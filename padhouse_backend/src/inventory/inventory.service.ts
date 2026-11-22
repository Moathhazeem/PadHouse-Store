import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, StockMovementType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { UpdateStockDto } from './dto/inventory.dto';

/** Prisma transaction client used to keep multi-record stock changes atomic. */
export type StockTx = Prisma.TransactionClient;

/** Default audit note for manual inventory-manager adjustments. */
const MANUAL_ADJUSTMENT_NOTE = 'تعديل يدوي من لوحة تحكم المستودع';

/**
 * Input for the single, centralized variant stock-change primitive.
 * `delta` is signed: positive adds stock, negative removes stock.
 */
export interface ApplyStockDeltaInput {
  /** Target product variant (owns the 1:1 Inventory row). */
  variantId: string;
  /** Signed change applied to `Inventory.currentStock`. */
  delta: number;
  /** Audit movement type persisted on the `InventoryMovement` row. */
  type: StockMovementType;
  notes?: string;
  actorId?: string;
  /** Human-readable document reference (e.g. a purchase receipt number) stored with the movement. */
  reference?: string;
  /** Origin purchase order id, stored on the movement for traceability. */
  purchaseOrderId?: string;
  /** Goods receipt id that produced this movement. */
  goodsReceiptId?: string;
  /** Allow the resulting stock to drop below zero. Defaults to false. */
  allowNegative?: boolean;
  /** Unit purchase cost. When set for a positive delta, `Inventory.costPrice` is recalculated via Weighted Average Cost. */
  unitCost?: number;
}

/** Input for the reusable purchase stock-in operation. */
export interface ReceiveStockInput {
  /** Target product variant (owns the 1:1 Inventory row). Either this or `productId` is required. */
  variantId?: string;
  /** Target product; the stock-in is credited to the product's primary tracked variant. */
  productId?: string;
  /** Received quantity (must be > 0). */
  quantity: number;
  /** Unit purchase cost used for the Weighted Average Cost recalculation. */
  unitCost: number;
  /** Purchase document reference (e.g. receipt number) kept on the movement. */
  reference?: string;
  /** Origin purchase order id kept on the movement. */
  purchaseOrderId?: string;
  /** Goods receipt id that produced this movement. */
  goodsReceiptId?: string;
  notes?: string;
  actorId?: string;
  /** Optional surrounding transaction to enlist in (required for purchase receipts later). */
  tx?: StockTx;
}

/**
 * Owns every stock mutation in the system.
 *
 * Phase 0 (Stock Unification) invariants:
 *  - `Inventory.currentStock` (variant level) is the single source of truth.
 *  - `Product.stock` (product level) is a denormalized aggregate recomputed as the
 *    sum of all of a product's variant stocks after every change.
 *  - Every change writes exactly one `InventoryMovement` audit row.
 *  - Changes affecting both records run inside a Prisma transaction.
 *  - Negative stock is rejected unless a caller explicitly opts in.
 */
@Injectable()
export class InventoryService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  async getInventoryOverview() {
    const items = await this.prisma.inventory.findMany({
      include: {
        variant: {
          include: {
            product: {
              include: { images: true, category: true },
            },
          },
        },
      },
      orderBy: { currentStock: 'asc' },
    });

