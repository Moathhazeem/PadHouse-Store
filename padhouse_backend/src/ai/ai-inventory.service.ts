import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { createHmac } from 'crypto';
import { Prisma, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  PurchaseOrderActor,
  PurchaseOrdersService,
} from '../purchase-orders/purchase-orders.service';
import { OUTSTANDING_STATUSES } from '../purchase-orders/purchase-analytics.util';
import { CreatePurchaseOrderDto } from '../purchase-orders/dto/purchase-order.dto';
import { CreateDraftPurchaseOrderDto, ReorderSuggestionsDto } from './dto/inventory-ai.dto';

/* ------------------------------------------------------------------ */
/* Constants                                                           */
/* ------------------------------------------------------------------ */

const DEFAULT_WINDOW_DAYS = 30;
const DEFAULT_LIMIT = 20;
/** Storefront currency used for AI-drafted purchase orders (matches suppliers module). */
const DRAFT_CURRENCY = 'ILS';
/** Safety cover (days of demand) used when computing a suggested quantity. */
const DEMAND_COVER_DAYS = 30;
const MAX_SUPPLIER_CANDIDATES = 3;
const NARRATIVE_TIMEOUT_MS = 15_000;
const N8N_TIMEOUT_MS = 5_000;

const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_GEMINI_MODEL_FALLBACK = 'gemini-2.5-flash-lite';

/** Goods already committed to a supplier but not yet received (inbound). */
const COMMITTED_STATUSES: PurchaseOrderStatus[] = OUTSTANDING_STATUSES;
/** Orders still awaiting a decision — counted as "on order" but not committed. */
const AWAITING_STATUSES: PurchaseOrderStatus[] = [
  PurchaseOrderStatus.DRAFT,
  PurchaseOrderStatus.PENDING_APPROVAL,
];

const REORDER_NARRATIVE_INSTRUCTION = [
  'أنت محلل مشتريات ومخزون لمتجر PadHouse.',
  'اكتب ملخصاً عربياً موجزاً (٣ إلى ٥ أسطر) لنتائج تحليل إعادة التوريد اعتماداً على الأرقام المرفقة فقط.',
  '- لا تخترع أي أرقام أو أسماء منتجات أو موردين أو أسعار.',
  '- اذكر عدد المنتجات التي تحتاج توريداً، وأبرزها، وأي كميات قادمة تغطي الطلب بالفعل.',
  '- لم تخترع توصيات. لا تقترح الموافقة أو الإرسال — فالقرار للمدير.',
].join('\n');

const DRAFT_NARRATIVE_INSTRUCTION = [
  'أنت مساعد مشتريات لمتجر PadHouse.',
  'اكتب رداً عربياً موجزاً (٣ إلى ٥ أسطر) يخبر المدير بأن مسودات أوامر الشراء أُنشئت للمراجعة.',
  '- اذكر أرقام المسودات وأسماء الموردين إن وُجدت، اعتماداً على البيانات المرفقة فقط.',
  '- شدّد على أن المسودات بحاجة إلى اعتماد المدير، ولم يتم اعتمادها أو إرسالها تلقائياً.',
  '- لا تخترع أي بيانات.',
].join('\n');

/* ------------------------------------------------------------------ */
/* Public shapes                                                       */
/* ------------------------------------------------------------------ */

export type ReorderPriority = 'HIGH' | 'MEDIUM' | 'LOW';

/** How a supplier was matched to a product. */
export type SupplierMatchSource = 'HISTORY' | 'SUGGESTED';

export interface ReorderSupplierOption {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
  /** True for the option the draft would default to (first candidate). */
  isPreferred: boolean;
  /** `HISTORY` when this supplier already supplied the product before. */
  source: SupplierMatchSource;
  purchaseOrdersCount: number;
  lastPurchaseAt: string | null;
}

export interface ReorderSuggestion {
  productId: string;
  sku: string;
  nameAr: string;
  category: string | null;
  currentStock: number;
  minStock: number;
  maxStock: number;
  avgDailySales: number;
  unitsSoldWindow: number;
  /** Units on orders still awaiting a decision (DRAFT / PENDING_APPROVAL). */
  pendingQuantity: number;
  /** Units committed to a supplier but not yet received (inbound). */
  outstandingQuantity: number;
  /** pending + outstanding. */
  inboundQuantity: number;
  /** currentStock + inboundQuantity. */
  projectedStock: number;
  suggestedQuantity: number;
  /** Real weighted-average cost from the product's inventory (never invented). */
  suggestedUnitCost: number;
  /** True when no cost is recorded — the admin must price the line before sending. */
  needsPricing: boolean;
  estimatedLineCost: number;
  priority: ReorderPriority;
  reason: string;
  /** First element is the preferred supplier (when any supplier exists). */
  supplierCandidates: ReorderSupplierOption[];
  preferredSupplier: ReorderSupplierOption | null;
}

