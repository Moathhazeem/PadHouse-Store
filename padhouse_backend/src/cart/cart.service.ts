import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AddToCartDto, UpdateCartItemDto } from './dto/cart.dto';

@Injectable()
export class CartService {
  constructor(private prisma: PrismaService) {}

  private async getOrCreateCart(customerProfileId: string) {
    let cart = await this.prisma.cart.findUnique({
      where: { customerProfileId },
    });
    if (!cart) {
      cart = await this.prisma.cart.create({
        data: { customerProfileId },
      });
    }
    return cart;
  }

  async getCart(customerProfileId: string) {
    const cart = await this.getOrCreateCart(customerProfileId);

    const fullCart = await this.prisma.cart.findUnique({
      where: { id: cart.id },
      include: {
        items: {
          include: {
            product: {
              include: { images: true },
            },
            variant: {
              include: { inventory: true },
            },
          },
        },
      },
    });

    if (!fullCart) {
      throw new NotFoundException('السلة غير موجودة');
    }

    let subtotal = 0;
    const items = fullCart.items.map((item) => {
      const price = Number(item.product.salePrice || item.product.basePrice);
      const lineTotal = price * item.quantity;
      subtotal += lineTotal;
      const availableStock = item.variant.inventory?.currentStock ?? 0;

      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.nameAr,
        variantId: item.variantId,
        color: item.variant.colorNameAr,
        price,
        quantity: item.quantity,
        total: lineTotal,
        image: item.product.images[0]?.url || '',
        availableStock,
        inStock: availableStock >= item.quantity,
      };
    });

    const discount = Number(fullCart.discountAmount || 0);
    const total = Math.max(0, subtotal - discount);

    return {
      cartId: fullCart.id,
      items,
      itemCount: items.reduce((acc, i) => acc + i.quantity, 0),
      subtotal,
      discount,
      total,
      couponCode: fullCart.couponCode,
    };
  }

  async addItem(customerProfileId: string, dto: AddToCartDto) {
    const cart = await this.getOrCreateCart(customerProfileId);

    // Identify Product
    const product = await this.prisma.product.findFirst({
      where: { OR: [{ id: dto.productId }, { sku: dto.productId }] },
      include: { variants: { include: { inventory: true } } },
    });

    if (!product) {
      throw new NotFoundException('المنتج غير موجود');
    }

    // Match variant by variantId or selectedColor
    let variant = product.variants.find((v) => v.id === dto.variantId);
    if (!variant && dto.selectedColor) {
      variant = product.variants.find((v) => v.colorNameAr === dto.selectedColor);
    }
    if (!variant && product.variants.length > 0) {
      variant = product.variants[0];
    }

    if (!variant) {
      throw new NotFoundException('متغير المنتج غير موجود');
    }

    const availableStock = variant.inventory?.currentStock ?? 0;
    if (availableStock < dto.quantity) {
      throw new BadRequestException(`الكمية المطلوبة غير متوفرة في المستودع. المتوفر: ${availableStock}`);
    }

    // Check if line item already exists
    const existingItem = await this.prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: product.id,
        variantId: variant.id,
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity;
      if (availableStock < newQty) {
        throw new BadRequestException(`لا يمكنك إضافة المزيد، رصيد المستودع الحالي: ${availableStock}`);
      }
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          variantId: variant.id,
          quantity: dto.quantity,
        },
      });
    }

    return this.getCart(customerProfileId);
  }

  async updateItemQuantity(customerProfileId: string, itemId: string, dto: UpdateCartItemDto) {
    const cart = await this.getOrCreateCart(customerProfileId);
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, cartId: cart.id },
      include: { variant: { include: { inventory: true } } },
    });

    if (!item) {
      throw new NotFoundException('عنصر السلة غير موجود');
    }

    const availableStock = item.variant.inventory?.currentStock ?? 0;
    if (availableStock < dto.quantity) {
      throw new BadRequestException(`الكمية المتوفرة في المخزون هي ${availableStock} فقط`);
    }

    await this.prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity: dto.quantity },
    });

    return this.getCart(customerProfileId);
  }

  async removeItem(customerProfileId: string, itemId: string) {
    const cart = await this.getOrCreateCart(customerProfileId);
    await this.prisma.cartItem.deleteMany({
      where: { id: itemId, cartId: cart.id },
    });
    return this.getCart(customerProfileId);
  }

  async clearCart(customerProfileId: string) {
    const cart = await this.getOrCreateCart(customerProfileId);
    await this.prisma.cartItem.deleteMany({
      where: { cartId: cart.id },
    });
    return this.getCart(customerProfileId);
  }
}

