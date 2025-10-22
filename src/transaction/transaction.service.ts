import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import {
  CreateTransactionDto,
  TransactionStatus,
} from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import {
  getPaginationParams,
  createPaginatedResponse,
} from '../common/helpers/prisma-pagination.helper';
import { Prisma } from '@prisma/client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '../common/constants/events.constants';

@Injectable()
export class TransactionService {
  private logger = new Logger(TransactionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly emitter: EventEmitter2,
  ) {}

  async create(createTransactionDto: CreateTransactionDto, userId: string) {
    // Wrap trong transaction để đảm bảo atomicity
    return await this.prisma
      .$transaction(async (tx) => {
        // Verify user exists
        const user = await tx.users.findUnique({
          where: { id: userId },
        });

        if (!user) {
          throw new BadRequestException('User not found');
        }

        // Verify payment method if provided
        if (createTransactionDto.payment_method_id) {
          const paymentMethod = await tx.payment_methods.findUnique({
            where: { id: createTransactionDto.payment_method_id },
          });

          if (!paymentMethod) {
            throw new BadRequestException('Payment method not found');
          }

          if (paymentMethod.user_id !== userId) {
            throw new BadRequestException(
              'Payment method does not belong to this user',
            );
          }
        }

        // Create transaction với status PENDING
        const transaction = await tx.transactions.create({
          data: {
            user_id: userId,
            payment_method_id: createTransactionDto.payment_method_id,
            amount: createTransactionDto.amount,
            currency: createTransactionDto.currency || 'VND',
            description: createTransactionDto.description,
            status: TransactionStatus.PENDING, // Trạng thái ban đầu
            gateway_provider: createTransactionDto.gateway_provider,
            gateway_response: Prisma.JsonNull,
            ip_address: createTransactionDto.ip_address,
            user_agent: createTransactionDto.user_agent,
            device_id: createTransactionDto.device_id,
          },
          include: {
            users: {
              select: {
                id: true,
                email: true,
                full_name: true,
              },
            },
            payment_methods: {
              select: {
                id: true,
                type: true,
                provider: true,
                last_four: true,
              },
            },
          },
        });

        // Create initial event
        await tx.transaction_events.create({
          data: {
            transaction_id: transaction.id,
            event_type: 'CREATED',
            to_value: TransactionStatus.PENDING,
            metadata: { created_by: 'system' },
          },
        });

        return transaction;
      })
      .then(async (transaction) => {
        // Emit event SAU KHI transaction đã commit
        this.emitter.emit(EVENTS.TRANSACTION.CREATED, {
          transactionId: transaction.id,
          userId: transaction.user_id,
          amount: transaction.amount,
          currency: transaction.currency,
          description: transaction.description,
          paymentMethodId: transaction.payment_method_id,
        });

        return {
          message: 'Transaction created successfully',
          transaction,
        };
      })
      .catch((error) => {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          `Failed to create transaction: ${error.message}`,
        );
      });
  }

  async findAll(
    queryDto: QueryTransactionDto,
  ): Promise<PaginatedResponse<any>> {
    const { skip, take } = getPaginationParams(queryDto.page, queryDto.limit);

    // Build where clause
    const where: Prisma.transactionsWhereInput = {};

    if (queryDto.user_id) {
      where.user_id = queryDto.user_id;
    }

    if (queryDto.status) {
      where.status = queryDto.status;
    }

    if (queryDto.gateway_provider) {
      where.gateway_provider = queryDto.gateway_provider;
    }

    if (queryDto.external_transaction_id) {
      where.external_transaction_id = queryDto.external_transaction_id;
    }

    if (queryDto.created_from || queryDto.created_to) {
      where.created_at = {};
      if (queryDto.created_from) {
        where.created_at.gte = new Date(queryDto.created_from);
      }
      if (queryDto.created_to) {
        where.created_at.lte = new Date(queryDto.created_to);
      }
    }

    const [transactions, total] = await Promise.all([
      this.prisma.transactions.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
        include: {
          users: {
            select: {
              id: true,
              email: true,
              full_name: true,
            },
          },
          payment_methods: {
            select: {
              id: true,
              type: true,
              provider: true,
              last_four: true,
            },
          },
        },
      }),
      this.prisma.transactions.count({ where }),
    ]);

    return createPaginatedResponse(
      transactions,
      total,
      queryDto.page,
      queryDto.limit,
    );
  }

  async findOne(id: string) {
    const transaction = await this.prisma.transactions.findUnique({
      where: { id },
      include: {
        users: {
          select: {
            id: true,
            email: true,
            full_name: true,
            phone: true,
          },
        },
        payment_methods: {
          select: {
            id: true,
            type: true,
            provider: true,
            last_four: true,
            expiry_month: true,
            expiry_year: true,
          },
        },
        transaction_events: {
          orderBy: { created_at: 'desc' },
          take: 10,
        },
        refunds: {
          select: {
            id: true,
            amount: true,
            status: true,
            reason: true,
            created_at: true,
          },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto) {
    // Check if transaction exists
    const existingTransaction = await this.prisma.transactions.findUnique({
      where: { id },
    });

    if (!existingTransaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    try {
      const transaction = await this.prisma.transactions.update({
        where: { id },
        data: updateTransactionDto,
        include: {
          users: {
            select: {
              id: true,
              email: true,
              full_name: true,
            },
          },
          payment_methods: {
            select: {
              id: true,
              type: true,
              provider: true,
              last_four: true,
            },
          },
        },
      });

      // Create transaction event if status changed
      if (
        transaction.status &&
        transaction.status !== existingTransaction.status
      ) {
        await this.prisma.transaction_events.create({
          data: {
            transaction_id: id,
            event_type: 'status_changed',
            from_value: existingTransaction.status,
            to_value: updateTransactionDto.status,
            metadata: { updated_by: 'system' } as any,
          },
        });
      }

      return transaction;
    } catch (error) {
      throw new BadRequestException(
        `Failed to update transaction: ${error.message}`,
      );
    }
  }

  async updateGatewayResponse(
    external_transaction_id: number,
    gatewayResponse: any,
    transactionStatus: TransactionStatus,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const transaction = await tx.transactions.findFirst({
        where: { external_transaction_id: external_transaction_id },
        select: { id: true, gateway_response: true, status: true },
      });

      if (!transaction) {
        throw new NotFoundException('Transaction not found');
      }

      const updatedTransaction = await tx.transactions.updateMany({
        where: { external_transaction_id },
        data: {
          gateway_response: gatewayResponse,
          status: transactionStatus,
        },
      });

      this.logger.log(
        `Updated ${updatedTransaction.count} transaction(s) with external_transaction_id ${external_transaction_id}`,
      );

      const createdTransactionEvent = await tx.transaction_events.create({
        data: {
          transaction_id: transaction.id,
          event_type: 'GATEWAY_RESPONSE_UPDATED',
          from_value: transaction.status,
          to_value: transactionStatus,
          metadata: { updated_by: 'system' },
        },
      });

      this.logger.log(
        `Created transaction event with ID ${createdTransactionEvent.id} for transaction ID ${transaction.id}`,
      );

      // Emit event để cancel timeout job nếu transaction đã hoàn thành hoặc thất bại
      if (
        transactionStatus === TransactionStatus.COMPLETED ||
        transactionStatus === TransactionStatus.FAILED ||
        transactionStatus === TransactionStatus.CANCELLED
      ) {
        this.emitter.emit(EVENTS.TRANSACTION.STATUS_UPDATED, {
          transactionId: transaction.id,
          status: transactionStatus,
          shouldCancelTimeout: true,
        });
      }

      return updatedTransaction;
    });
  }

  async updateStatus(transactionId: string, status: string) {
    const transaction = await this.prisma.transactions.findUnique({
      where: { id: transactionId },
      select: { status: true },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update transaction
      const updated = await tx.transactions.update({
        where: { id: transactionId },
        data: { status },
      });

      // Log event
      await tx.transaction_events.create({
        data: {
          transaction_id: transactionId,
          event_type: 'STATUS_CHANGED',
          from_value: transaction.status,
          to_value: status,
          metadata: { updated_by: 'system' },
        },
      });

      return updated;
    });
  }

  async remove(id: string) {
    // Check if transaction exists
    const transaction = await this.prisma.transactions.findUnique({
      where: { id },
      include: {
        refunds: true,
        transaction_events: true,
      },
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    // Don't allow deletion of completed transactions with refunds
    if (transaction.refunds.length > 0) {
      throw new BadRequestException(
        'Cannot delete transaction with existing refunds',
      );
    }

    try {
      // Delete related records first (transaction_events will be cascade deleted)
      await this.prisma.transactions.delete({
        where: { id },
      });

      return { message: 'Transaction deleted successfully', id };
    } catch (error) {
      throw new BadRequestException(
        `Failed to delete transaction: ${error.message}`,
      );
    }
  }

  async findByUser(
    userId: string,
    queryDto: QueryTransactionDto,
  ): Promise<PaginatedResponse<any>> {
    queryDto.user_id = userId;
    return this.findAll(queryDto);
  }

  async getTransactionStats(userId?: string) {
    const where: Prisma.transactionsWhereInput = userId
      ? { user_id: userId }
      : {};

    const [total, completed, pending, failed, totalAmount] = await Promise.all([
      this.prisma.transactions.count({ where }),
      this.prisma.transactions.count({
        where: { ...where, status: 'completed' },
      }),
      this.prisma.transactions.count({
        where: {
          ...where,
          status: { in: ['pending', 'awaiting_payment', 'processing'] },
        },
      }),
      this.prisma.transactions.count({
        where: { ...where, status: { in: ['failed', 'cancelled'] } },
      }),
      this.prisma.transactions.aggregate({
        where: { ...where, status: 'completed' },
        _sum: { amount: true },
      }),
    ]);

    return {
      total,
      completed,
      pending,
      failed,
      totalAmount: totalAmount._sum.amount || 0,
    };
  }

  async getUserIdByExternalTransactionId(orderCode: number) {
    const transaction = await this.prisma.transactions.findFirst({
      where: { external_transaction_id: orderCode },
      select: {
        user_id: true,
        users: {
          select: { full_name: true, email: true },
        },
      },
    });

    if (!transaction) {
      throw new NotFoundException('Transaction not found');
    }

    return transaction;
  }
}