export interface CoveredRestockItem {
  productId: string;
  sku: string;
  nameAr: string;
  currentStock: number;
  minStock: number;
  pendingQuantity: number;
  outstandingQuantity: number;
  inboundQuantity: number;
  projectedStock: number;
  note: string;
}

export interface ReorderKpis {
  productsAnalyzed: number;
  productsNeedingRestock: number;
  productsCoveredByInbound: number;
  outOfStockCount: number;
  estimatedTotalCost: number;
  currency: string;
  windowDays: number;
}

export interface ReorderAnalysisResult {
  generatedAt: string;
  windowDays: number;
  summary: string;
  kpis: ReorderKpis;
  suggestions: ReorderSuggestion[];
  /** Low-stock items already covered by incoming quantities (dedupe evidence). */
  covered: CoveredRestockItem[];
}

export interface AiDraftPoItem {
  productId: string;
  productName: string;
  sku: string;
  orderedQuantity: number;
  unitCost: number;
  lineSubtotal: number;
  needsPricing: boolean;
}

export interface AiDraftPoSummary {
  id: string;
  orderNumber: string;
  status: PurchaseOrderStatus;
  currency: string;
  supplier: { id: string; name: string; company: string | null } | null;
  orderDate: string;
  expectedAt: string | null;
  grandTotal: number;
  itemsCount: number;
  items: AiDraftPoItem[];
}

export interface SkippedRestockItem {
  productId: string;
  nameAr: string;
  reason: string;
}

export interface AiDraftPurchaseOrderResult {
  reply: string;
  analysis: ReorderAnalysisResult;
  drafts: AiDraftPoSummary[];
  skipped: SkippedRestockItem[];
  /** Always true: AI output is advisory and never auto-executed. */
  requiresApproval: true;
}

/* ------------------------------------------------------------------ */
/* Internal row shapes                                                 */
/* ------------------------------------------------------------------ */

interface SupplierRow {
  id: string;
  name: string;
  company: string | null;
  phone: string | null;
  email: string | null;
}

interface SupplierStat {
  orders: number;
  totalValue: number;
  lastOrderAt: Date | null;
}

interface ProductHistoryEntry {
  orders: number;
  lastOrderAt: Date;
}

interface ProductRow {
  id: string;
  sku: string;
  nameAr: string;
  stock: number;
  minStock: number;
  maxStock: number;
  category: { id: string; nameAr: string } | null;
  variants: Array<{
    inventory: { currentStock: number; costPrice: Prisma.Decimal } | null;
  }>;
}

/**
 * AI capabilities for the Purchase Management module, hosted on the existing
 * PadHouse assistant (`/ai/*`) — never a second assistant.
 *
 * Two capabilities are exposed:
 *  1. {@link getReorderSuggestions} — a fully deterministic analysis of real
 *     inventory, purchase-order and sales records that lists the products which
 *     need restocking, a suggested quantity (deduplicated against quantities
 *     already on pending purchase orders) and suitable suppliers from the
 *     existing supplier records.
 *  2. {@link createDraftPurchaseOrders} — turns that analysis into one or more
 *     **DRAFT** purchase orders for administrator review.
 *
 * Safety contract (enforced by design, not convention):
 *  - Every number, product, supplier and price comes from the database. The LLM
 *    is only ever used to phrase the natural-language summary; it never selects
 *    ids, quantities or prices.
 *  - Drafts are created exclusively through `PurchaseOrdersService.create`, which
 *    persists `status = DRAFT`. This service never calls submit / approve / send /
 *    receive — approval, sending and goods receipt stay explicit human actions.
 */
@Injectable()
export class AiInventoryService {
  private readonly logger = new Logger(AiInventoryService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly purchaseOrdersService: PurchaseOrdersService,
  ) {}

  /* ------------------------------------------------------------------ */
  /* 1. Reorder suggestions                                              */
  /* ------------------------------------------------------------------ */

