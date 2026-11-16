import { Controller, Get, Header, Param, Query, StreamableFile } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';

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
  @Get()
  async getProducts(
    @Query('category') category?: string,
    @Query('search') search?: string,
    @Query('compatibility') compatibility?: string,
    @Query('featured') featured?: string,
  ) {
    return this.productsService.findAll({
      category,
      search,
      compatibility,
      featured: featured === undefined ? undefined : featured === 'true',
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
}
