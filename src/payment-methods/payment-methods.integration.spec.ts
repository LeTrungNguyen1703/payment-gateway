import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import {
  PaymentMethodType,
  PaymentProvider,
  PaymentMethodStatus,
} from './enums/payment-methods.enum';
import { PrismaService } from '../prisma/prisma.service';
import { AppModule } from '../app.module';

describe('Payment Methods Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let paymentMethodId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
      }),
    );

    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Login and get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'test@example.com',
        password: 'Test123!',
      })
      .expect(200);

    accessToken = loginResponse.body.access_token;

    // Get user ID from database
    const user = await prisma.users.findUnique({
      where: { email: 'test@example.com' },
    });

    if (!user) {
      throw new Error('Test user not found. Please seed test database.');
    }

    userId = user.id;
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.payment_methods.deleteMany({
      where: { user_id: userId },
    });
    await app.close();
  });

  describe('POST /payment-methods', () => {
    it('should create a new payment method', async () => {
      const createDto = {
        type: PaymentMethodType.CARD,
        provider: PaymentProvider.STRIPE,
        token: 'tok_test_123456',
        last_four: '4242',
        expiry_month: 12,
        expiry_year: 2025,
      };

      const response = await request(app.getHttpServer())
        .post('/payment-methods')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        type: createDto.type,
        provider: createDto.provider,
        token: createDto.token,
        last_four: createDto.last_four,
        user_id: userId,
        status: PaymentMethodStatus.ACTIVE,
        created_at: expect.any(String),
        updated_at: expect.any(String),
      });

      paymentMethodId = response.body.id;
    });

    it('should fail without authentication', async () => {
      const createDto = {
        type: PaymentMethodType.CARD,
        provider: PaymentProvider.STRIPE,
        token: 'tok_test_no_auth',
      };

      await request(app.getHttpServer())
        .post('/payment-methods')
        .send(createDto)
        .expect(401);
    });

    it('should fail with invalid type enum', async () => {
      const createDto = {
        type: 'invalid_type',
        provider: PaymentProvider.STRIPE,
        token: 'tok_test_invalid',
      };

      await request(app.getHttpServer())
        .post('/payment-methods')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(400);
    });

    it('should fail with invalid last_four format', async () => {
      const createDto = {
        type: PaymentMethodType.CARD,
        provider: PaymentProvider.STRIPE,
        token: 'tok_test_invalid_last_four',
        last_four: '12', // Should be 4 digits
      };

      await request(app.getHttpServer())
        .post('/payment-methods')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(400);
    });

    it('should fail with duplicate token', async () => {
      const createDto = {
        type: PaymentMethodType.CARD,
        provider: PaymentProvider.STRIPE,
        token: 'tok_duplicate_test',
      };

      // First creation
      await request(app.getHttpServer())
        .post('/payment-methods')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      // Duplicate creation
      await request(app.getHttpServer())
        .post('/payment-methods')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(409);
    });

    it('should create payment method without optional fields', async () => {
      const createDto = {
        type: PaymentMethodType.BANK_TRANSFER,
        token: 'ba_test_minimal',
      };

      const response = await request(app.getHttpServer())
        .post('/payment-methods')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body.type).toBe(PaymentMethodType.BANK_TRANSFER);
      expect(response.body.provider).toBeNull();
      expect(response.body.last_four).toBeNull();
    });
  });

  describe('GET /payment-methods', () => {
    beforeAll(async () => {
      // Create some test payment methods for pagination
      const methods = [
        {
          type: PaymentMethodType.CARD,
          provider: PaymentProvider.STRIPE,
          token: 'tok_pagination_1',
          status: PaymentMethodStatus.ACTIVE,
        },
        {
          type: PaymentMethodType.CARD,
          provider: PaymentProvider.VNPAY,
          token: 'tok_pagination_2',
          status: PaymentMethodStatus.INACTIVE,
        },
      ];

      for (const method of methods) {
        await request(app.getHttpServer())
          .post('/payment-methods')
          .set('Authorization', `Bearer ${accessToken}`)
          .send(method);
      }
    });

    it('should get all payment methods with pagination (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/payment-methods?page=1&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        data: expect.any(Array),
        meta: {
          total: expect.any(Number),
          page: 1,
          limit: 10,
          totalPages: expect.any(Number),
          hasNextPage: expect.any(Boolean),
          hasPreviousPage: false,
        },
      });
    });

    it('should filter by status', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payment-methods?status=${PaymentMethodStatus.ACTIVE}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(
        response.body.data.every(
          (pm: any) => pm.status === PaymentMethodStatus.ACTIVE,
        ),
      ).toBe(true);
    });

    it('should filter by type', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payment-methods?type=${PaymentMethodType.CARD}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(
        response.body.data.every((pm: any) => pm.type === PaymentMethodType.CARD),
      ).toBe(true);
    });

    it('should filter by provider', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payment-methods?provider=${PaymentProvider.STRIPE}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(
        response.body.data.every(
          (pm: any) => pm.provider === PaymentProvider.STRIPE,
        ),
      ).toBe(true);
    });

    it('should search payment methods', async () => {
      const response = await request(app.getHttpServer())
        .get('/payment-methods?search=4242')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });

    it('should handle pagination correctly', async () => {
      // Page 1
      const page1 = await request(app.getHttpServer())
        .get('/payment-methods?page=1&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(page1.body.data.length).toBeLessThanOrEqual(2);
      expect(page1.body.meta.page).toBe(1);

      // Page 2
      const page2 = await request(app.getHttpServer())
        .get('/payment-methods?page=2&limit=2')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(page2.body.meta.page).toBe(2);
    });
  });

  describe('GET /payment-methods/my-methods', () => {
    it('should get current user payment methods only', async () => {
      const response = await request(app.getHttpServer())
        .get('/payment-methods/my-methods')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.every((pm: any) => pm.user_id === userId)).toBe(
        true,
      );
    });

    it('should paginate user payment methods', async () => {
      const response = await request(app.getHttpServer())
        .get('/payment-methods/my-methods?page=1&limit=5')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.meta.page).toBe(1);
      expect(response.body.meta.limit).toBe(5);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get('/payment-methods/my-methods')
        .expect(401);
    });
  });

  describe('GET /payment-methods/:id', () => {
    it('should get payment method by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/payment-methods/${paymentMethodId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: paymentMethodId,
        type: expect.any(String),
        token: expect.any(String),
      });
    });

    it('should return 404 for non-existent payment method', async () => {
      await request(app.getHttpServer())
        .get('/payment-methods/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail with invalid UUID format', async () => {
      await request(app.getHttpServer())
        .get('/payment-methods/invalid-uuid-format')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/payment-methods/${paymentMethodId}`)
        .expect(401);
    });
  });

  describe('PATCH /payment-methods/:id', () => {
    it('should update payment method owned by user', async () => {
      const updateDto = {
        status: PaymentMethodStatus.INACTIVE,
        is_default: true,
      };

      const response = await request(app.getHttpServer())
        .patch(`/payment-methods/${paymentMethodId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.status).toBe(PaymentMethodStatus.INACTIVE);
      expect(response.body.is_default).toBe(true);
    });

    it('should fail to update with invalid data', async () => {
      const updateDto = {
        last_four: '123', // Invalid: should be 4 digits
      };

      await request(app.getHttpServer())
        .patch(`/payment-methods/${paymentMethodId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(400);
    });

    it('should fail to update non-existent payment method', async () => {
      const updateDto = { status: PaymentMethodStatus.INACTIVE };

      await request(app.getHttpServer())
        .patch('/payment-methods/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(404);
    });

    it('should fail without authentication', async () => {
      const updateDto = { status: PaymentMethodStatus.INACTIVE };

      await request(app.getHttpServer())
        .patch(`/payment-methods/${paymentMethodId}`)
        .send(updateDto)
        .expect(401);
    });
  });

  describe('DELETE /payment-methods/:id', () => {
    let paymentMethodToDelete: string;

    beforeEach(async () => {
      // Create a payment method to delete
      const response = await request(app.getHttpServer())
        .post('/payment-methods')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          type: PaymentMethodType.CARD,
          provider: PaymentProvider.STRIPE,
          token: `tok_delete_${Date.now()}`,
        })
        .expect(201);

      paymentMethodToDelete = response.body.id;
    });

    it('should delete payment method owned by user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/payment-methods/${paymentMethodToDelete}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        message: 'Payment method has been deleted successfully',
        paymentMethod: expect.objectContaining({
          id: paymentMethodToDelete,
        }),
      });

      // Verify deletion in database
      const deleted = await prisma.payment_methods.findUnique({
        where: { id: paymentMethodToDelete },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 when deleting non-existent payment method', async () => {
      await request(app.getHttpServer())
        .delete('/payment-methods/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail with invalid UUID format', async () => {
      await request(app.getHttpServer())
        .delete('/payment-methods/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .delete(`/payment-methods/${paymentMethodToDelete}`)
        .expect(401);
    });
  });

  describe('Edge Cases', () => {
    it('should handle large page numbers gracefully', async () => {
      const response = await request(app.getHttpServer())
        .get('/payment-methods?page=9999&limit=10')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toEqual([]);
      expect(response.body.meta.hasNextPage).toBe(false);
    });

    it('should handle very small page limit', async () => {
      const response = await request(app.getHttpServer())
        .get('/payment-methods?page=1&limit=1')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.length).toBeLessThanOrEqual(1);
    });

    it('should handle multiple filters combined', async () => {
      const response = await request(app.getHttpServer())
        .get(
          `/payment-methods?type=${PaymentMethodType.CARD}&status=${PaymentMethodStatus.ACTIVE}&provider=${PaymentProvider.STRIPE}`,
        )
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      response.body.data.forEach((pm: any) => {
        expect(pm.type).toBe(PaymentMethodType.CARD);
        expect(pm.status).toBe(PaymentMethodStatus.ACTIVE);
        expect(pm.provider).toBe(PaymentProvider.STRIPE);
      });
    });
  });
});