  async getReorderSuggestions(dto: ReorderSuggestionsDto = {}): Promise<ReorderAnalysisResult> {
    const windowDays = dto.windowDays ?? DEFAULT_WINDOW_DAYS;
    const limit = dto.limit ?? DEFAULT_LIMIT;

    const { products, demand, pendingByProduct, outstandingByProduct, historyByProduct, suppliers, supplierStats, pendingOrderIds } =
      await this.loadAnalysisInputs(windowDays, dto.categoryId);

    const suggestions: ReorderSuggestion[] = [];
    const coveredAll: CoveredRestockItem[] = [];
    let outOfStockCount = 0;

    for (const product of products) {
      const currentStock = product.stock;
      const minStock = product.minStock;
      const maxStock = product.maxStock;
      const pendingQuantity = pendingByProduct.get(product.id) ?? 0;
      const outstandingQuantity = outstandingByProduct.get(product.id) ?? 0;
      const inboundQuantity = pendingQuantity + outstandingQuantity;
      const projectedStock = currentStock + inboundQuantity;

      const unitsSoldWindow = demand.get(product.id) ?? 0;
      const avgDailySales = round2(unitsSoldWindow / windowDays);

      const needsRestock = currentStock <= minStock;
      let suggestedQuantity = 0;
      if (needsRestock) {
        // Bring the product up to its maximum level, but never below what the
        // recent demand window requires — both measured net of inbound stock.
        const replenishToMax = maxStock - projectedStock;
        const demandCover = Math.ceil(avgDailySales * DEMAND_COVER_DAYS) - projectedStock;
        suggestedQuantity = Math.max(0, replenishToMax, demandCover);
      }

      if (currentStock <= 0) outOfStockCount += 1;

      if (!needsRestock || suggestedQuantity <= 0) {
        // Either healthy, or low but already covered by incoming quantities —
        // this is where duplicate reorder recommendations are suppressed.
        if (needsRestock) {
          coveredAll.push({
            productId: product.id,
            sku: product.sku,
            nameAr: product.nameAr,
            currentStock,
            minStock,
            pendingQuantity,
            outstandingQuantity,
            inboundQuantity,
            projectedStock,
            note:
              inboundQuantity > 0
                ? `الطلب مغطى بكمية قادمة على أوامر شراء قائمة (${inboundQuantity} وحدة) — لا حاجة لتوصية مكررة.`
                : 'لا تتوفر كمية قادمة، والمنتج فوق حد إعادة الطلب بعد الحساب.',
          });
        }
        continue;
      }

      const suggestedUnitCost = this.resolveProductCost(product);
      const estimatedLineCost = round2(suggestedQuantity * suggestedUnitCost);
      const supplierCandidates = this.buildSupplierCandidates(
        product.id,
        historyByProduct,
        suppliers,
        supplierStats,
      );

      suggestions.push({
        productId: product.id,
        sku: product.sku,
        nameAr: product.nameAr,
        category: product.category?.nameAr ?? null,
        currentStock,
        minStock,
        maxStock,
        avgDailySales,
        unitsSoldWindow,
        pendingQuantity,
        outstandingQuantity,
        inboundQuantity,
        projectedStock,
        suggestedQuantity,
        suggestedUnitCost,
        needsPricing: suggestedUnitCost <= 0,
        estimatedLineCost,
        priority: this.resolvePriority(currentStock, minStock),
        reason: this.buildReason({
          currentStock,
          minStock,
          maxStock,
          pendingQuantity,
          outstandingQuantity,
          inboundQuantity,
          suggestedQuantity,
          avgDailySales,
        }),
        supplierCandidates,
        preferredSupplier: supplierCandidates[0] ?? null,
      });
    }

    suggestions.sort(compareSuggestions);

    const estimatedTotalCost = round2(
      suggestions.reduce((sum, item) => sum + item.estimatedLineCost, 0),
    );

    const kpis: ReorderKpis = {
      productsAnalyzed: products.length,
      productsNeedingRestock: suggestions.length,
      productsCoveredByInbound: coveredAll.length,
      outOfStockCount,
      estimatedTotalCost,
      currency: DRAFT_CURRENCY,
      windowDays,
    };

    const topSuggestions = suggestions.slice(0, limit);
    const baseSummary = this.buildSuggestionsSummary(kpis, topSuggestions, pendingOrderIds.size);
    const summary = await this.composeSummary(
      baseSummary,
      REORDER_NARRATIVE_INSTRUCTION,
      this.suggestionsFacts(kpis, topSuggestions),
    );

    return {
      generatedAt: new Date().toISOString(),
      windowDays,
      summary,
      kpis,
      suggestions: topSuggestions,
      covered: coveredAll.slice(0, limit),
    };
  }

  /* ------------------------------------------------------------------ */
  /* 2. Draft purchase order creation                                    */
  /* ------------------------------------------------------------------ */

