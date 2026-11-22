import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PurchaseOrder,
  PurchaseOrderItem,
  PurchaseOrderStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { InventoryService } from '../inventory/inventory.service';
import {
  CancelPurchaseOrderDto,
  CreatePurchaseOrderDto,
  PurchaseAnalyticsQueryDto,
  PurchaseOrderActionDto,
  PurchaseOrderItemInputDto,
  PurchaseOrderQueryDto,
  ReceivePurchaseOrderDto,
  UpdatePurchaseOrderDto,
} from './dto/purchase-order.dto';
import {
  AnalyticsOrderRow,
  aggregatePurchaseAnalytics,
} from './purchase-analytics.util';

/** Who performed the action, used for the audit trail. */
export interface PurchaseOrderActor {
  id?: string | null;
  fullName?: string | null;
}

const Decimal = Prisma.Decimal;
type Tx = Prisma.TransactionClient;

/**
 * Allowed status transitions. This map is the single source of truth for the
 * workflow and is enforced for every status change — no endpoint may bypass it.
 */
const ALLOWED_TRANSITIONS: Record<PurchaseOrderStatus, PurchaseOrderStatus[]> = {
  [PurchaseOrderStatus.DRAFT]: [
    PurchaseOrderStatus.PENDING_APPROVAL,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.PENDING_APPROVAL]: [
    PurchaseOrderStatus.APPROVED,
    PurchaseOrderStatus.DRAFT,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.APPROVED]: [
    PurchaseOrderStatus.SENT,
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
    PurchaseOrderStatus.RECEIVED,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.SENT]: [
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
    PurchaseOrderStatus.RECEIVED,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.PARTIALLY_RECEIVED]: [
    PurchaseOrderStatus.PARTIALLY_RECEIVED,
    PurchaseOrderStatus.RECEIVED,
    PurchaseOrderStatus.CANCELLED,
  ],
  [PurchaseOrderStatus.RECEIVED]: [],
  [PurchaseOrderStatus.CANCELLED]: [],
};

/** Statuses from which goods may be received. */
const RECEIVABLE_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.APPROVED,
  PurchaseOrderStatus.SENT,
  PurchaseOrderStatus.PARTIALLY_RECEIVED,
];

const detailInclude = {
  supplier: true,
  createdBy: { select: { id: true, fullName: true, email: true } },
  items: {
    include: {
      product: {
        select: { id: true, sku: true, nameAr: true, nameEn: true, stock: true },
      },
    },
    orderBy: { createdAt: 'asc' as const },
  },
  statusHistory: { orderBy: { createdAt: 'asc' as const } },
  receipts: {
    include: {
      receivedBy: { select: { id: true, fullName: true } },
      items: { orderBy: { createdAt: 'asc' as const } },
    },
    orderBy: { receivedAt: 'desc' as const },
  },
};

type PurchaseOrderDetail = Prisma.PurchaseOrderGetPayload<{ include: typeof detailInclude }>;

/**
 * Purchase Orders Management.
 *
 * Workflow: DRAFT → PENDING_APPROVAL → APPROVED → SENT → PARTIALLY_RECEIVED → RECEIVED
 * (with CANCELLED reachable from any non-final state). Every transition is
 * validated against {@link ALLOWED_TRANSITIONS} and written to the audit trail.
 *
 * Stock is never touched by creating, approving or sending an order. Only
 * confirming a goods receipt ({@link receive}) mutates inventory, via the single
 * centralized {@link InventoryService} primitive. All monetary values are
 * computed and stored with `Decimal`.
 */
@Injectable()
export class PurchaseOrdersService {
  constructor(
    private prisma: PrismaService,
    private inventoryService: InventoryService,
  ) {}

  /* ------------------------------------------------------------------ */
  /* Reads                                                               */
  /* ------------------------------------------------------------------ */

