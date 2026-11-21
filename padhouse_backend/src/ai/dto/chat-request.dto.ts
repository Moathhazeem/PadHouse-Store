import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  ValidateNested,
} from 'class-validator';

export class ChatTurnDto {
  @IsIn(['user', 'model'])
  role: 'user' | 'model';

  @IsString()
  @MaxLength(1200)
  content: string;
}

/**
 * Optional checkout details supplied by the client (website / mobile app).
 * When the customer asks the assistant to buy a product, these fields let the
 * assistant complete the order in one turn instead of asking for them again.
 * Anything still missing is resolved from the customer's saved address on the
 * backend, and whatever remains is requested as a follow-up question.
 */
export class ChatCheckoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(240)
  street?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  couponCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  giftCardCode?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  customerNotes?: string;
}

export class ChatRequestDto {
  @IsString()
  @MaxLength(1200)
  message: string;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(12)
  @ValidateNested({ each: true })
  @Type(() => ChatTurnDto)
  history?: ChatTurnDto[];

  @IsOptional()
  @ValidateNested()
  @Type(() => ChatCheckoutDto)
  checkout?: ChatCheckoutDto;
}
