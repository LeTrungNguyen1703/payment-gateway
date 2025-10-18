import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { PaymentMethodType, PaymentProvider, PaymentMethodStatus } from '../enums/payment-methods.enum';
import { IsNotExpired } from '../custom.decorator';
import { metadata } from 'reflect-metadata/no-conflict';

export class CreatePaymentMethodDto {
  @ApiProperty({
    description: 'Payment method type',
    enum: PaymentMethodType,
    example: PaymentMethodType.CARD,
  })
  @IsEnum(PaymentMethodType)
  @IsNotEmpty()
  type: PaymentMethodType;

  @ApiPropertyOptional({
    description: 'Provider name',
    enum: PaymentProvider,
    example: PaymentProvider.STRIPE,
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiProperty({
    description: 'Provider token or reference',
    example: 'tok_1ABCDEF...',
  })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiPropertyOptional({
    description: 'Last 4 digits of card',
    example: '4242',
    pattern: '^[0-9]{4}$',
  })
  @IsOptional()
  @Matches(/^[0-9]{4}$/, {
    message: 'Last four must be exactly 4 digits',
  })
  last_four?: string;

  @ApiPropertyOptional({
    description: 'Expiry month',
    example: 12,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  expiry_month?: number;

  @ApiPropertyOptional({
    description: 'Expiry year',
    example: 2030,
    minimum: 2000,
  })
  @IsOptional()
  @IsInt()
  @Min(new Date().getFullYear(), {
    message: 'Expiry year cannot be in the past',
  })
  @IsNotExpired() // ← Custom validator
  expiry_year?: number;

  @ApiPropertyOptional({
    description: 'Mark as default payment method',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @ApiPropertyOptional({
    description: 'Payment method status',
    enum: PaymentMethodStatus,
    example: PaymentMethodStatus.ACTIVE,
  })
  @IsOptional()
  @IsEnum(PaymentMethodStatus)
  status?: PaymentMethodStatus;

  @ApiPropertyOptional({
    description: 'Additional metadata',
    example: { brand: 'visa' },
  })
  @IsOptional()
  metadata?: any;

}
