import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { PurchaseOrdersService } from '../purchase-orders/purchase-orders.service';
import { AiInventoryService } from './ai-inventory.service';

/**
 * Purchase-management AI capabilities.
 *
 * These drive the real `AiInventoryService` against an in-memory database that
 * mimics the Prisma read surface (products + variants/inventory, purchase-order
 * lines, order lines, suppliers). The purchase-order service is stubbed only at
 * its write boundary (`create`) so we can assert exactly what the assistant
 * persists — and, just as importantly, that it never calls approve / send /
 * receive.
 */

const DAY = 86_400_000;
const daysAgo = (n: number) => new Date(Date.now() - n * DAY);

describe('AiInventoryService', () => {
  let service: AiInventoryService;
  let purchaseOrders: {
    create: jest.Mock;
    submit: jest.Mock;
    approve: jest.Mock;
    send: jest.Mock;
    receive: jest.Mock;
  };

  let products: any[];
  let poLines: any[];
  let orderLines: any[];
  let suppliers: any[];

  const prismaMock = {
    product: { findMany: jest.fn(async () => products) },
    purchaseOrderItem: { findMany: jest.fn(async () => poLines) },
    orderItem: { findMany: jest.fn(async () => orderLines) },
    supplier: {
      findMany: jest.fn(async () => suppliers),
      findUnique: jest.fn(async ({ where }: any) => suppliers.find((s) => s.id === where.id) ?? null),
    },
    automationLog: { create: jest.fn(async () => ({})) },
  };

  // No Gemini key and no n8n webhook → deterministic Arabic text, no network.
  const configMock = { get: jest.fn(() => undefined) } as unknown as ConfigService;

  let draftSeq: number;

  beforeEach(() => {
    draftSeq = 0;

    products = [
      // Low, no inbound → needs restocking; has purchase history with sup-1.
      {
        id: 'prod-case',
        sku: 'CASE-01',
        nameAr: 'غلاف آيباد',
        stock: 2,
        minStock: 5,
        maxStock: 50,
        categoryId: 'cat-1',
        category: { id: 'cat-1', nameAr: 'الأغلفة' },
        variants: [{ inventory: { currentStock: 2, costPrice: 10 } }],
      },
      // Out of stock, has an APPROVED order (inbound) and history with sup-2.
      {
        id: 'prod-kb',
        sku: 'KB-01',
        nameAr: 'لوحة مفاتيح',
        stock: 0,
        minStock: 5,
        maxStock: 20,
        categoryId: 'cat-1',
        category: { id: 'cat-1', nameAr: 'الأغلفة' },
        variants: [{ inventory: { currentStock: 0, costPrice: 25 } }],
      },
      // Low BUT already covered by a pending purchase order → must be suppressed.
      {
        id: 'prod-covered',
        sku: 'CVR-01',
        nameAr: 'غطاء واقٍ',
        stock: 3,
        minStock: 5,
        maxStock: 10,
        categoryId: 'cat-1',
        category: { id: 'cat-1', nameAr: 'الأغلفة' },
        variants: [{ inventory: { currentStock: 3, costPrice: 8 } }],
      },
      // Healthy → never suggested.
      {
        id: 'prod-healthy',
        sku: 'HLT-01',
        nameAr: 'منتج متوفر',
        stock: 50,
        minStock: 5,
        maxStock: 100,
        categoryId: 'cat-1',
        category: { id: 'cat-1', nameAr: 'الأغلفة' },
        variants: [{ inventory: { currentStock: 50, costPrice: 12 } }],
      },
      // Low with no recorded cost → suggested but flagged needsPricing.
      {
        id: 'prod-nocost',
        sku: 'NCOST-01',
        nameAr: 'منتج بلا تكلفة',
        stock: 1,
        minStock: 5,
        maxStock: 10,
        categoryId: 'cat-1',
        category: { id: 'cat-1', nameAr: 'الأغلفة' },
        variants: [{ inventory: { currentStock: 1, costPrice: 0 } }],
      },
      // Out of stock with NO purchase history → exercises the SUGGESTED path.
      {
        id: 'prod-new',
        sku: 'NEW-01',
        nameAr: 'منتج جديد',
        stock: 0,
        minStock: 5,
        maxStock: 30,
        categoryId: 'cat-1',
        category: { id: 'cat-1', nameAr: 'الأغلفة' },
        variants: [{ inventory: { currentStock: 0, costPrice: 15 } }],
      },
    ];

    poLines = [
      // Historic (received) order that ties prod-case to sup-1.
      {
        productId: 'prod-case',
        orderedQuantity: 10,
        receivedQuantity: 10,
        purchaseOrder: {
          id: 'po-old',
          status: 'RECEIVED',
          grandTotal: 500,
          createdAt: daysAgo(40),
          supplierId: 'sup-1',
        },
      },
      // Pending order that already covers prod-covered's shortfall.
      {
        productId: 'prod-covered',
        orderedQuantity: 20,
        receivedQuantity: 0,
        purchaseOrder: {
          id: 'po-pending',
          status: 'PENDING_APPROVAL',
          grandTotal: 160,
          createdAt: daysAgo(3),
          supplierId: 'sup-1',
        },
      },
      // Committed-but-not-received order → outstanding (inbound) quantity.
      {
        productId: 'prod-kb',
        orderedQuantity: 12,
        receivedQuantity: 4,
        purchaseOrder: {
          id: 'po-approved',
          status: 'APPROVED',
          grandTotal: 300,
          createdAt: daysAgo(6),
          supplierId: 'sup-2',
        },
      },
      // Historic order that ties prod-nocost to sup-2.
      {
        productId: 'prod-nocost',
        orderedQuantity: 5,
        receivedQuantity: 5,
        purchaseOrder: {
          id: 'po-nocost',
          status: 'RECEIVED',
          grandTotal: 90,
          createdAt: daysAgo(20),
          supplierId: 'sup-2',
        },
      },
    ];

    orderLines = [{ productId: 'prod-case', quantity: 30 }];

    suppliers = [
      {
        id: 'sup-1',
        name: 'مورد ألف',
        company: 'شركة ألف',
        phone: '0500000001',
        email: 'a@supplier.test',
        status: 'ACTIVE',
      },
      {
        id: 'sup-2',
        name: 'مورد باء',
        company: 'شركة باء',
        phone: '0500000002',
        email: 'b@supplier.test',
        status: 'ACTIVE',
      },
    ];

    // `create` returns the same detail shape `PurchaseOrdersService.toDetail`
    // produces — always as a DRAFT.
    purchaseOrders = {
      create: jest.fn(async (dto: any) => {
        draftSeq += 1;
        const supplier = suppliers.find((s) => s.id === dto.supplierId);
        const items = dto.items.map((line: any) => {
          const product = products.find((p) => p.id === line.productId);
          const lineSubtotal = line.orderedQuantity * line.unitCost;
          return {
            productId: line.productId,
            productName: product?.nameAr ?? line.productId,
            sku: product?.sku ?? '',
            orderedQuantity: line.orderedQuantity,
            unitCost: line.unitCost,
            lineSubtotal,
          };
        });
        return {
          id: `draft-${draftSeq}`,
          orderNumber: `PO-2026-000${draftSeq}`,
          status: 'DRAFT',
          currency: dto.currency ?? 'ILS',
          orderDate: new Date(),
          expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
          grandTotal: items.reduce((sum: number, i: any) => sum + i.lineSubtotal, 0),
          supplier: supplier ? { id: supplier.id, name: supplier.name, company: supplier.company } : null,
          items,
        };
      }),
      submit: jest.fn(),
      approve: jest.fn(),
      send: jest.fn(),
      receive: jest.fn(),
    };

    service = new AiInventoryService(
      configMock,
      prismaMock as unknown as PrismaService,
      purchaseOrders as unknown as PurchaseOrdersService,
    );
  });

  afterEach(() => jest.clearAllMocks());

  describe('getReorderSuggestions', () => {
    it('recommends only the products that need restocking, with supplier suggestions', async () => {
      const result = await service.getReorderSuggestions();

      const ids = result.suggestions.map((s) => s.productId);
      expect(ids).toContain('prod-case');
      expect(ids).toContain('prod-kb');
      expect(ids).toContain('prod-nocost');
      expect(ids).toContain('prod-new');
      // Healthy product is never recommended.
      expect(ids).not.toContain('prod-healthy');
      // Low but already covered → suppressed from recommendations.
      expect(ids).not.toContain('prod-covered');

      const kase = result.suggestions.find((s) => s.productId === 'prod-case')!;
      expect(kase.currentStock).toBe(2);
      expect(kase.minStock).toBe(5);
      expect(kase.maxStock).toBe(50);
      expect(kase.unitsSoldWindow).toBe(30);
      expect(kase.avgDailySales).toBe(1);
      // Brings stock (2) up to the maximum (50).
      expect(kase.suggestedQuantity).toBe(48);
      expect(kase.suggestedUnitCost).toBe(10);
      expect(kase.estimatedLineCost).toBe(480);
      expect(kase.needsPricing).toBe(false);
      // Preferred supplier comes from real purchase history, not invention.
      expect(kase.preferredSupplier?.id).toBe('sup-1');
      expect(kase.preferredSupplier?.source).toBe('HISTORY');
      expect(kase.priority).toBe('HIGH');
    });

    it('deduplicates against quantities already on pending and outstanding orders', async () => {
      const result = await service.getReorderSuggestions();

      // prod-kb is out of stock but has 8 units inbound on an APPROVED order.
      const kb = result.suggestions.find((s) => s.productId === 'prod-kb')!;
      expect(kb.pendingQuantity).toBe(0);
      expect(kb.outstandingQuantity).toBe(8); // 12 ordered − 4 received
      expect(kb.inboundQuantity).toBe(8);
      expect(kb.projectedStock).toBe(8); // 0 + 8
      // Replenish to max (20) net of inbound = 12.
      expect(kb.suggestedQuantity).toBe(12);

      // prod-covered is low (3 ≤ 5) but its pending order (20) exceeds maxStock.
      const covered = result.covered.find((c) => c.productId === 'prod-covered')!;
      expect(covered.pendingQuantity).toBe(20);
      expect(covered.inboundQuantity).toBe(20);
      expect(covered.projectedStock).toBe(23);
      expect(covered.note).toContain('مغطى');
    });

    it('suggests an existing active supplier when a product has no purchase history', async () => {
      const result = await service.getReorderSuggestions();
      const fresh = result.suggestions.find((s) => s.productId === 'prod-new')!;
      // Ranked from the existing supplier records — explicitly a suggestion.
      expect(fresh.preferredSupplier?.source).toBe('SUGGESTED');
      expect(['sup-1', 'sup-2']).toContain(fresh.preferredSupplier?.id);
      expect(fresh.preferredSupplier?.isPreferred).toBe(true);
    });

    it('never invents a cost — surfaces needsPricing instead', async () => {
      const result = await service.getReorderSuggestions();
      const nocost = result.suggestions.find((s) => s.productId === 'prod-nocost')!;
      expect(nocost.suggestedUnitCost).toBe(0);
      expect(nocost.needsPricing).toBe(true);
      expect(nocost.estimatedLineCost).toBe(0);
    });

    it('aggregates KPIs from the real records', async () => {
      const result = await service.getReorderSuggestions();
      expect(result.kpis.productsAnalyzed).toBe(6);
      expect(result.kpis.productsNeedingRestock).toBe(4);
      expect(result.kpis.productsCoveredByInbound).toBe(1);
      expect(result.kpis.outOfStockCount).toBe(2);
      expect(result.kpis.windowDays).toBe(30);
      expect(result.kpis.currency).toBe('ILS');
      // case 48×10 + kb 12×25 + nocost 9×0 + new 30×15 = 1230
      expect(result.kpis.estimatedTotalCost).toBe(1230);
      expect(result.windowDays).toBe(30);
      expect(result.summary.length).toBeGreaterThan(0);
    });

    it('honours the per-product limit without changing the totals', async () => {
      const result = await service.getReorderSuggestions({ limit: 1 });
      expect(result.suggestions).toHaveLength(1);
      expect(result.kpis.productsNeedingRestock).toBe(4);
    });
  });

  describe('createDraftPurchaseOrders', () => {
    const actor = { id: 'admin-1', fullName: 'مدير المخزون' };

    it('creates DRAFT purchase orders grouped by supplier and never auto-approves', async () => {
      const result = await service.createDraftPurchaseOrders({ message: 'أنشئ أمر شراء' }, actor);

      expect(result.requiresApproval).toBe(true);
      expect(result.drafts).toHaveLength(2);
      expect(result.skipped).toHaveLength(0);

      // Every draft is a persisted DRAFT.
      for (const draft of result.drafts) {
        expect(draft.status).toBe('DRAFT');
        expect(draft.currency).toBe('ILS');
        expect(draft.items.length).toBeGreaterThan(0);
      }

      // Grouping follows real supplier history: sup-1 (new + case), sup-2 (kb + nocost).
      const sup1 = result.drafts.find((d) => d.supplier?.id === 'sup-1')!;
      const sup2 = result.drafts.find((d) => d.supplier?.id === 'sup-2')!;
      expect(sup1.items.map((i) => i.productId).sort()).toEqual(['prod-case', 'prod-new']);
      expect(sup2.items.map((i) => i.productId).sort()).toEqual(['prod-kb', 'prod-nocost']);
      expect(sup2.items.find((i) => i.productId === 'prod-nocost')!.needsPricing).toBe(true);

      // The draft is created through the shared purchase-orders service...
      expect(purchaseOrders.create).toHaveBeenCalledTimes(2);
      const firstPayload = purchaseOrders.create.mock.calls[0][0];
      expect(firstPayload.supplierId).toBe('sup-1');
      expect(firstPayload.items.every((i: any) => i.orderedQuantity > 0)).toBe(true);
      // ...and the actor is threaded through for the audit trail.
      expect(purchaseOrders.create.mock.calls[0][1]).toEqual(actor);

      // Critical actions are NEVER triggered by the assistant.
      expect(purchaseOrders.submit).not.toHaveBeenCalled();
      expect(purchaseOrders.approve).not.toHaveBeenCalled();
      expect(purchaseOrders.send).not.toHaveBeenCalled();
      expect(purchaseOrders.receive).not.toHaveBeenCalled();
    });

    it('validates an explicitly requested supplier against the database', async () => {
      await expect(
        service.createDraftPurchaseOrders({ supplierId: 'does-not-exist' }, actor),
      ).rejects.toBeInstanceOf(NotFoundException);
      expect(purchaseOrders.create).not.toHaveBeenCalled();
    });

    it('skips products that have no supplier rather than inventing one', async () => {
      suppliers = []; // No active suppliers exist in the database.
      const result = await service.createDraftPurchaseOrders({}, actor);

      expect(result.drafts).toHaveLength(0);
      expect(result.skipped).toHaveLength(4);
      expect(result.skipped.every((s) => s.reason.includes('مورد'))).toBe(true);
      expect(purchaseOrders.create).not.toHaveBeenCalled();
      expect(result.requiresApproval).toBe(true);
    });

    it('rejects requested product ids that are not actually in need of restocking', async () => {
      const result = await service.createDraftPurchaseOrders(
        { productIds: ['prod-healthy'] },
        actor,
      );

      expect(result.drafts).toHaveLength(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].productId).toBe('prod-healthy');
      expect(purchaseOrders.create).not.toHaveBeenCalled();
    });
  });
});
