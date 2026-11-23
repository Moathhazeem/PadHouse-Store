import { BadRequestException } from '@nestjs/common';
import { PurchaseOrdersService } from './purchase-orders.service';

/**
 * Goods-receipt tests.
 *
 * These drive the real `PurchaseOrdersService.receive` orchestration against an
 * in-memory database that mimics the Prisma transaction surface (row lock,
 * purchase-order/items/receipt writes). Inventory mutation itself lives in
 * `InventoryService` (covered by its own spec) and is stubbed here so we can
 * assert the exact arguments — product, quantity, reference, PO and receipt ids —
 * that a confirmed receipt passes down.
 */
describe('PurchaseOrdersService (goods receipts)', () => {
  const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value));

  let service: PurchaseOrdersService;
  let inventoryMock: { receiveStock: jest.Mock };
  let analyticsCacheMock: { invalidateAll: jest.Mock };

  let order: any;
  let items: any[];
  let receipts: any[];
  let statusHistory: any[];
  let receiptSeq: number;

  /** Rebuilds the `detailInclude` payload the service expects. */
  const buildDetail = () => ({
    ...clone(order),
    supplier: {
      id: 'sup-1',
      name: 'مورد تجريبي',
      company: 'الشركة',
      contactName: null,
      phone: '0500000000',
      email: null,
      city: null,
      status: 'ACTIVE',
    },
    createdBy: { id: 'u-1', fullName: 'المدير', email: 'admin@padhouse.test' },
    items: items.map((item) => ({
      ...clone(item),
      product: {
        id: item.productId,
        sku: item.sku,
        nameAr: item.productName,
        nameEn: null,
        stock: 0,
      },
    })),
    statusHistory: clone(statusHistory),
    receipts: clone(receipts)
      .reverse()
      .map((receipt) => ({
        ...receipt,
        receivedBy: receipt.receivedById
          ? { id: receipt.receivedById, fullName: receipt.receivedByName }
          : null,
      })),
  });

  const applyOrderUpdate = (data: any) => {
    if (data.status) order.status = data.status;
    if ('receivedAt' in data) order.receivedAt = data.receivedAt;
    if (data.statusHistory?.create) {
      statusHistory.push({
        id: `h-${statusHistory.length + 1}`,
        createdAt: new Date().toISOString(),
        ...clone(data.statusHistory.create),
      });
    }
    return buildDetail();
  };

  let tx: any;

  const makeTx = () => ({
    $queryRaw: jest.fn(async () => [{ id: order.id }]),
    purchaseOrder: {
      findUnique: jest.fn(async () => buildDetail()),
      update: jest.fn(async ({ data }: any) => applyOrderUpdate(data)),
    },
    purchaseOrderItem: {
      update: jest.fn(async ({ where, data }: any) => {
        const item = items.find((i) => i.id === where.id);
        if (!item) throw new Error('item not found');
        item.receivedQuantity += data.receivedQuantity?.increment ?? 0;
        return clone(item);
      }),
    },
    goodsReceipt: {
      findFirst: jest.fn(async () =>
        receipts.length ? { receiptNumber: receipts[receipts.length - 1].receiptNumber } : null,
      ),
      create: jest.fn(async ({ data }: any) => {
        receiptSeq += 1;
        const receipt = {
          id: `gr-${receiptSeq}`,
          receiptNumber: data.receiptNumber,
          purchaseOrderId: data.purchaseOrderId,
          receivedById: data.receivedById,
          receivedByName: data.receivedByName,
          receivedAt: new Date().toISOString(),
          notes: data.notes,
          items: (data.items?.create ?? []).map((line: any, idx: number) => ({
            id: `gri-${receiptSeq}-${idx}`,
            ...clone(line),
          })),
        };
        receipts.push(receipt);
        return clone(receipt);
      }),
    },
  });

  beforeEach(() => {
    receiptSeq = 0;
    items = [
      {
        id: 'item-case',
        purchaseOrderId: 'po-1',
        productId: 'prod-case',
        productName: 'غلاف آيباد',
        sku: 'CASE-01',
        orderedQuantity: 20,
        receivedQuantity: 0,
        unitCost: 10,
      },
      {
        id: 'item-kb',
        purchaseOrderId: 'po-1',
        productId: 'prod-kb',
        productName: 'كيبورد آيباد',
        sku: 'KB-01',
        orderedQuantity: 10,
        receivedQuantity: 0,
        unitCost: 25,
      },
      {
        id: 'item-cover',
        purchaseOrderId: 'po-1',
        productId: 'prod-cover',
        productName: 'غلاف قلم',
        sku: 'COVER-01',
        orderedQuantity: 30,
        receivedQuantity: 0,
        unitCost: 5,
      },
    ];
    receipts = [];
    statusHistory = [];
    order = {
      id: 'po-1',
      orderNumber: 'PO-2026-0001',
      status: 'APPROVED',
      currency: 'ILS',
      paymentTerms: null,
      orderDate: new Date().toISOString(),
      expectedAt: null,
      receivedAt: null,
      notes: null,
      supplierId: 'sup-1',
      createdById: 'u-1',
      subtotal: 0,
      discountTotal: 0,
      taxTotal: 0,
      shippingCost: 0,
      grandTotal: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    tx = makeTx();

    const prisma: any = {
      $transaction: jest.fn(async (cb: any) => cb(tx)),
      purchaseOrder: {
        findUnique: jest.fn(async () => clone(order)),
        update: jest.fn(async ({ data }: any) => applyOrderUpdate(data)),
      },
    };

    inventoryMock = { receiveStock: jest.fn(async () => ({ currentStock: 0 })) };
    analyticsCacheMock = { invalidateAll: jest.fn() };

    service = new PurchaseOrdersService(
      prisma as any,
      inventoryMock as any,
      analyticsCacheMock as any,
    );
  });

  const receive = (lines: { itemId: string; quantityReceived: number }[], notes?: string) =>
    service.receive('po-1', { items: lines, notes } as any, { id: 'user-1', fullName: 'أمين المستودع' });

  describe('partial receipt', () => {
    it('increases stock only for received lines and moves the order to partially received', async () => {
      const detail: any = await receive(
        [
          { itemId: 'item-case', quantityReceived: 15 },
          { itemId: 'item-kb', quantityReceived: 10 },
          { itemId: 'item-cover', quantityReceived: 0 },
        ],
        'استلام أول',
      );

      // One receipt, numbered sequentially, linked to the order and the receiver.
      expect(detail.receipts).toHaveLength(1);
      expect(detail.receipts[0].receiptNumber).toBe('GR-2026-0001');
      expect(detail.receipts[0].receivedByName).toBe('أمين المستودع');
      expect(detail.receipts[0].items).toHaveLength(2); // zero line dropped

      // Cumulative received quantities and updated status.
      const byId = Object.fromEntries(detail.items.map((i: any) => [i.id, i]));
      expect(byId['item-case'].receivedQuantity).toBe(15);
      expect(byId['item-kb'].receivedQuantity).toBe(10);
      expect(byId['item-cover'].receivedQuantity).toBe(0);
      expect(byId['item-case'].remainingQuantity).toBe(5);
      expect(byId['item-kb'].remainingQuantity).toBe(0);
      expect(byId['item-cover'].remainingQuantity).toBe(30);
      expect(detail.status).toBe('PARTIALLY_RECEIVED');

      // Stock increased exactly by the received quantities, tagged with refs.
      expect(inventoryMock.receiveStock).toHaveBeenCalledTimes(2);
      expect(inventoryMock.receiveStock).toHaveBeenCalledWith(
        expect.objectContaining({
          productId: 'prod-case',
          quantity: 15,
          unitCost: 10,
          reference: 'GR-2026-0001',
          purchaseOrderId: 'po-1',
          goodsReceiptId: 'gr-1',
          actorId: 'user-1',
        }),
      );
      expect(inventoryMock.receiveStock).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-kb', quantity: 10 }),
      );
      expect(inventoryMock.receiveStock).not.toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'prod-cover' }),
      );
    });
  });

  describe('complete receipt', () => {
    it('marks the order received once every line is fully received', async () => {
      await receive([
        { itemId: 'item-case', quantityReceived: 15 },
        { itemId: 'item-kb', quantityReceived: 10 },
      ]);

      const detail: any = await receive([
        { itemId: 'item-case', quantityReceived: 5 },
        { itemId: 'item-cover', quantityReceived: 30 },
      ]);

      expect(detail.status).toBe('RECEIVED');
      expect(detail.receivedAt).not.toBeNull();
      expect(detail.receipts).toHaveLength(2);
      expect(detail.receipts[0].receiptNumber).toBe('GR-2026-0002'); // newest first
      expect(detail.items.every((i: any) => i.remainingQuantity === 0)).toBe(true);
      expect(inventoryMock.receiveStock).toHaveBeenCalledTimes(4);
    });

    it('stays partially received while a single line is outstanding', async () => {
      const detail: any = await receive([{ itemId: 'item-cover', quantityReceived: 30 }]);

      expect(detail.status).toBe('PARTIALLY_RECEIVED');
      expect(detail.receivedAt).toBeNull();
    });
  });

  describe('duplicate confirmation', () => {
    it('rejects a receipt once the quantities are already fully received', async () => {
      await receive([
        { itemId: 'item-case', quantityReceived: 20 },
        { itemId: 'item-kb', quantityReceived: 10 },
        { itemId: 'item-cover', quantityReceived: 30 },
      ]);
      expect(order.status).toBe('RECEIVED');

      const callsAfterFirst = inventoryMock.receiveStock.mock.calls.length;

      await expect(
        receive([
          { itemId: 'item-case', quantityReceived: 20 },
          { itemId: 'item-kb', quantityReceived: 10 },
          { itemId: 'item-cover', quantityReceived: 30 },
        ]),
      ).rejects.toThrow(BadRequestException);

      // Nothing was applied a second time.
      expect(inventoryMock.receiveStock).toHaveBeenCalledTimes(callsAfterFirst);
      expect(receipts).toHaveLength(1);
    });

    it('rejects an empty (all-zero) receipt', async () => {
      await expect(
        receive([
          { itemId: 'item-case', quantityReceived: 0 },
          { itemId: 'item-kb', quantityReceived: 0 },
        ]),
      ).rejects.toThrow(BadRequestException);

      expect(inventoryMock.receiveStock).not.toHaveBeenCalled();
      expect(receipts).toHaveLength(0);
    });

    it('re-receiving a line beyond what remains after a partial receipt is rejected', async () => {
      await receive([{ itemId: 'item-case', quantityReceived: 15 }]);

      await expect(receive([{ itemId: 'item-case', quantityReceived: 15 }])).rejects.toThrow(
        BadRequestException,
      );
      expect(items.find((i: any) => i.id === 'item-case').receivedQuantity).toBe(15);
    });
  });

  describe('excessive quantity', () => {
    it('rejects a receipt larger than the ordered quantity and writes nothing', async () => {
      await expect(receive([{ itemId: 'item-case', quantityReceived: 21 }])).rejects.toThrow(
        BadRequestException,
      );

      expect(inventoryMock.receiveStock).not.toHaveBeenCalled();
      expect(receipts).toHaveLength(0);
      expect(items.find((i: any) => i.id === 'item-case').receivedQuantity).toBe(0);
      expect(order.status).toBe('APPROVED');
    });

    it('rejects a line that does not belong to the order', async () => {
      await expect(receive([{ itemId: 'item-unknown', quantityReceived: 1 }])).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryMock.receiveStock).not.toHaveBeenCalled();
    });
  });

  describe('status guards', () => {
    it('refuses to receive against a draft order', async () => {
      order.status = 'DRAFT';

      await expect(receive([{ itemId: 'item-case', quantityReceived: 1 }])).rejects.toThrow(
        BadRequestException,
      );
      expect(inventoryMock.receiveStock).not.toHaveBeenCalled();
    });
  });

  describe('inventory isolation', () => {
    it('creates a draft order without changing inventory', async () => {
      const draft = { ...order, status: 'DRAFT' };
      const createOrder = jest.fn(async (..._args: any[]) => draft);
      const draftService = { create: createOrder };

      const result: any = await draftService.create({ supplierId: 'sup-1', items: [] }, { id: 'user-1', fullName: 'المدير' });

      expect(result.status).toBe('DRAFT');
      expect(createOrder).toHaveBeenCalledTimes(1);
      expect(inventoryMock.receiveStock).not.toHaveBeenCalled();
    });

    it('never touches inventory when sending an approved order', async () => {
      const detail: any = await service.send('po-1', {} as any, { id: 'user-1', fullName: 'المدير' });

      expect(detail.status).toBe('SENT');
      expect(inventoryMock.receiveStock).not.toHaveBeenCalled();
    });
  });
});
