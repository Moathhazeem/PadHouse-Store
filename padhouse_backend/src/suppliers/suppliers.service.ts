import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  PurchaseOrder,
  PurchaseOrderStatus,
  Supplier,
  SupplierStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSupplierDto, SupplierQueryDto, UpdateSupplierDto } from './dto/supplier.dto';

/** Aggregated purchase metrics attached to every supplier payload. */
interface SupplierStats {
  totalPurchaseValue: number;
  purchaseOrdersCount: number;
  lastPurchaseAt: Date | null;
}

const ZERO_STATS: SupplierStats = {
  totalPurchaseValue: 0,
  purchaseOrdersCount: 0,
  lastPurchaseAt: null,
};

/**
 * Supplier Management for the Purchase Management Module.
 *
 * Business rules enforced here:
 *  - Active/Inactive status only (`SupplierStatus`).
 *  - Phone (7–15 digits, international-friendly) and email are validated.
 *  - Name / email / phone must not duplicate another supplier.
 *  - A supplier linked to purchase orders cannot be deleted (deactivate instead).
 */
@Injectable()
export class SuppliersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateSupplierDto) {
    const data = this.buildWriteData(dto);
    await this.assertUnique(data);

    try {
      const supplier = await this.prisma.supplier.create({ data });
      return this.toSummary(supplier, ZERO_STATS);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async findAll(query: SupplierQueryDto) {
    const where: Prisma.SupplierWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    const search = query.search?.trim();
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { company: { contains: search, mode: 'insensitive' } },
        { contactName: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ];
    }

    const suppliers = await this.prisma.supplier.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    const stats = await this.statsFor(suppliers.map((s) => s.id));
    const items = suppliers.map((s) => this.toSummary(s, stats.get(s.id) ?? ZERO_STATS));

    return {
      items,
      total: items.length,
      active: items.filter((i) => i.isActive).length,
      inactive: items.filter((i) => !i.isActive).length,
      totalPurchaseValue: round2(items.reduce((sum, i) => sum + i.totalPurchaseValue, 0)),
    };
  }

  async findOne(id: string) {
    const supplier = await this.ensureExists(id);
    const [stats, history] = await Promise.all([
      this.statsFor([id]),
      this.prisma.purchaseOrder.findMany({
        where: { supplierId: id },
        orderBy: { createdAt: 'desc' },
        take: 50,
      }),
    ]);

    return {
      ...this.toSummary(supplier, stats.get(id) ?? ZERO_STATS),
      purchaseHistory: history.map((po) => this.mapPurchaseOrder(po)),
    };
  }

  async getPurchaseHistory(id: string) {
    await this.ensureExists(id);

    const orders = await this.prisma.purchaseOrder.findMany({
      where: { supplierId: id },
      orderBy: { createdAt: 'desc' },
    });

    return {
      supplierId: id,
      purchaseOrdersCount: orders.length,
      orders: orders.map((po) => this.mapPurchaseOrder(po)),
    };
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.ensureExists(id);

    const data: Prisma.SupplierUpdateInput = {};
    if (dto.name !== undefined) data.name = dto.name.trim();
    if (dto.company !== undefined) data.company = dto.company.trim() || null;
    if (dto.contactName !== undefined) data.contactName = dto.contactName.trim() || null;
    if (dto.phone !== undefined) data.phone = this.validatePhone(dto.phone);
    if (dto.email !== undefined) data.email = this.normalizeEmail(dto.email);
    if (dto.address !== undefined) data.address = dto.address.trim() || null;
    if (dto.city !== undefined) data.city = dto.city.trim() || null;
    if (dto.notes !== undefined) data.notes = dto.notes.trim() || null;
    if (dto.status !== undefined) data.status = dto.status;
    if (dto.leadTimeDays !== undefined) data.leadTimeDays = dto.leadTimeDays;

    await this.assertUnique(
      {
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
      },
      id,
    );

    try {
      const supplier = await this.prisma.supplier.update({ where: { id }, data });
      const stats = await this.statsFor([id]);
      return this.toSummary(supplier, stats.get(id) ?? ZERO_STATS);
    } catch (error) {
      throw this.mapWriteError(error);
    }
  }

