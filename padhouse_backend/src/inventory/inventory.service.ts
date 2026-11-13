import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateStockDto } from './dto/inventory.dto';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

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

  async updateStock(variantId: string, dto: UpdateStockDto, actorId: string) {
    const inventory = await this.prisma.inventory.findUnique({
      where: { variantId },
    });

    if (!inventory) {
      throw new NotFoundException('سجل المخزون لهذا المتغير غير موجود');
    }

    const diff = dto.quantity - inventory.currentStock;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.inventory.update({
        where: { id: inventory.id },
        data: {
          currentStock: dto.quantity,
          lastRestockDate: diff > 0 ? new Date() : inventory.lastRestockDate,
        },
      });

      await tx.inventoryMovement.create({
        data: {
          inventoryId: inventory.id,
          quantity: diff,
          type: diff >= 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
          notes: dto.notes || 'تعديل يدوي من لوحة تحكم المستودع',
          actorId,
        },
      });

      return updated;
    });
  }
}

