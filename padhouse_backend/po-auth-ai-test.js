/* eslint-disable no-console */
/**
 * Targeted end-to-end checks for two scenarios that the main workflow test
 * does not cover at runtime:
 *
 *   Scenario 8 — Authorization: a non-admin (CUSTOMER) token, and an anonymous
 *                request, must be rejected from every purchase-management action.
 *
 *   Scenario 9 — AI draft isolation: an AI-generated purchase order must be
 *                persisted as DRAFT (never approved/sent/received) and must not
 *                change inventory.
 *
 * Self-contained: creates a low-stock test product to force a real AI draft,
 * then removes the draft order and the test product.
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

async function expectStatus(fn, expected, label) {
  try {
    const res = await fn();
    fail(`${label} (expected HTTP ${expected}, got ${res?.status})`, res?.data);
  } catch (err) {
    const status = err.response?.status;
    if (status === expected) ok(`${label} (HTTP ${status})`);
    else fail(`${label} (expected HTTP ${expected}, got ${status})`, err.response?.data || err.message);
  }
}

async function main() {
  const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'adimn123@gmail.com',
    password: '123456',
  });
  const adminToken = adminLogin.data.accessToken;

  /* ------------------------------------------------------------------ */
  /* Scenario 8 — Authorization                                          */
  /* ------------------------------------------------------------------ */
  section('Scenario 8 — Authorization (approve / receive / manage)');
  check(!!adminToken, `Admin token acquired (role: ${adminLogin.data.user?.role})`);

  let customerToken = null;
  try {
    const custLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ahmad@padhouse.ps',
      password: 'password123',
    });
    customerToken = custLogin.data.accessToken;
    check(
      !!customerToken && custLogin.data.user?.role === 'CUSTOMER',
      `Customer logged in (role: ${custLogin.data.user?.role})`,
    );
  } catch (err) {
    fail('Customer login failed', err.response?.data || err.message);
  }

  const list = await axios.get(`${BASE_URL}/purchase-orders`, auth(adminToken));
  const orders = Array.isArray(list.data) ? list.data : list.data?.items ?? [];
  const orderId = orders[0]?.id;
  check(!!orderId, `Reference order id resolved (${orderId})`);

  await expectStatus(
    () => axios.post(`${BASE_URL}/purchase-orders/${orderId}/approve`, {}, auth(customerToken)),
    403,
    'Customer cannot approve a purchase order',
  );
  await expectStatus(
    () =>
      axios.post(`${BASE_URL}/purchase-orders/${orderId}/receive`, { items: [] }, auth(customerToken)),
    403,
    'Customer cannot receive goods',
  );
  await expectStatus(
    () => axios.post(`${BASE_URL}/purchase-orders`, { supplierId: 'x', items: [] }, auth(customerToken)),
    403,
    'Customer cannot create a purchase order',
  );
  await expectStatus(
    () => axios.get(`${BASE_URL}/purchase-orders`, auth(customerToken)),
    403,
    'Customer cannot list purchase orders',
  );
  await expectStatus(
    () => axios.get(`${BASE_URL}/suppliers`, auth(customerToken)),
    403,
    'Customer cannot access supplier management',
  );
  await expectStatus(
    () => axios.post(`${BASE_URL}/ai/inventory/draft-purchase-order`, {}, auth(customerToken)),
    403,
    'Customer cannot trigger AI draft purchase orders',
  );
  await expectStatus(
    () => axios.get(`${BASE_URL}/purchase-orders`),
    401,
    'Anonymous cannot list purchase orders',
  );
  await expectStatus(
    () => axios.post(`${BASE_URL}/purchase-orders/${orderId}/approve`, {}),
    401,
    'Anonymous cannot approve a purchase order',
  );

  const adminList = await axios.get(`${BASE_URL}/purchase-orders`, auth(adminToken));
  check(adminList.status === 200, 'Admin can list purchase orders (HTTP 200)');

  /* ------------------------------------------------------------------ */
  /* Scenario 9 — AI drafts remain DRAFT and never touch inventory       */
  /* ------------------------------------------------------------------ */
  section('Scenario 9 — AI-generated purchase orders stay DRAFT');

  // Fixtures: an active supplier + a deliberately low-stock product.
  const suppliersRes = await axios.get(`${BASE_URL}/suppliers`, auth(adminToken));
  const suppliers = Array.isArray(suppliersRes.data) ? suppliersRes.data : suppliersRes.data?.items ?? [];
  const supplier = suppliers.find((s) => s.status === 'ACTIVE') ?? suppliers[0];
  check(!!supplier, `Supplier resolved (${supplier?.name})`);

  const catRes = await axios.get(`${BASE_URL}/categories`);
  const cats = Array.isArray(catRes.data) ? catRes.data : catRes.data?.items ?? [];
  const categoryId = cats[0]?.id;
  check(!!categoryId, `Category resolved (${cats[0]?.nameAr ?? categoryId})`);

  const sku = `AITEST-${Date.now()}`;
  const productRes = await axios.post(
    `${BASE_URL}/products`,
    {
      sku,
      nameAr: 'منتج اختبار الذكاء الاصطناعي',
      nameEn: 'AI Test Product',
      descriptionAr: 'منتج مؤقت لاختبار إنشاء مسودة أمر الشراء بالذكاء الاصطناعي',
      descriptionEn: 'Temporary product for AI draft PO testing',
      categoryId,
      basePrice: 10,
      stock: 0,
      minStock: 5,
      maxStock: 20,
      isActive: true,
    },
    auth(adminToken),
  );
  const testProduct = productRes.data;
  check(!!testProduct?.id, `Created low-stock test product (${testProduct?.id})`);

  const before = await axios.get(`${BASE_URL}/products?includeInactive=true`, auth(adminToken));
  const beforeList = Array.isArray(before.data) ? before.data : before.data?.items ?? [];
  const stockBefore = new Map(beforeList.map((p) => [p.id, Number(p.stock)]));

  let aiRes = null;
  try {
    aiRes = await axios.post(
      `${BASE_URL}/ai/inventory/draft-purchase-order`,
      {
        message: 'أنشئ أمر شراء للمنتجات التي تحتاج إعادة توريد',
        productIds: [testProduct.id],
        supplierId: supplier.id,
        limit: 5,
      },
      auth(adminToken),
    );
  } catch (err) {
    fail('AI draft endpoint failed', err.response?.data || err.message);
  }

  const createdDrafts = [];
  if (aiRes) {
    check(
      aiRes.status === 200 || aiRes.status === 201,
      `AI draft endpoint responded HTTP ${aiRes.status}`,
    );
    const drafts = aiRes.data?.drafts ?? [];
    check(Array.isArray(drafts) && drafts.length >= 1, `AI created ${drafts.length} draft(s)`);
    check(aiRes.data?.requiresApproval === true, 'Response signals requiresApproval = true');

    const allDraft = drafts.every((d) => d.status === 'DRAFT');
    check(allDraft, 'Every AI-generated order reports status = DRAFT');

    for (const d of drafts) {
      if (d.id) createdDrafts.push(d);
      const fresh = await axios.get(`${BASE_URL}/purchase-orders/${d.id}`, auth(adminToken));
      check(
        fresh.data?.status === 'DRAFT',
        `Persisted status of ${fresh.data?.orderNumber ?? d.id} is DRAFT`,
        fresh.data?.status,
      );
      const touchesProduct = (fresh.data?.items ?? []).some((i) => i.productId === testProduct.id);
      if (touchesProduct) {
        check(
          (fresh.data.items.find((i) => i.productId === testProduct.id).receivedQuantity ?? 0) === 0,
          'AI draft line has receivedQuantity = 0 (nothing received)',
        );
      }
    }
  }

  const after = await axios.get(`${BASE_URL}/products?includeInactive=true`, auth(adminToken));
  const afterList = Array.isArray(after.data) ? after.data : after.data?.items ?? [];
  const changed = afterList.filter((p) => stockBefore.get(p.id) !== Number(p.stock));
  check(
    changed.length === 0,
    'AI draft creation did not change any product stock',
    changed.map((p) => ({ id: p.id, before: stockBefore.get(p.id), after: p.stock })),
  );

  /* ------------------------------------------------------------------ */
  /* Cleanup                                                             */
  /* ------------------------------------------------------------------ */
  section('Cleanup (remove test fixtures)');
  for (const d of createdDrafts) {
    try {
      await axios.delete(`${BASE_URL}/purchase-orders/${d.id}`, auth(adminToken));
      ok(`Deleted test draft ${d.orderNumber ?? d.id}`);
    } catch (err) {
      fail(`Could not delete test draft ${d.id}`, err.response?.data || err.message);
    }
  }
  if (testProduct?.id) {
    try {
      await axios.delete(`${BASE_URL}/products/${testProduct.id}`, auth(adminToken));
      ok('Deleted test product');
    } catch (err) {
      fail('Could not delete test product', err.response?.data || err.message);
    }
  }

  section('RESULT');
  console.log(`  ${passed} passed, ${failed} failed`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error('\nFATAL:', err.response?.data || err.message);
  process.exit(1);
});
