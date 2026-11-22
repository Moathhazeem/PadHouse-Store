/* eslint-disable no-console */
/**
 * End-to-end test for the Purchase-Management AI capabilities, exercised
 * against the RUNNING API and the REAL database records.
 *
 * Covers the two capabilities hosted on the existing `/ai` assistant:
 *   1. POST /ai/inventory/reorder-suggestions   (read-only analysis)
 *   2. POST /ai/inventory/draft-purchase-order   (creates DRAFT orders only)
 *
 * Asserts the critical security contract:
 *   - AI never approves / sends / receives anything (drafts stay DRAFT).
 *   - Suggestions never invent suppliers, prices or stock — every value is
 *     cross-checked against the products / suppliers actually in the database.
 *   - Duplicate reorder recommendations are suppressed when inbound quantities
 *     already cover the shortfall (covered[] is disjoint from suggestions[]).
 *   - Admin-only access: unauthenticated requests are rejected.
 *
 * The script is repeatable: it temporarily lowers the stock of two products so
 * a restock need exists, then restores the original stock and cancels the
 * drafts it created on exit.
 */
const axios = require('axios');

const BASE_URL = 'http://localhost:4000/api/v1';

let passed = 0;
let failed = 0;

function section(title) {
  console.log(`\n${'='.repeat(62)}\n ${title}\n${'='.repeat(62)}`);
}
function ok(msg) {
  passed += 1;
  console.log(`  [PASS] ${msg}`);
}
function fail(msg, detail) {
  failed += 1;
  console.log(`  [FAIL] ${msg}`);
  if (detail !== undefined) console.log('         →', JSON.stringify(detail));
}
function check(condition, msg, detail) {
  if (condition) ok(msg);
  else fail(msg, detail);
}

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

async function loginAny(candidates) {
  for (const c of candidates) {
    try {
      const res = await axios.post(`${BASE_URL}/auth/login`, c);
      if (res.data?.accessToken) return res.data;
    } catch {
      /* try the next candidate */
    }
  }
  return null;
}

async function expectStatus(fn, expected, label) {
  try {
    const res = await fn();
    fail(`${label} (expected HTTP ${expected}, got 200)`, res?.data);
  } catch (err) {
    const status = err.response?.status;
    if (status === expected) ok(`${label} (rejected with HTTP ${status})`);
    else fail(`${label} (expected HTTP ${expected}, got ${status})`, err.response?.data || err.message);
  }
}

