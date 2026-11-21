import {
  GatewayTimeoutException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenAI, Type, type Schema } from '@google/genai';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { ORDER_STATUS_LABELS, PaymentMethodType } from '../orders/dto/order.dto';
import { ChatRequestDto } from './dto/chat-request.dto';

const REQUEST_TIMEOUT_MS = 45_000;
const MAX_HISTORY_TURNS = 12;

/** Primary model when `GEMINI_MODEL` is not configured. */
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
/** Alternate model retried once when the primary model call fails. */
const DEFAULT_GEMINI_MODEL_FALLBACK = 'gemini-2.5-flash-lite';

/**
 * Normalized keyword sets for the deterministic fallback. Every entry is matched
 * against `normalize()`-d text, so hamza/taa-marbuta are already folded.
 */
const FALLBACK_KEYWORDS = {
  cheapest: ['ارخص', 'الارخص', 'رخيص', 'رخيصه', 'اوفر', 'الاوفر', 'افضل سعر', 'اقل سعر', 'cheap', 'cheapest', 'lowest price', 'budget'],
  priciest: ['اغلي', 'الاغلي', 'غالي', 'افخم', 'الافخم', 'premium', 'expensive', 'most expensive'],
  recommend: ['انصح', 'انصحني', 'تنصح', 'نصيحه', 'اقترح', 'اقتراح', 'توصي', 'توصيه', 'افضل منتج', 'افضل خيار', 'recommend', 'suggest'],
  addToCart: ['ضيف', 'ضف', 'اضف', 'اضافه', 'حط', 'خلي', 'خليه', 'بالسله', 'السله', 'سله', 'add to cart', 'add it', 'add to basket'],
  buyNow: ['اشتري', 'اشتر', 'شراء', 'اطلب', 'اطلبلي', 'بدي اشتري', 'اكمل الطلب', 'اتمام الطلب', 'checkout', 'buy', 'purchase', 'order it', 'order this'],
};

/** What the assistant actually did (or why it needs more information). */
export type AiChatAction = 'ADDED_TO_CART' | 'ORDER_CREATED' | 'NEEDS_INFO' | 'NONE';

/**
 * Action the model resolved from the whole conversation. `CHAT_REPLY` is a plain
 * informational answer; the other two are executed against the shared cart /
 * order services after the referenced product has been resolved from context.
 */
type AiPlannedAction = 'ADD_TO_CART' | 'BUY_NOW' | 'CHAT_REPLY';

export interface AiProductRef {
  id: string;
  sku: string;
  nameAr: string;
  quantity: number;
  variantId?: string;
  color?: string;
}

export interface AiChatResponse {
  answer: string;
  action: AiChatAction;
  /** Product the action refers to, when one could be resolved. */
  product?: AiProductRef;
  /** Fresh cart snapshot after an "add to cart" (mirrors `GET /cart`). */
  cart?: unknown;
  /** Created order after a purchase (mirrors `POST /orders`). */
  order?: unknown;
  /** Checkout fields the customer still has to provide. */
  missingFields?: string[];
  /** True when the action requires the customer to be signed in. */
  requiresAuth?: boolean;
}

interface ChatUser {
  id?: string;
  fullName?: string;
  customerProfileId?: string;
}

type ProductWithVariants = Prisma.ProductGetPayload<{
  include: { variants: { include: { inventory: true } }; images: true };
}>;

interface ResolvedCandidate {
  product: ProductWithVariants;
  variant?: ProductWithVariants['variants'][number];
  quantity: number;
}

/** Structured decision returned by the LLM for a single conversational turn. */
interface AiDecision {
  action: AiPlannedAction;
  /** Catalog product the customer is referring to (resolved from context). */
  productId?: string;
  variantId?: string;
  quantity?: number;
  /** Checkout details the customer explicitly stated in the conversation. */
  checkout: { city?: string; street?: string; phone?: string };
  /** Natural-language reply shown to the customer. */
  reply: string;
}

/** Resolved checkout details plus the fields that are still missing. */
interface ResolvedCheckout {
  city?: string;
  street?: string;
  phone?: string;
  paymentMethod: string;
  couponCode?: string;
  giftCardCode?: string;
  customerNotes?: string;
  missing: string[];
}

/**
 * Structured output contract for the shopping assistant. The model must resolve
 * contextual references ("اياه"، "ضيفه"، "الأرخص"، "it") against the conversation
 * history and the catalog IDs supplied in the system instruction.
 */
