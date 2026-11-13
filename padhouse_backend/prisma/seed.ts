import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

const CATEGORIES_DATA = [
  { slug: 'cat_pens', nameAr: 'الأقلام وملحقاتها', nameEn: 'Pencils & Accessories', displayOrder: 1 },
  { slug: 'cat_cases', nameAr: 'الحافظات والحقائب', nameEn: 'Cases & Sleeves', displayOrder: 2 },
  { slug: 'cat_keyboards', nameAr: 'لوحات المفاتيح', nameEn: 'Keyboards', displayOrder: 3 },
  { slug: 'cat_stands', nameAr: 'الحوامل والمساند', nameEn: 'Stands & Mounts', displayOrder: 4 },
  { slug: 'cat_chargers', nameAr: 'الشواحن والكابلات', nameEn: 'Chargers & Cables', displayOrder: 5 },
  { slug: 'cat_others', nameAr: 'إكسسوارات أخرى', nameEn: 'Other Accessories', displayOrder: 6 },
];

async function main() {
  console.log('--- Starting PadHouse Database Seeding ---');

  // 1. Seed Super Admin, Admin and Customer
  const superAdminPassword = await bcrypt.hash('123456', 10);
  const superAdmin = await prisma.user.upsert({
    where: { email: 'adimn123@gmail.com' },
    update: {
      role: 'SUPER_ADMIN',
      isActive: true,
    },
    create: {
      email: 'adimn123@gmail.com',
      passwordHash: superAdminPassword,
      fullName: 'مدير عام بادهاوس (Super Admin)',
      phone: '+970599000000',
      role: 'SUPER_ADMIN',
      isActive: true,
      customerProfile: {
        create: {
          preferredLocale: 'ar',
          cart: { create: {} },
        },
      },
    },
  });
  console.log('Created/Verified Super Admin:', superAdmin.email);

  const adminPassword = await bcrypt.hash('123456', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@padhouse.ps' },
    update: {
      role: 'ADMIN',
      isActive: true,
    },
    create: {
      email: 'admin@padhouse.ps',
      passwordHash: adminPassword,
      fullName: 'مدير عمليات المتجر (Admin)',
      phone: '+970599000001',
      role: 'ADMIN',
      isActive: true,
      customerProfile: {
        create: {
          preferredLocale: 'ar',
          cart: { create: {} },
        },
      },
    },
  });
  console.log('Created/Verified Admin:', admin.email);

  const customerPassword = await bcrypt.hash('password123', 10);
  const customer = await prisma.user.upsert({
    where: { email: 'ahmad@padhouse.ps' },
    update: {},
    create: {
      email: 'ahmad@padhouse.ps',
      passwordHash: customerPassword,
      fullName: 'أحمد الفلسطيني',
      phone: '+970 59 912 3456',
      role: 'CUSTOMER',
      customerProfile: {
        create: {
          preferredLocale: 'ar',
          addresses: {
            create: {
              city: 'رام الله والبيرة',
              street: 'الماصيون، قرب قصر الثقافة',
              phone: '+970 59 912 3456',
              isDefault: true,
            },
          },
          cart: { create: {} },
        },
      },
    },
    include: {
      customerProfile: {
        include: {
          addresses: true,
        },
      },
    },
  });
  console.log('Created/Verified Customer:', customer.email);

  // 2. Seed Categories
  const categoryMap = new Map<string, string>();
  for (const cat of CATEGORIES_DATA) {
    const record = await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        displayOrder: cat.displayOrder,
      },
      create: {
        slug: cat.slug,
        nameAr: cat.nameAr,
        nameEn: cat.nameEn,
        displayOrder: cat.displayOrder,
      },
    });
    categoryMap.set(cat.slug, record.id);
  }
  console.log(`Seeded ${categoryMap.size} official categories.`);

  // 3. Seed 21 Official Products
  const rawData = fs.readFileSync(path.join(__dirname, 'raw_products.json'), 'utf8');
  // eslint-disable-next-line @typescript-eslint/no-implied-eval
  const productsList = eval(rawData) as Array<{
    id: string;
    sku: string;
    name: string;
    categories: string[];
    price: number;
    originalPrice: number;
    stock: number;
    minThreshold: number;
    compatibility: string;
    rating: number;
    reviewsCount: number;
    image: string;
    description: string;
    colors: string[];
  }>;

  for (const p of productsList) {
    const primaryCatSlug = p.categories[0] || 'cat_others';
    const categoryId = categoryMap.get(primaryCatSlug) || categoryMap.get('cat_others')!;

    // Create or update Product
    const product = await prisma.product.upsert({
      where: { sku: p.sku },
      update: {
        nameAr: p.name,
        nameEn: p.name,
        descriptionAr: p.description,
        descriptionEn: p.description,
        basePrice: p.originalPrice || p.price,
        salePrice: p.originalPrice > p.price ? p.price : null,
        ipadCompatibility: JSON.stringify([p.compatibility]),
        categoryId,
      },
      create: {
        id: p.id,
        sku: p.sku,
        nameAr: p.name,
        nameEn: p.name,
        descriptionAr: p.description,
        descriptionEn: p.description,
        basePrice: p.originalPrice || p.price,
        salePrice: p.originalPrice > p.price ? p.price : null,
        ipadCompatibility: JSON.stringify([p.compatibility]),
        categoryId,
        images: {
          create: {
            url: p.image,
            isPrimary: true,
            displayOrder: 0,
          },
        },
      },
      include: {
        variants: true,
      },
    });

    // Seed Variants for each color
    for (let i = 0; i < p.colors.length; i++) {
      const color = p.colors[i];
      const variantSku = `${p.sku}-V${i + 1}`;
      const variant = await prisma.productVariant.upsert({
        where: { sku: variantSku },
        update: {
          colorNameAr: color,
          colorNameEn: color,
        },
        create: {
          productId: product.id,
          sku: variantSku,
          colorNameAr: color,
          colorNameEn: color,
          priceDelta: 0,
          inventory: {
            create: {
              currentStock: p.stock,
              minThreshold: p.minThreshold || 5,
              costPrice: Math.round(p.price * 0.6),
            },
          },
        },
      });
    }
  }

  console.log(`Seeded ${productsList.length} products with images, variants, and inventory.`);

  // 4. Seed Initial Order
  const defaultAddress = customer.customerProfile?.addresses[0];
  if (defaultAddress) {
    const firstProduct = await prisma.product.findUnique({
      where: { sku: 'PH-PEN-01' },
      include: { variants: true },
    });
    if (firstProduct && firstProduct.variants.length > 0) {
      await prisma.order.upsert({
        where: { orderNumber: 'PH-2026-1042' },
        update: {},
        create: {
          orderNumber: 'PH-2026-1042',
          userId: customer.id,
          addressId: defaultAddress.id,
          status: 'PREPARING',
          paymentMethod: 'CASH_ON_DELIVERY',
          paymentStatus: 'PENDING',
          subtotal: 150,
          shippingFee: 20,
          discountTotal: 0,
          grandTotal: 170,
          items: {
            create: {
              productId: firstProduct.id,
              variantId: firstProduct.variants[0].id,
              unitPrice: 120,
              quantity: 1,
              totalPrice: 120,
            },
          },
          statusHistory: {
            create: [
              { status: 'PENDING', notes: 'تم استلام الطلب' },
              { status: 'PREPARING', notes: 'قيد التجهيز في مستودع رام الله' },
            ],
          },
        },
      });
      console.log('Seeded sample order PH-2026-1042');
    }
  }

  // 5. Seed Phase 5 / E-Commerce Demo Data
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Coupons
  const coupons = [
    { code: 'WELCOME10', type: 'PERCENT', value: 10, minSubtotal: 100, maxDiscount: 50, descriptionAr: 'خصم ترحيبي 10% على أول طلب' },
    { code: 'SAVE20', type: 'FIXED', value: 20, minSubtotal: 200, descriptionAr: 'خصم 20 ₪ على الطلبات فوق 200 ₪' },
    { code: 'FREESHIP', type: 'FREE_SHIPPING', value: 0, minSubtotal: 150, descriptionAr: 'توصيل مجاني للطلبات فوق 150 ₪' },
  ];
  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: { isActive: true },
      create: {
        code: c.code,
        type: c.type,
        value: c.value,
        minSubtotal: c.minSubtotal,
        maxDiscount: c.maxDiscount ?? null,
        usageLimit: null,
        perCustomerLimit: 1,
        startsAt: now,
        endsAt: in30Days,
        descriptionAr: c.descriptionAr,
        isActive: true,
      },
    });
  }
  console.log(`Seeded ${coupons.length} demo coupons.`);

  // Gift card
  await prisma.giftCard.upsert({
    where: { code: 'GIFT-DEMO2026' },
    update: {},
    create: {
      code: 'GIFT-DEMO2026',
      initialBalance: 200,
      balance: 200,
      currency: 'ILS',
      isActive: true,
      expiresAt: in30Days,
    },
  });
  console.log('Seeded demo gift card GIFT-DEMO2026 (200 ₪).');

  // Bundle: iPad Starter Pack
  const bundleProducts = await prisma.product.findMany({
    where: { sku: { in: ['PH-PEN-01', 'PH-CAS-03', 'PH-KBD-06'] } },
  });
  if (bundleProducts.length > 0) {
    const bundle = await prisma.bundle.upsert({
      where: { slug: 'ipad-starter-pack' },
      update: { isActive: true },
      create: {
        slug: 'ipad-starter-pack',
        titleAr: 'حزمة بداية الآيباد',
        descriptionAr: 'كل ما تحتاجه لبدء استخدام الآيباد: قلم وحافظة ولوحة مفاتيح بخصم خاص.',
        discountType: 'PERCENT',
        discountValue: 15,
        displayOrder: 1,
        isActive: true,
      },
    });
    await prisma.bundleItem.deleteMany({ where: { bundleId: bundle.id } });
    for (const bp of bundleProducts) {
      await prisma.bundleItem.create({
        data: { bundleId: bundle.id, productId: bp.id, quantity: 1 },
      });
    }
    console.log(`Seeded bundle "ipad-starter-pack" with ${bundleProducts.length} items.`);
  }

  // Flash sale
  const flashProducts = await prisma.product.findMany({
    where: { sku: { in: ['PH-CAB-12', 'PH-STN-09'] } },
  });
  if (flashProducts.length > 0) {
    const existingFlash = await prisma.flashSale.findFirst({ where: { titleAr: 'تخفيضات سريعة' } });
    const flash =
      existingFlash ??
      (await prisma.flashSale.create({
        data: {
          titleAr: 'تخفيضات سريعة',
          discountPercent: 20,
          startsAt: now,
          endsAt: in30Days,
          isActive: true,
        },
      }));
    await prisma.flashSaleItem.deleteMany({ where: { flashSaleId: flash.id } });
    for (const fp of flashProducts) {
      await prisma.flashSaleItem.create({
        data: { flashSaleId: flash.id, productId: fp.id },
      });
    }
    console.log(`Seeded flash sale with ${flashProducts.length} items.`);
  }

  // Loyalty account for the demo customer
  if (customer.customerProfile) {
    await prisma.loyaltyAccount.upsert({
      where: { customerProfileId: customer.customerProfile.id },
      update: {},
      create: { customerProfileId: customer.customerProfile.id, points: 250, tier: 'BRONZE' },
    });
    console.log('Seeded loyalty account for demo customer (250 points).');
  }

  console.log('--- Database Seeding Completed Successfully ---');
}

main()
  .catch((e) => {
    console.error('Seed Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

