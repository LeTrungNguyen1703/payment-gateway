import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
  UseGuards,
} from '@nestjs/common';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { QueryPaymentMethodDto } from './dto/query-payment-method.dto';
import { CurrentDbUserId } from '../user/decorators/current-user.decorator';
import { DbUserGuard } from '../user/guards/db-user.guard';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { Roles, Resource, RoleMatchingMode } from 'nest-keycloak-connect';
import { PaymentMethodResponse } from './interfaces/payment-method.interface';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@ApiTags('payment-methods')
@Resource('payment-methods')
@Controller('payment-methods')
@UseGuards(DbUserGuard) // Apply guard to all routes
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {
  }

  @Post()
  @ApiBearerAuth('access-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new payment method for current user' })
  @ApiResponse({ status: 201, description: 'Payment method created', type: PaymentMethodResponse })
  @ApiResponse({ status: 409, description: 'Token already exists' })
  create(
    @Body() createPaymentMethodDto: CreatePaymentMethodDto,
    @CurrentDbUserId() userId: string,
  ): Promise<PaymentMethodResponse> {
    return this.paymentMethodsService.create(createPaymentMethodDto, userId);
  }

  @Get()
  @Roles({ roles: ['admin'] })
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all payment methods with pagination (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated payment methods',
    schema: {
      example: {
        data: PaymentMethodResponse,
        meta: {
          total: 10,
          page: 1,
          limit: 10,
          totalPages: 1,
          hasNextPage: false,
          hasPreviousPage: false,
        },
      },
    },
  })
  findAll(@Query() queryDto: QueryPaymentMethodDto): Promise<PaginatedResponse<PaymentMethodResponse>> {
    return this.paymentMethodsService.findAll(queryDto);
  }

  @Get('my-methods')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user payment methods with pagination' })
  findMine(
    @Query() queryDto: QueryPaymentMethodDto,
    @CurrentDbUserId() userId: string,
  ): Promise<PaginatedResponse<PaymentMethodResponse>> {
    return this.paymentMethodsService.findByUserId(userId, queryDto);
  }

  @Get(':id')
  @Roles({ roles: ['admin'], mode: RoleMatchingMode.ANY })
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get a payment method by ID (Admin)' })
  @ApiParam({ name: 'id', description: 'Payment method ID (UUID)' })
  @ApiResponse({ status: 200, description: 'Returns payment method', type: PaymentMethodResponse })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string): Promise<PaymentMethodResponse> {
    return this.paymentMethodsService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update a payment method (owned by current user)' })
  @ApiParam({ name: 'id', description: 'Payment method ID (UUID)' })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body() updatePaymentMethodDto: UpdatePaymentMethodDto,
    @CurrentDbUserId() userId: string,
  ): Promise<PaymentMethodResponse> {
    return this.paymentMethodsService.updateForUser(id, updatePaymentMethodDto, userId);
  }

  @Delete(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete a payment method (owned by current user)' })
  @ApiParam({ name: 'id', description: 'Payment method ID (UUID)' })
  remove(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @CurrentDbUserId() userId: string,
  ): Promise<{ message: string; paymentMethod: Partial<PaymentMethodResponse> }> {
    return this.paymentMethodsService.removeForUser(id, userId);
  }
}
