import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatRequestDto } from './dto/chat-request.dto';
import { CreateDraftPurchaseOrderDto, ReorderSuggestionsDto } from './dto/inventory-ai.dto';
import { AiService } from './ai.service';
import { AiInventoryService } from './ai-inventory.service';
import { PurchaseOrderActor } from '../purchase-orders/purchase-orders.service';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';

/** Shape of the authenticated principal injected by the JWT strategy. */
interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: string;
}

@ApiTags('AI Assistant')
@Controller('ai')
export class AiController {
  constructor(
    private readonly aiService: AiService,
    private readonly aiInventoryService: AiInventoryService,
  ) {}

  @Post('chat')
  // Guests can still chat, but a signed-in customer lets the assistant run the
  // real "add to cart" / "buy" actions on their shared backend cart.
  @UseGuards(OptionalJwtAuthGuard)
  @ApiOperation({ summary: 'Ask the PadHouse shopping assistant' })
  chat(
    @Body() body: ChatRequestDto,
    @CurrentUser() user?: { id?: string; fullName?: string; customerProfileId?: string },
  ) {
    return this.aiService.chat(body, user);
  }

  /* ------------------------------------------------------------------ */
  /* Purchase-management capabilities (admin-only)                       */
  /* ------------------------------------------------------------------ */

  /**
   * AI reorder suggestions. Read-only: analyses real inventory, sales and
   * purchase-order records and returns recommendations for the admin dashboard.
   */
  @Post('inventory/reorder-suggestions')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
  @ApiOperation({ summary: 'اقتراحات إعادة التوريد الذكية (لوحة الإدارة)' })
  reorderSuggestions(@Body() body: ReorderSuggestionsDto) {
    return this.aiInventoryService.getReorderSuggestions(body);
  }

  /**
   * AI draft purchase-order creation. On an explicit administrator request it
   * produces **DRAFT** purchase orders for review. It never approves, sends or
   * receives anything — those remain guarded, manual actions.
   */
  @Post('inventory/draft-purchase-order')
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SUPER_ADMIN', 'ADMIN', 'INVENTORY_MANAGER')
  @ApiOperation({ summary: 'إنشاء مسودة أمر شراء ذكية للمنتجات التي تحتاج توريداً (لوحة الإدارة)' })
  createDraftPurchaseOrder(@Body() body: CreateDraftPurchaseOrderDto, @CurrentUser() user: AuthUser) {
    return this.aiInventoryService.createDraftPurchaseOrders(body, this.actor(user));
  }

  private actor(user: AuthUser): PurchaseOrderActor {
    return { id: user?.id ?? null, fullName: user?.fullName ?? null };
  }
}
