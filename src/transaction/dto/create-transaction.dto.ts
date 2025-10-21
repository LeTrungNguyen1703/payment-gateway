import { IsNotEmpty, IsNumber, IsString, IsOptional, IsUUID, Min, IsEnum, IsIP } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum TransactionStatus {
  PENDING = 'pending',
  AWAITING_PAYMENT = 'awaiting_payment',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  REFUNDED = 'refunded'
}

export class CreateTransactionDto {
  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
    format: 'uuid',
  })
  @IsNotEmpty()
  @IsUUID()
  user_id: string;

  @ApiPropertyOptional({
    description: 'Payment method ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  payment_method_id?: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 100000,
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