  async updateStatus(id: string, status: SupplierStatus) {
    await this.ensureExists(id);

    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: { status },
    });

    const stats = await this.statsFor([id]);
    return this.toSummary(supplier, stats.get(id) ?? ZERO_STATS);
  }

  async remove(id: string) {
    await this.ensureExists(id);

    const linkedOrders = await this.prisma.purchaseOrder.count({ where: { supplierId: id } });
    if (linkedOrders > 0) {
      throw new BadRequestException(
        `لا يمكن حذف مورد مرتبط بـ ${linkedOrders} من طلبات الشراء. يمكنك تعطيله بدلاً من الحذف.`,
      );
    }

    await this.prisma.supplier.delete({ where: { id } });
    return { success: true, id };
  }

  /* ------------------------------------------------------------------ */
  /* Helpers                                                             */
  /* ------------------------------------------------------------------ */

  /** Normalizes an incoming create payload (trim + lowercase email + defaults). */
  private buildWriteData(dto: CreateSupplierDto): Prisma.SupplierCreateInput {
    return {
      name: dto.name.trim(),
      company: dto.company?.trim() || null,
      contactName: dto.contactName?.trim() || null,
      phone: this.validatePhone(dto.phone),
      email: this.normalizeEmail(dto.email),
      address: dto.address?.trim() || null,
      city: dto.city?.trim() || null,
      notes: dto.notes?.trim() || null,
      status: dto.status ?? SupplierStatus.ACTIVE,
      leadTimeDays: dto.leadTimeDays ?? null,
    };
  }

  private normalizeEmail(email?: string | null): string | null {
    const trimmed = email?.trim().toLowerCase();
    return trimmed ? trimmed : null;
  }

  /** Validates the international-friendly phone format and returns the trimmed value. */
  private validatePhone(phone: string): string {
    const trimmed = (phone || '').trim();
    const digits = trimmed.replace(/\D/g, '');
    if (digits.length < 7 || digits.length > 15) {
      throw new BadRequestException('رقم الهاتف غير صالح (يجب أن يحتوي على 7 إلى 15 رقماً)');
    }
    return trimmed;
  }

  /**
   * Rejects duplicate supplier records (name / phone / email).
   * Comparison is case-insensitive for text and digit-normalized for phones.
   * `excludeId` skips the record being updated.
   */
  private async assertUnique(
    input: { name?: string | null; phone?: string | null; email?: string | null },
    excludeId?: string,
  ) {
    const notSelf = excludeId ? { id: { not: excludeId } } : {};

    const name = input.name?.trim();
    if (name) {
      const existing = await this.prisma.supplier.findFirst({
        where: { ...notSelf, name: { equals: name, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('يوجد مورد آخر مسجّل بنفس الاسم');
      }
    }

    const email = this.normalizeEmail(input.email);
    if (email) {
      const existing = await this.prisma.supplier.findFirst({
        where: { ...notSelf, email: { equals: email, mode: 'insensitive' } },
        select: { id: true },
      });
      if (existing) {
        throw new ConflictException('البريد الإلكتروني مستخدم من قبل مورد آخر');
      }
    }

    const phone = input.phone?.trim();
    if (phone) {
      const target = phone.replace(/\D/g, '');
      const candidates = await this.prisma.supplier.findMany({
        where: notSelf,
        select: { id: true, phone: true },
      });
      if (candidates.some((c) => c.phone.replace(/\D/g, '') === target)) {
        throw new ConflictException('رقم الهاتف مستخدم من قبل مورد آخر');
      }
    }
  }

  private async ensureExists(id: string): Promise<Supplier> {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) {
      throw new NotFoundException('المورد غير موجود');
    }
    return supplier;
  }

  /**
   * Aggregate purchase metrics per supplier.
   *  - `purchaseOrdersCount`: every linked purchase order (blocks deletion).
   *  - `totalPurchaseValue`: sum of non-cancelled purchase orders.
   */
  private async statsFor(ids: string[]): Promise<Map<string, SupplierStats>> {
    const map = new Map<string, SupplierStats>();
    if (ids.length === 0) return map;

    const rows = await this.prisma.purchaseOrder.findMany({
      where: { supplierId: { in: ids } },
      select: { supplierId: true, grandTotal: true, status: true, createdAt: true },
    });

    for (const id of ids) {
      map.set(id, { totalPurchaseValue: 0, purchaseOrdersCount: 0, lastPurchaseAt: null });
    }

    for (const row of rows) {
      const stats = map.get(row.supplierId);
      if (!stats) continue;
      stats.purchaseOrdersCount += 1;
      if (row.status !== PurchaseOrderStatus.CANCELLED) {
        stats.totalPurchaseValue += Number(row.grandTotal);
      }
      if (!stats.lastPurchaseAt || row.createdAt > stats.lastPurchaseAt) {
        stats.lastPurchaseAt = row.createdAt;
      }
    }

    for (const stats of map.values()) {
      stats.totalPurchaseValue = round2(stats.totalPurchaseValue);
    }

    return map;
  }

  private toSummary(supplier: Supplier, stats: SupplierStats) {
    return {
      id: supplier.id,
      name: supplier.name,
      company: supplier.company ?? null,
      contactName: supplier.contactName ?? null,
      phone: supplier.phone,
      email: supplier.email ?? null,
      address: supplier.address ?? null,
      city: supplier.city ?? null,
      notes: supplier.notes ?? null,
      status: supplier.status,
      leadTimeDays: supplier.leadTimeDays ?? null,
      isActive: supplier.status === SupplierStatus.ACTIVE,
      totalPurchaseValue: stats.totalPurchaseValue,
      purchaseOrdersCount: stats.purchaseOrdersCount,
      lastPurchaseAt: stats.lastPurchaseAt,
      createdAt: supplier.createdAt,
      updatedAt: supplier.updatedAt,
    };
  }

  private mapPurchaseOrder(po: PurchaseOrder) {
    return {
      id: po.id,
      orderNumber: po.orderNumber,
      status: po.status,
      totalAmount: Number(po.grandTotal),
      notes: po.notes ?? null,
      expectedAt: po.expectedAt ?? null,
      receivedAt: po.receivedAt ?? null,
      createdAt: po.createdAt,
    };
  }

  /** Translates a Prisma unique-constraint violation into a friendly conflict. */
  private mapWriteError(error: unknown): unknown {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return new ConflictException('توجد بيانات مورد مكررة (الاسم أو البريد الإلكتروني مستخدم مسبقاً)');
    }
    return error;
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