  /**
   * Creates DRAFT purchase orders for the products that need restocking, on an
   * explicit administrator request. Products are grouped by their preferred
   * supplier (or forced onto a single supplier when `supplierId` is supplied),
   * because a purchase order header references exactly one supplier.
   */
  async createDraftPurchaseOrders(
    dto: CreateDraftPurchaseOrderDto,
    actor: PurchaseOrderActor,
  ): Promise<AiDraftPurchaseOrderResult> {
    const analysis = await this.getReorderSuggestions({
      windowDays: dto.windowDays,
      limit: dto.limit,
    });

    const skipped: SkippedRestockItem[] = [];
    let candidates = analysis.suggestions;

    if (dto.productIds?.length) {
      const requested = new Set(dto.productIds);
      const byId = new Map(analysis.suggestions.map((item) => [item.productId, item]));
      candidates = [];
      for (const id of requested) {
        const match = byId.get(id);
        if (match) {
          candidates.push(match);
        } else {
          skipped.push({
            productId: id,
            nameAr: id,
            reason: 'المنتج غير مدرج ضمن المنتجات التي تحتاج إعادة توريد حالياً.',
          });
        }
      }
    }

    if (dto.supplierId) {
      await this.ensureSupplier(dto.supplierId);
    }

    // Group lines per supplier so every draft header has a single supplier.
    const groups = new Map<string, { supplierId: string; items: ReorderSuggestion[] }>();
    for (const item of candidates) {
      const supplierId = dto.supplierId ?? item.preferredSupplier?.id;
      if (!supplierId) {
        skipped.push({
          productId: item.productId,
          nameAr: item.nameAr,
          reason: 'لا يوجد مورد مسجّل لربط أمر الشراء به. أضف مورداً أولاً.',
        });
        continue;
      }
      const group = groups.get(supplierId) ?? { supplierId, items: [] };
      group.items.push(item);
      groups.set(supplierId, group);
    }

    const drafts: AiDraftPoSummary[] = [];
    for (const group of groups.values()) {
      const payload: CreatePurchaseOrderDto = {
        supplierId: group.supplierId,
        currency: DRAFT_CURRENCY,
        shippingCost: 0,
        items: group.items.map((item) => ({
          productId: item.productId,
          orderedQuantity: item.suggestedQuantity,
          unitCost: item.suggestedUnitCost,
          discountRate: 0,
          taxRate: 0,
        })),
        notes: this.buildDraftNote(dto.notes, group.items),
        ...(dto.expectedAt ? { expectedAt: dto.expectedAt } : {}),
      };

      // Only ever a DRAFT: `create` persists `status = DRAFT` and nothing here
      // touches submit/approve/send/receive.
      const created = await this.purchaseOrdersService.create(payload, actor);
      drafts.push(this.toDraftSummary(created));
    }

    const reply = await this.composeSummary(
      this.buildDraftReply(dto.message, drafts, skipped),
      DRAFT_NARRATIVE_INSTRUCTION,
      this.draftFacts(drafts, skipped),
    );

    this.dispatchAutomation('AI_DRAFT_PURCHASE_ORDER_CREATED', {
      drafts: drafts.map((draft) => ({
        id: draft.id,
        orderNumber: draft.orderNumber,
        supplierId: draft.supplier?.id ?? null,
        itemsCount: draft.itemsCount,
        grandTotal: draft.grandTotal,
      })),
      skipped,
      actorId: actor?.id ?? null,
    });

    return { reply, analysis, drafts, skipped, requiresApproval: true };
  }

  /* ------------------------------------------------------------------ */
  /* Data loading                                                        */
  /* ------------------------------------------------------------------ */

