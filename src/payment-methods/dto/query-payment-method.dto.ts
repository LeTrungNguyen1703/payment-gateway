import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsEnum } from 'class-validator';
import { PaymentMethodStatus, PaymentMethodType, PaymentProvider } from '../enums/payment-methods.enum';

export class QueryPaymentMethodDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by status',
    enum: PaymentMethodStatus
  })
  @IsOptional()
  @IsEnum(PaymentMethodStatus)
  status?: PaymentMethodStatus;

  @ApiPropertyOptional({
    description: 'Filter by type',
    enum: PaymentMethodType,
    example: PaymentMethodType.CARD
  })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  type?: PaymentMethodType;

  @ApiPropertyOptional({
    description: 'Filter by provider',
    enum: PaymentProvider,
    example: PaymentProvider.STRIPE
  })
  @IsOptional()
  @IsEnum(PaymentProvider)
  provider?: PaymentProvider;

  @ApiPropertyOptional({ description: 'Search by token or last_four', example: '4242' })
  @IsOptional()
  @IsString()
  search?: string;
}
