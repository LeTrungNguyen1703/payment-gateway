import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { UpdatePaymentMethodDto } from './dto/update-payment-method.dto';
import { PrismaService } from '../prisma/prisma.service';
import { PrismaPagination } from '../common/helpers/prisma-pagination.helper';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { PaymentMethodResponse } from './interfaces/payment-method.interface';
import { Prisma } from '@prisma/client';
import { QueryPaymentMethodDto } from './dto/query-payment-method.dto';

@Injectable()
export class PaymentMethodsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    createPaymentMethodDto: CreatePaymentMethodDto,
    userId: string,
  ): Promise<PaymentMethodResponse> {
    try {
      const { ...data } = createPaymentMethodDto;

      return await this.prisma.payment_methods.create({
        data: {
          user_id: userId,
          ...data,
        },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Payment method token already exists');
        }
        if (error.code === 'P2003') {
          throw new NotFoundException('Related user not found');
        }
      }
      throw error;
    }
  }

  async findAll(
    queryDto: QueryPaymentMethodDto,
  ): Promise<PaginatedResponse<PaymentMethodResponse>> {
    const { page = 1, limit = 10 } = queryDto;

    const where = this.buildWhere(queryDto);

    return PrismaPagination.paginate<PaymentMethodResponse>(
      this.prisma.payment_methods,
      page,
      limit,
      where,
      { created_at: 'desc' },
    );
  }

  async findByUserId(
    userId: string,
    queryDto: QueryPaymentMethodDto,
  ): Promise<PaginatedResponse<PaymentMethodResponse>> {
    const { page = 1, limit = 10 } = queryDto;

    const where = this.buildWhere(queryDto, userId);

    return PrismaPagination.paginate<PaymentMethodResponse>(
      this.prisma.payment_methods,
      page,
      limit,
      where,
      { created_at: 'desc' },
    );
  }

  async findOne(id: string): Promise<PaymentMethodResponse> {
    const pm = await this.prisma.payment_methods.findUnique({ where: { id } });
    if (!pm) throw new NotFoundException('Payment method not found');
    return pm;
  }

  async updateForUser(
    id: string,
    updatePaymentMethodDto: UpdatePaymentMethodDto,
    userId: string,
  ): Promise<PaymentMethodResponse> {
    const existing = await this.prisma.payment_methods.findUnique({
      where: { id },
      select: { id: true, user_id: true },
    });
    if (!existing) throw new NotFoundException('Payment method not found');
    if (existing.user_id !== userId)
      throw new ForbiddenException('You do not own this payment method');

    try {
      return await this.prisma.payment_methods.update({
        where: { id },
        data: { ...updatePaymentMethodDto },
      });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2002') {
          throw new ConflictException('Payment method token already exists');
        }
        if (error.code === 'P2025') {
          throw new NotFoundException('Payment method not found');
        }
      }
      throw error;
    }
  }

  async removeForUser(
    id: string,
    userId: string,
  ): Promise<{
    message: string;
    paymentMethod: Partial<PaymentMethodResponse>;
  }> {
    const existing = await this.prisma.payment_methods.findUnique({
      where: { id },
      select: {
        id: true,
        user_id: true,
        type: true,
        provider: true,
        last_four: true,
      },
    });
    if (!existing) throw new NotFoundException('Payment method not found');
    if (existing.user_id !== userId)
      throw new ForbiddenException('You do not own this payment method');

    await this.prisma.payment_methods.delete({ where: { id } });

    return {
      message: 'Payment method has been deleted successfully',
      paymentMethod: existing,
    };
  }

  // Helper methods
  private buildWhere(queryDto?: QueryPaymentMethodDto, userId?: string): Prisma.payment_methodsWhereInput {
    const { status, type, provider, search } = queryDto || {};
    const where: Prisma.payment_methodsWhereInput = {};

    if (userId) where.user_id = userId;
    if (status) where.status = status;
    if (type) where.type = type;
    if (provider) where.provider = provider;

    if (search) {
      where.OR = [
        { provider: { contains: search, mode: 'insensitive' } },
        { last_four: { contains: search, mode: 'insensitive' } },
      ];
    }

    return where;
  }
}