    return items.map((inv) => {
      const isLowStock = inv.currentStock <= inv.minThreshold;
      return {
        id: inv.id,
        variantId: inv.variantId,
        variantSku: inv.variant.sku,
        color: inv.variant.colorNameAr,
        productId: inv.variant.productId,
        productName: inv.variant.product.nameAr,
        category: inv.variant.product.category.nameAr,
        currentStock: inv.currentStock,
        minThreshold: inv.minThreshold,
        costPrice: Number(inv.costPrice),
        isLowStock,
        updatedAt: inv.updatedAt,
      };
    });
  }

  async getLowStockAlerts() {
    const all = await this.getInventoryOverview();
    return all.filter((item) => item.isLowStock);
  }

  /**
   * Sets a variant's stock to an absolute value.
   * Keeps `Product.stock` synchronized and records a RESTOCK/MANUAL_ADJUSTMENT movement.
   */
  async updateStock(variantId: string, dto: UpdateStockDto, actorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const inventory = await tx.inventory.findUnique({ where: { variantId } });

      if (!inventory) {
        throw new NotFoundException('سجل المخزون لهذا المتغير غير موجود');
      }

      const delta = dto.quantity - inventory.currentStock;

      const { inventory: updated } = await this.applyStockDeltaTx(tx, {
        variantId,
        delta,
        type: delta >= 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
        notes: dto.notes || MANUAL_ADJUSTMENT_NOTE,
        actorId,
      });

      return updated;
    });
  }

  /**
   * Applies a signed stock delta to a variant. Used by order fulfilment, cancellations,
   * returns and damaged write-offs.
   *
   * Pass the surrounding `tx` to keep the change atomic with the caller's transaction
   * (this is what checkout and order cancellation rely on).
   */
  async applyVariantDelta(input: ApplyStockDeltaInput, tx?: StockTx) {
    if (tx) {
      return this.applyStockDeltaTx(tx, input);
    }
    return this.prisma.$transaction((client) => this.applyStockDeltaTx(client, input));
  }

  /**
   * Reusable stock-in operation for purchase receipts.
   * Increases the variant stock, recalculates Weighted Average Cost and writes an audit movement.
   * Transaction-safe: pass `tx` to enlist in an existing (future) purchase transaction.
   */
  async receiveStock(input: ReceiveStockInput) {
    if (!Number.isFinite(input.quantity) || input.quantity <= 0) {
      throw new BadRequestException('الكمية المستلمة يجب أن تكون أكبر من صفر');
    }
    if (!Number.isFinite(input.unitCost) || input.unitCost < 0) {
      throw new BadRequestException('تكلفة الوحدة غير صالحة');
    }
    if (!input.variantId && !input.productId) {
      throw new BadRequestException('يجب تحديد المتغير أو المنتج المستلم');
    }

    const run = async (client: StockTx) => {
      const variantId =
        input.variantId ?? (await this.resolveReceivingVariant(client, input.productId!));

      return this.applyStockDeltaTx(client, {
        variantId,
        delta: input.quantity,
        type: 'RESTOCK',
        unitCost: input.unitCost,
        reference: input.reference,
        purchaseOrderId: input.purchaseOrderId,
        goodsReceiptId: input.goodsReceiptId,
        notes: input.notes || 'استلام بضاعة',
        actorId: input.actorId,
      });
    };

    const result = input.tx ? await run(input.tx) : await this.prisma.$transaction(run);
    return result.inventory;
  }

  /**
   * Resolves the variant that receives a product-level stock-in.
   *
   * Purchase orders reference products (not variants), so a received quantity is
   * credited to the product's primary tracked variant — the same rule used by
   * {@link setProductStock} for positive deltas.
   */
  private async resolveReceivingVariant(tx: StockTx, productId: string): Promise<string> {
    const variant = await tx.productVariant.findFirst({
      where: { productId, inventory: { isNot: null } },
      orderBy: { createdAt: 'asc' },
      select: { id: true },
    });

    if (!variant) {
      throw new BadRequestException('لا يوجد متغير مخزون مرتبط بهذا المنتج لاستلام الكمية');
    }
    return variant.id;
  }

  /**
   * Sets a product's aggregate stock to an absolute value, distributing the difference
   * across its variant inventories so `Product.stock` always equals the sum of variants.
   *
   * Used by the legacy product-level restock endpoint (`PATCH /products/:id/stock`).
   */
  async setProductStock(
    productId: string,
    newStock: number,
    actorId?: string,
    notes?: string,
    tx?: StockTx,
  ) {
    if (newStock < 0) {
      throw new BadRequestException('لا يمكن أن يكون المخزون سالباً');
    }

    const run = async (client: StockTx) => {
      const product = await client.product.findUnique({
        where: { id: productId },
        include: { variants: { include: { inventory: true } } },
      });

      if (!product) {
        throw new NotFoundException('المنتج غير موجود');
      }

      const variants = product.variants.filter((v) => v.inventory);
      const currentTotal = variants.reduce(
        (sum, v) => sum + (v.inventory?.currentStock ?? 0),
        0,
      );

      // No tracked variants yet: keep the legacy absolute write on the product only.
      if (variants.length === 0) {
        return client.product.update({
          where: { id: productId },
          data: { stock: newStock },
        });
      }

      let remaining = newStock - currentTotal;
      const auditNotes = notes || MANUAL_ADJUSTMENT_NOTE;

      if (remaining > 0) {
        // Restock the product as a whole: add the incoming quantity to the first variant.
        await this.applyStockDeltaTx(client, {
          variantId: variants[0].id,
          delta: remaining,
          type: 'RESTOCK',
          notes: auditNotes,
          actorId,
        });
      } else if (remaining < 0) {
        // Drain variants in order, never letting any variant drop below zero.
        for (const variant of variants) {
          if (remaining >= 0) break;
          const take = Math.min(variant.inventory!.currentStock, -remaining);
          if (take <= 0) continue;

          await this.applyStockDeltaTx(client, {
            variantId: variant.id,
            delta: -take,
            type: 'MANUAL_ADJUSTMENT',
            notes: auditNotes,
            actorId,
          });
          remaining += take;
        }

        if (remaining < 0) {
          throw new BadRequestException(
            'لا يمكن تخفيض المخزون لأقل من إجمالي المتوفر في متغيرات المنتج',
          );
        }
      }

      return client.product.findUnique({ where: { id: productId } });
    };

    if (tx) {
      return run(tx);
    }
    return this.prisma.$transaction(run);
  }

  /**
   * Core stock-change primitive. MUST run inside a Prisma transaction.
   *
   * 1. Loads the variant inventory row (source of truth).
   * 2. Applies the signed delta, rejecting negative stock unless `allowNegative`.
   * 3. Optionally recalculates `costPrice` using Weighted Average Cost.
   * 4. Writes the `InventoryMovement` audit row.
   * 5. Recomputes and persists `Product.stock` as the sum of variant stocks
   *    and triggers the low-stock notification when needed.
   */
  private async applyStockDeltaTx(tx: StockTx, input: ApplyStockDeltaInput) {
    const inventory = await tx.inventory.findUnique({
      where: { variantId: input.variantId },
      include: { variant: { select: { productId: true } } },
    });

    if (!inventory) {
      throw new NotFoundException('سجل المخزون لهذا المتغير غير موجود');
    }

    const newStock = inventory.currentStock + input.delta;

    if (!input.allowNegative && newStock < 0) {
      throw new BadRequestException(
        `الكمية المطلوبة تتجاوز المخزون المتاح (${inventory.currentStock})`,
      );
    }

    // Weighted Average Cost: blend existing inventory value with the received units.
    let costPrice: number | undefined;
    if (input.unitCost !== undefined && input.delta > 0) {
      const previousValue = Number(inventory.costPrice) * inventory.currentStock;
      const incomingValue = input.unitCost * input.delta;
      costPrice =
        newStock > 0
          ? Math.round(((previousValue + incomingValue) / newStock) * 100) / 100
          : Math.round(input.unitCost * 100) / 100;
    }

    const updated = await tx.inventory.update({
      where: { id: inventory.id },
      data: {
        currentStock: newStock,
        ...(input.delta > 0 ? { lastRestockDate: new Date() } : {}),
        ...(costPrice !== undefined ? { costPrice } : {}),
      },
    });

    await tx.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        quantity: input.delta,
        type: input.type,
        notes: this.buildMovementNotes(input.reference, input.notes),
        actorId: input.actorId ?? null,
        reference: input.reference ?? null,
        purchaseOrderId: input.purchaseOrderId ?? null,
        goodsReceiptId: input.goodsReceiptId ?? null,
      },
    });

    const product = await this.syncProductStock(tx, inventory.variant.productId);

    return { inventory: updated, product };
  }

  /**
   * Recomputes `Product.stock` as the sum of its variants' `currentStock`
   * and fires the low-stock notification when the total falls below `minStock`.
   */
  private async syncProductStock(tx: StockTx, productId: string) {
    const aggregate = await tx.inventory.aggregate({
      where: { variant: { productId } },
      _sum: { currentStock: true },
    });
    const total = aggregate._sum.currentStock ?? 0;

    const product = await tx.product.update({
      where: { id: productId },
      data: { stock: total },
      select: { id: true, nameAr: true, stock: true, minStock: true },
    });

    if (product.stock < product.minStock) {
      await this.notificationsService.checkAndCreateLowStockNotification(
        {
          productId: product.id,
          productNameAr: product.nameAr,
          stock: product.stock,
          minStock: product.minStock,
        },
        tx,
      );
    }

    return product;
  }

  /** Prefixes the audit note with a document reference when one is provided. */
  private buildMovementNotes(reference?: string, notes?: string): string | undefined {
    const parts: string[] = [];
    if (reference) parts.push(`[${reference}]`);
    if (notes) parts.push(notes);
    return parts.length ? parts.join(' ') : undefined;
  }
}
