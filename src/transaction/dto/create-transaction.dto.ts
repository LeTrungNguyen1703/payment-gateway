import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsUUID,
  Min,
  IsEnum,
  IsIP,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionStatus {
  PENDING = 'pending',
  AWAITING_PAYMENT = 'awaiting_payment',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded',
}

export class CreateTransactionDto {
  @ApiPropertyOptional({
    description: 'Payment method ID',
    example: '5e965704-4097-4d37-8dd8-0745948f996b',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  payment_method_id?: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 2000,
    minimum: 0,
  })
  @IsNotEmpty()
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiPropertyOptional({
    description: 'Currency code',
    example: 'VND',
    default: 'VND',
    maxLength: 3,
  })
  @IsOptional()
  @IsString()
  currency?: string = 'VND';

  @ApiPropertyOptional({
    description: 'Transaction description',
    example: 'Payment for order #12345',
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({
    description: 'Transaction status',
    enum: TransactionStatus,
    example: TransactionStatus.PENDING,
    default: TransactionStatus.PENDING,
  })
  @IsOptional()
  @IsEnum(TransactionStatus)
  status?: TransactionStatus = TransactionStatus.PENDING;

  @ApiPropertyOptional({
    description: 'Payment gateway provider',
    example: 'payos',
  })
  @IsOptional()
  @IsString()
  gateway_provider?: string;

  @ApiPropertyOptional({
    description: 'Client IP address',
    example: '192.168.1.1',
  })
  @IsOptional()
  @IsIP()
  ip_address?: string;

  @ApiPropertyOptional({
    description: 'User agent string',
    example: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  })
  @IsOptional()
  @IsString()
  user_agent?: string;

  @ApiPropertyOptional({
    description: 'Device identifier',
    example: 'device-123-abc',
  })
  @IsOptional()
  @IsString()
  device_id?: string;

  @ApiPropertyOptional({
    description: 'Gateway response data',
    example: { orderCode: '123456', checkoutUrl: 'https://...' },
  })
  @IsOptional()
  gateway_response?: any;
}
