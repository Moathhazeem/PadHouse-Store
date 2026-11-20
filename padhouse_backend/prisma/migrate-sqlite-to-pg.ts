/**
 * SQLite → PostgreSQL Data Migration Script
 * Usage: npx ts-node prisma/migrate-sqlite-to-pg.ts
 */

import * as path from 'path';
import Database = require('better-sqlite3');
import { PrismaClient } from '@prisma/client';

const SQLITE_PATH = path.join(__dirname, 'dev.db');
const sqlite = new Database(SQLITE_PATH, { readonly: true });
const prisma = new PrismaClient();

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toDate(val: unknown): Date | null {
  if (val === null || val === undefined) return null;
  if (val instanceof Date) return val;
  if (typeof val === 'number') return new Date(val);
  if (typeof val === 'string') {
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

function toDateRequired(val: unknown): Date {
  const d = toDate(val);
  if (!d) throw new Error(`Expected a date but got: ${val}`);
  return d;
}

function parseJsonField(val: unknown): any {
  if (val === null || val === undefined) return null;
  if (typeof val === 'object') return val;
  if (typeof val === 'string') {
    try { return JSON.parse(val); } catch { return null; }
  }
  return null;
}

function parseStringArray(val: unknown): string[] {
  if (Array.isArray(val)) return val.map(String);
  const parsed = parseJsonField(val);
  if (Array.isArray(parsed)) return parsed.map(String);
  if (typeof val === 'string' && val.trim()) return [val];
  return [];
}

function toDecimal(val: unknown): any {
  if (val === null || val === undefined) return null;
  return val;
}

function allRows(table: string): any[] {
  return sqlite.prepare(`SELECT * FROM "${table}"`).all() as any[];
}

function countRows(table: string): number {
  const result = sqlite.prepare(`SELECT COUNT(*) as cnt FROM "${table}"`).get() as any;
  return result.cnt as number;
}

async function pgCount(model: any): Promise<number> {
  return model.count();
}

// ─── Migration table helpers ──────────────────────────────────────────────────

async function migrate(
  tableName: string,
  pgModel: any,
  transform: (row: any) => any,
) {
  const rows = allRows(tableName);
  const sqliteCount = rows.length;
  console.log(`\n[${tableName}] SQLite rows: ${sqliteCount}`);

  if (sqliteCount === 0) {
    console.log(`  → Skipping (empty table)`);
    return;
  }

  const data = rows.map(transform);
  // Insert in batches of 100
  const batchSize = 100;
  let inserted = 0;
  for (let i = 0; i < data.length; i += batchSize) {
    const batch = data.slice(i, i + batchSize);
    const result = await pgModel.createMany({ data: batch, skipDuplicates: true });
    inserted += result.count;
  }

  const pgRows = await pgCount(pgModel);
  console.log(`  → Inserted: ${inserted} | PG total: ${pgRows}`);
  if (pgRows < sqliteCount) {
    console.warn(`  ⚠ Count mismatch! Expected ${sqliteCount}, got ${pgRows}`);
  } else {
    console.log(`  ✓ Count verified`);
  }
}

// ─── Main migration ───────────────────────────────────────────────────────────

async function main() {
  console.log('=== SQLite → PostgreSQL Data Migration ===');
  console.log(`SQLite: ${SQLITE_PATH}`);
  console.log('Starting...\n');

  // Print SQLite counts
  const tables = [
    'User', 'RefreshToken', 'CustomerProfile', 'Address',
    'Category', 'Product', 'ProductImage', 'ProductVariant',
    'Inventory', 'InventoryMovement', 'Cart', 'CartItem',
    'Order', 'OrderItem', 'OrderStatusHistory', 'Review',
    'Warranty', 'Coupon', 'CouponRedemption',
    'Competitor', 'CompetitorProductMatch', 'CompetitorPriceHistory', 'CompetitorPromotion',
    'SocialAccount', 'SocialAnalyticsSnapshot', 'ContentCalendarItem',
    'AutomationLog', 'AuditLog',
    'Bundle', 'BundleItem', 'FlashSale', 'FlashSaleItem', 'GiftCard',
    'LoyaltyAccount', 'LoyaltyTransaction', 'Referral',
    'WishlistItem', 'RecentlyViewed', 'BackInStockAlert',
  ];

  console.log('SQLite record counts:');
  for (const t of tables) {
    try {
      console.log(`  ${t}: ${countRows(t)}`);
    } catch {
      console.log(`  ${t}: (table not found)`);
    }
  }
  console.log('');

  // ── 1. User ──
  await migrate('User', prisma.user, (r) => ({
    id: r.id,
    email: r.email,
    passwordHash: r.passwordHash,
    fullName: r.fullName,
    phone: r.phone ?? null,
    role: r.role ?? 'CUSTOMER',
    isActive: r.isActive === 1 || r.isActive === true,
    createdAt: toDateRequired(r.createdAt),
    updatedAt: toDateRequired(r.updatedAt),
  }));

  // ── 2. RefreshToken ──
  await migrate('RefreshToken', prisma.refreshToken, (r) => ({
    id: r.id,
    token: r.token,
    userId: r.userId,
    isRevoked: r.isRevoked === 1 || r.isRevoked === true,
    expiresAt: toDateRequired(r.expiresAt),
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 3. CustomerProfile ──
  await migrate('CustomerProfile', prisma.customerProfile, (r) => ({
    id: r.id,
    userId: r.userId,
    preferredLocale: r.preferredLocale ?? 'ar',
    avatarUrl: r.avatarUrl ?? null,
    createdAt: toDateRequired(r.createdAt),
    updatedAt: toDateRequired(r.updatedAt),
  }));

  // ── 4. Address ──
  await migrate('Address', prisma.address, (r) => ({
    id: r.id,
    customerProfileId: r.customerProfileId,
    city: r.city,
    street: r.street,
    building: r.building ?? null,
    floor: r.floor ?? null,
    isDefault: r.isDefault === 1 || r.isDefault === true,
    phone: r.phone,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 5. Category ──
  await migrate('Category', prisma.category, (r) => ({
    id: r.id,
    slug: r.slug,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
    description: r.description ?? null,
    imageUrl: r.imageUrl ?? null,
    displayOrder: r.displayOrder ?? 0,
    isActive: r.isActive === 1 || r.isActive === true,
    createdAt: toDateRequired(r.createdAt),
    updatedAt: toDateRequired(r.updatedAt),
  }));

  // ── 6. Product ──
  await migrate('Product', prisma.product, (r) => ({
    id: r.id,
    sku: r.sku,
    nameAr: r.nameAr,
    nameEn: r.nameEn,
    descriptionAr: r.descriptionAr,
    descriptionEn: r.descriptionEn,
    categoryId: r.categoryId,
    basePrice: toDecimal(r.basePrice),
    salePrice: r.salePrice != null ? toDecimal(r.salePrice) : null,
    isFeatured: r.isFeatured === 1 || r.isFeatured === true,
    isActive: r.isActive === 1 || r.isActive === true,
    // Convert JSON string array to native PG array
    ipadCompatibility: parseStringArray(r.ipadCompatibility),
    warrantyMonths: r.warrantyMonths ?? 12,
    createdAt: toDateRequired(r.createdAt),
    updatedAt: toDateRequired(r.updatedAt),
  }));

  // ── 7. ProductImage ──
  await migrate('ProductImage', prisma.productImage, (r) => ({
    id: r.id,
    productId: r.productId,
    url: r.url,
    isPrimary: r.isPrimary === 1 || r.isPrimary === true,
    displayOrder: r.displayOrder ?? 0,
  }));

  // ── 8. ProductVariant ──
  await migrate('ProductVariant', prisma.productVariant, (r) => ({
    id: r.id,
    productId: r.productId,
    sku: r.sku,
    colorNameAr: r.colorNameAr,
    colorNameEn: r.colorNameEn,
    colorHex: r.colorHex ?? null,
    material: r.material ?? null,
    priceDelta: toDecimal(r.priceDelta ?? 0),
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 9. Inventory ──
  await migrate('Inventory', prisma.inventory, (r) => ({
    id: r.id,
    variantId: r.variantId,
    currentStock: r.currentStock ?? 0,
    minThreshold: r.minThreshold ?? 5,
    costPrice: toDecimal(r.costPrice),
    lastRestockDate: toDate(r.lastRestockDate),
    updatedAt: toDateRequired(r.updatedAt),
  }));

  // ── 10. InventoryMovement ──
  await migrate('InventoryMovement', prisma.inventoryMovement, (r) => ({
    id: r.id,
    inventoryId: r.inventoryId,
    quantity: r.quantity,
    type: r.type,
    notes: r.notes ?? null,
    actorId: r.actorId ?? null,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 11. Cart ──
  await migrate('Cart', prisma.cart, (r) => ({
    id: r.id,
    customerProfileId: r.customerProfileId,
    couponCode: r.couponCode ?? null,
    discountAmount: toDecimal(r.discountAmount ?? 0),
    updatedAt: toDateRequired(r.updatedAt),
  }));

  // ── 12. CartItem ──
  await migrate('CartItem', prisma.cartItem, (r) => ({
    id: r.id,
    cartId: r.cartId,
    productId: r.productId,
    variantId: r.variantId,
    quantity: r.quantity ?? 1,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 13. Order ──
  await migrate('Order', prisma.order, (r) => ({
    id: r.id,
    orderNumber: r.orderNumber,
    userId: r.userId,
    addressId: r.addressId,
    status: r.status ?? 'PENDING',
    paymentMethod: r.paymentMethod ?? 'CASH_ON_DELIVERY',
    paymentStatus: r.paymentStatus ?? 'PENDING',
    subtotal: toDecimal(r.subtotal),
    shippingFee: toDecimal(r.shippingFee),
    discountTotal: toDecimal(r.discountTotal ?? 0),
    giftCardCode: r.giftCardCode ?? null,
    giftCardDiscount: toDecimal(r.giftCardDiscount ?? 0),
    grandTotal: toDecimal(r.grandTotal),
    internalNotes: r.internalNotes ?? null,
    customerNotes: r.customerNotes ?? null,
    createdAt: toDateRequired(r.createdAt),
    updatedAt: toDateRequired(r.updatedAt),
  }));

  // ── 14. OrderItem ──
  await migrate('OrderItem', prisma.orderItem, (r) => ({
    id: r.id,
    orderId: r.orderId,
    productId: r.productId,
    variantId: r.variantId,
    unitPrice: toDecimal(r.unitPrice),
    quantity: r.quantity,
    totalPrice: toDecimal(r.totalPrice),
  }));

  // ── 15. OrderStatusHistory ──
  await migrate('OrderStatusHistory', prisma.orderStatusHistory, (r) => ({
    id: r.id,
    orderId: r.orderId,
    status: r.status,
    notes: r.notes ?? null,
    updatedBy: r.updatedBy ?? null,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 16. Review ──
  await migrate('Review', prisma.review, (r) => ({
    id: r.id,
    productId: r.productId,
    customerProfileId: r.customerProfileId,
    rating: r.rating,
    comment: r.comment ?? null,
    isVerifiedPurchase: r.isVerifiedPurchase === 1 || r.isVerifiedPurchase === true,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 17. Warranty ──
  await migrate('Warranty', prisma.warranty, (r) => ({
    id: r.id,
    orderId: r.orderId,
    productId: r.productId,
    customerProfileId: r.customerProfileId,
    serialNumber: r.serialNumber ?? null,
    months: r.months,
    startsAt: toDateRequired(r.startsAt),
    expiresAt: toDateRequired(r.expiresAt),
    status: r.status ?? 'ACTIVE',
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 18. Coupon ──
  await migrate('Coupon', prisma.coupon, (r) => ({
    id: r.id,
    code: r.code,
    type: r.type ?? 'FIXED',
    value: toDecimal(r.value ?? 0),
    minSubtotal: toDecimal(r.minSubtotal ?? 0),
    maxDiscount: r.maxDiscount != null ? toDecimal(r.maxDiscount) : null,
    usageLimit: r.usageLimit ?? null,
    usedCount: r.usedCount ?? 0,
    perCustomerLimit: r.perCustomerLimit ?? 1,
    startsAt: toDate(r.startsAt),
    endsAt: toDate(r.endsAt),
    descriptionAr: r.descriptionAr ?? null,
    isActive: r.isActive === 1 || r.isActive === true,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 19. CouponRedemption ──
  await migrate('CouponRedemption', prisma.couponRedemption, (r) => ({
    id: r.id,
    couponId: r.couponId,
    customerProfileId: r.customerProfileId,
    orderId: r.orderId ?? null,
    amount: toDecimal(r.amount),
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 20. Competitor ──
  await migrate('Competitor', prisma.competitor, (r) => ({
    id: r.id,
    name: r.name,
    websiteUrl: r.websiteUrl ?? null,
    instagramHandle: r.instagramHandle ?? null,
    notes: r.notes ?? null,
    isActive: r.isActive === 1 || r.isActive === true,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 21. CompetitorProductMatch ──
  await migrate('CompetitorProductMatch', prisma.competitorProductMatch, (r) => ({
    id: r.id,
    competitorId: r.competitorId,
    padhouseProdId: r.padhouseProdId,
    externalTitle: r.externalTitle,
    productUrl: r.productUrl ?? null,
    currentPrice: toDecimal(r.currentPrice),
    previousPrice: r.previousPrice != null ? toDecimal(r.previousPrice) : null,
    isAvailable: r.isAvailable === 1 || r.isAvailable === true,
    isVerified: r.isVerified === 1 || r.isVerified === true,
    lastCheckedAt: toDateRequired(r.lastCheckedAt),
  }));

  // ── 22. CompetitorPriceHistory ──
  await migrate('CompetitorPriceHistory', prisma.competitorPriceHistory, (r) => ({
    id: r.id,
    matchId: r.matchId,
    recordedPrice: toDecimal(r.recordedPrice),
    discountTag: r.discountTag ?? null,
    capturedAt: toDateRequired(r.capturedAt),
  }));

  // ── 23. CompetitorPromotion ──
  await migrate('CompetitorPromotion', prisma.competitorPromotion, (r) => ({
    id: r.id,
    competitorId: r.competitorId,
    title: r.title,
    promoType: r.promoType,
    discountText: r.discountText ?? null,
    startDate: toDate(r.startDate),
    endDate: toDate(r.endDate),
    isActive: r.isActive === 1 || r.isActive === true,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 24. SocialAccount ──
  await migrate('SocialAccount', prisma.socialAccount, (r) => ({
    id: r.id,
    platform: r.platform,
    accountHandle: r.accountHandle,
    followersCount: r.followersCount ?? 0,
    followingCount: r.followingCount ?? 0,
    postsCount: r.postsCount ?? 0,
    updatedAt: toDateRequired(r.updatedAt),
  }));

  // ── 25. SocialAnalyticsSnapshot ──
  await migrate('SocialAnalyticsSnapshot', prisma.socialAnalyticsSnapshot, (r) => ({
    id: r.id,
    accountId: r.accountId,
    recordedDate: toDateRequired(r.recordedDate),
    followers: r.followers,
    reach: r.reach,
    impressions: r.impressions,
    engagementRate: toDecimal(r.engagementRate),
    likes: r.likes,
    comments: r.comments,
    shares: r.shares,
    saves: r.saves,
    profileVisits: r.profileVisits,
  }));

  // ── 26. ContentCalendarItem ──
  await migrate('ContentCalendarItem', prisma.contentCalendarItem, (r) => ({
    id: r.id,
    title: r.title,
    captionAr: r.captionAr,
    captionEn: r.captionEn ?? null,
    hashtags: parseStringArray(r.hashtags),
    platforms: parseStringArray(r.platforms),
    mediaUrls: parseStringArray(r.mediaUrls),
    status: r.status ?? 'IDEA',
    scheduledFor: toDate(r.scheduledFor),
    publishedAt: toDate(r.publishedAt),
    assignedToId: r.assignedToId ?? null,
    internalNotes: r.internalNotes ?? null,
    createdAt: toDateRequired(r.createdAt),
    updatedAt: toDateRequired(r.updatedAt),
  }));

  // ── 27. AutomationLog ──
  await migrate('AutomationLog', prisma.automationLog, (r) => ({
    id: r.id,
    workflowName: r.workflowName,
    status: r.status,
    payload: parseJsonField(r.payload),
    response: parseJsonField(r.response),
    executedAt: toDateRequired(r.executedAt),
  }));

  // ── 28. AuditLog ──
  await migrate('AuditLog', prisma.auditLog, (r) => ({
    id: r.id,
    userId: r.userId ?? null,
    action: r.action,
    targetId: r.targetId ?? null,
    meta: parseJsonField(r.meta),
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 29. Bundle ──
  await migrate('Bundle', prisma.bundle, (r) => ({
    id: r.id,
    slug: r.slug,
    titleAr: r.titleAr,
    descriptionAr: r.descriptionAr ?? null,
    discountType: r.discountType ?? 'PERCENT',
    discountValue: toDecimal(r.discountValue ?? 0),
    imageUrl: r.imageUrl ?? null,
    displayOrder: r.displayOrder ?? 0,
    isActive: r.isActive === 1 || r.isActive === true,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 30. BundleItem ──
  await migrate('BundleItem', prisma.bundleItem, (r) => ({
    id: r.id,
    bundleId: r.bundleId,
    productId: r.productId,
    quantity: r.quantity ?? 1,
  }));

  // ── 31. FlashSale ──
  await migrate('FlashSale', prisma.flashSale, (r) => ({
    id: r.id,
    titleAr: r.titleAr,
    discountPercent: r.discountPercent,
    startsAt: toDateRequired(r.startsAt),
    endsAt: toDateRequired(r.endsAt),
    isActive: r.isActive === 1 || r.isActive === true,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 32. FlashSaleItem ──
  await migrate('FlashSaleItem', prisma.flashSaleItem, (r) => ({
    id: r.id,
    flashSaleId: r.flashSaleId,
    productId: r.productId,
  }));

  // ── 33. GiftCard ──
  await migrate('GiftCard', prisma.giftCard, (r) => ({
    id: r.id,
    code: r.code,
    initialBalance: toDecimal(r.initialBalance),
    balance: toDecimal(r.balance),
    currency: r.currency ?? 'ILS',
    isActive: r.isActive === 1 || r.isActive === true,
    expiresAt: toDate(r.expiresAt),
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 34. LoyaltyAccount ──
  await migrate('LoyaltyAccount', prisma.loyaltyAccount, (r) => ({
    id: r.id,
    customerProfileId: r.customerProfileId,
    points: r.points ?? 0,
    tier: r.tier ?? 'BRONZE',
    updatedAt: toDateRequired(r.updatedAt),
  }));

  // ── 35. LoyaltyTransaction ──
  await migrate('LoyaltyTransaction', prisma.loyaltyTransaction, (r) => ({
    id: r.id,
    loyaltyAccountId: r.loyaltyAccountId,
    points: r.points,
    type: r.type,
    notes: r.notes ?? null,
    orderId: r.orderId ?? null,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 36. Referral ──
  await migrate('Referral', prisma.referral, (r) => ({
    id: r.id,
    ownerProfileId: r.ownerProfileId,
    code: r.code,
    refereeEmail: r.refereeEmail ?? null,
    status: r.status ?? 'PENDING',
    rewardPoints: r.rewardPoints ?? 50,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 37. WishlistItem ──
  await migrate('WishlistItem', prisma.wishlistItem, (r) => ({
    id: r.id,
    customerProfileId: r.customerProfileId,
    productId: r.productId,
    createdAt: toDateRequired(r.createdAt),
  }));

  // ── 38. RecentlyViewed ──
  await migrate('RecentlyViewed', prisma.recentlyViewed, (r) => ({
    id: r.id,
    customerProfileId: r.customerProfileId,
    productId: r.productId,
    viewedAt: toDateRequired(r.viewedAt),
  }));

  // ── 39. BackInStockAlert ──
  await migrate('BackInStockAlert', prisma.backInStockAlert, (r) => ({
    id: r.id,
    customerProfileId: r.customerProfileId ?? null,
    productId: r.productId,
    variantId: r.variantId ?? null,
    email: r.email ?? null,
    phone: r.phone ?? null,
    isNotified: r.isNotified === 1 || r.isNotified === true,
    createdAt: toDateRequired(r.createdAt),
  }));

  console.log('\n=== Migration Complete ===');
  console.log('\nFinal PostgreSQL counts:');
  const models = [
    ['User', prisma.user],
    ['RefreshToken', prisma.refreshToken],
    ['CustomerProfile', prisma.customerProfile],
    ['Address', prisma.address],
    ['Category', prisma.category],
    ['Product', prisma.product],
    ['ProductImage', prisma.productImage],
    ['ProductVariant', prisma.productVariant],
    ['Inventory', prisma.inventory],
    ['InventoryMovement', prisma.inventoryMovement],
    ['Cart', prisma.cart],
    ['CartItem', prisma.cartItem],
    ['Order', prisma.order],
    ['OrderItem', prisma.orderItem],
    ['OrderStatusHistory', prisma.orderStatusHistory],
    ['Review', prisma.review],
    ['Warranty', prisma.warranty],
    ['Coupon', prisma.coupon],
    ['CouponRedemption', prisma.couponRedemption],
    ['Bundle', prisma.bundle],
    ['BundleItem', prisma.bundleItem],
    ['FlashSale', prisma.flashSale],
    ['FlashSaleItem', prisma.flashSaleItem],
    ['GiftCard', prisma.giftCard],
    ['LoyaltyAccount', prisma.loyaltyAccount],
    ['LoyaltyTransaction', prisma.loyaltyTransaction],
    ['Referral', prisma.referral],
    ['WishlistItem', prisma.wishlistItem],
    ['RecentlyViewed', prisma.recentlyViewed],
    ['BackInStockAlert', prisma.backInStockAlert],
  ] as const;

  for (const [name, model] of models) {
    const pg = await (model as any).count();
    let sq = 0;
    try { sq = countRows(name); } catch {}
    const ok = pg >= sq ? '✓' : '⚠';
    console.log(`  ${ok} ${name}: SQLite=${sq}, PG=${pg}`);
  }
}

main()
  .catch((e) => {
    console.error('Migration failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    sqlite.close();
    await prisma.$disconnect();
  });