  async findAll(query: PurchaseOrderQueryDto) {
    const where: Prisma.PurchaseOrderWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { orderNumber: { contains: search, mode: 'insensitive' } },
        { supplier: { is: { name: { contains: search, mode: 'insensitive' } } } },
        { supplier: { is: { company: { contains: search, mode: 'insensitive' } } } },
      ];
    }

    if (query.from || query.to) {
      where.orderDate = {};
      if (query.from) where.orderDate.gte = new Date(query.from);
      if (query.to) where.orderDate.lte = new Date(query.to);
    }

    const orders = await this.prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        supplier: { select: { id: true, name: true, company: true } },
        createdBy: { select: { id: true, fullName: true } },
        _count: { select: { items: true } },
      },
    });

    const items = orders.map((po) => ({
      id: po.id,
      orderNumber: po.orderNumber,
      status: po.status,
      supplier: po.supplier,
      createdBy: po.createdBy,
      currency: po.currency,
      paymentTerms: po.paymentTerms ?? null,
      orderDate: po.orderDate,
      expectedAt: po.expectedAt ?? null,
      receivedAt: po.receivedAt ?? null,
      itemsCount: po._count.items,
      subtotal: Number(po.subtotal),
      discountTotal: Number(po.discountTotal),
      taxTotal: Number(po.taxTotal),
      shippingCost: Number(po.shippingCost),
      grandTotal: Number(po.grandTotal),
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
    }));

    const byStatus = items.reduce<Record<string, number>>((acc, po) => {
      acc[po.status] = (acc[po.status] ?? 0) + 1;
      return acc;
    }, {});

    return {
      items,
      total: items.length,
      byStatus,
      totalValue: round2(
        items
          .filter((po) => po.status !== PurchaseOrderStatus.CANCELLED)
          .reduce((sum, po) => sum + po.grandTotal, 0),
      ),
    };
  }

  async findOne(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: detailInclude,
    });
    if (!po) {
      throw new NotFoundException('أمر الشراء غير موجود');
    }
    return this.toDetail(po);
  }

  /**
   * Purchase analytics dashboard payload.
   *
   * Everything is derived from a single projected read of the matching purchase
   * orders (header + supplier + lines) and rolled up in memory by
   * {@link aggregatePurchaseAnalytics} — one query, no mock data, and every
   * ranked list bounded by `topLimit` (pagination-style cap). Financial and
   * quantity figures follow the rules documented in the aggregation module:
   * cancelled orders are excluded, received (not ordered) quantities drive
   * "products purchased", and only committed unreceived remainders count as
   * outstanding.
   */
  async analytics(query: PurchaseAnalyticsQueryDto) {
    const where: Prisma.PurchaseOrderWhereInput = {};

    if (query.status) where.status = query.status;
    if (query.supplierId) where.supplierId = query.supplierId;
    if (query.productId) where.items = { some: { productId: query.productId } };

    if (query.from || query.to) {
      where.orderDate = {};
      if (query.from) where.orderDate.gte = new Date(query.from);
      if (query.to) where.orderDate.lte = new Date(query.to);
    }

    const orders = await this.prisma.purchaseOrder.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        currency: true,
        orderDate: true,
        expectedAt: true,
        receivedAt: true,
        createdAt: true,
        grandTotal: true,
        supplierId: true,
        supplier: { select: { name: true, company: true } },
        items: {
          select: {
            productId: true,
            productName: true,
            sku: true,
            orderedQuantity: true,
            receivedQuantity: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    const rows: AnalyticsOrderRow[] = orders.map((po) => ({
      id: po.id,
      orderNumber: po.orderNumber,
      status: po.status,
      currency: po.currency,
      orderDate: po.orderDate,
      expectedAt: po.expectedAt ?? null,
      receivedAt: po.receivedAt ?? null,
      createdAt: po.createdAt,
      grandTotal: Number(po.grandTotal),
      supplierId: po.supplierId,
      supplierName: po.supplier?.name ?? null,
      supplierCompany: po.supplier?.company ?? null,
      items: po.items.map((item) => ({
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
      })),
    }));

    const aggregated = aggregatePurchaseAnalytics(rows, {
      topLimit: query.topLimit ?? 10,
      months: query.months ?? 12,
    });

    return {
      filters: {
        from: query.from ?? null,
        to: query.to ?? null,
        supplierId: query.supplierId ?? null,
        status: query.status ?? null,
        productId: query.productId ?? null,
        topLimit: query.topLimit ?? 10,
        months: query.months ?? 12,
      },
      ...aggregated,
      generatedAt: new Date(),
    };
  }

  /* ------------------------------------------------------------------ */
  /* Create / Update / Delete (DRAFT only)                               */
  /* ------------------------------------------------------------------ */

  async create(dto: CreatePurchaseOrderDto, actor: PurchaseOrderActor) {
    const supplier = await this.ensureSupplier(dto.supplierId);
    const { creates, lines } = await this.buildLines(dto.items);
    const totals = computeTotals(lines, dto.shippingCost ?? 0);

    // Retry on the rare race where two orders grab the same sequence number.
    for (let attempt = 0; ; attempt++) {
      try {
        const created = await this.prisma.$transaction(async (tx) => {
          const orderNumber = await this.nextOrderNumber(tx);

          return tx.purchaseOrder.create({
            data: {
              orderNumber,
              supplierId: supplier.id,
              status: PurchaseOrderStatus.DRAFT,
              currency: (dto.currency ?? 'ILS').toUpperCase(),
              paymentTerms: dto.paymentTerms?.trim() || null,
              orderDate: dto.orderDate ? new Date(dto.orderDate) : new Date(),
              expectedAt: dto.expectedAt ? new Date(dto.expectedAt) : null,
              notes: dto.notes?.trim() || null,
              ...totals,
              createdById: actor.id ?? null,
              items: { create: creates },
              statusHistory: {
                create: {
                  fromStatus: null,
                  toStatus: PurchaseOrderStatus.DRAFT,
                  notes: 'إنشاء أمر الشراء',
                  actorId: actor.id ?? null,
                  actorName: actor.fullName ?? null,
                },
              },
            },
            include: detailInclude,
          });
        });

        return this.toDetail(created);
      } catch (error) {
        if (isUniqueViolation(error) && attempt < 4) continue;
        throw this.mapWriteError(error);
      }
    }
  }

  async update(id: string, dto: UpdatePurchaseOrderDto, actor: PurchaseOrderActor) {
    const existing = await this.ensureExists(id);
    this.assertEditable(existing, 'التعديل');

    if (dto.supplierId && dto.supplierId !== existing.supplierId) {
      await this.ensureSupplier(dto.supplierId);
    }

    const data: Prisma.PurchaseOrderUpdateInput = {};
    if (dto.supplierId) data.supplier = { connect: { id: dto.supplierId } };
    if (dto.currency !== undefined) data.currency = dto.currency.toUpperCase();
    if (dto.paymentTerms !== undefined) data.paymentTerms = dto.paymentTerms.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;
    if (dto.orderDate !== undefined) data.orderDate = new Date(dto.orderDate);
    if (dto.expectedAt !== undefined) data.expectedAt = new Date(dto.expectedAt);

    if (dto.items) {
      const { creates, lines } = await this.buildLines(dto.items);
      const totals = computeTotals(lines, dto.shippingCost ?? Number(existing.shippingCost));
      Object.assign(data, totals);
      data.items = { deleteMany: {}, create: creates };
    } else if (dto.shippingCost !== undefined) {
      const items = await this.prisma.purchaseOrderItem.findMany({
        where: { purchaseOrderId: id },
      });
      const lines = items.map((item) =>
        computeLine({
          orderedQuantity: item.orderedQuantity,
          unitCost: item.unitCost.toString(),
          discountRate: item.discountRate.toString(),
          taxRate: item.taxRate.toString(),
        }),
      );
      const totals = computeTotals(lines, dto.shippingCost);
      Object.assign(data, totals);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrderItem.deleteMany({ where: { purchaseOrderId: id } });
      return tx.purchaseOrder.update({ where: { id }, data, include: detailInclude });
    });

    return this.toDetail(updated);
  }

  async remove(id: string, actor: PurchaseOrderActor) {
    const existing = await this.ensureExists(id);
    this.assertEditable(existing, 'الحذف');

    await this.prisma.purchaseOrder.delete({ where: { id } });
    return { success: true, id, orderNumber: existing.orderNumber, deletedBy: actor.fullName ?? null };
  }

  /* ------------------------------------------------------------------ */
  /* Workflow actions                                                    */
  /* ------------------------------------------------------------------ */

  /** DRAFT → PENDING_APPROVAL */
  async submit(id: string, dto: PurchaseOrderActionDto, actor: PurchaseOrderActor) {
    return this.transition(id, PurchaseOrderStatus.PENDING_APPROVAL, dto.notes, actor);
  }

  /** PENDING_APPROVAL → APPROVED */
  async approve(id: string, dto: PurchaseOrderActionDto, actor: PurchaseOrderActor) {
    return this.transition(id, PurchaseOrderStatus.APPROVED, dto.notes, actor);
  }

  /** PENDING_APPROVAL → DRAFT (sent back to the requester for changes) */
  async reject(id: string, dto: PurchaseOrderActionDto, actor: PurchaseOrderActor) {
    return this.transition(id, PurchaseOrderStatus.DRAFT, dto.notes, actor);
  }

  /** APPROVED → SENT */
  async send(id: string, dto: PurchaseOrderActionDto, actor: PurchaseOrderActor) {
    return this.transition(id, PurchaseOrderStatus.SENT, dto.notes, actor);
  }

  /** Any non-final state → CANCELLED */
  async cancel(id: string, dto: CancelPurchaseOrderDto, actor: PurchaseOrderActor) {
    const notes = [dto.reason?.trim(), dto.notes?.trim()].filter(Boolean).join(' — ') || null;
    return this.transition(id, PurchaseOrderStatus.CANCELLED, notes ?? undefined, actor);
  }

  /**
   * Confirms a goods receipt for the order.
   *
   * `quantityReceived` per line is the quantity received in THIS receipt (a
   * positive delta) and must not exceed the line's remaining quantity. A receipt
   * is the only purchase action that mutates stock: every received line increases
   * the linked product's stock through {@link InventoryService.receiveStock} and
   * writes exactly one `InventoryMovement` referencing both this receipt and the
   * purchase order. The order becomes RECEIVED once every line is fully received,
   * otherwise PARTIALLY_RECEIVED. Multiple receipts per order are supported.
   *
   * Concurrency & duplicates: the purchase-order row is locked
   * (`SELECT … FOR UPDATE`) inside the transaction, so two simultaneous
   * confirmations cannot double-apply stock or exceed what was ordered. An empty
   * (all-zero) receipt is rejected.
   */
  async receive(id: string, dto: ReceivePurchaseOrderDto, actor: PurchaseOrderActor) {
    // Collapse repeated lines and drop zero-quantity entries.
    const requested = new Map<string, number>();
    for (const line of dto.items) {
      if (line.quantityReceived > 0) {
        requested.set(line.itemId, (requested.get(line.itemId) ?? 0) + line.quantityReceived);
      }
    }
    if (requested.size === 0) {
      throw new BadRequestException('لم يتم إدخال أي كمية مستلمة');
    }

    const notes = dto.notes?.trim() || undefined;

    // Retry on the rare race where two receipts grab the same sequence number.
    for (let attempt = 0; ; attempt++) {
      try {
        return await this.prisma.$transaction(async (tx) => {
          // Serialize concurrent receipts for the same order.
          await tx.$queryRaw`SELECT "id" FROM "PurchaseOrder" WHERE "id" = ${id} FOR UPDATE`;

          const order = await tx.purchaseOrder.findUnique({
            where: { id },
            include: { items: { orderBy: { createdAt: 'asc' } } },
          });
          if (!order) throw new NotFoundException('أمر الشراء غير موجود');

          if (!RECEIVABLE_STATUSES.includes(order.status)) {
            throw new BadRequestException(
              `لا يمكن استلام منتجات لأمر شراء بحالة ${statusLabel(order.status)}. يجب أن يكون الأمر معتمداً أو مُرسلاً.`,
            );
          }

          const itemById = new Map(order.items.map((item) => [item.id, item]));
          const lines: { item: PurchaseOrderItem; quantity: number }[] = [];

          for (const [itemId, quantity] of requested) {
            const item = itemById.get(itemId);
            if (!item) {
              throw new BadRequestException('أحد بنود الاستلام لا ينتمي لهذا الأمر');
            }
            const remaining = item.orderedQuantity - item.receivedQuantity;
            if (quantity > remaining) {
              throw new BadRequestException(
                `الكمية المستلمة للبند "${item.productName}" تتجاوز الكمية المتبقية (${remaining})`,
              );
            }
            lines.push({ item, quantity });
          }

          const receiptNumber = await this.nextReceiptNumber(tx);

          const receipt = await tx.goodsReceipt.create({
            data: {
              receiptNumber,
              purchaseOrderId: id,
              receivedById: actor.id ?? null,
              receivedByName: actor.fullName ?? null,
              notes: notes ?? null,
              items: {
                create: lines.map(({ item, quantity }) => ({
                  purchaseOrderItemId: item.id,
                  productId: item.productId,
                  productName: item.productName,
                  sku: item.sku,
                  quantityReceived: quantity,
                  unitCost: item.unitCost,
                })),
              },
            },
          });

          // Apply stock and advance the cumulative received quantity per line.
          for (const { item, quantity } of lines) {
            await this.inventoryService.receiveStock({
              productId: item.productId,
              quantity,
              unitCost: Number(item.unitCost),
              reference: receiptNumber,
              purchaseOrderId: id,
              goodsReceiptId: receipt.id,
              notes: `استلام بضاعة لأمر الشراء ${order.orderNumber}`,
              actorId: actor.id ?? null,
              tx,
            });

            await tx.purchaseOrderItem.update({
              where: { id: item.id },
              data: { receivedQuantity: { increment: quantity } },
            });
          }

          const fullyReceived = order.items.every(
            (item) => item.receivedQuantity + (requested.get(item.id) ?? 0) >= item.orderedQuantity,
          );
          const target = fullyReceived
            ? PurchaseOrderStatus.RECEIVED
            : PurchaseOrderStatus.PARTIALLY_RECEIVED;
          this.assertTransition(order.status, target);

          const updated = await tx.purchaseOrder.update({
            where: { id },
            data: {
              status: target,
              receivedAt: fullyReceived ? new Date() : order.receivedAt,
              statusHistory: {
                create: {
                  fromStatus: order.status,
                  toStatus: target,
                  notes:
                    notes ?? (fullyReceived ? 'استلام كامل للكميات' : 'استلام جزئي للكميات'),
                  actorId: actor.id ?? null,
                  actorName: actor.fullName ?? null,
                },
              },
            },
            include: detailInclude,
          });

          return this.toDetail(updated);
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
          if (attempt < 4) continue;
          throw new ConflictException('تعذر إنشاء رقم استلام فريد، حاول مرة أخرى');
        }
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2025'
        ) {
          throw new BadRequestException('تم تعديل أمر الشراء من طلب آخر، أعد المحاولة');
        }
        throw error;
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /* Internal helpers                                                    */
  /* ------------------------------------------------------------------ */

  /** Validates a transition and persists it together with an audit entry. */
  private async transition(
    id: string,
    target: PurchaseOrderStatus,
    notes: string | undefined,
    actor: PurchaseOrderActor,
  ) {
    const existing = await this.ensureExists(id);
    this.assertTransition(existing.status, target);

    const updated = await this.prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: target,
        statusHistory: {
          create: {
            fromStatus: existing.status,
            toStatus: target,
            notes: notes?.trim() || null,
            actorId: actor.id ?? null,
            actorName: actor.fullName ?? null,
          },
        },
      },
      include: detailInclude,
    });

    return this.toDetail(updated);
  }

  private assertTransition(from: PurchaseOrderStatus, to: PurchaseOrderStatus) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      throw new BadRequestException(
        `انتقال حالة غير مسموح به: ${statusLabel(from)} ← ${statusLabel(to)}`,
      );
    }
  }

  private assertEditable(po: PurchaseOrder, action: string) {
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException(
        `لا يمكن ${action} أمر شراء بحالة ${statusLabel(po.status)}. التعديل أو الحذف متاح فقط في حالة المسودة.`,
      );
    }
  }

  private async ensureExists(id: string): Promise<PurchaseOrder> {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('أمر الشراء غير موجود');
    return po;
  }

  private async ensureSupplier(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('المورد غير موجود');
    return supplier;
  }

  /**
   * Resolves every line against the existing catalog (no product duplication),
   * validates quantities/money, and snapshots name + SKU.
   */
  private async buildLines(items: PurchaseOrderItemInputDto[]): Promise<{
    creates: Prisma.PurchaseOrderItemCreateWithoutPurchaseOrderInput[];
    lines: LineMoney[];
  }> {
    const ids = items.map((item) => item.productId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('لا يمكن تكرار نفس المنتج في أكثر من بند');
    }

    const products = await this.prisma.product.findMany({
      where: { id: { in: ids } },
      select: { id: true, sku: true, nameAr: true },
    });
    const byId = new Map(products.map((p) => [p.id, p]));

    const missing = ids.filter((id) => !byId.has(id));
    if (missing.length > 0) {
      throw new BadRequestException('يوجد منتج غير موجود في الكتالوج ضمن بنود أمر الشراء');
    }

    const creates: Prisma.PurchaseOrderItemCreateWithoutPurchaseOrderInput[] = [];
    const lines: LineMoney[] = [];

    for (const item of items) {
      const product = byId.get(item.productId)!;
      const line = computeLine({
        orderedQuantity: item.orderedQuantity,
        unitCost: item.unitCost,
        discountRate: item.discountRate ?? 0,
        taxRate: item.taxRate ?? 0,
      });
      lines.push(line);

      creates.push({
        product: { connect: { id: product.id } },
        productName: product.nameAr,
        sku: product.sku,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: 0,
        unitCost: new Decimal(line.unitCost),
        discountRate: new Decimal(line.discountRate),
        taxRate: new Decimal(line.taxRate),
        discountAmount: new Decimal(line.discountAmount),
        taxAmount: new Decimal(line.taxAmount),
        lineSubtotal: new Decimal(line.lineSubtotal),
      });
    }

    return { creates, lines };
  }

  /** Sequential per-year number: PO-<year>-<0001…>. */
  private async nextOrderNumber(tx: Tx): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `PO-${year}-`;
    const last = await tx.purchaseOrder.findFirst({
      where: { orderNumber: { startsWith: prefix } },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    });
    const parsed = last ? parseInt(last.orderNumber.slice(prefix.length), 10) : 0;
    const next = (Number.isFinite(parsed) ? parsed : 0) + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  /** Sequential per-year goods-receipt number: GR-<year>-<0001…>. */
  private async nextReceiptNumber(tx: Tx): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `GR-${year}-`;
    const last = await tx.goodsReceipt.findFirst({
      where: { receiptNumber: { startsWith: prefix } },
      orderBy: { receiptNumber: 'desc' },
      select: { receiptNumber: true },
    });
    const parsed = last ? parseInt(last.receiptNumber.slice(prefix.length), 10) : 0;
    const next = (Number.isFinite(parsed) ? parsed : 0) + 1;
    return `${prefix}${String(next).padStart(4, '0')}`;
  }

  private toDetail(po: PurchaseOrderDetail) {
    return {
      id: po.id,
      orderNumber: po.orderNumber,
      status: po.status,
      currency: po.currency,
      paymentTerms: po.paymentTerms ?? null,
      orderDate: po.orderDate,
      expectedAt: po.expectedAt ?? null,
      receivedAt: po.receivedAt ?? null,
      notes: po.notes ?? null,
      supplier: po.supplier
        ? {
            id: po.supplier.id,
            name: po.supplier.name,
            company: po.supplier.company ?? null,
            contactName: po.supplier.contactName ?? null,
            phone: po.supplier.phone,
            email: po.supplier.email ?? null,
            city: po.supplier.city ?? null,
            status: po.supplier.status,
          }
        : null,
      createdBy: po.createdBy
        ? { id: po.createdBy.id, fullName: po.createdBy.fullName, email: po.createdBy.email }
        : null,
      subtotal: Number(po.subtotal),
      discountTotal: Number(po.discountTotal),
      taxTotal: Number(po.taxTotal),
      shippingCost: Number(po.shippingCost),
      grandTotal: Number(po.grandTotal),
      items: po.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        sku: item.sku,
        orderedQuantity: item.orderedQuantity,
        receivedQuantity: item.receivedQuantity,
        remainingQuantity: item.orderedQuantity - item.receivedQuantity,
        unitCost: Number(item.unitCost),
        discountRate: Number(item.discountRate),
        taxRate: Number(item.taxRate),
        discountAmount: Number(item.discountAmount),
        taxAmount: Number(item.taxAmount),
        lineSubtotal: Number(item.lineSubtotal),
        currentStock: item.product?.stock ?? null,
      })),
      statusHistory: po.statusHistory.map((h) => ({
        id: h.id,
        fromStatus: h.fromStatus,
        toStatus: h.toStatus,
        notes: h.notes ?? null,
        actorId: h.actorId ?? null,
        actorName: h.actorName ?? null,
        createdAt: h.createdAt,
      })),
      receipts: po.receipts.map((receipt) => ({
        id: receipt.id,
        receiptNumber: receipt.receiptNumber,
        receivedAt: receipt.receivedAt,
        receivedById: receipt.receivedById ?? null,
        receivedByName: receipt.receivedByName ?? receipt.receivedBy?.fullName ?? null,
        notes: receipt.notes ?? null,
        items: receipt.items.map((item) => ({
          id: item.id,
          purchaseOrderItemId: item.purchaseOrderItemId,
          productId: item.productId,
          productName: item.productName,
          sku: item.sku,
          quantityReceived: item.quantityReceived,
          unitCost: Number(item.unitCost),
        })),
      })),
      allowedTransitions: ALLOWED_TRANSITIONS[po.status],
      createdAt: po.createdAt,
      updatedAt: po.updatedAt,
    };
  }

  private mapWriteError(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('تعذر إنشاء رقم أمر شراء فريد، حاول مرة أخرى');
    }
    return error;
  }
}

