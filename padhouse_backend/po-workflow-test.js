/* eslint-disable no-console */
/**
 * End-to-end test for the Purchase Orders Management Module.
 *
 * Exercises the full lifecycle against the running API:
 *   create (draft) → edit draft → guard checks → submit → approve → send
 *   → receive partial → receive remaining (RECEIVED)
 * plus the reject path, the cancel path, and the "cancelled can't receive" guard.
 *
 * Also asserts the inventory contract: create / approve / send never touch
 * stock, while a confirmed goods receipt increases stock by exactly the
 * received quantities.
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

function near(a, b, eps = 0.005) {
  return Math.abs(Number(a) - Number(b)) <= eps;
}

async function expectStatus(fn, expected, label) {
  try {
    const res = await fn();
    fail(`${label} (expected HTTP ${expected}, got 200)`, res?.data);
    return null;
  } catch (err) {
    const status = err.response?.status;
    if (status === expected) {
      ok(`${label} (rejected with HTTP ${status})`);
      return err.response?.data;
    }
    fail(`${label} (expected HTTP ${expected}, got ${status})`, err.response?.data || err.message);
    return null;
  }
}

const auth = (token) => ({ headers: { Authorization: `Bearer ${token}` } });

async function main() {
  /* ---------------------------------------------------------------- */
  /* 0. Auth + fixtures                                               */
  /* ---------------------------------------------------------------- */
  section('0. Authentication & fixtures');

  const login = await axios.post(`${BASE_URL}/auth/login`, {
    email: 'adimn123@gmail.com',
    password: '123456',
  });
  const token = login.data.accessToken;
  check(!!token, `Admin logged in as ${login.data.user?.email} (role: ${login.data.user?.role})`);

  const suppliersRes = await axios.get(`${BASE_URL}/suppliers`, auth(token));
  const suppliers = Array.isArray(suppliersRes.data)
    ? suppliersRes.data
    : suppliersRes.data?.items ?? [];
  let supplier = suppliers.find((s) => s.status === 'ACTIVE') ?? suppliers[0];

  if (!supplier) {
    const created = await axios.post(
      `${BASE_URL}/suppliers`,
      {
        name: 'مورد الاختبار الآلي',
        company: 'Test Supply Co.',
        contactName: 'مسؤول المبيعات',
        phone: '+970 59 123 4567',
        email: `supplier_${Date.now()}@test.local`,
        city: 'نابلس',
        status: 'ACTIVE',
      },
      auth(token),
    );
    supplier = created.data;
    check(!!supplier, `Created test supplier: ${supplier?.name} (${supplier?.id})`);
  } else {
    check(!!supplier, `Picked supplier: ${supplier?.name} (${supplier?.id})`);
  }

  const productsRes = await axios.get(`${BASE_URL}/products?includeInactive=true`, auth(token));
  const products = Array.isArray(productsRes.data) ? productsRes.data : productsRes.data?.items ?? [];
  const [productA, productB] = products;
  check(!!productA && !!productB, `Picked products: ${productA?.nameAr} / ${productB?.nameAr}`);

  const stockBefore = new Map(products.map((p) => [p.id, p.stock]));

  /* ---------------------------------------------------------------- */
  /* 1. Create draft                                                   */
  /* ---------------------------------------------------------------- */
  section('1. Create draft purchase order');

  const createRes = await axios.post(
    `${BASE_URL}/purchase-orders`,
    {
      supplierId: supplier.id,
      currency: 'ILS',
      paymentTerms: 'Net 30',
      orderDate: new Date().toISOString(),
      expectedAt: new Date(Date.now() + 7 * 864e5).toISOString(),
      notes: 'طلب توريد تجريبي من الاختبار الآلي',
      shippingCost: 25,
      items: [
        { productId: productA.id, orderedQuantity: 10, unitCost: 42.5, discountRate: 5, taxRate: 16 },
        { productId: productB.id, orderedQuantity: 4, unitCost: 100, discountRate: 0, taxRate: 16 },
      ],
    },
    auth(token),
  );

  const po = createRes.data;
  check(po.status === 'DRAFT', `New order status is DRAFT`);
  check(/^PO-\d{4}-\d{4}$/.test(po.orderNumber), `PO number auto-generated: ${po.orderNumber}`);
  check(po.supplier?.id === supplier.id, 'Supplier linked (reference, not duplicated)');
  check(po.createdBy?.id === login.data.user.id, `Created By recorded: ${po.createdBy?.fullName}`);
  check(po.items?.length === 2, 'Two line items stored');
  const poId = po.id;
  const itemA = po.items.find((i) => i.productId === productA.id);
  const itemB = po.items.find((i) => i.productId === productB.id);

  check(
    itemA?.productName === productA.nameAr && itemA?.sku === productA.sku,
    `Line snapshot keeps product identity (name + SKU)`,
    itemA,
  );
  check(itemA?.remainingQuantity === 10, 'remainingQuantity = ordered − received');

  // Financials: item A = 425 gross, 21.25 discount, 64.60 tax, 468.35 line
  //             item B = 400 gross, 0 discount, 64.00 tax, 464.00 line
  check(near(po.subtotal, 825), `Subtotal = ${po.subtotal} (expected 825)`);
  check(near(po.discountTotal, 21.25), `Total discounts = ${po.discountTotal} (expected 21.25)`);
  check(near(po.taxTotal, 128.6), `Total taxes = ${po.taxTotal} (expected 128.60)`);
  check(near(po.shippingCost, 25), `Shipping = ${po.shippingCost}`);
  check(near(po.grandTotal, 957.35), `Grand total = ${po.grandTotal} (expected 957.35)`);

  /* ---------------------------------------------------------------- */
  /* 2. Validation guards on create                                    */
  /* ---------------------------------------------------------------- */
  section('2. Input validation');

  await expectStatus(
    () =>
      axios.post(
        `${BASE_URL}/purchase-orders`,
        {
          supplierId: supplier.id,
          items: [{ productId: productA.id, orderedQuantity: 0, unitCost: 10 }],
        },
        auth(token),
      ),
    400,
    'Zero quantity rejected',
  );

  await expectStatus(
    () =>
      axios.post(
        `${BASE_URL}/purchase-orders`,
        {
          supplierId: supplier.id,
          items: [{ productId: productA.id, orderedQuantity: 1, unitCost: -5 }],
        },
        auth(token),
      ),
    400,
    'Negative unit cost rejected',
  );

  await expectStatus(
    () =>
      axios.post(
        `${BASE_URL}/purchase-orders`,
        {
          supplierId: supplier.id,
          items: [{ productId: productA.id, orderedQuantity: 1, unitCost: 10, taxRate: 150 }],
        },
        auth(token),
      ),
    400,
    'Tax rate > 100% rejected',
  );

  await expectStatus(
    () =>
      axios.post(
        `${BASE_URL}/purchase-orders`,
        {
          supplierId: supplier.id,
          items: [
            { productId: productA.id, orderedQuantity: 1, unitCost: 10 },
            { productId: productA.id, orderedQuantity: 2, unitCost: 10 },
          ],
        },
        auth(token),
      ),
    400,
    'Duplicate product in lines rejected',
  );

  await expectStatus(
    () =>
      axios.post(
        `${BASE_URL}/purchase-orders`,
        {
          supplierId: supplier.id,
          currency: 'ils',
          items: [{ productId: productA.id, orderedQuantity: 1, unitCost: 10 }],
        },
        auth(token),
      ),
    400,
    'Lowercase currency rejected',
  );

  /* ---------------------------------------------------------------- */
  /* 3. Edit draft                                                     */
  /* ---------------------------------------------------------------- */
  section('3. Edit draft (allowed)');

  const editRes = await axios.patch(
    `${BASE_URL}/purchase-orders/${poId}`,
    {
      notes: 'تم التعديل أثناء المسودة',
      shippingCost: 50,
      items: [
        { productId: productA.id, orderedQuantity: 20, unitCost: 40, discountRate: 10, taxRate: 16 },
      ],
    },
    auth(token),
  );
  check(editRes.data.items.length === 1, 'Draft items replaced by edit');
  // item = 800 gross, 80 discount, 115.20 tax, 835.20 line; + shipping 50 → 885.20
  check(near(editRes.data.subtotal, 800), `Edited subtotal = ${editRes.data.subtotal}`);
  check(near(editRes.data.discountTotal, 80), `Edited discounts = ${editRes.data.discountTotal}`);
  check(near(editRes.data.taxTotal, 115.2), `Edited taxes = ${editRes.data.taxTotal}`);
  check(near(editRes.data.grandTotal, 885.2), `Edited grand total = ${editRes.data.grandTotal} (expected 885.20)`);

  const editedItem = editRes.data.items[0];

  /* ---------------------------------------------------------------- */
  /* 4. Invalid transitions from DRAFT                                 */
  /* ---------------------------------------------------------------- */
  section('4. Invalid transition guards');

  await expectStatus(
    () => axios.post(`${BASE_URL}/purchase-orders/${poId}/approve`, {}, auth(token)),
    400,
    'Cannot approve a DRAFT directly',
  );
  await expectStatus(
    () => axios.post(`${BASE_URL}/purchase-orders/${poId}/send`, {}, auth(token)),
    400,
    'Cannot send a DRAFT directly',
  );
  await expectStatus(
    () =>
      axios.post(`${BASE_URL}/purchase-orders/${poId}/receive`, { items: [] }, auth(token)),
    400,
    'Cannot receive against a DRAFT',
  );
  await expectStatus(
    () => axios.patch(`${BASE_URL}/purchase-orders/${poId}`, { status: 'APPROVED' }, auth(token)),
    400,
    'Manual status field cannot be set (whitelist rejects)',
  );

  /* ---------------------------------------------------------------- */
  /* 5. Submit → Approve → Send                                        */
  /* ---------------------------------------------------------------- */
  section('5. Submit → Approve → Send');

  const submitRes = await axios.post(
    `${BASE_URL}/purchase-orders/${poId}/submit`,
    { notes: 'بانتظار موافقة المدير' },
    auth(token),
  );
  check(submitRes.data.status === 'PENDING_APPROVAL', 'Status → PENDING_APPROVAL after submit');

  await expectStatus(
    () => axios.patch(`${BASE_URL}/purchase-orders/${poId}`, { notes: 'x' }, auth(token)),
    400,
    'Cannot edit once submitted (not a draft)',
  );

  const approveRes = await axios.post(
    `${BASE_URL}/purchase-orders/${poId}/approve`,
    { notes: 'تمت الموافقة' },
    auth(token),
  );
  check(approveRes.data.status === 'APPROVED', 'Status → APPROVED after approval');
  check(
    approveRes.data.allowedTransitions.includes('SENT'),
    `allowedTransitions exposes SENT: [${approveRes.data.allowedTransitions.join(', ')}]`,
  );

  const sendRes = await axios.post(
    `${BASE_URL}/purchase-orders/${poId}/send`,
    { notes: 'أُرسل للمورد' },
    auth(token),
  );
  check(sendRes.data.status === 'SENT', 'Status → SENT after send');

  /* ---------------------------------------------------------------- */
  /* 6. Receive partial → full (per-receipt quantities)                */
  /* ---------------------------------------------------------------- */
  section('6. Goods receipt');

  // Over-receipt beyond the ordered quantity is rejected.
  await expectStatus(
    () =>
      axios.post(
        `${BASE_URL}/purchase-orders/${poId}/receive`,
        { items: [{ itemId: editedItem.id, quantityReceived: 999 }] },
        auth(token),
      ),
    400,
    'Receiving more than ordered is rejected',
  );

  // An all-zero receipt is rejected too.
  await expectStatus(
    () =>
      axios.post(
        `${BASE_URL}/purchase-orders/${poId}/receive`,
        { items: [{ itemId: editedItem.id, quantityReceived: 0 }] },
        auth(token),
      ),
    400,
    'An empty (all-zero) receipt is rejected',
  );

  const partialRes = await axios.post(
    `${BASE_URL}/purchase-orders/${poId}/receive`,
    { items: [{ itemId: editedItem.id, quantityReceived: 5 }], notes: 'استلام أول شحنة' },
    auth(token),
  );
  check(partialRes.data.status === 'PARTIALLY_RECEIVED', 'Status → PARTIALLY_RECEIVED after partial receipt');
  check(partialRes.data.items[0].receivedQuantity === 5, 'Cumulative received quantity recorded');
  check(partialRes.data.items[0].remainingQuantity === 15, 'Remaining quantity recomputed (20 − 5)');

  const firstReceipt = partialRes.data.receipts?.[0];
  check(partialRes.data.receipts?.length === 1, 'First goods receipt stored');
  check(
    /^GR-\d{4}-\d{4}$/.test(firstReceipt?.receiptNumber ?? ''),
    `Unique receipt reference generated: ${firstReceipt?.receiptNumber}`,
  );
  check(!!firstReceipt?.receivedByName, `Receiving user recorded: ${firstReceipt?.receivedByName}`);
  check(!!firstReceipt?.receivedAt, 'Receipt date recorded');
  check(
    firstReceipt?.items?.length === 1 && firstReceipt.items[0].quantityReceived === 5,
    'Receipt line records this receipt quantity (delta)',
  );

  // A second receipt may not exceed what is still outstanding (15).
  await expectStatus(
    () =>
      axios.post(
        `${BASE_URL}/purchase-orders/${poId}/receive`,
        { items: [{ itemId: editedItem.id, quantityReceived: 16 }] },
        auth(token),
      ),
    400,
    'Receiving more than the remaining quantity is rejected',
  );

  const fullRes = await axios.post(
    `${BASE_URL}/purchase-orders/${poId}/receive`,
    { items: [{ itemId: editedItem.id, quantityReceived: 15 }], notes: 'استلام باقي الكمية' },
    auth(token),
  );
  check(fullRes.data.status === 'RECEIVED', 'Status → RECEIVED once all lines fully received');
  check(!!fullRes.data.receivedAt, 'receivedAt timestamp set');
  check(fullRes.data.receipts?.length === 2, 'Multiple receipts supported for one order');
  check(fullRes.data.allowedTransitions.length === 0, 'RECEIVED is terminal (no further transitions)');

  // Duplicate confirmation: the order is fully received, nothing may be re-applied.
  await expectStatus(
    () =>
      axios.post(
        `${BASE_URL}/purchase-orders/${poId}/receive`,
        { items: [{ itemId: editedItem.id, quantityReceived: 1 }] },
        auth(token),
      ),
    400,
    'Duplicate confirmation against a RECEIVED order is rejected',
  );

  /* ---------------------------------------------------------------- */
  /* 7. Reject path                                                    */
  /* ---------------------------------------------------------------- */
  section('7. Reject path (PENDING_APPROVAL → DRAFT)');

  const rejectPo = (
    await axios.post(
      `${BASE_URL}/purchase-orders`,
      {
        supplierId: supplier.id,
        currency: 'ILS',
        items: [{ productId: productB.id, orderedQuantity: 3, unitCost: 30 }],
      },
      auth(token),
    )
  ).data;
  await axios.post(`${BASE_URL}/purchase-orders/${rejectPo.id}/submit`, {}, auth(token));
  const rejectRes = await axios.post(
    `${BASE_URL}/purchase-orders/${rejectPo.id}/reject`,
    { notes: 'مرفوض — يحتاج تعديل السعر' },
    auth(token),
  );
  check(rejectRes.data.status === 'DRAFT', 'Rejected order returns to DRAFT (editable again)');
  const reEdit = await axios.patch(
    `${BASE_URL}/purchase-orders/${rejectPo.id}`,
    { notes: 'أُعيد للتعديل بعد الرفض' },
    auth(token),
  );
  check(reEdit.data.notes.includes('أُعيد'), 'Rejected order can be edited after returning to DRAFT');
  await axios.delete(`${BASE_URL}/purchase-orders/${rejectPo.id}`, auth(token));
  ok('Draft can be deleted');

  /* ---------------------------------------------------------------- */
  /* 8. Cancel path + cancelled guards                                 */
  /* ---------------------------------------------------------------- */
  section('8. Cancel path & guards');

  const cancelPo = (
    await axios.post(
      `${BASE_URL}/purchase-orders`,
      {
        supplierId: supplier.id,
        currency: 'ILS',
        items: [{ productId: productA.id, orderedQuantity: 5, unitCost: 12 }],
      },
      auth(token),
    )
  ).data;
  await axios.post(`${BASE_URL}/purchase-orders/${cancelPo.id}/submit`, {}, auth(token));
  await axios.post(`${BASE_URL}/purchase-orders/${cancelPo.id}/approve`, {}, auth(token));
  const cancelRes = await axios.post(
    `${BASE_URL}/purchase-orders/${cancelPo.id}/cancel`,
    { reason: 'تغيّرت الحاجة' },
    auth(token),
  );
  check(cancelRes.data.status === 'CANCELLED', 'Status → CANCELLED');

  await expectStatus(
    () =>
      axios.post(
        `${BASE_URL}/purchase-orders/${cancelPo.id}/receive`,
        { items: [{ itemId: cancelRes.data.items[0].id, quantityReceived: 1 }] },
        auth(token),
      ),
    400,
    'Cancelled order cannot receive products',
  );
  await expectStatus(
    () => axios.post(`${BASE_URL}/purchase-orders/${cancelPo.id}/approve`, {}, auth(token)),
    400,
    'Cancelled order cannot be approved',
  );

  /* ---------------------------------------------------------------- */
  /* 9. Audit trail                                                    */
  /* ---------------------------------------------------------------- */
  section('9. Audit history');

  const detail = (await axios.get(`${BASE_URL}/purchase-orders/${poId}`, auth(token))).data;
  const chain = detail.statusHistory.map((h) => h.toStatus);
  check(
    JSON.stringify(chain) ===
      JSON.stringify(['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT', 'PARTIALLY_RECEIVED', 'RECEIVED']),
    `Full status chain recorded: ${chain.join(' → ')}`,
    chain,
  );
  check(
    detail.statusHistory.every((h) => h.actorName),
    'Every history entry records the acting user',
  );

  /* ---------------------------------------------------------------- */
  /* 10. List / filter / search                                        */
  /* ---------------------------------------------------------------- */
  section('10. List endpoints');

  const listAll = (await axios.get(`${BASE_URL}/purchase-orders`, auth(token))).data;
  check(listAll.items.length >= 2, `List returns orders (total: ${listAll.total})`);
  check(typeof listAll.byStatus === 'object', `KPI breakdown byStatus: ${JSON.stringify(listAll.byStatus)}`);

  const listFiltered = (
    await axios.get(`${BASE_URL}/purchase-orders?status=RECEIVED`, auth(token))
  ).data;
  check(
    listFiltered.items.every((o) => o.status === 'RECEIVED'),
    `Status filter works (${listFiltered.items.length} RECEIVED)`,
  );

  const listSearch = (
    await axios.get(`${BASE_URL}/purchase-orders?search=${encodeURIComponent(po.orderNumber)}`, auth(token))
  ).data;
  check(listSearch.items.length >= 1, `Search by order number works (${po.orderNumber})`);

  /* ---------------------------------------------------------------- */
  /* 11. Inventory contract                                            */
  /* ---------------------------------------------------------------- */
  section('11. Inventory updated only by receipts');

  const afterRes = await axios.get(`${BASE_URL}/products?includeInactive=true`, auth(token));
  const afterProducts = Array.isArray(afterRes.data) ? afterRes.data : afterRes.data?.items ?? [];
  const afterById = new Map(afterProducts.map((p) => [p.id, p]));

  // product A was ordered for 20 and fully received across two receipts (5 + 15).
  const receivedTotal = 20;
  const productABefore = stockBefore.get(productA.id);
  const productAAfter = afterById.get(productA.id)?.stock;
  check(
    productAAfter === productABefore + receivedTotal,
    `Received product stock increased by exactly ${receivedTotal} (${productABefore} → ${productAAfter})`,
  );

  let othersUnchanged = true;
  for (const p of afterProducts) {
    if (p.id === productA.id) continue;
    if (stockBefore.has(p.id) && stockBefore.get(p.id) !== p.stock) {
      othersUnchanged = false;
      fail(`Stock changed for ${p.nameAr}: ${stockBefore.get(p.id)} → ${p.stock}`);
    }
  }
  check(
    othersUnchanged,
    'No other product stock changed (create / approve / send never touch inventory)',
  );

  /* ---------------------------------------------------------------- */
  section(`RESULT: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

main().catch((err) => {
  console.error('\n[TEST RUN CRASHED]:', err.response?.data || err.message);
  process.exit(1);
});
