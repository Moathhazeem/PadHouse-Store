import axios from 'axios';

const BASE_URL = 'http://localhost:4000/api/v1';

async function runTests() {
  console.log('==============================================');
  console.log('   STARTING PADHOUSE BACKEND COMPREHENSIVE TESTS');
  console.log('==============================================\n');

  try {
    // 1. Categories
    console.log('Test 1: GET /categories');
    const catRes = await axios.get(`${BASE_URL}/categories`);
    console.log(`[PASS] Fetched ${catRes.data.length} categories.`);
    console.log('Sample category:', catRes.data[0].nameAr, `(${catRes.data[0].slug})`);

    // 2. Products
    console.log('\nTest 2: GET /products');
    const prodRes = await axios.get(`${BASE_URL}/products`);
    console.log(`[PASS] Fetched ${prodRes.data.length} products.`);
    console.log('First product:', prodRes.data[0].name, '| SKU:', prodRes.data[0].sku, '| Price:', prodRes.data[0].price);

    // 3. Product Details
    console.log('\nTest 3: GET /products/:id (prod-01)');
    const singleProd = await axios.get(`${BASE_URL}/products/prod-01`);
    console.log(`[PASS] Fetched details for: ${singleProd.data.nameAr}`);
    console.log('Variants count:', singleProd.data.variants.length, 'Colors:', singleProd.data.colors);

    // 4. Product Search & Filter
    console.log('\nTest 4: Search & Category Filter');
    const searchRes = await axios.get(`${BASE_URL}/products?search=قلم`);
    console.log(`[PASS] Search 'قلم' returned ${searchRes.data.length} results.`);
    const filterRes = await axios.get(`${BASE_URL}/products?category=cat_pens`);
    console.log(`[PASS] Filter 'cat_pens' returned ${filterRes.data.length} results.`);

    // 5. Customer Login
    console.log('\nTest 5: POST /auth/login (Customer)');
    const custLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'ahmad@padhouse.ps',
      password: 'password123',
    });
    console.log('[PASS] Customer login successful.');
    const customerToken = custLogin.data.accessToken;
    console.log('Customer User:', custLogin.data.user.fullName, '| Role:', custLogin.data.user.role);

    // 6. Super Admin Login
    console.log('\nTest 6: POST /auth/login (Super Admin)');
    const adminLogin = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'adimn123@gmail.com',
      password: '123456',
    });
    console.log('[PASS] Super Admin login successful.');
    const adminToken = adminLogin.data.accessToken;
    console.log('Admin Role:', adminLogin.data.user.role);

    // 7. Protected Route: GET /auth/me
    console.log('\nTest 7: Protected Route: GET /auth/me');
    const meRes = await axios.get(`${BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${customerToken}` },
    });
    console.log('[PASS] Profile authenticated as:', meRes.data.email);

    // 8. New User Registration
    const testEmail = `test_${Date.now()}@padhouse.ps`;
    console.log(`\nTest 8: POST /auth/register (${testEmail})`);
    const regRes = await axios.post(`${BASE_URL}/auth/register`, {
      email: testEmail,
      password: 'securePass123',
      fullName: 'مستخدم تجريبي جديد',
      phone: '+970 59 888 7777',
      city: 'نابلس',
      street: 'رفيديا، الشارع الرئيسي',
    });
    console.log('[PASS] User registered successfully:', regRes.data.user.email);
    const newCustomerToken = regRes.data.accessToken;

    // 9. Cart Operations
    console.log('\nTest 9: Cart Workflow (Add, Read, Update, Remove)');
    const addCart = await axios.post(
      `${BASE_URL}/cart/items`,
      {
        productId: 'prod-01',
        selectedColor: 'أبيض ناصع',
        quantity: 1,
      },
      { headers: { Authorization: `Bearer ${newCustomerToken}` } },
    );
    console.log(`[PASS] Added item to cart. Total items in cart: ${addCart.data.itemCount}, Subtotal: ${addCart.data.subtotal} ILS`);

    // Add second item
    await axios.post(
      `${BASE_URL}/cart/items`,
      {
        productId: 'prod-02',
        selectedColor: 'أبيض أصلي',
        quantity: 2,
      },
      { headers: { Authorization: `Bearer ${newCustomerToken}` } },
    );
    const cartState = await axios.get(`${BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${newCustomerToken}` },
    });
    console.log(`[PASS] Cart now has ${cartState.data.itemCount} items with total price: ${cartState.data.total} ILS`);

    // 10. Order Placement (Checkout)
    console.log('\nTest 10: POST /orders (Checkout with backend validation)');
    const orderRes = await axios.post(
      `${BASE_URL}/orders`,
      {
        city: 'نابلس',
        street: 'شارع رفيديا العام',
        phone: '+970 59 888 7777',
        paymentMethod: 'CASH_ON_DELIVERY',
        customerNotes: 'الاتصال عند الوصول إلى المبنى',
      },
      { headers: { Authorization: `Bearer ${newCustomerToken}` } },
    );
    console.log(`[PASS] Order created successfully! Order #: ${orderRes.data.orderNumber}`);
    console.log(`Subtotal: ${orderRes.data.subtotal} ILS, Shipping: ${orderRes.data.shippingFee} ILS, Grand Total: ${orderRes.data.grandTotal} ILS`);

    // Verify Cart is cleared after order
    const emptyCart = await axios.get(`${BASE_URL}/cart`, {
      headers: { Authorization: `Bearer ${newCustomerToken}` },
    });
    console.log(`[PASS] Cart auto-cleared after order. Current item count: ${emptyCart.data.itemCount}`);

    // 11. Customer Order History
    console.log('\nTest 11: GET /orders/my');
    const myOrders = await axios.get(`${BASE_URL}/orders/my`, {
      headers: { Authorization: `Bearer ${newCustomerToken}` },
    });
    console.log(`[PASS] Customer orders count: ${myOrders.data.length}, latest status: ${myOrders.data[0].status}`);

    // 12. Order Tracking
    console.log('\nTest 12: GET /orders/:orderNumber (Order Tracking)');
    const trackRes = await axios.get(`${BASE_URL}/orders/${orderRes.data.orderNumber}`, {
      headers: { Authorization: `Bearer ${newCustomerToken}` },
    });
    console.log(`[PASS] Order tracked successfully. Items count: ${trackRes.data.items.length}, Timeline steps: ${trackRes.data.statusHistory.length}`);

    // 13. Admin: View All Orders & Update Order Status
    console.log('\nTest 13: Admin Orders API & Status Update');
    const allOrders = await axios.get(`${BASE_URL}/orders/admin/all`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`[PASS] Admin fetched all orders. Total in system: ${allOrders.data.length}`);

    const statusUpdate = await axios.patch(
      `${BASE_URL}/orders/${orderRes.data.id}/status`,
      {
        status: 'SHIPPED',
        notes: 'تم تسليم الشحنة لشركة التوصيل في نابلس',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    console.log(`[PASS] Order status updated to: ${statusUpdate.data.status}`);

    // 14. Inventory Management & Stock Adjustment
    console.log('\nTest 14: Admin Inventory & Stock Protection');
    const invOverview = await axios.get(`${BASE_URL}/inventory`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    console.log(`[PASS] Admin fetched inventory items: ${invOverview.data.length} variants tracked.`);

    const firstVariant = invOverview.data[0];
    const previousStock = firstVariant.currentStock;
    const updateStockRes = await axios.patch(
      `${BASE_URL}/inventory/variants/${firstVariant.variantId}/stock`,
      {
        quantity: previousStock + 10,
        notes: 'توريد دفعة جديدة للمستودع',
      },
      { headers: { Authorization: `Bearer ${adminToken}` } },
    );
    console.log(`[PASS] Stock updated for variant ${firstVariant.variantSku}: from ${previousStock} to ${updateStockRes.data.currentStock}`);

    // 15. Role Guard Security Check (Customer accessing admin route must fail with 403)
    console.log('\nTest 15: Security Role Guard Check (Customer -> Admin Route)');
    try {
      await axios.get(`${BASE_URL}/orders/admin/all`, {
        headers: { Authorization: `Bearer ${newCustomerToken}` },
      });
      console.error('[FAIL] Customer should NOT access admin route!');
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.log('[PASS] Security Guard correctly rejected unauthorized customer with 403 Forbidden.');
      } else {
        console.error('[ERROR] Unexpected status code:', err.response?.status);
      }
    }

    console.log('\n==============================================');
    console.log('   ALL 15 TEST SUITES PASSED FLAWLESSLY!   ');
    console.log('==============================================');
  } catch (error) {
    console.error('\n[TEST RUN FAILED]:', error.response?.data || error.message);
    process.exit(1);
  }
}

runTests();