/* ------------------------------------------------------------------ */
/* Financial calculation (Decimal)                                     */
/* ------------------------------------------------------------------ */

export interface LineMoneyInput {
  orderedQuantity: number;
  unitCost: number | string;
  discountRate: number | string;
  taxRate: number | string;
}

export interface LineMoney {
  unitCost: string;
  discountRate: string;
  taxRate: string;
  discountAmount: string;
  taxAmount: string;
  lineSubtotal: string;
}

/**
 * Per-line money math.
 *   gross     = qty × unitCost
 *   discount  = gross × discountRate%
 *   tax       = (gross − discount) × taxRate%
 *   lineTotal = gross − discount + tax
 */
export function computeLine(input: LineMoneyInput): LineMoney {
  const qty = new Decimal(input.orderedQuantity);
  const unitCost = new Decimal(input.unitCost);
  const discountRate = new Decimal(input.discountRate);
  const taxRate = new Decimal(input.taxRate);

  const gross = qty.mul(unitCost);
  const discountAmount = gross.mul(discountRate).div(100).toDecimalPlaces(2);
  const taxable = gross.minus(discountAmount);
  const taxAmount = taxable.mul(taxRate).div(100).toDecimalPlaces(2);
  const lineSubtotal = taxable.plus(taxAmount).toDecimalPlaces(2);

  return {
    unitCost: unitCost.toFixed(2),
    discountRate: discountRate.toFixed(2),
    taxRate: taxRate.toFixed(2),
    discountAmount: discountAmount.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    lineSubtotal: lineSubtotal.toFixed(2),
  };
}

