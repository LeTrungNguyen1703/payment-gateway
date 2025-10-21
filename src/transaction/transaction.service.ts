import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { CreateTransactionDto } from './dto/create-transaction.dto';
import { UpdateTransactionDto } from './dto/update-transaction.dto';
import { QueryTransactionDto } from './dto/query-transaction.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { getPaginationParams, createPaginatedResponse } from '../common/helpers/prisma-pagination.helper';
import { Prisma } from '@prisma/client';

@Injectable()
export class TransactionService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTransactionDto: CreateTransactionDto) {
    try {
      // Verify user exists
      const user = await this.prisma.users.findUnique({
        where: { id: createTransactionDto.user_id }
      });

      if (!user) {
        throw new BadRequestException('User not found');
      }

      // Verify payment method if provided
      if (createTransactionDto.payment_method_id) {
        const paymentMethod = await this.prisma.payment_methods.findUnique({
          where: { id: createTransactionDto.payment_method_id }
        });

        if (!paymentMethod) {
          throw new BadRequestException('Payment method not found');
        }

        if (paymentMethod.user_id !== createTransactionDto.user_id) {
          throw new BadRequestException('Payment method does not belong to this user');
        }
      }

      const transaction = await this.prisma.transactions.create({
        data: {
          user_id: createTransactionDto.user_id,
          payment_method_id: createTransactionDto.payment_method_id,
          amount: createTransactionDto.amount,
          currency: createTransactionDto.currency || 'VND',
          description: createTransactionDto.description,
          status: createTransactionDto.status || 'pending',
          gateway_provider: createTransactionDto.gateway_provider,
          gateway_response: createTransactionDto.gateway_response || Prisma.JsonNull,
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
            }
          },
          payment_methods: {
            select: {
              id: true,
              type: true,
              provider: true,
              last_four: true,
            }
          }
        }
      });

      // Create transaction event
      await this.prisma.transaction_events.create({
        data: {
          transaction_id: transaction.id,
          event_type: 'created',
          to_value: transaction.status,
          metadata: { created_by: 'system' } as any,
        }
      });

      return transaction;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to create transaction: ${error.message}`);
    }
  }

  async findAll(queryDto: QueryTransactionDto): Promise<PaginatedResponse<any>> {
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
            }
          },
          payment_methods: {
            select: {
              id: true,
              type: true,
              provider: true,
              last_four: true,
            }
          }
        }
      }),
      this.prisma.transactions.count({ where })
    ]);

    return createPaginatedResponse(transactions, total, queryDto.page, queryDto.limit);
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
          }
        },
        payment_methods: {
          select: {
            id: true,
            type: true,
            provider: true,
            last_four: true,
            expiry_month: true,
            expiry_year: true,
          }
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
          }
        }
      }
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    return transaction;
  }

  async update(id: string, updateTransactionDto: UpdateTransactionDto) {
    // Check if transaction exists
    const existingTransaction = await this.prisma.transactions.findUnique({
      where: { id }
    });

    if (!existingTransaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    try {
      const updateData: any = {};

      // Only update fields that are provided
      if (updateTransactionDto.amount !== undefined) updateData.amount = updateTransactionDto.amount;
      if (updateTransactionDto.currency !== undefined) updateData.currency = updateTransactionDto.currency;
      if (updateTransactionDto.description !== undefined) updateData.description = updateTransactionDto.description;
      if (updateTransactionDto.status !== undefined) updateData.status = updateTransactionDto.status;
      if (updateTransactionDto.gateway_provider !== undefined) updateData.gateway_provider = updateTransactionDto.gateway_provider;
      if (updateTransactionDto.gateway_response !== undefined) updateData.gateway_response = updateTransactionDto.gateway_response;
      if (updateTransactionDto.external_transaction_id !== undefined) updateData.external_transaction_id = updateTransactionDto.external_transaction_id;
      if (updateTransactionDto.fraud_score !== undefined) updateData.fraud_score = updateTransactionDto.fraud_score;
      if (updateTransactionDto.fraud_decision !== undefined) updateData.fraud_decision = updateTransactionDto.fraud_decision;
      if (updateTransactionDto.fraud_provider !== undefined) updateData.fraud_provider = updateTransactionDto.fraud_provider;
      if (updateTransactionDto.fraud_metadata !== undefined) updateData.fraud_metadata = updateTransactionDto.fraud_metadata;
      if (updateTransactionDto.job_id !== undefined) updateData.job_id = updateTransactionDto.job_id;
      if (updateTransactionDto.ip_address !== undefined) updateData.ip_address = updateTransactionDto.ip_address;
      if (updateTransactionDto.user_agent !== undefined) updateData.user_agent = updateTransactionDto.user_agent;
      if (updateTransactionDto.device_id !== undefined) updateData.device_id = updateTransactionDto.device_id;

      updateData.updated_at = new Date();

      // Set completed_at if status is completed
      if (updateTransactionDto.status === 'completed' && !existingTransaction.completed_at) {
        updateData.completed_at = new Date();
      }

      const transaction = await this.prisma.transactions.update({
        where: { id },
        data: updateData,
        include: {
          users: {
            select: {
              id: true,
              email: true,
              full_name: true,
            }
          },
          payment_methods: {
            select: {
              id: true,
              type: true,
              provider: true,
              last_four: true,
            }
          }
        }
      });

      // Create transaction event if status changed
      if (updateTransactionDto.status && updateTransactionDto.status !== existingTransaction.status) {
        await this.prisma.transaction_events.create({
          data: {
            transaction_id: id,
            event_type: 'status_changed',
            from_value: existingTransaction.status,
            to_value: updateTransactionDto.status,
            metadata: { updated_by: 'system' } as any,
          }
        });
      }

      return transaction;
    } catch (error) {
      throw new BadRequestException(`Failed to update transaction: ${error.message}`);
    }
  }

  async remove(id: string) {
    // Check if transaction exists
    const transaction = await this.prisma.transactions.findUnique({
      where: { id },
      include: {
        refunds: true,
        transaction_events: true,
      }
    });

    if (!transaction) {
      throw new NotFoundException(`Transaction with ID ${id} not found`);
    }

    // Don't allow deletion of completed transactions with refunds
    if (transaction.refunds.length > 0) {
      throw new BadRequestException('Cannot delete transaction with existing refunds');
    }

    try {
      // Delete related records first (transaction_events will be cascade deleted)
      await this.prisma.transactions.delete({
        where: { id }
      });

      return { message: 'Transaction deleted successfully', id };
    } catch (error) {
      throw new BadRequestException(`Failed to delete transaction: ${error.message}`);
    }
  }

  async findByUser(userId: string, queryDto: QueryTransactionDto): Promise<PaginatedResponse<any>> {
    queryDto.user_id = userId;
    return this.findAll(queryDto);
  }

  async getTransactionStats(userId?: string) {
    const where: Prisma.transactionsWhereInput = userId ? { user_id: userId } : {};

    const [total, completed, pending, failed, totalAmount] = await Promise.all([
      this.prisma.transactions.count({ where }),
      this.prisma.transactions.count({ where: { ...where, status: 'completed' } }),
      this.prisma.transactions.count({ where: { ...where, status: { in: ['pending', 'awaiting_payment', 'processing'] } } }),
      this.prisma.transactions.count({ where: { ...where, status: { in: ['failed', 'cancelled'] } } }),
      this.prisma.transactions.aggregate({
        where: { ...where, status: 'completed' },
        _sum: { amount: true }
      })
    ]);

    return {
      total,
      completed,
      pending,
      failed,
      totalAmount: totalAmount._sum.amount || 0,
    };
  }
}
