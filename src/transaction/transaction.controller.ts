import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  ValidationPipe,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe, UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { TransactionService } from './transaction.service';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import {
  TransactionResponse,
  TransactionStatsResponse,
} from './interfaces/transaction-response.interface';
import { CurrentDbUserId } from '../user/decorators/current-user.decorator';
import { DbUserGuard } from '../user/guards/db-user.guard';

@ApiTags('transactions')
@Controller('transaction')
@UseGuards(DbUserGuard)
export class TransactionController {
  constructor(private readonly transactionService: TransactionService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Create a new transaction',
    description:
      'Creates a new transaction record. Validates that user and payment method exist.',
  })
  @ApiResponse({
    status: 201,
    description: 'Transaction created successfully',
    type: TransactionResponse,
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data or user/payment method not found',
  })
  create(
    @Body(ValidationPipe) createTransactionDto: CreateTransactionDto,
    @CurrentDbUserId() userId: string,
  ) {
    return this.transactionService.create(createTransactionDto, userId);
  }

  @Get()
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get all transactions with pagination and filters',
    description:
      'Returns a paginated list of transactions. Supports filtering by user, status, gateway, date range, etc.',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated transactions',
    schema: {
      example: {
        data: [TransactionResponse],
        meta: {
          total: 100,
          page: 1,
          limit: 10,
          totalPages: 10,
          hasNextPage: true,
          hasPreviousPage: false,
        },
      },
    },
  })
  findAll(@Query(ValidationPipe) queryDto: QueryTransactionDto) {
    return this.transactionService.findAll(queryDto);
  }

  @Get('stats')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get transaction statistics',
    description:
      'Returns aggregated statistics for transactions. Optionally filter by user.',
  })
  @ApiQuery({
    name: 'user_id',
    required: false,
    description: 'Filter statistics by user ID',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns transaction statistics',
    type: TransactionStatsResponse,
  })
  getStats(@Query('user_id') userId?: string) {
    return this.transactionService.getTransactionStats(userId);
  }

  @Get('user/:userId')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get transactions for a specific user',
    description: 'Returns paginated transactions for the specified user ID',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns user transactions',
  })
  findByUser(
    @Param('userId', new ParseUUIDPipe({ version: '4' })) userId: string,
    @Query(ValidationPipe) queryDto: QueryTransactionDto,
  ) {
    return this.transactionService.findByUser(userId, queryDto);
  }

  @Get(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Get transaction by ID',
    description:
      'Returns detailed transaction information including user, payment method, events, and refunds',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Returns transaction details',
    type: TransactionResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  findOne(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.transactionService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Update transaction',
    description:
      'Updates transaction details. Auto-creates status change events. Sets completed_at when status changes to completed.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction updated successfully',
    type: TransactionResponse,
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid data',
  })
  update(
    @Param('id', new ParseUUIDPipe({ version: '4' })) id: string,
    @Body(ValidationPipe) updateTransactionDto: UpdateTransactionDto,
  ) {
    return this.transactionService.update(id, updateTransactionDto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth('access-token')
  @ApiOperation({
    summary: 'Delete transaction',
    description:
      'Deletes a transaction. Cannot delete transactions with existing refunds.',
  })
  @ApiParam({
    name: 'id',
    description: 'Transaction ID (UUID)',
    type: String,
  })
  @ApiResponse({
    status: 200,
    description: 'Transaction deleted successfully',
    schema: {
      example: {
        message: 'Transaction deleted successfully',
        id: '123e4567-e89b-12d3-a456-426614174000',
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Transaction not found',
  })
  @ApiResponse({
    status: 400,
    description: 'Cannot delete transaction with existing refunds',
  })
  remove(@Param('id', new ParseUUIDPipe({ version: '4' })) id: string) {
    return this.transactionService.remove(id);
  }
}
