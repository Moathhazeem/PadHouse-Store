import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatRequestDto } from './dto/chat-request.dto';
import { AiService } from './ai.service';
import { OptionalJwtAuthGuard } from '../common/guards/optional-jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('AI Assistant')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

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
}
