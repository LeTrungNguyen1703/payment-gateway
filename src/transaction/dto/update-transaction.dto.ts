import { PartialType } from '@nestjs/mapped-types';
import { CreateTransactionDto } from './create-transaction.dto';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateTransactionDto extends PartialType(CreateTransactionDto) {
  @ApiPropertyOptional({
    description: 'External transaction ID from payment gateway',
    example: 'PAYOS_123456789',
  })
  @IsOptional()
  @IsString()
  external_transaction_id?: number;

  @ApiPropertyOptional({
    description: 'Fraud detection score (0-100)',
    example: 85,
    minimum: 0,
    maximum: 100,
  })
  @IsOptional()
  @IsNumber()
  fraud_score?: number;

  @ApiPropertyOptional({
    description: 'Fraud detection decision',
    example: 'accept',
    enum: ['accept', 'reject', 'review'],
  })
  @IsOptional()
  @IsString()
  fraud_decision?: string;

  @ApiPropertyOptional({
    description: 'Fraud detection provider name',
    example: 'stripe_radar',
  })
  @IsOptional()
  @IsString()
  fraud_provider?: string;

  @ApiPropertyOptional({
    description: 'Additional fraud detection metadata',
    example: { risk_level: 'low', rules_matched: [] },
  })
  @IsOptional()
  fraud_metadata?: any;

  @ApiPropertyOptional({
    description: 'Background job ID for async processing',
    example: 'job_123abc',
  })
  @IsOptional()
  @IsString()
  job_id?: string;
}
