import { ApiProperty } from '@nestjs/swagger';
import { Expose } from 'class-transformer';
import { PaymentMethodType, PaymentProvider, PaymentMethodStatus } from '../enums/payment-methods.enum';

export interface PaymentMethod {
  id: string;
  user_id: string;
  type: string;
  provider: string | null;
  token: string;
  last_four: string | null;
  expiry_month: number | null;
  expiry_year: number | null;
  is_default: boolean | null;
  status: string | null;
  metadata: any | null;
  created_at: Date | null;
  updated_at: Date | null;
}

export class PaymentMethodResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  user_id: string;

  @ApiProperty({ enum: PaymentMethodType, example: PaymentMethodType.CARD })
  @Expose()
  type: string;

  @ApiProperty({ nullable: true, enum: PaymentProvider, example: PaymentProvider.STRIPE })
  @Expose()
  provider: string | null;

  @ApiProperty({ example: 'tok_1ABCDEF...' })
  @Expose()
  token: string;

  @ApiProperty({ nullable: true, example: '4242' })
  @Expose()
  last_four: string | null;

  @ApiProperty({ nullable: true, example: 12 })
  @Expose()
  expiry_month: number | null;

  @ApiProperty({ nullable: true, example: 2030 })
  @Expose()
  expiry_year: number | null;

  @ApiProperty({ nullable: true, example: false })
  @Expose()
  is_default: boolean | null;

  @ApiProperty({ nullable: true, enum: PaymentMethodStatus, example: PaymentMethodStatus.ACTIVE })
  @Expose()
  status: string | null;

  @ApiProperty({ nullable: true, example: { brand: 'visa' } })
  @Expose()
  metadata: any | null;

  @ApiProperty({ nullable: true })
  @Expose()
  created_at: Date | null;

  @ApiProperty({ nullable: true })
  @Expose()
  updated_at: Date | null;
}
