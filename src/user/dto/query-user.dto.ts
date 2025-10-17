import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryUserDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Filter by user status',
    enum: ['active', 'inactive', 'suspended']
  })
  @IsOptional()
  @IsEnum(['active', 'inactive', 'suspended'])
  status?: string;

  @ApiPropertyOptional({
    description: 'Filter by KYC verification status',
    type: Boolean
  })
  @IsOptional()
  kyc_verified?: boolean;

  @ApiPropertyOptional({
    description: 'Search by email or name',
    example: 'john@example.com'
  })
  @IsOptional()
  search?: string;
}