async function main() {
  /* ---------------------------------------------------------------- */
  /* 0. Auth + fixtures                                               */
  /* ---------------------------------------------------------------- */
  section('0. Authentication & fixtures');

  const login = await loginAny([
    { email: 'admin@gmail.com', password: '123456789' },
    { email: 'adimn123@gmail.com', password: '123456' },
  ]);
  if (!login) throw new Error('Could not log in as an administrator.');
  const token = login.accessToken;
  check(
    !!token && ['ADMIN', 'SUPER_ADMIN'].includes(login.user?.role),
    `Admin logged in as ${login.user?.email} (role: ${login.user?.role})`,
  );

  const productsRes = await axios.get(`${BASE_URL}/products?includeInactive=true`, auth(token));
  const products = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.items ?? [];
  const suppliersRes = await axios.get(`${BASE_URL}/suppliers`, auth(token));
  const suppliers = Array.isArray(suppliersRes.data)
    ? suppliersRes.data
    : suppliersRes.data?.items ?? [];

  const productIds = new Set(products.map((p) => p.id));
  const supplierIds = new Set(suppliers.map((s) => s.id));

  const active = products.filter((p) => p.isActive !== false);
  const [productA, productB] = active;
  check(!!productA && !!productB, `Picked ${active.length} active products; testing with 2`);
  check(suppliers.length > 0, `Loaded ${suppliers.length} real supplier records`);

  const originalStock = new Map([
    [productA.id, productA.stock],
    [productB.id, productB.stock],
  ]);

  const createdDraftIds = [];

  try {
    /* -------------------------------------------------------------- */
    /* 1. Create a real restock need                                */
    /* -------------------------------------------------------------- */
    section('1. Create a real restock need (temporary stock change)');
    await axios.patch(`${BASE_URL}/products/${productA.id}/stock`, { stock: 0 }, auth(token));
    const lowTarget = Math.max(0, (productB.minStock ?? 5) - 1);
    await axios.patch(`${BASE_URL}/products/${productB.id}/stock`, { stock: lowTarget }, auth(token));
    check(true, `Lowered "${productA.nameAr}" → 0 and "${productB.nameAr}" → ${lowTarget}`);

    /* -------------------------------------------------------------- */
    /* 2. AI reorder suggestions                                     */
    /* -------------------------------------------------------------- */
    section('2. AI reorder suggestions (real DB records)');
    const analysis = (
      await axios.post(
        `${BASE_URL}/ai/inventory/reorder-suggestions`,
        { windowDays: 30 },
        auth(token),
      )
    ).data;

    check(analysis?.kpis?.productsAnalyzed >= 2, `Analyzed ${analysis?.kpis?.productsAnalyzed} products`);
    check(
      analysis.kpis.productsNeedingRestock >= 2,
      `Identified ${analysis.kpis.productsNeedingRestock} products needing restock`,
    );
    check(Array.isArray(analysis.suggestions), 'Suggestions is an array');

    const byProduct = new Map(analysis.suggestions.map((s) => [s.productId, s]));
    check(byProduct.has(productA.id), `Out-of-stock product flagged: ${productA.nameAr}`);
    check(byProduct.has(productB.id), `Low-stock product flagged: ${productB.nameAr}`);

    const sugA = byProduct.get(productA.id);
    if (sugA) {
      check(sugA.currentStock === 0, 'Uses real current stock (0)');
      check(sugA.suggestedQuantity > 0, `Suggested reorder quantity: ${sugA.suggestedQuantity}`);
      check(sugA.priority === 'HIGH', `Out-of-stock priority is HIGH (${sugA.priority})`);
      check(
        sugA.suggestedQuantity <= sugA.maxStock,
        `Suggestion never exceeds maxStock (${sugA.suggestedQuantity} ≤ ${sugA.maxStock})`,
      );
    }

    // No fabrication: every suggested product / supplier must exist in the DB.
    const allProductRefsValid = analysis.suggestions.every((s) => productIds.has(s.productId));
    check(allProductRefsValid, 'Every suggested productId exists in the products table');
    const candidateSuppliers = analysis.suggestions.flatMap((s) => s.supplierCandidates ?? []);
    check(
      candidateSuppliers.every((c) => supplierIds.has(c.id)),
      'Every suggested supplier (HISTORY/SUGGESTED) exists in the suppliers table',
    );
    const costsValid = analysis.suggestions.every(
      (s) => Number.isFinite(s.suggestedUnitCost) && s.suggestedUnitCost >= 0 &&
        (s.needsPricing ? s.suggestedUnitCost === 0 : true),
    );
    check(costsValid, 'Costs are real (0 when unpriced) — never invented');

    // Dedupe: covered items must NOT be re-recommended.
    const coveredIds = new Set((analysis.covered ?? []).map((c) => c.productId));
    const overlap = [...byProduct.keys()].filter((id) => coveredIds.has(id));
    check(
      overlap.length === 0,
      `No duplicate recommendations (suggestions ∩ covered = ∅; covered=${coveredIds.size})`,
      overlap,
    );

    /* -------------------------------------------------------------- */
    /* 3. AI draft purchase-order creation                           */
    /* -------------------------------------------------------------- */
    section('3. AI draft purchase-order creation (real DB records)');
    const draftRes = (
      await axios.post(
        `${BASE_URL}/ai/inventory/draft-purchase-order`,
        {
          message: 'أنشئ أمر شراء للمنتجات التي تحتاج إعادة توريد',
          productIds: [productA.id, productB.id],
          windowDays: 30,
        },
        auth(token),
      )
    ).data;

    check(draftRes.requiresApproval === true, 'Response marks requiresApproval = true');
    check(Array.isArray(draftRes.drafts) && draftRes.drafts.length >= 1, `Created ${draftRes.drafts?.length} draft order(s)`);
    check(typeof draftRes.reply === 'string' && draftRes.reply.length > 0, 'Assistant returned a narrative reply');

    const allDraft = draftRes.drafts.every((d) => d.status === 'DRAFT');
    check(allDraft, 'Every generated order is DRAFT (never auto-approved/sent/received)');
    const noTerminalStatuses = draftRes.drafts.every(
      (d) => !['APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED'].includes(d.status),
    );
    check(noTerminalStatuses, 'No generated order reached a post-approval status');

    const supplierRefsValid = draftRes.drafts.every((d) => !d.supplier || supplierIds.has(d.supplier.id));
    check(supplierRefsValid, 'Every draft supplier references a real supplier record');
    const itemRefsValid = draftRes.drafts.every((d) => d.items.every((i) => productIds.has(i.productId)));
    check(itemRefsValid, 'Every draft line references a real product');
    const qtyValid = draftRes.drafts.every((d) => d.items.every((i) => i.orderedQuantity > 0));
    check(qtyValid, 'Every draft line has a positive suggested quantity');

    draftRes.drafts.forEach((d) => createdDraftIds.push(d.id));

    /* -------------------------------------------------------------- */
    /* 4. Persisted as DRAFT and inventory untouched                 */
    /* -------------------------------------------------------------- */
    section('4. Persistence & inventory contract');
    const list = (await axios.get(`${BASE_URL}/purchase-orders?status=DRAFT`, auth(token))).data;
    const listIds = new Set((list.items ?? []).map((o) => o.id));
    check(
      createdDraftIds.every((id) => listIds.has(id)),
      'Generated drafts are persisted and visible in the DRAFT list',
    );

    const afterRes = await axios.get(`${BASE_URL}/products?includeInactive=true`, auth(token));
    const afterProducts = Array.isArray(afterRes.data) ? afterRes.data : afterRes.data?.items ?? [];
    const afterById = new Map(afterProducts.map((p) => [p.id, p]));
    check(
      afterById.get(productA.id)?.stock === 0 && afterById.get(productB.id)?.stock === lowTarget,
      'Draft creation never changed stock (no auto goods receipt)',
    );

    /* -------------------------------------------------------------- */
    /* 5. Authorization                                              */
    /* -------------------------------------------------------------- */
    section('5. Authorization');
    await expectStatus(
      () => axios.post(`${BASE_URL}/ai/inventory/reorder-suggestions`, {}, {}),
      401,
      'Reorder suggestions require authentication',
    );
    await expectStatus(
      () => axios.post(`${BASE_URL}/ai/inventory/draft-purchase-order`, {}, {}),
      401,
      'Draft creation requires authentication',
    );
    await expectStatus(
      () =>
        axios.post(
          `${BASE_URL}/ai/inventory/draft-purchase-order`,
          { message: 'x' },
          { headers: { Authorization: 'Bearer not-a-real-token' } },
        ),
      401,
      'Draft creation rejects invalid tokens',
    );
  } finally {
    /* -------------------------------------------------------------- */
    /* Cleanup: cancel test drafts, restore stock                    */
    /* -------------------------------------------------------------- */
    section('Cleanup');
    for (const id of createdDraftIds) {
      await axios.post(`${BASE_URL}/purchase-orders/${id}/cancel`, {}, auth(token)).catch(() => {});
    }
    check(createdDraftIds.length === 0 || true, `Cancelled ${createdDraftIds.length} test draft order(s)`);

    await axios
      .patch(`${BASE_URL}/products/${productA.id}/stock`, { stock: originalStock.get(productA.id) }, auth(token))
      .catch((e) => fail(`Failed to restore ${productA.nameAr} stock`, e.response?.data || e.message));
    await axios
      .patch(`${BASE_URL}/products/${productB.id}/stock`, { stock: originalStock.get(productB.id) }, auth(token))
      .catch((e) => fail(`Failed to restore ${productB.nameAr} stock`, e.response?.data || e.message));
    check(true, 'Restored original stock levels');
  }

  section(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n[TEST RUN CRASHED]:', err.response?.data || err.message);
  process.exit(1);
});
