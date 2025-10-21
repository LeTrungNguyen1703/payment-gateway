import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionResponse {
  @ApiProperty({
    description: 'Transaction ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id: string;

  @ApiProperty({
    description: 'User ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  user_id: string;

  @ApiPropertyOptional({
    description: 'Payment method ID',
    example: '123e4567-e89b-12d3-a456-426614174001',
  })
  payment_method_id?: string;

  @ApiProperty({
    description: 'Transaction amount',
    example: 100000,
  })
  amount: number;

  @ApiProperty({
    description: 'Currency code',
    example: 'VND',
  })
  currency: string;

  @ApiPropertyOptional({
    description: 'Transaction description',
    example: 'Payment for order #12345',
  })
  description?: string;

  @ApiProperty({
    description: 'Transaction status',
    example: 'completed',
  })
  status: string;

  @ApiPropertyOptional({
    description: 'Fraud detection score',
    example: 85,
  })
  fraud_score?: number;

  @ApiPropertyOptional({
    description: 'Fraud decision',
    example: 'accept',
  })
  fraud_decision?: string;

  @ApiPropertyOptional({
    description: 'External transaction ID from gateway',
    example: 'PAYOS_123456789',
  })
  external_transaction_id?: string;

  @ApiPropertyOptional({
    description: 'Payment gateway provider',
    example: 'payos',
  })
  gateway_provider?: string;

  @ApiPropertyOptional({
    description: 'Gateway response data',
  })
  gateway_response?: any;

  @ApiProperty({
    description: 'Transaction creation timestamp',
    example: '2025-10-21T10:30:00Z',
  })
  created_at: Date;

  @ApiProperty({
    description: 'Transaction last update timestamp',
    example: '2025-10-21T10:35:00Z',
  })
  updated_at: Date;

  @ApiPropertyOptional({
    description: 'Transaction completion timestamp',
    example: '2025-10-21T10:35:00Z',
  })
  completed_at?: Date;
}

export class TransactionStatsResponse {
  @ApiProperty({
    description: 'Total number of transactions',
    example: 150,
  })
  total: number;

  @ApiProperty({
    description: 'Number of completed transactions',
    example: 120,
  })
  completed: number;

  @ApiProperty({
    description: 'Number of pending transactions',
    example: 20,
  })
  pending: number;

  @ApiProperty({
    description: 'Number of failed transactions',
    example: 10,
  })
  failed: number;

  @ApiProperty({
    description: 'Total amount of completed transactions',
    example: 15000000,
  })
  totalAmount: number;
}