const AI_DECISION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    action: {
      type: Type.STRING,
      enum: ['ADD_TO_CART', 'BUY_NOW', 'CHAT_REPLY'],
      description:
        'ADD_TO_CART إذا طلب العميل إضافة المنتج إلى السلة فقط، BUY_NOW إذا طلب شراءه أو إتمام الطلب، وإلا CHAT_REPLY لسؤال أو توصية أو توافق.',
    },
    productId: {
      type: Type.STRING,
      nullable: true,
      description: 'قيمة ID للمنتج المقصود من الكتالوج (محل النقاش في المحادثة). لا تخترع قيماً.',
    },
    variantId: {
      type: Type.STRING,
      nullable: true,
      description: 'معرّف المتغير/اللون المقصود من الكتالوج إن حُدد صراحةً أو من السياق.',
    },
    quantity: {
      type: Type.INTEGER,
      nullable: true,
      description: 'الكمية المطلوبة. اتركها فارغة أو 1 عند عدم ذكر كمية.',
    },
    city: {
      type: Type.STRING,
      nullable: true,
      description: 'مدينة التوصيل، فقط إذا ذكرها العميل صراحةً أثناء الشراء.',
    },
    street: {
      type: Type.STRING,
      nullable: true,
      description: 'عنوان/شارع التوصيل، فقط إذا ذكره العميل صراحةً أثناء الشراء.',
    },
    phone: {
      type: Type.STRING,
      nullable: true,
      description: 'رقم هاتف العميل، فقط إذا ذكره صراحةً أثناء الشراء.',
    },
    reply: {
      type: Type.STRING,
      description: 'الرد النصي الموجّه للعميل بلغته (العربية افتراضاً).',
    },
  },
  required: ['action', 'reply'],
  propertyOrdering: ['action', 'productId', 'variantId', 'quantity', 'city', 'street', 'phone', 'reply'],
};

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
    private readonly ordersService: OrdersService,
  ) {}

  async chat(request: ChatRequestDto, user?: ChatUser): Promise<AiChatResponse> {
    // The chat endpoint is the customer's last line of support: it must always
    // come back with a readable Arabic answer. Any failure (catalog load, LLM
    // outage, unexpected runtime error) is converted into a structured reply
    // instead of an error status the UI would surface as a blank/silent failure.
    try {
      const products = await this.loadProducts();

      // A single structured LLM call resolves the intent *and* the product the
      // customer is referring to, so contextual follow-ups ("ضيفه"، "بدي تشتريلي اياه")
      // are understood without repeating the product name.
      const decision = await this.planTurnWithFallback(request, products);

      if (decision.action === 'CHAT_REPLY') {
        return this.finalize({
          action: 'NONE',
          answer: decision.reply || 'لم أفهم طلبك تماماً. هل يمكنك توضيح ما تبحث عنه؟',
        });
      }

      return this.finalize(await this.executeAction(decision, request, products, user));
    } catch (error) {
      this.logUnexpectedError(error);
      const reason =
        error instanceof HttpException
          ? this.exceptionMessage(error)
          : 'تعذّر إكمال طلبك الآن بسبب خطأ غير متوقع. يرجى المحاولة مرة أخرى بعد قليل.';
      return this.finalize({ action: 'NONE', answer: reason });
    }
  }

  /** Guarantees every response carries a non-empty customer-facing `answer`. */
  private finalize(response: AiChatResponse): AiChatResponse {
    const answer = typeof response.answer === 'string' ? response.answer.trim() : '';
    return answer
      ? { ...response, answer }
      : { ...response, answer: 'لم أتمكن من تجهيز رد واضح. هل يمكنك إعادة صياغة طلبك؟' };
  }

  /* ------------------------------------------------------------------ */
  /* LLM planning (intent + contextual product resolution)                */
  /* ------------------------------------------------------------------ */

  /** Runs the LLM planner, degrading to a deterministic catalog answer on failure. */
  private async planTurnWithFallback(
    request: ChatRequestDto,
    products: ProductWithVariants[],
  ): Promise<AiDecision> {
    try {
      return await this.planTurn(request, products);
    } catch (error) {
      this.logger.warn(
        `Gemini planning failed (${this.describeError(error)}); answering "${request.message.trim().slice(0, 120)}" from the deterministic catalog fallback.`,
      );
      return this.buildFallbackDecision(request, products);
    }
  }

  /** Model IDs tried in order: `GEMINI_MODEL`, then the configured/alternate model. */
  private getModelCandidates(): string[] {
    const primary = this.config.get<string>('GEMINI_MODEL')?.trim() || DEFAULT_GEMINI_MODEL;
    const fallback =
      this.config.get<string>('GEMINI_MODEL_FALLBACK')?.trim() || DEFAULT_GEMINI_MODEL_FALLBACK;
    return Array.from(new Set([primary, fallback].filter((model): model is string => !!model)));
  }

  private async planTurn(
    request: ChatRequestDto,
    products: ProductWithVariants[],
  ): Promise<AiDecision> {
    const apiKey = this.config.get<string>('GEMINI_API_KEY')?.trim();
    if (!apiKey) {
      this.logger.error(
        'Gemini API key is missing: GEMINI_API_KEY is not set (or empty) in the backend environment.',
      );
      throw new ServiceUnavailableException('المساعد الذكي غير متاح حالياً. يرجى المحاولة لاحقاً.');
    }

    const transcript = (request.history ?? [])
      .slice(-MAX_HISTORY_TURNS)
      .map((turn) => `${turn.role === 'user' ? 'العميل' : 'المساعد'}: ${turn.content.trim().slice(0, 1200)}`)
      .join('\n');
    const contents = [transcript, `العميل: ${request.message.trim()}`]
      .filter(Boolean)
      .join('\n');

    const client = new GoogleGenAI({ apiKey });
    const models = this.getModelCandidates();
    let lastError: unknown;

    for (const model of models) {
      try {
        const raw = await this.generateWithTimeout(client, model, contents, products);
        return this.parseDecision(raw);
      } catch (error) {
        lastError = error;
        this.logGeminiError(model, error);

        // A hard timeout already consumed the latency budget — retrying the
        // fallback model would double the wait, so bail out immediately.
        if (error instanceof GatewayTimeoutException) break;
        // An invalid/revoked key fails identically on every model: stop retrying.
        if (this.isAuthError(error)) break;
      }
    }

    if (lastError instanceof HttpException) throw lastError;
    throw new HttpException(
      'تعذّر الحصول على رد حالياً. يرجى المحاولة بعد قليل.',
      HttpStatus.BAD_GATEWAY,
    );
  }

  /** One Gemini attempt against a single model, guarded by a hard timeout. */
  private async generateWithTimeout(
    client: GoogleGenAI,
    model: string,
    contents: string,
    products: ProductWithVariants[],
  ): Promise<string> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined;
    try {
      const response = await Promise.race([
        client.models.generateContent({
          model,
          contents,
          config: {
            systemInstruction: this.buildSystemInstruction(products),
            responseMimeType: 'application/json',
            responseSchema: AI_DECISION_SCHEMA,
            maxOutputTokens: 2048,
            temperature: 0.2,
          },
        }),
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(
            () => reject(new GatewayTimeoutException('انتهت مهلة الرد. يرجى المحاولة مرة أخرى.')),
            REQUEST_TIMEOUT_MS,
          );
        }),
      ]);
      const raw = response.text?.trim();
      if (!raw) throw new Error('Empty Gemini response');
      return raw;
    } finally {
      if (timeoutId) clearTimeout(timeoutId);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Error logging                                                       */
  /* ------------------------------------------------------------------ */

  /**
   * Dumps the full underlying Gemini/HTTP error (status, message, response body,
   * cause and stack) so the exact API failure is visible in the backend logs.
   */
  private logGeminiError(model: string, error: unknown): void {
    const err = error as {
      name?: string;
      status?: unknown;
      statusCode?: unknown;
      code?: unknown;
      message?: string;
      response?: unknown;
      errorDetails?: unknown;
      cause?: unknown;
    } | null;

    this.logger.error(
      `Gemini request failed [model=${model}] name=${err?.name ?? 'Error'} ` +
        `status=${this.stringify(err?.status ?? err?.statusCode)} code=${this.stringify(err?.code)} ` +
        `message=${err?.message ?? 'no message'}`,
    );
    if (err?.response !== undefined) {
      this.logger.error(`[model=${model}] .response: ${this.stringify(err.response)}`);
    }
    if (err?.errorDetails !== undefined) {
      this.logger.error(`[model=${model}] .errorDetails: ${this.stringify(err.errorDetails)}`);
    }
    if (err?.cause !== undefined) {
      this.logger.error(`[model=${model}] .cause: ${this.stringify(err.cause)}`);
    }
    if (error instanceof Error && error.stack) {
      this.logger.error(`[model=${model}] stack: ${error.stack}`);
    }
  }

  private logUnexpectedError(error: unknown): void {
    this.logger.error(`AI chat request failed unexpectedly: ${this.stringify(error)}`);
    if (error instanceof Error && error.stack) {
      this.logger.error(`stack: ${error.stack}`);
    }
  }

  /** True when the failure is key/project-level (retrying another model is futile). */
  private isAuthError(error: unknown): boolean {
    const err = error as { status?: unknown; statusCode?: unknown; message?: string } | null;
    const status = Number(err?.status ?? err?.statusCode);
    if (status === 401 || status === 403) return true;
    const message = String(err?.message ?? '').toUpperCase();
    return (
      message.includes('API KEY') ||
      message.includes('API_KEY') ||
      message.includes('UNAUTHENTICATED') ||
      message.includes('PERMISSION_DENIED')
    );
  }

  /** Short one-line description of an error for warn logs. */
  private describeError(error: unknown): string {
    const err = error as { status?: unknown; statusCode?: unknown; message?: string } | null;
    const status = err?.status ?? err?.statusCode;
    return `${err?.message ?? String(error)}${status !== undefined ? ` [status=${this.stringify(status)}]` : ''}`;
  }

  private stringify(value: unknown): string {
    if (value === undefined) return 'undefined';
    if (value === null) return 'null';
    if (typeof value === 'string') return value;
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }

  private buildSystemInstruction(products: ProductWithVariants[]): string {
    const catalog = this.buildCatalog(products);
    return [
      'أنت مساعد التسوق الرسمي لمتجر PadHouse الفلسطيني المتخصص بملحقات iPad.',
      'مهمتك فهم طلب العميل داخل سياق المحادثة كاملاً ثم تحديد الإجراء المناسب.',
      '',
      'قواعد أساسية:',
      '- استخدم سياق المحادثة السابقة (رسائل العميل والمساعد) لحل الإشارات والضمائر مثل: "اياه"، "إياه"، "هذا"، "هاد"، "الأول"، "الأرخص"، "المذكور"، "it"، "that one"، "the cheap one".',
      '- إذا كان المساعد قد اقترح منتجاً في ردٍّ سابق وطلب العميل إضافته أو شراءه، فاعتبر ذلك المنتج هو المقصود دون مطالبة العميل بتكرار اسمه.',
      '- عند طلب الإضافة إلى السلة فقط (مثل: "ضيفه"، "أضفه"، "حطه بالسلة"، "خليه بالسلة"، "add it") أعد action = "ADD_TO_CART".',
      '- عند طلب الشراء أو إتمام الطلب (مثل: "بدي تشتريلي اياه"، "اطلبلي هاد"، "اشتريه"، "buy it") أعد action = "BUY_NOW".',
      '- إن لم يكن الطلب إضافة أو شراءً واضحاً (سؤال، توصية، مقارنة، توافق، معلومات) أعد action = "CHAT_REPLY" واكتب جوابك في الحقل reply.',
      '- حدد المنتج المقصود من الكتالوج وأعد حقل productId بقيمة ID الظاهرة في الكتالوج، واللون المطابق في variantId، والكمية في quantity.',
      '- لا تخترع productId أو variantId غير موجود في الكتالوج. إن لم تتمكن من تحديد المنتج بثقة، أعد action = "CHAT_REPLY" واسأل العميل عن المنتج المقصود.',
      '- إذا كانت المحادثة قد بدأت عملية شراء ولم تكتمل وطلب المساعد بيانات ناقصة (المدينة/العنوان/الهاتف)، فأعد action = "BUY_NOW" مع نفس المنتج واستخرج البيانات التي ذكرها العميل في الحقول city/street/phone.',
      '- املأ الحقول city/street/phone فقط إذا ذكرها العميل صراحةً في رسالته أو في سياق المحادثة.',
      '- أجب بلغة العميل، وبالعربية عند عدم وضوح اللغة. كن موجزاً وودوداً.',
      '- اعتمد حصراً على الكتالوج أدناه عند ذكر السعر أو التوافق أو المخزون أو الميزات، ولا تخترع منتجاً أو سعراً أو توافقاً.',
      '- اعرض الأسعار بالشيكل (₪)، ولا تذكر الـ IDs أو أكواد المتغيرات في نص الرد للعميل.',
      '- إذا لم تتوفر معلومة، صرّح بذلك واقترح التواصل مع خدمة العملاء.',
      '',
      `كتالوج المنتجات الحالي (مع المعرفات):\n${catalog || 'الكتالوج غير متاح حالياً.'}`,
    ].join('\n');
  }

  /**
   * Renders the catalog for the model. Each product exposes its `ID` and each
   * variant exposes its `ID`, so the model can return exact identifiers that the
   * backend resolves back to real rows.
   */
  private buildCatalog(products: ProductWithVariants[]): string {
    return products
      .map((product) => {
        const price = product.salePrice ?? product.basePrice;
        const totalStock = product.variants.reduce(
          (sum, variant) => sum + (variant.inventory?.currentStock ?? 0),
          0,
        );
        const variants = product.variants.length
          ? product.variants
              .map(
                (variant) =>
                  `ID=${variant.id} (${variant.colorNameAr}, مخزون ${variant.inventory?.currentStock ?? 0})`,
              )
              .join(' ؛ ')
          : 'لا يوجد';
        const compatibility = Array.isArray(product.ipadCompatibility)
          ? product.ipadCompatibility.join('، ')
          : String(product.ipadCompatibility ?? '');
        return [
          `[ID: ${product.id}] ${product.nameAr}${product.nameEn ? ` / ${product.nameEn}` : ''} (SKU: ${product.sku})`,
          `السعر: ${price.toString()} ₪${product.salePrice ? ` (الأصلي ${product.basePrice.toString()} ₪)` : ''}`,
          `المتغيرات: ${variants}`,
          `التوافق: ${compatibility || 'غير محدد'}`,
          `المخزون الكلي: ${totalStock}`,
          `الضمان: ${product.warrantyMonths} شهر`,
          `الوصف: ${product.descriptionAr}`,
        ].join(' | ');
      })
      .join('\n');
  }

  private parseDecision(raw: string): AiDecision {
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(raw) as Record<string, unknown>;
    } catch {
      // The model answered with plain prose instead of JSON — surface it as-is.
      return { action: 'CHAT_REPLY', checkout: {}, reply: raw };
    }

    const rawAction = String(parsed.action ?? '').toUpperCase();
    const action: AiPlannedAction =
      rawAction === 'ADD_TO_CART' || rawAction === 'BUY_NOW' ? rawAction : 'CHAT_REPLY';

    return {
      action,
      productId: this.toOptionalString(parsed.productId),
      variantId: this.toOptionalString(parsed.variantId),
      quantity: this.toPositiveInt(parsed.quantity),
      checkout: {
        city: this.toOptionalString(parsed.city),
        street: this.toOptionalString(parsed.street),
        phone: this.toOptionalString(parsed.phone),
      },
      reply: typeof parsed.reply === 'string' ? parsed.reply.trim() : '',
    };
  }

  /* ------------------------------------------------------------------ */
  /* Deterministic fallback (used when Gemini is unavailable)             */
  /* ------------------------------------------------------------------ */

  /**
   * Answers the common catalog/action questions directly from the loaded catalog
   * so a Gemini outage (bad key, quota, deprecated model, network error) never
   * leaves the customer with a bare "try again later" message.
   */
  private buildFallbackDecision(
    request: ChatRequestDto,
    products: ProductWithVariants[],
  ): AiDecision {
    const quantity = this.extractQuantity(request.message);
    const replyOnly = (reply: string): AiDecision => ({ action: 'CHAT_REPLY', checkout: {}, quantity, reply });

    if (products.length === 0) {
      return replyOnly('كتالوج المنتجات غير متاح حالياً. يرجى المحاولة بعد قليل.');
    }

    const text = this.normalize(request.message);
    const has = (keywords: string[]) => keywords.some((keyword) => text.includes(keyword));
    const byPrice = this.sortByPrice(products);
    const cheapest = byPrice[0];
    const priciest = byPrice[byPrice.length - 1];

    // "Add to cart" / "buy" intents: resolve the referenced product, or fall
    // back to the cheapest one when the customer asks for it implicitly.
    if (has(FALLBACK_KEYWORDS.addToCart) || has(FALLBACK_KEYWORDS.buyNow)) {
      const wantsBuy = has(FALLBACK_KEYWORDS.buyNow);
      let candidates = this.resolveCandidates(request.message, products);
      if (candidates.length === 0 && has(FALLBACK_KEYWORDS.cheapest)) {
        candidates = [{ product: cheapest, quantity }];
      }
      if (candidates.length === 1) {
        return {
          action: wantsBuy ? 'BUY_NOW' : 'ADD_TO_CART',
          productId: candidates[0].product.id,
          variantId: candidates[0].variant?.id,
          quantity,
          checkout: {},
          reply: '',
        };
      }
      if (candidates.length > 1) {
        const names = candidates.slice(0, 4).map((c) => `"${c.product.nameAr}"`).join('، ');
        return replyOnly(`وجدت أكثر من منتج مطابق: ${names}. أيّها تقصد؟`);
      }
      return replyOnly(
        wantsBuy
          ? 'حدد المنتج الذي تريد شراءه (اسمه أو رمزه) وسأكمل الطلب مباشرةً.'
          : 'حدد المنتج الذي تريد إضافته إلى سلة التسوق (اسمه أو رمزه).',
      );
    }

    if (has(FALLBACK_KEYWORDS.cheapest)) {
      return replyOnly(this.priceAnswer('أرخص منتج لدينا حالياً', cheapest));
    }

    if (has(FALLBACK_KEYWORDS.priciest)) {
      return replyOnly(this.priceAnswer('أفخم منتج لدينا حالياً', priciest));
    }

    // Product lookup by name / SKU / colour token.
    const candidates = this.resolveCandidates(request.message, products);
    if (candidates.length === 1) {
      return replyOnly(this.productAnswer(candidates[0].product));
    }
    if (candidates.length > 1) {
      return replyOnly(this.recommendationAnswer(candidates.map((c) => c.product)));
    }

    if (has(FALLBACK_KEYWORDS.recommend)) {
      return replyOnly(this.recommendationAnswer(byPrice.slice(0, 3)));
    }

    // Unknown intent: stay helpful with a short catalog summary instead of an error.
    return replyOnly(
      [
        'المساعد الذكي مشغول قليلاً الآن، لكنني أستطيع مساعدتك فوراً بالبيانات المتوفرة:',
        this.priceAnswer('أرخص منتج لدينا', cheapest),
        'يمكنك أن تسألني عن أرخص منتج، أو أن تطلب إضافة منتج إلى السلة أو شراءه.',
      ].join('\n'),
    );
  }

  /** Sorts products ascending by their effective (sale-aware) price. */
  private sortByPrice(products: ProductWithVariants[]): ProductWithVariants[] {
    return [...products].sort((a, b) => this.effectivePrice(a) - this.effectivePrice(b));
  }

  private effectivePrice(product: ProductWithVariants): number {
    return Number(product.salePrice ?? product.basePrice);
  }

  private priceAnswer(prefix: string, product: ProductWithVariants): string {
    const totalStock = product.variants.reduce(
      (sum, variant) => sum + (variant.inventory?.currentStock ?? 0),
      0,
    );
    const stock = totalStock > 0 ? ` (المتوفر: ${totalStock} قطعة)` : ' (غير متوفر حالياً)';
    return `${prefix}: "${product.nameAr}" بسعر ${this.effectivePrice(product)} ₪${stock}.`;
  }

  private productAnswer(product: ProductWithVariants): string {
    const compatibility = Array.isArray(product.ipadCompatibility)
      ? product.ipadCompatibility.join('، ')
      : String(product.ipadCompatibility ?? '');
    return [
      this.priceAnswer('إليك التفاصيل', product),
      `التوافق: ${compatibility || 'غير محدد'}.`,
      `الضمان: ${product.warrantyMonths} شهر.`,
    ].join(' ');
  }

  private recommendationAnswer(products: ProductWithVariants[]): string {
    const lines = products
      .slice(0, 4)
      .map((product, index) => `${index + 1}. "${product.nameAr}" — ${this.effectivePrice(product)} ₪`);
    return ['إليك أبرز الخيارات المتوفرة:', ...lines].join('\n');
  }

  /* ------------------------------------------------------------------ */
  /* Action execution                                                    */
  /* ------------------------------------------------------------------ */

  private async executeAction(
    decision: AiDecision,
    request: ChatRequestDto,
    products: ProductWithVariants[],
    user?: ChatUser,
  ): Promise<AiChatResponse> {
    if (products.length === 0) {
      return {
        action: 'NEEDS_INFO',
        answer: 'كتالوج المنتجات غير متاح حالياً. يرجى المحاولة بعد قليل.',
      };
    }

    // Resolve the product the model pointed at, then fall back to a deterministic
    // name/SKU match against the current message if the model omitted or invented it.
    let product = decision.productId
      ? products.find((candidate) => candidate.id === decision.productId)
      : undefined;
    let variant =
      product && decision.variantId
        ? product.variants.find((candidate) => candidate.id === decision.variantId)
        : undefined;

    if (!product) {
      const candidates = this.resolveCandidates(request.message, products);
      if (candidates.length > 1) {
        const names = candidates.slice(0, 4).map((c) => `"${c.product.nameAr}"`).join('، ');
        return { action: 'NEEDS_INFO', answer: `وجدت أكثر من منتج مطابق: ${names}. أيّها تقصد؟` };
      }
      if (candidates.length === 1) {
        product = candidates[0].product;
        variant = candidates[0].variant;
      }
    }

    if (!product) {
      return {
        action: 'NEEDS_INFO',
        answer:
          decision.reply ||
          (decision.action === 'BUY_NOW'
            ? 'حدد المنتج الذي تريد شراءه وسأكمل الطلب مباشرةً.'
            : 'حدد المنتج الذي تريد إضافته إلى سلة التسوق.'),
      };
    }

    // A single-variant product needs no colour question.
    if (!variant && product.variants.length === 1) variant = product.variants[0];

    const quantity = decision.quantity ?? this.extractQuantity(request.message);
    const productRef = this.toProductRef(product, variant, quantity);

    const profileId = user?.customerProfileId;
    if (!user?.id || !profileId) {
      return {
        action: 'NEEDS_INFO',
        requiresAuth: true,
        product: productRef,
        answer:
          decision.action === 'BUY_NOW'
            ? 'لإتمام عملية الشراء يجب تسجيل الدخول إلى حسابك أولاً، وبعدها سأكمل الطلب نيابةً عنك.'
            : 'لإضافة المنتج إلى سلة التسوق يجب تسجيل الدخول إلى حسابك أولاً.',
      };
    }

    try {
      if (decision.action === 'ADD_TO_CART') {
        const cart = await this.cartService.addItem(profileId, {
          productId: product.id,
          variantId: variant?.id,
          quantity,
        });
        return {
          action: 'ADDED_TO_CART',
          product: productRef,
          cart,
          answer: this.addedToCartAnswer(product, variant, quantity, cart),
        };
      }

      // ── Buy / checkout ──────────────────────────────────────────────
      // Ask which colour to buy when the product has several variants and the
      // customer did not pick one (variant ambiguity must never be guessed).
      if (!variant && product.variants.length > 1) {
        const colors = product.variants.map((v) => v.colorNameAr).join('، ');
        return {
          action: 'NEEDS_INFO',
          product: productRef,
          missingFields: ['variant'],
          answer: `المنتج "${product.nameAr}" متوفر بعدة ألوان: ${colors}. أيّ لون تريد؟`,
        };
      }

      const checkout = await this.resolveCheckout(request, profileId, decision.checkout);
      if (checkout.missing.length > 0) {
        return {
          action: 'NEEDS_INFO',
          product: productRef,
          missingFields: checkout.missing,
          answer: this.askForCheckoutAnswer(checkout.missing),
        };
      }

      // Make sure the product is in the cart without double-counting an
      // identical line that is already there.
      await this.ensureInCart(profileId, product.id, variant?.id, quantity);

      const order = await this.ordersService.createOrder(user.id, profileId, {
        city: checkout.city,
        street: checkout.street,
        phone: checkout.phone,
        paymentMethod: checkout.paymentMethod as PaymentMethodType,
        couponCode: checkout.couponCode,
        giftCardCode: checkout.giftCardCode,
        customerNotes: checkout.customerNotes,
      });

      return {
        action: 'ORDER_CREATED',
        product: productRef,
        order,
        answer: this.orderCreatedAnswer(order),
      };
    } catch (error) {
      // Surface the exact reason (out of stock, invalid phone, empty cart, …)
      // instead of failing silently so the customer can fix it in chat.
      const reason =
        error instanceof HttpException
          ? this.exceptionMessage(error)
          : 'تعذّر إتمام العملية حالياً. يرجى المحاولة بعد قليل.';
      return { action: 'NEEDS_INFO', product: productRef, answer: reason };
    }
  }

  /** Adds the product only when an identical line is not already in the cart. */
  private async ensureInCart(
    profileId: string,
    productId: string,
    variantId: string | undefined,
    quantity: number,
  ) {
    const cart = await this.prisma.cart.findUnique({
      where: { customerProfileId: profileId },
      include: { items: true },
    });
    const alreadyInCart = cart?.items.some(
      (item) => item.productId === productId && item.variantId === variantId,
    );
    if (alreadyInCart) return;

    await this.cartService.addItem(profileId, { productId, variantId, quantity });
  }

  /* ------------------------------------------------------------------ */
  /* Checkout resolution                                                 */
  /* ------------------------------------------------------------------ */

  private async resolveCheckout(
    request: ChatRequestDto,
    profileId: string,
    extracted?: { city?: string; street?: string; phone?: string },
  ): Promise<ResolvedCheckout> {
    const provided = request.checkout ?? {};
    // Precedence: details stated in the conversation, then explicit client
    // payload, then the customer's saved default address.
    let city = extracted?.city || provided.city?.trim() || undefined;
    let street = extracted?.street || provided.street?.trim() || undefined;
    let phone = extracted?.phone || provided.phone?.trim() || undefined;

    if (!city || !street || !phone) {
      const address = await this.prisma.address.findFirst({
        where: { customerProfileId: profileId },
        orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      });
      city ||= address?.city;
      street ||= address?.street;
      phone ||= address?.phone;
    }

    const missing: string[] = [];
    if (!city) missing.push('city');
    if (!street) missing.push('street');
    // The delivery phone is required by the order/address record, so ask for it
    // explicitly instead of creating an order the courier cannot call.
    if (!phone) missing.push('phone');

    return {
      city,
      street,
      phone,
      paymentMethod: provided.paymentMethod?.trim() || PaymentMethodType.CASH_ON_DELIVERY,
      couponCode: provided.couponCode?.trim() || undefined,
      giftCardCode: provided.giftCardCode?.trim() || undefined,
      customerNotes: provided.customerNotes?.trim() || undefined,
      missing,
    };
  }

  /* ------------------------------------------------------------------ */
  /* Product + variant resolution                                        */
  /* ------------------------------------------------------------------ */

  private async loadProducts(): Promise<ProductWithVariants[]> {
    return this.prisma.product.findMany({
      where: { isActive: true },
      include: { variants: { include: { inventory: true } }, images: true },
      orderBy: [{ isFeatured: 'desc' }, { nameAr: 'asc' }],
    });
  }

  /**
   * Deterministic fallback used only when the model requested an action but did
   * not return a resolvable catalog ID. Scores every active product against the
   * message by SKU and by name tokens, then returns the top-scoring product(s).
   */
  private resolveCandidates(message: string, products: ProductWithVariants[]): ResolvedCandidate[] {
    const text = this.normalize(message);
    const quantity = this.extractQuantity(message);

    let bestScore = 0;
    const winners: ProductWithVariants[] = [];

    for (const product of products) {
      let score = 0;
      if (product.sku && text.includes(this.normalize(product.sku))) score += 5;

      const tokens = new Set([
        ...this.nameTokens(product.nameAr),
        ...this.nameTokens(product.nameEn),
      ]);
      for (const token of tokens) {
        if (token.length >= 2 && text.includes(token)) score += token.length;
      }

      if (score === 0) continue;
      if (score > bestScore) {
        bestScore = score;
        winners.length = 0;
        winners.push(product);
      } else if (score === bestScore) {
        winners.push(product);
      }
    }

    return winners.map((product) => ({
      product,
      variant: this.resolveVariant(product, text),
      quantity,
    }));
  }

  /** Matches a variant by its SKU or by its (normalized) Arabic colour name. */
  private resolveVariant(product: ProductWithVariants, normalizedMessage: string) {
    if (product.variants.length <= 1) return product.variants[0];
    return product.variants.find((variant) => {
      if (variant.sku && normalizedMessage.includes(this.normalize(variant.sku))) return true;
      const color = this.normalize(variant.colorNameAr);
      if (color && normalizedMessage.includes(color)) return true;
      return this.nameTokens(variant.colorNameAr).some(
        (token) => token.length >= 3 && normalizedMessage.includes(token),
      );
    });
  }

  /** Splits a product name into searchable tokens (Arabic + English). */
  private nameTokens(value: string): string[] {
    return this.normalize(value)
      .split(' ')
      .filter((token) => token.length >= 2);
  }

  /* ------------------------------------------------------------------ */
  /* Reply helpers                                                       */
  /* ------------------------------------------------------------------ */

  private toProductRef(
    product: ProductWithVariants,
    variant: ProductWithVariants['variants'][number] | undefined,
    quantity: number,
  ): AiProductRef {
    return {
      id: product.id,
      sku: product.sku,
      nameAr: product.nameAr,
      quantity,
      variantId: variant?.id,
      color: variant?.colorNameAr,
    };
  }

  private addedToCartAnswer(
    product: ProductWithVariants,
    variant: ProductWithVariants['variants'][number] | undefined,
    quantity: number,
    cart: { itemCount?: number; total?: number },
  ): string {
    const color = variant?.colorNameAr ? ` (اللون: ${variant.colorNameAr})` : '';
    const count = cart.itemCount ?? 0;
    const total = cart.total ?? 0;
    return `تمت إضافة "${product.nameAr}"${color} بكمية ${quantity} إلى سلة التسوق. سلتك الآن تحتوي على ${count} قطعة بإجمالي ${total} ₪. (لم يتم إنشاء أي طلب بعد — أخبرني إن أردت إتمام الشراء.)`;
  }

  private orderCreatedAnswer(order: {
    orderNumber: string;
    grandTotal: unknown;
    status: string;
  }): string {
    const total = Number(order.grandTotal);
    const status = ORDER_STATUS_LABELS[order.status] || order.status;
    return `تم إنشاء طلبك بنجاح! رقم الطلب: ${order.orderNumber}، الإجمالي: ${total} ₪، الحالة الحالية: ${status}. يمكنك متابعة الطلب لحظة بلحظة من صفحة تتبع الطلبات.`;
  }

  private askForCheckoutAnswer(missing: string[]): string {
    const labels: Record<string, string> = {
      city: 'المدينة/المحافظة',
      street: 'العنوان (الشارع والتفاصيل)',
      phone: 'رقم الهاتف',
      variant: 'اللون/المتغير',
    };
    const list = missing.map((field) => labels[field] || field).join('، ');
    return `لإتمام الطلب أحتاج إلى: ${list}. أرسلها لي وسأكمل عملية الشراء مباشرةً.`;
  }

  private exceptionMessage(error: HttpException): string {
    const response = error.getResponse();
    if (typeof response === 'string') return response;
    const message = (response as { message?: string | string[] })?.message;
    if (Array.isArray(message)) return message.join('، ');
    return message || 'تعذّر إتمام العملية حالياً.';
  }

  /* ------------------------------------------------------------------ */
  /* Value coercion + text utilities                                     */
  /* ------------------------------------------------------------------ */

  private toOptionalString(value: unknown): string | undefined {
    if (typeof value !== 'string') return undefined;
    const trimmed = value.trim();
    return trimmed ? trimmed : undefined;
  }

  private toPositiveInt(value: unknown): number | undefined {
    if (value === null || value === undefined || value === '') return undefined;
    const num = typeof value === 'number' ? value : Number(value);
    if (!Number.isFinite(num)) return undefined;
    const int = Math.floor(num);
    return int >= 1 && int <= 99 ? int : undefined;
  }

  /** Extracts the first quantity in the message (Arabic-Indic digits supported). */
  private extractQuantity(message: string): number {
    const match = message.match(/[0-9٠-٩]+/);
    if (!match) return 1;
    const western = match[0].replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));
    const value = Number(western);
    return Number.isFinite(value) && value >= 1 && value <= 99 ? value : 1;
  }

  /**
   * Folds Arabic orthography and punctuation so product names can be matched
   * against free-form messages (أ/إ/آ→ا، ة→ه، ى→ي، إزالة التشكيل).
   */
  private normalize(value: string): string {
    return value
      .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // diacritics + tatweel
      .replace(/[أإآٱ]/g, 'ا')
      .replace(/ى/g, 'ي')
      .replace(/ة/g, 'ه')
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }
}
