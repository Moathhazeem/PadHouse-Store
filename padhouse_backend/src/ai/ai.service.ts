import { Injectable, GatewayTimeoutException, HttpException, HttpStatus, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI } from '@google/genai';
import { PrismaService } from '../prisma/prisma.service';
import { ChatRequestDto } from './dto/chat-request.dto';

const REQUEST_TIMEOUT_MS = 45_000;

@Injectable()
export class AiService {
  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  async chat(request: ChatRequestDto): Promise<{ answer: string }> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException('المساعد الذكي غير متاح حالياً. يرجى المحاولة لاحقاً.');
    }

    const catalog = await this.getCatalogContext();
    const client = new GoogleGenAI({ apiKey });
    const transcript = (request.history ?? [])
      .slice(-12)
      .map((turn) => `${turn.role === 'user' ? 'العميل' : 'المساعد'}: ${turn.content.trim().slice(0, 1200)}`)
      .join('\n');
    const contents = [
      transcript,
      `العميل: ${request.message.trim()}`,
    ].filter(Boolean).join('\n');

    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        client.models.generateContent({
          model: this.config.get<string>('GEMINI_MODEL')?.trim() || 'gemini-3.8-flash',
          contents,
          config: {
            systemInstruction: [
              'أنت مساعد التسوق الرسمي لمتجر PadHouse الفلسطيني المتخصص بملحقات iPad.',
              'أجب بلغة العميل، وبالعربية عند عدم وضوح اللغة. كن موجزاً وودوداً.',
              'اعتمد حصراً على كتالوج المنتجات أدناه عند ذكر السعر أو التوافق أو المخزون أو الميزات.',
              'لا تخترع منتجاً أو سعراً أو توافقاً أو مخزوناً. إذا لم يذكر الكتالوج جهاز العميل، اسأله عن رقم الموديل قبل التوصية.',
              'اعرض الأسعار بالشيكل (₪)، واذكر اسم المنتج ورمز SKU عند توفره.',
              'إذا لم تتوفر معلومة، صرّح بذلك واقترح التواصل مع خدمة العملاء.',
              `كتالوج المنتجات الحالي:\n${catalog || 'الكتالوج غير متاح حالياً.'}`,
            ].join('\n\n'),
            maxOutputTokens: 2048,
            temperature: 0.3,
          },
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new GatewayTimeoutException('انتهت مهلة الرد. يرجى المحاولة مرة أخرى.')), REQUEST_TIMEOUT_MS);
        }),
      ]);
      const answer = response.text?.trim();
      if (!answer) throw new Error('Empty Gemini response');
      return { answer };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      throw new HttpException('تعذّر الحصول على رد حالياً. يرجى المحاولة بعد قليل.', HttpStatus.BAD_GATEWAY);
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  private async getCatalogContext(): Promise<string> {
    try {
      const products = await this.prisma.product.findMany({
      where: { isActive: true },
      orderBy: [{ isFeatured: 'desc' }, { nameAr: 'asc' }],
      select: {
        sku: true,
        nameAr: true,
        nameEn: true,
        descriptionAr: true,
        basePrice: true,
        salePrice: true,
        ipadCompatibility: true,
        warrantyMonths: true,
        variants: { select: { inventory: { select: { currentStock: true } } } },
      },
      });

      return products.map((product) => {
      let compatibleModels = product.ipadCompatibility;
      try {
        const parsed: unknown = JSON.parse(product.ipadCompatibility);
        if (Array.isArray(parsed)) compatibleModels = parsed.join('، ');
      } catch {
        // Keep the stored value when legacy rows are not JSON encoded.
      }
      const price = product.salePrice ?? product.basePrice;
      const stock = product.variants.reduce((sum, variant) => sum + (variant.inventory?.currentStock ?? 0), 0);
      return [
        `${product.nameAr}${product.nameEn ? ` / ${product.nameEn}` : ''} (SKU: ${product.sku})`,
        `السعر: ${price.toString()} ₪${product.salePrice ? ` (السعر الأصلي ${product.basePrice.toString()} ₪)` : ''}`,
        `التوافق المسجل: ${compatibleModels}`,
        `المخزون الحالي: ${stock}`,
        `الضمان: ${product.warrantyMonths} شهر`,
        `الوصف: ${product.descriptionAr}`,
      ].join(' | ');
      }).join('\n');
    } catch {
      return '';
    }
  }
}