/** Rolls line totals up into the order header. */
export function computeTotals(lines: LineMoney[], shippingCost: number | string) {
  let subtotal = new Decimal(0);
  let discountTotal = new Decimal(0);
  let taxTotal = new Decimal(0);

  for (const line of lines) {
    const gross = new Decimal(line.lineSubtotal)
      .plus(line.discountAmount)
      .minus(line.taxAmount);
    subtotal = subtotal.plus(gross);
    discountTotal = discountTotal.plus(line.discountAmount);
    taxTotal = taxTotal.plus(line.taxAmount);
  }

  subtotal = subtotal.toDecimalPlaces(2);
  discountTotal = discountTotal.toDecimalPlaces(2);
  taxTotal = taxTotal.toDecimalPlaces(2);
  const shipping = new Decimal(shippingCost).toDecimalPlaces(2);
  const grandTotal = subtotal.minus(discountTotal).plus(taxTotal).plus(shipping);

  return {
    subtotal: new Decimal(subtotal.toFixed(2)),
    discountTotal: new Decimal(discountTotal.toFixed(2)),
    taxTotal: new Decimal(taxTotal.toFixed(2)),
    shippingCost: new Decimal(shipping.toFixed(2)),
    grandTotal: new Decimal(grandTotal.toFixed(2)),
  };
}

const STATUS_LABELS: Record<PurchaseOrderStatus, string> = {
  DRAFT: 'مسودة',
  PENDING_APPROVAL: 'بانتظار الموافقة',
  APPROVED: 'معتمد',
  SENT: 'مُرسل للمورد',
  PARTIALLY_RECEIVED: 'مستلم جزئياً',
  RECEIVED: 'مستلم بالكامل',
  CANCELLED: 'ملغى',
};

function statusLabel(status: PurchaseOrderStatus): string {
  return STATUS_LABELS[status] ?? status;
}

function isUniqueViolation(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === 'P2002' &&
    (Array.isArray((error.meta as any)?.target)
      ? (error.meta as any).target.includes('orderNumber')
      : true)
  );
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
