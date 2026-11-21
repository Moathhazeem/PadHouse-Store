import {
  Body,
  Controller,
  Delete,
  Get,
  Header,
  Param,
  Patch,
  Post,
  Query,
  StreamableFile,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private productsService: ProductsService) {}

  @Get('image')
  @Header('Access-Control-Allow-Origin', '*')
  @Header('Cache-Control', 'public, max-age=86400, stale-while-revalidate=604800')
  async getProductImage(@Query('url') url: string): Promise<StreamableFile> {
    const image = await this.productsService.fetchProductImage(url);
    return new StreamableFile(image.buffer, { type: image.contentType });
  }

  @ApiOperation({ summary: 'تصفح قائمة المنتجات مع الفلترة والبحث' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'compatibility', required: false })
  @ApiQuery({ name: 'featured', required: false, type: Boolean })
  @ApiQuery({
    name: 'includeInactive',
    required: false,
    type: Boolean,
    description: 'لوحة الإدارة فقط: تضمين المنتجات غير المفعّلة (يتطلب دور ADMIN)',
  })
  @UseGuards(OptionalJwtAuthGuard)
  @Get()
  async getProducts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('compatibility') compatibility?: string,
    @Query('featured') featured?: string,
    @Query('includeInactive') includeInactive?: string,
    @CurrentUser() user?: { role?: string },
  ) {
    const isAdmin = !!user && ['ADMIN', 'SUPER_ADMIN'].includes(user.role ?? '');

    return this.productsService.findAll({
      category,
      search,
      compatibility,
      featured: featured === undefined ? undefined : featured === 'true',
      includeInactive: isAdmin && includeInactive === 'true',
    });
  }

  @ApiOperation({ summary: 'قائمة أجهزة iPad المعتمدة في سجلات المنتجات للتحقق من التوافق' })
  @Get('ipad-models')
  async getIpadModels() {
    return this.productsService.getIpadModels();
  }

  @ApiOperation({ summary: 'تفاصيل منتج معين عبر المعرف أو رمز SKU' })
  @Get(':id')
  async getProduct(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @ApiOperation({ summary: 'إنشاء منتج جديد مع المخزون والحدود الدنيا/العليا (لوحة الإدارة)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiResponse({ status: 201, description: 'تم إنشاء المنتج بنجاح' })
  @Post()
  async createProduct(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @ApiOperation({ summary: 'تحديث بيانات المنتج والمخزون (لوحة الإدارة)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiResponse({ status: 200, description: 'تم تحديث المنتج بنجاح' })
  @Patch(':id')
  async updateProduct(
    @Param('id') id: string,
    @Body() dto: UpdateProductDto,
  ) {
    return this.productsService.update(id, dto);
  }

  @ApiOperation({ summary: 'تحديث مباشر لكمية مخزون المنتج (لوحة الإدارة)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiResponse({ status: 200, description: 'تم تحديث المخزون بنجاح' })
  @Patch(':id/stock')
  async updateStock(
    @Param('id') id: string,
    @Body('stock') stock: number,
  ) {
    return this.productsService.updateStock(id, Number(stock));
  }

  @ApiOperation({ summary: 'حذف منتج (لوحة الإدارة)' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN')
  @ApiResponse({ status: 200, description: 'تم حذف المنتج بنجاح' })
  @Delete(':id')
  async deleteProduct(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
