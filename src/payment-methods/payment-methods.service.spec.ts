import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethodsService } from './payment-methods.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  NotFoundException,
  ForbiddenException,
  ConflictException,
} from '@nestjs/common';
import {
  PaymentMethodType,
  PaymentProvider,
  PaymentMethodStatus,
} from './enums/payment-methods.enum';
import { Prisma } from '@prisma/client';
import { CreatePaymentMethodDto } from './dto/create-payment-method.dto';
import { PaymentMethodResponse } from './interfaces/payment-method.interface';

describe('PaymentMethodsService', () => {
  let service: PaymentMethodsService;

  const prismaMock = {
    payment_methods: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  };

  const prismaErrorP2002 = new Prisma.PrismaClientKnownRequestError(
    'Unique constraint failed',
    {
      code: 'P2002',
      clientVersion: '5.0.0',
      meta: { target: ['token'] },
    },
  );

  const prismaErrorP2003 = new Prisma.PrismaClientKnownRequestError(
    'Foreign key constraint failed',
    {
      code: 'P2003',
      clientVersion: '5.0.0',
      meta: { field_name: 'user_id' },
    },
  );

  const userId = 'user-uuid-123';

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PaymentMethodsService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<PaymentMethodsService>(PaymentMethodsService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const createDto: CreatePaymentMethodDto = {
      type: PaymentMethodType.CARD,
      provider: PaymentProvider.STRIPE,
      token: 'tok_123',
      last_four: '4242',
    };

    const expectedResult: PaymentMethodResponse = {
      id: 'pm-uuid-123',
      user_id: userId,
      type: PaymentMethodType.CARD,
      provider: PaymentProvider.STRIPE,
      token: 'tok_123',
      last_four: '4242',
      expiry_month: null,
      expiry_year: null,
      is_default: null,
      status: PaymentMethodStatus.ACTIVE,
      metadata: null,
      created_at: new Date(),
      updated_at: new Date(),
    };

    it('should create a payment method', async () => {
      const userId = 'user-uuid-123';

      prismaMock.payment_methods.create.mockResolvedValue(expectedResult);

      const result = await service.create(createDto, userId);

      expect(result).toEqual(expectedResult);

      expect(prismaMock.payment_methods.create).toHaveBeenCalledWith({
        data: {
          user_id: userId,
          ...createDto,
        },
      });
    });

    it('should throw ConflictException if token already exists', async () => {
      prismaMock.payment_methods.create.mockRejectedValue(prismaErrorP2002);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        ConflictException,
      );
    });

    it('should throw NotFoundException if user not found', async () => {
      prismaMock.payment_methods.create.mockRejectedValue(prismaErrorP2003);

      await expect(service.create(createDto, userId)).rejects.toThrow(
        NotFoundException,
      );
    });

  });

  describe('findByUserId', () => {
    it('should return paginated payment methods for a user', async () => {
      const userId = 'user-uuid-123';
      const queryDto = { page: 1, limit: 10 };
      const mockData = [
        {
          id: 'pm1',
          user_id: userId,
          type: PaymentMethodType.CARD,
          provider: PaymentProvider.STRIPE,
          token: 'tok_1',
          last_four: '4242',
          status: PaymentMethodStatus.ACTIVE,
        },
      ];

      prismaMock.payment_methods.findMany.mockResolvedValue(mockData);
      prismaMock.payment_methods.count.mockResolvedValue(1);

      const result = await service.findByUserId(userId, queryDto);

      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('updateForUser', () => {
    it('should update a payment method owned by the user', async () => {
      const userId = 'user-uuid-123';
      const pmId = 'pm-uuid-123';
      const updateDto = { status: PaymentMethodStatus.INACTIVE };
      const existing = { id: pmId, user_id: userId };
      const updated = { ...existing, ...updateDto };

      prismaMock.payment_methods.findUnique.mockResolvedValue(existing);
      prismaMock.payment_methods.update.mockResolvedValue(updated);

      const result = await service.updateForUser(pmId, updateDto, userId);

      expect(result).toEqual(updated);
    });

    it('should throw ForbiddenException if user does not own the payment method', async () => {
      const userId = 'user-uuid-123';
      const otherUserId = 'user-uuid-456';
      const pmId = 'pm-uuid-123';
      const updateDto = { status: PaymentMethodStatus.INACTIVE };

      prismaMock.payment_methods.findUnique.mockResolvedValue({
        id: pmId,
        user_id: otherUserId,
      });

      await expect(
        service.updateForUser(pmId, updateDto, userId),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('removeForUser', () => {
    it('should delete a payment method owned by the user', async () => {
      const userId = 'user-uuid-123';
      const pmId = 'pm-uuid-123';
      const existing = {
        id: pmId,
        user_id: userId,
        type: PaymentMethodType.CARD,
        provider: PaymentProvider.STRIPE,
        last_four: '4242',
      };

      prismaMock.payment_methods.findUnique.mockResolvedValue(existing);
      prismaMock.payment_methods.delete.mockResolvedValue(existing);

      const result = await service.removeForUser(pmId, userId);

      expect(result.message).toBe(
        'Payment method has been deleted successfully',
      );
      expect(result.paymentMethod).toEqual(existing);
    });

    it('should throw ForbiddenException if user does not own the payment method', async () => {
      const userId = 'user-uuid-123';
      const otherUserId = 'user-uuid-456';
      const pmId = 'pm-uuid-123';

      prismaMock.payment_methods.findUnique.mockResolvedValue({
        id: pmId,
        user_id: otherUserId,
      });

      await expect(service.removeForUser(pmId, userId)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });
});