  private async loadAnalysisInputs(windowDays: number, categoryId?: string) {
    const windowStart = new Date(Date.now() - windowDays * 86_400_000);

    const [products, poRows, orderItems, suppliers] = await Promise.all([
      this.prisma.product.findMany({
        where: { isActive: true, ...(categoryId ? { categoryId } : {}) },
        include: {
          category: { select: { id: true, nameAr: true } },
          variants: {
            select: { inventory: { select: { currentStock: true, costPrice: true } } },
          },
        },
      }),
      this.prisma.purchaseOrderItem.findMany({
        where: { purchaseOrder: { status: { not: PurchaseOrderStatus.CANCELLED } } },
        select: {
          productId: true,
          orderedQuantity: true,
          receivedQuantity: true,
          purchaseOrder: {
            select: {
              id: true,
              status: true,
              grandTotal: true,
              createdAt: true,
              supplierId: true,
            },
          },
        },
      }),
      this.prisma.orderItem.findMany({
        where: {
          order: { status: { not: 'CANCELLED' }, createdAt: { gte: windowStart } },
        },
        select: { productId: true, quantity: true },
      }),
      this.prisma.supplier.findMany({
        where: { status: 'ACTIVE' },
        select: { id: true, name: true, company: true, phone: true, email: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const demand = new Map<string, number>();
    for (const item of orderItems) {
      demand.set(item.productId, (demand.get(item.productId) ?? 0) + item.quantity);
    }

    const pendingByProduct = new Map<string, number>();
    const outstandingByProduct = new Map<string, number>();
    const pendingOrderIds = new Set<string>();
    const historyByProduct = new Map<string, Map<string, ProductHistoryEntry>>();
    const supplierStats = new Map<string, SupplierStat>();

    for (const row of poRows) {
      const po = row.purchaseOrder;
      const isPending = AWAITING_STATUSES.includes(po.status);
      const isCommitted = COMMITTED_STATUSES.includes(po.status);

      if (isPending) {
        pendingOrderIds.add(po.id);
        pendingByProduct.set(
          row.productId,
          (pendingByProduct.get(row.productId) ?? 0) + row.orderedQuantity,
        );
      }
      if (isCommitted) {
        const remaining = Math.max(0, row.orderedQuantity - row.receivedQuantity);
        outstandingByProduct.set(
          row.productId,
          (outstandingByProduct.get(row.productId) ?? 0) + remaining,
        );
      }

      // Supplier history covers every non-cancelled order (incl. received).
      const productHistory =
        historyByProduct.get(row.productId) ?? new Map<string, ProductHistoryEntry>();
      const entry = productHistory.get(po.supplierId);
      const orderAt = po.createdAt ?? new Date(0);
      if (entry) {
        entry.orders += 1;
        if (orderAt > entry.lastOrderAt) entry.lastOrderAt = orderAt;
      } else {
        productHistory.set(po.supplierId, { orders: 1, lastOrderAt: orderAt });
      }
      historyByProduct.set(row.productId, productHistory);

      const stat = supplierStats.get(po.supplierId) ?? {
        orders: 0,
        totalValue: 0,
        lastOrderAt: null,
      };
      stat.orders += 1;
      stat.totalValue += Number(po.grandTotal);
      if (!stat.lastOrderAt || orderAt > stat.lastOrderAt) stat.lastOrderAt = orderAt;
      supplierStats.set(po.supplierId, stat);
    }

    return {
      products: products as ProductRow[],
      demand,
      pendingByProduct,
      outstandingByProduct,
      historyByProduct,
      suppliers: suppliers as SupplierRow[],
      supplierStats,
      pendingOrderIds,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Derived helpers                                                     */
  /* ------------------------------------------------------------------ */

  /**
   * Weighted-average cost across a product's variants (real `Inventory.costPrice`).
   * Falls back to any recorded cost, then 0 — a 0 is surfaced as `needsPricing`
   * rather than being replaced with an invented figure.
   */
  private resolveProductCost(product: ProductRow): number {
    let totalStock = 0;
    let totalValue = 0;
    let fallback: number | null = null;

    for (const variant of product.variants) {
      const inventory = variant.inventory;
      if (!inventory) continue;
      const cost = Number(inventory.costPrice);
      if (!Number.isFinite(cost)) continue;
      if (fallback === null) fallback = cost;
      if (inventory.currentStock > 0 && cost > 0) {
        totalStock += inventory.currentStock;
        totalValue += cost * inventory.currentStock;
      }
    }

    const weighted = totalStock > 0 ? totalValue / totalStock : fallback ?? 0;
    return round2(weighted > 0 ? weighted : 0);
  }

  private buildSupplierCandidates(
    productId: string,
    historyByProduct: Map<string, Map<string, ProductHistoryEntry>>,
    suppliers: SupplierRow[],
    supplierStats: Map<string, SupplierStat>,
  ): ReorderSupplierOption[] {
    const byId = new Map(suppliers.map((supplier) => [supplier.id, supplier]));
    const history = historyByProduct.get(productId);

    const fromHistory: ReorderSupplierOption[] = [];
    if (history) {
      for (const [supplierId, entry] of history) {
        const supplier = byId.get(supplierId);
        // Only active, existing suppliers can be recommended.
        if (!supplier) continue;
        fromHistory.push({
          id: supplier.id,
          name: supplier.name,
          company: supplier.company,
          phone: supplier.phone,
          email: supplier.email,
          isPreferred: false,
          source: 'HISTORY',
          purchaseOrdersCount: entry.orders,
          lastPurchaseAt: entry.lastOrderAt.toISOString(),
        });
      }
      fromHistory.sort((a, b) => {
        const timeDiff = timeOf(b.lastPurchaseAt) - timeOf(a.lastPurchaseAt);
        return timeDiff !== 0 ? timeDiff : b.purchaseOrdersCount - a.purchaseOrdersCount;
      });
    }

    let candidates = fromHistory;
    if (candidates.length === 0) {
      // No purchase history for this product: suggest the existing active
      // suppliers, best-performing first, explicitly flagged as a suggestion.
      candidates = [...suppliers]
        .map<ReorderSupplierOption>((supplier) => {
          const stat = supplierStats.get(supplier.id);
          return {
            id: supplier.id,
            name: supplier.name,
            company: supplier.company,
            phone: supplier.phone,
            email: supplier.email,
            isPreferred: false,
            source: 'SUGGESTED',
            purchaseOrdersCount: stat?.orders ?? 0,
            lastPurchaseAt: stat?.lastOrderAt ? stat.lastOrderAt.toISOString() : null,
          };
        })
        .sort((a, b) => {
          const aStat = supplierStats.get(a.id);
          const bStat = supplierStats.get(b.id);
          const valueDiff = (bStat?.totalValue ?? 0) - (aStat?.totalValue ?? 0);
          if (valueDiff !== 0) return valueDiff;
          return timeOf(b.lastPurchaseAt) - timeOf(a.lastPurchaseAt);
        });
    }

    const limited = candidates.slice(0, MAX_SUPPLIER_CANDIDATES);
    return limited.map((option, index) => ({ ...option, isPreferred: index === 0 }));
  }

  private resolvePriority(currentStock: number, minStock: number): ReorderPriority {
    if (currentStock <= 0) return 'HIGH';
    if (currentStock <= Math.floor(minStock / 2)) return 'HIGH';
    return 'MEDIUM';
  }

  private buildReason(input: {
    currentStock: number;
    minStock: number;
    maxStock: number;
    pendingQuantity: number;
    outstandingQuantity: number;
    inboundQuantity: number;
    suggestedQuantity: number;
    avgDailySales: number;
  }): string {
    const parts: string[] = [];
    if (input.currentStock <= 0) {
      parts.push('المنتج نافد حالياً');
    } else {
      parts.push(
        `المخزون الحالي (${input.currentStock}) عند/أدنى من الحد الأدنى (${input.minStock})`,
      );
    }
    if (input.inboundQuantity > 0) {
      parts.push(
        `مع احتساب كمية قادمة (${input.inboundQuantity} وحدة: معلّقة ${input.pendingQuantity} + والتزامات ${input.outstandingQuantity})`,
      );
    }
    parts.push(`مقترح توريد ${input.suggestedQuantity} وحدة للوصول إلى ${input.maxStock}`);
    if (input.avgDailySales > 0) {
      parts.push(`بمتوسط مبيعات يومي ${input.avgDailySales}`);
    }
    return `${parts.join('، ')}.`;
  }

  private buildSuggestionsSummary(
    kpis: ReorderKpis,
    suggestions: ReorderSuggestion[],
    pendingOrderCount: number,
  ): string {
    if (kpis.productsNeedingRestock === 0) {
      return `حلّلت ${kpis.productsAnalyzed} منتجاً خلال آخر ${kpis.windowDays} يوماً؛ لا توجد منتجات تحتاج إعادة توريد حالياً. (${kpis.productsCoveredByInbound} منتجاً منخفض المخزون مغطّى بكميات قادمة.)`;
    }
    const top = suggestions
      .slice(0, 5)
      .map((item) => `${item.nameAr} (${item.suggestedQuantity})`)
      .join('، ');
    return [
      `حلّلت ${kpis.productsAnalyzed} منتجاً خلال آخر ${kpis.windowDays} يوماً.`,
      `${kpis.productsNeedingRestock} منتجاً تحتاج إعادة توريد، منها ${kpis.outOfStockCount} نافدة تماماً.`,
      `أبرز التوصيات: ${top}.`,
      `تم استثناء ${kpis.productsCoveredByInbound} منتجاً لأنه مغطّى بكميات قادمة على ${pendingOrderCount} أمر شراء قائم.`,
      `التكلفة التقديرية للتوريد: ${kpis.estimatedTotalCost} ${kpis.currency}.`,
    ].join(' ');
  }

  private suggestionsFacts(kpis: ReorderKpis, suggestions: ReorderSuggestion[]): string {
    const lines = suggestions.slice(0, 10).map(
      (item) =>
        `- ${item.nameAr} (${item.sku}): مخزون ${item.currentStock}، حد أدنى ${item.minStock}، حد أقصى ${item.maxStock}، قادم ${item.inboundQuantity}، مقترح ${item.suggestedQuantity}، متوسط بيع يومي ${item.avgDailySales}`,
    );
    return [
      `نافذة التحليل: ${kpis.windowDays} يوماً.`,
      `عدد المنتجات المحللة: ${kpis.productsAnalyzed}.`,
      `تحتاج توريداً: ${kpis.productsNeedingRestock}.`,
      `مغطاة بكميات قادمة: ${kpis.productsCoveredByInbound}.`,
      `نافدة: ${kpis.outOfStockCount}.`,
      `التكلفة التقديرية: ${kpis.estimatedTotalCost} ${kpis.currency}.`,
      'التوصيات:',
      ...lines,
    ].join('\n');
  }

  private draftFacts(drafts: AiDraftPoSummary[], skipped: SkippedRestockItem[]): string {
    if (drafts.length === 0) {
      return 'لم تُنشأ أي مسودة: لا توجد منتجات تحتاج إعادة توريد أو لا يوجد موردون مسجّلون.';
    }
    const lines = drafts.map(
      (draft) =>
        `- ${draft.orderNumber} للمورد ${draft.supplier?.name ?? '—'}: ${draft.itemsCount} بنداً بإجمالي ${draft.grandTotal} ${draft.currency}`,
    );
    return [
      `عدد المسودات: ${drafts.length}.`,
      ...lines,
      skipped.length ? `بنود متجاهلة: ${skipped.length}.` : '',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildDraftReply(
    message: string | undefined,
    drafts: AiDraftPoSummary[],
    skipped: SkippedRestockItem[],
  ): string {
    if (drafts.length === 0) {
      return 'لا توجد منتجات تحتاج إعادة توريد حالياً، أو لا يوجد مورد مسجّل لإنشاء أمر شراء. لم يتم إنشاء أي مسودة.';
    }
    const lines = drafts.map(
      (draft) =>
        `• ${draft.orderNumber} — المورد: ${draft.supplier?.name ?? '—'} — ${draft.itemsCount} بنداً — الإجمالي ${draft.grandTotal} ${draft.currency}`,
    );
    return [
      message?.trim() ? `بناءً على طلبك: «${message.trim()}».` : 'تم تجهيز مسودات أوامر الشراء التالية:',
      ...lines,
      skipped.length
        ? `تم تجاهل ${skipped.length} منتجاً لعدم توفر مورد (${skipped.map((item) => item.nameAr).slice(0, 3).join('، ')}).`
        : '',
      'هذه المسودات بحالة «مسودة» فقط. لم يتم اعتمادها أو إرسالها تلقائياً — يرجى مراجعتها ثم اعتمادها وإرسالها يدوياً، وتسجيل استلام البضائع عند وصولها.',
    ]
      .filter(Boolean)
      .join('\n');
  }

  private buildDraftNote(extra: string | undefined, items: ReorderSuggestion[]): string {
    const missingCost = items.filter((item) => item.needsPricing).length;
    const parts = [
      'مسودة مقترحة بواسطة المساعد الذكي — بحاجة إلى مراجعة المدير قبل الاعتماد.',
      `عدد البنود: ${items.length}.`,
    ];
    if (missingCost > 0) {
      parts.push(`تنبيه: ${missingCost} بنداً بدون تكلفة مسجّلة يحتاج تسعيراً يدوياً.`);
    }
    if (extra?.trim()) parts.push(extra.trim());
    return parts.join(' ');
  }

  private toDraftSummary(created: any): AiDraftPoSummary {
    if (created?.status !== PurchaseOrderStatus.DRAFT) {
      // Defensive: the AI must never produce anything but a draft.
      this.logger.error(
        `AI draft PO ${created?.orderNumber} was not persisted as DRAFT (status=${created?.status}).`,
      );
    }
    const items: AiDraftPoItem[] = (created?.items ?? []).map((item: any) => ({
      productId: item.productId,
      productName: item.productName,
      sku: item.sku,
      orderedQuantity: item.orderedQuantity,
      unitCost: item.unitCost,
      lineSubtotal: item.lineSubtotal,
      needsPricing: !(item.unitCost > 0),
    }));

    return {
      id: created.id,
      orderNumber: created.orderNumber,
      status: created.status,
      currency: created.currency,
      supplier: created.supplier
        ? {
            id: created.supplier.id,
            name: created.supplier.name,
            company: created.supplier.company ?? null,
          }
        : null,
      orderDate: toIso(created.orderDate),
      expectedAt: created.expectedAt ? toIso(created.expectedAt) : null,
      grandTotal: created.grandTotal,
      itemsCount: items.length,
      items,
    };
  }

  private async ensureSupplier(supplierId: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('المورد غير موجود');
    if (supplier.status !== 'ACTIVE') {
      throw new BadRequestException('لا يمكن استخدام مورد غير نشط في أمر الشراء');
    }
    return supplier;
  }

  /* ------------------------------------------------------------------ */
  /* Optional LLM narrative (never the source of truth)                  */
  /* ------------------------------------------------------------------ */

  /** Returns the LLM phrasing when available, otherwise the deterministic text. */
  private async composeSummary(
    fallback: string,
    instruction: string,
    facts: string,
  ): Promise<string> {
    const narrative = await this.generateNarrative(instruction, facts);
    return narrative ?? fallback;
  }

  private async generateNarrative(instruction: string, facts: string): Promise<string | null> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) return null;

    const models = this.getModelCandidates();
    try {
      const client = new GoogleGenAI({ apiKey });
      for (const model of models) {
        try {
          const response = await Promise.race([
            client.models.generateContent({
              model,
              contents: facts,
              config: {
                systemInstruction: instruction,
                maxOutputTokens: 512,
                temperature: 0.3,
              },
            }),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error('narrative timeout')), NARRATIVE_TIMEOUT_MS),
            ),
          ]);
          const text = response.text?.trim();
          if (text) return text;
        } catch (error) {
          this.logger.warn(
            `AI narrative failed [model=${model}]: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      this.logger.warn(
        `AI narrative unavailable: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    return null;
  }

  private getModelCandidates(): string[] {
    const primary = this.config.get<string>('GEMINI_MODEL')?.trim() || DEFAULT_GEMINI_MODEL;
    const fallback =
      this.config.get<string>('GEMINI_MODEL_FALLBACK')?.trim() || DEFAULT_GEMINI_MODEL_FALLBACK;
    return Array.from(new Set([primary, fallback].filter((model): model is string => !!model)));
  }

  /* ------------------------------------------------------------------ */
  /* n8n automation (optional, fire-and-forget)                          */
  /* ------------------------------------------------------------------ */

  /**
   * Posts a purchase event to the configured n8n webhook and records it in
   * `AutomationLog`. Never throws and never blocks the API response; when no
   * webhook is configured it is a no-op.
   */
  private dispatchAutomation(event: string, payload: Record<string, unknown>): Promise<void> {
    const url = this.config.get<string>('N8N_WEBHOOK_URL')?.trim();
    if (!url) return Promise.resolve();

    return (async () => {
      const body = JSON.stringify({ event, firedAt: new Date().toISOString(), ...payload });
      let status = 'FAILED';
      let response: Record<string, unknown> | null = null;

      try {
        const secret = this.config.get<string>('N8N_WEBHOOK_SECRET')?.trim();
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (secret) {
          headers['X-PadHouse-Signature'] = createHmac('sha256', secret).update(body).digest('hex');
        }
        const res = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: AbortSignal.timeout(N8N_TIMEOUT_MS),
        });
        status = res.ok ? 'SUCCESS' : 'FAILED';
        response = { statusCode: res.status };
      } catch (error) {
        status = 'FAILED';
        response = { error: error instanceof Error ? error.message : String(error) };
        this.logger.warn(`n8n dispatch failed [${event}]: ${response.error}`);
      }

      await this.prisma.automationLog
        .create({
          data: {
            workflowName: event,
            status,
            payload: { event, ...payload } as Prisma.InputJsonValue,
            response: (response ?? undefined) as Prisma.InputJsonValue,
          },
        })
        .catch((error) =>
          this.logger.warn(
            `Failed to persist AutomationLog [${event}]: ${error instanceof Error ? error.message : String(error)}`,
          ),
        );
    })();
  }
}

/* ------------------------------------------------------------------ */
/* Pure helpers                                                        */
/* ------------------------------------------------------------------ */

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toIso(value: Date | string | null | undefined): string {
  if (!value) return new Date().toISOString();
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

function timeOf(value: string | null | undefined): number {
  if (!value) return 0;
  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function compareSuggestions(a: ReorderSuggestion, b: ReorderSuggestion): number {
  const rank: Record<ReorderPriority, number> = { HIGH: 0, MEDIUM: 1, LOW: 2 };
  if (rank[a.priority] !== rank[b.priority]) return rank[a.priority] - rank[b.priority];
  if (a.currentStock !== b.currentStock) return a.currentStock - b.currentStock;
  if (b.suggestedQuantity !== a.suggestedQuantity) return b.suggestedQuantity - a.suggestedQuantity;
  return a.nameAr.localeCompare(b.nameAr, 'ar');
}
