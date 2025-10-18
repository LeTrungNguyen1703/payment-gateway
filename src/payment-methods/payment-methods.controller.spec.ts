import { Test, TestingModule } from '@nestjs/testing';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';
import { PrismaService } from '../prisma/prisma.service';

describe('PaymentMethodsController', () => {
  let controller: PaymentMethodsController;

  const prismaMock = {
    users: { findUnique: jest.fn() },
    payment_methods: {
      create: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  } as unknown as PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PaymentMethodsController],
      providers: [PaymentMethodsService, { provide: PrismaService, useValue: prismaMock }],
    }).compile();

    controller = module.get<PaymentMethodsController>(PaymentMethodsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
