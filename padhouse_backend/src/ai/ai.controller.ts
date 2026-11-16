import { Body, Controller, Post } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { ChatRequestDto } from './dto/chat-request.dto';
import { AiService } from './ai.service';

@ApiTags('AI Assistant')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Ask the PadHouse shopping assistant' })
  chat(@Body() body: ChatRequestDto) {
    return this.aiService.chat(body);
  }
}
