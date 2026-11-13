import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(private prisma: PrismaService) {}

  @ApiOperation({ summary: 'قائمة الأقسام الرسمية للمتجر' })
  @Get()
  async getCategories() {
    return this.prisma.category.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: 'asc' },
      include: {
        _count: {
          select: { products: true },
        },
      },
    });
  }

  @ApiOperation({ summary: 'تفاصيل قسم معين عبر المعرف أو الاسم التعريفي' })
  @Get(':idOrSlug')
  async getCategory(@Param('idOrSlug') idOrSlug: string) {
    return this.prisma.category.findFirst({
      where: {
        OR: [{ id: idOrSlug }, { slug: idOrSlug }],
      },
      include: {
        products: {
          include: {
            images: true,
            variants: {
              include: { inventory: true },
            },
          },
        },
      },
    });
  }
}

