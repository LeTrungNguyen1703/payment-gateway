# CRUD Module Guidelines for Payment Gateway

## Core Requirements Summary

## This document defines the rules Copilot should follow when generating CRUD modules for the Payment Gateway project

### 1. **Authentication & Security**
- ✅ All endpoints must be protected with Keycloak guards (`@Roles`, `@Resource`)
- ✅ **NEVER take userId from URL parameter** - always extract from JWT token: `@CurrentUserId() keycloakId: string`
- ✅ For payment gateway, users are identified by `keycloak_id` (string UUID), not integer user_id
- ✅ Add `@ApiBearerAuth('access-token')` to each protected method for Swagger documentation

### 2. **Response Type Classes (NOT Interfaces)**
- ✅ Create Response class with `@Expose()` and `@ApiProperty()` decorators
- ✅ Use `| null` instead of `?:` optional for nullable database fields
- ✅ Pattern:
  ```typescript
  export class EntityResponse {
    @ApiProperty()
    @Expose()
    field_name: type;

    @ApiProperty({ nullable: true })
    @Expose()
    nullable_field: type | null;
  }
  ```

### 3. **DTO Structure**
- ✅ CreateDto: Full validation with `class-validator` decorators
- ✅ Complete Swagger decorators: `@ApiProperty()`, `@ApiPropertyOptional()`
- ✅ UpdateDto: Use `PartialType(CreateDto)` from `@nestjs/swagger`
- ✅ Add separate DTOs for special operations
- ✅ **For list endpoints**: Extend `PaginationDto` from `src/common/dto/pagination.dto.ts`

### 4. **Service Layer**
- ✅ **Always receive keycloakId from JWT**, not from DTO or URL
- ✅ Signature pattern: `async create(createDto: CreateDto, keycloakId: string): Promise<EntityResponse>`
- ✅ **DO NOT use verbose select statements** - Prisma returns all fields by default:
  ```typescript
  // ❌ AVOID: Verbose select with all fields listed
  return await this.prisma.entities.findMany({
    select: { field1: true, field2: true, ... }
  });

  // ✅ PREFER: Let Prisma return all fields
  return await this.prisma.entities.findMany({
    where: { user_id: userId },
    orderBy: { created_at: 'desc' }
  });
  ```
- ✅ **Only use select when**:
  - Fetching data for verification (only need specific fields)
  - Excluding sensitive fields
  - Returning partial data in delete operations
- ✅ **Use object destructuring in create/update methods**:
  ```typescript
  // ✅ PREFER: Clean approach using destructuring
  async create(createDto: CreateDto, keycloakId: string): Promise<EntityResponse> {
    const { dateField, specialField, ...otherFields } = createDto;

    // Get user_id from keycloak_id
    const user = await this.prisma.users.findUnique({
      where: { keycloak_id: keycloakId },
      select: { id: true }
    });

    return await this.prisma.entities.create({
      data: {
        user_id: user.id,
        ...otherFields,
        dateField: new Date(dateField),
        specialField: specialField ?? defaultValue,
      },
    });
  }
  ```
- ✅ Error handling with `PrismaClientKnownRequestError`:
  - P2002: Unique constraint violation
  - P2003: Foreign key constraint violation
  - P2025: Record not found
- ✅ Implement methods:
  - `create(dto, keycloakId)` - auto-assign user_id from keycloak_id
  - `findAll(paginationDto?)` - admin view with optional pagination
  - `findOne(id)` - single record (no select needed)
  - `findByUserId(userId, paginationDto?)` - user's own records with pagination
  - `update(id, dto, keycloakId)` - with ownership check
  - `remove(id, keycloakId)` - with ownership check

### 5. **Controller Layer**
- ✅ Extract keycloakId from JWT: `@CurrentUserId() keycloakId: string`
- ✅ Endpoint pattern:
```typescript
@Post()
@ApiBearerAuth('access-token')
@ApiOperation({ summary: 'Create new entity' })
@ApiResponse({ status: 201, type: EntityResponse })
async create(@Body() dto: CreateDto, @CurrentUserId() keycloakId: string): Promise<EntityResponse> {
  return this.service.create(dto, keycloakId);
}

@Get('my-entities')  // NOT /user/:userId
@ApiBearerAuth('access-token')
async findMine(@CurrentUserId() keycloakId: string): Promise<EntityResponse[]> {
  return this.service.findByKeycloakId(keycloakId);
}
```
- ✅ Use `ParseUUIDPipe` for UUID parameters (not ParseIntPipe)
- ✅ Proper HTTP status codes: `@HttpCode(HttpStatus.CREATED)`, etc.
- ✅ Full Swagger documentation

### 6. **Module Configuration**
- ✅ Export service: `exports: [EntityService]`
- ✅ Import PrismaModule

### 7. **Swagger Setup (main.ts)**
- ✅ Add new tag to DocumentBuilder:
```typescript
.addTag('entity-name', 'Entity management endpoints')
```

### 8. **Type Safety**
- ✅ Use Prisma enums from `@prisma/client`
- ✅ Validate enums with `@IsEnum(enum_name)`
- ✅ Proper null handling: `field ?? null`
- ✅ Clear return types for all async methods
- ❌ Avoid `as any` - use proper typing

### 9. **Payment Gateway Specific Patterns**

#### Pattern 1: User ID Resolution
```typescript
// Service method - resolve user_id from keycloak_id
async create(createDto: CreateDto, keycloakId: string): Promise<EntityResponse> {
  // Get internal user_id from keycloak_id
  const user = await this.prisma.users.findUnique({
    where: { keycloak_id: keycloakId },
    select: { id: true }
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  return await this.prisma.entities.create({
    data: {
      user_id: user.id,  // Use internal user_id for relations
      ...createDto,
    },
  });
}
```

#### Pattern 2: Keycloak Integration
```typescript
// For user-related operations with Keycloak sync
async update(id: string, updateDto: UpdateUserDto, keycloakId: string): Promise<UserResponse> {
  // Update in database
  const updatedUser = await this.prisma.users.update({
    where: { id },
    data: updateDto,
  });

  // Sync to Keycloak if needed
  if (updateDto.email || updateDto.full_name) {
    await this.keycloakAdmin.updateUser(keycloakId, {
      email: updateDto.email,
      // ... other fields
    });
  }

  return updatedUser;
}
```

#### Pattern 3: Response Class with UUIDs
```typescript
// interfaces/entity.interface.ts
export class EntityResponse {
  @ApiProperty({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @Expose()
  id: string;  // UUID string, not number

  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  @Expose()
  user_id: string;  // UUID string

  @ApiProperty({ nullable: true })
  @Expose()
  created_at: Date | null;
}
```

#### Pattern 4: Pagination Implementation
```typescript
// 1. Create Query DTO extending PaginationDto
// dto/query-entity.dto.ts
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryEntityDto extends PaginationDto {
  @ApiPropertyOptional({ 
    description: 'Filter by status',
    enum: ['active', 'inactive']
  })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional({ description: 'Search by name' })
  @IsOptional()
  search?: string;
}

// 2. Service method with pagination
import { PrismaPagination } from 'src/common/helpers/prisma-pagination.helper';
import { PaginatedResponse } from 'src/common/interfaces/paginated-response.interface';

async findAll(queryDto: QueryEntityDto): Promise<PaginatedResponse<EntityResponse>> {
  const { page = 1, limit = 10, status, search } = queryDto;

  // Build where clause
  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  return PrismaPagination.paginate<EntityResponse>(
    this.prisma.entities,
    page,
    limit,
    where,
    { created_at: 'desc' }, // orderBy
  );
}

// 3. Controller endpoint
@Get()
@ApiBearerAuth('access-token')
@ApiOperation({ summary: 'Get all entities with pagination' })
@ApiResponse({ 
  status: 200,
  description: 'Returns paginated entities',
  schema: {
    example: {
      data: [
        { id: 'uuid-1', name: 'Entity 1', created_at: '2025-01-01T00:00:00.000Z' },
        { id: 'uuid-2', name: 'Entity 2', created_at: '2025-01-02T00:00:00.000Z' }
      ],
      meta: {
        total: 250,
        page: 1,
        limit: 10,
        totalPages: 25,
        hasNextPage: true,
        hasPreviousPage: false
      }
    }
  }
})
async findAll(@Query() queryDto: QueryEntityDto): Promise<PaginatedResponse<EntityResponse>> {
  return this.service.findAll(queryDto);
}

// 4. User-specific paginated endpoint
@Get('my-entities')
@ApiBearerAuth('access-token')
@ApiOperation({ summary: 'Get current user entities with pagination' })
async findMine(
  @Query() queryDto: QueryEntityDto,
  @CurrentUserId() keycloakId: string
): Promise<PaginatedResponse<EntityResponse>> {
  return this.service.findByKeycloakId(keycloakId, queryDto);
}

// Service method for user-specific pagination
async findByKeycloakId(
  keycloakId: string, 
  queryDto: QueryEntityDto
): Promise<PaginatedResponse<EntityResponse>> {
  const { page = 1, limit = 10, status } = queryDto;

  // Get user_id from keycloak_id
  const user = await this.prisma.users.findUnique({
    where: { keycloak_id: keycloakId },
    select: { id: true }
  });

  if (!user) {
    throw new NotFoundException('User not found');
  }

  const where: any = { user_id: user.id };
  if (status) where.status = status;

  return PrismaPagination.paginate<EntityResponse>(
    this.prisma.entities,
    page,
    limit,
    where,
    { created_at: 'desc' },
  );
}
```

#### Pattern 5: Advanced Pagination with Relations
```typescript
// Pagination with included relations
async findAllWithRelations(queryDto: QueryEntityDto): Promise<PaginatedResponse<EntityResponse>> {
  const { page = 1, limit = 10 } = queryDto;

  return PrismaPagination.paginate<EntityResponse>(
    this.prisma.entities,
    page,
    limit,
    {}, // where
    { created_at: 'desc' }, // orderBy
    { // include relations
      user: {
        select: {
          id: true,
          email: true,
          full_name: true
        }
      },
      relatedEntity: true
    }
  );
}

// Without relations (faster)
async findAllSimple(queryDto: QueryEntityDto): Promise<PaginatedResponse<EntityResponse>> {
  const { page = 1, limit = 10 } = queryDto;

  return PrismaPagination.paginate<EntityResponse>(
    this.prisma.entities,
    page,
    limit,
    {},
    { created_at: 'desc' }
  );
}
```

### 10. **Security Checklist**
- ❌ NEVER: `@Get('user/:userId')` - Can be exploited
- ✅ ALWAYS: `@Get('my-entities')` + `@CurrentUserId() keycloakId: string`
- ✅ ALWAYS: Verify ownership before modifying data
- ✅ ALWAYS: Extract keycloakId from JWT token

### 11. **Pagination Best Practices**
- ✅ Always set default values: `page = 1`, `limit = 10`
- ✅ Limit maximum page size (default: 100 items max)
- ✅ Use `PrismaPagination.paginate()` helper for consistent responses
- ✅ Add filtering and search capabilities in Query DTOs
- ✅ Order by `created_at: 'desc'` by default for newest first
- ✅ **Include relations only when necessary** - impacts performance
- ✅ Use `@Query()` decorator with validation DTOs
- ✅ Document pagination in Swagger with example responses
- ✅ Return `PaginatedResponse<T>` type for type safety

### 12. **Testing Requirements** ⭐

For each CRUD endpoint, you must create **two types of tests**:
1. **Unit Tests** - Test service logic in isolation with mocked dependencies
2. **Integration Tests** - Test complete HTTP request/response cycle with real database

#### Unit Tests (*.service.spec.ts)
- ✅ **REQUIRED** for every service method
- ✅ Test all success scenarios
- ✅ Test all error scenarios (validation, not found, forbidden, conflict)
- ✅ Mock all dependencies (PrismaService, external services)
- ✅ Test pagination logic with different parameters
- ✅ Test ownership validation
- ✅ Test Prisma error handling (P2002, P2003, P2025)
- ✅ Minimum 80% code coverage

**Unit Test Pattern:**
```typescript
// entity.service.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EntityService } from './entity.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, ForbiddenException, ConflictException } from '@nestjs/common';
import { Prisma } from '@prisma/client';

describe('EntityService', () => {
  let service: EntityService;
  let prisma: PrismaService;

  const prismaMock = {
    entities: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    users: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        EntityService,
        { provide: PrismaService, useValue: prismaMock },
      ],
    }).compile();

    service = module.get<EntityService>(EntityService);
    prisma = module.get<PrismaService>(PrismaService);

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create an entity successfully', async () => {
      const userId = 'user-uuid-123';
      const createDto = { name: 'Test', description: 'Test desc' };
      const expected = { id: 'entity-uuid', user_id: userId, ...createDto };

      prismaMock.entities.create.mockResolvedValue(expected);

      const result = await service.create(createDto, userId);

      expect(result).toEqual(expected);
      expect(prismaMock.entities.create).toHaveBeenCalledWith({
        data: { user_id: userId, ...createDto },
      });
    });

    it('should throw ConflictException on duplicate', async () => {
      const userId = 'user-uuid-123';
      const createDto = { name: 'Test' };
      
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Unique constraint failed',
        { code: 'P2002', clientVersion: '5.0.0', meta: { target: ['name'] } }
      );

      prismaMock.entities.create.mockRejectedValue(prismaError);

      await expect(service.create(createDto, userId)).rejects.toThrow(ConflictException);
    });

    it('should throw NotFoundException if user not found', async () => {
      const userId = 'user-uuid-123';
      const createDto = { name: 'Test' };
      
      const prismaError = new Prisma.PrismaClientKnownRequestError(
        'Foreign key constraint failed',
        { code: 'P2003', clientVersion: '5.0.0' }
      );

      prismaMock.entities.create.mockRejectedValue(prismaError);

      await expect(service.create(createDto, userId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('findAll', () => {
    it('should return paginated entities', async () => {
      const queryDto = { page: 1, limit: 10 };
      const mockData = [{ id: 'uuid-1', name: 'Entity 1' }];

      prismaMock.entities.findMany.mockResolvedValue(mockData);
      prismaMock.entities.count.mockResolvedValue(1);

      const result = await service.findAll(queryDto);

      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
    });

    it('should filter by status', async () => {
      const queryDto = { page: 1, limit: 10, status: 'active' };
      
      prismaMock.entities.findMany.mockResolvedValue([]);
      prismaMock.entities.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(prismaMock.entities.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'active' }),
        })
      );
    });
  });

  describe('findOne', () => {
    it('should return an entity by id', async () => {
      const id = 'entity-uuid';
      const expected = { id, name: 'Test Entity' };

      prismaMock.entities.findUnique.mockResolvedValue(expected);

      const result = await service.findOne(id);

      expect(result).toEqual(expected);
    });

    it('should throw NotFoundException if entity not found', async () => {
      prismaMock.entities.findUnique.mockResolvedValue(null);

      await expect(service.findOne('non-existent')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateForUser', () => {
    it('should update entity owned by user', async () => {
      const userId = 'user-uuid';
      const entityId = 'entity-uuid';
      const updateDto = { name: 'Updated' };
      const existing = { id: entityId, user_id: userId };
      const updated = { ...existing, ...updateDto };

      prismaMock.entities.findUnique.mockResolvedValue(existing);
      prismaMock.entities.update.mockResolvedValue(updated);

      const result = await service.updateForUser(entityId, updateDto, userId);

      expect(result).toEqual(updated);
    });

    it('should throw ForbiddenException if user does not own entity', async () => {
      const userId = 'user-uuid';
      const otherUserId = 'other-user-uuid';
      const entityId = 'entity-uuid';

      prismaMock.entities.findUnique.mockResolvedValue({
        id: entityId,
        user_id: otherUserId,
      });

      await expect(
        service.updateForUser(entityId, {}, userId)
      ).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if entity not found', async () => {
      prismaMock.entities.findUnique.mockResolvedValue(null);

      await expect(
        service.updateForUser('non-existent', {}, 'user-uuid')
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeForUser', () => {
    it('should delete entity owned by user', async () => {
      const userId = 'user-uuid';
      const entityId = 'entity-uuid';
      const existing = { id: entityId, user_id: userId, name: 'Test' };

      prismaMock.entities.findUnique.mockResolvedValue(existing);
      prismaMock.entities.delete.mockResolvedValue(existing);

      const result = await service.removeForUser(entityId, userId);

      expect(result.message).toBe('Entity has been deleted successfully');
      expect(prismaMock.entities.delete).toHaveBeenCalledWith({
        where: { id: entityId },
      });
    });

    it('should throw ForbiddenException if user does not own entity', async () => {
      prismaMock.entities.findUnique.mockResolvedValue({
        id: 'entity-uuid',
        user_id: 'other-user-uuid',
      });

      await expect(
        service.removeForUser('entity-uuid', 'user-uuid')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('buildWhere helper', () => {
    it('should build where clause with all filters', async () => {
      const queryDto = {
        page: 1,
        limit: 10,
        status: 'active',
        search: 'test',
      };

      prismaMock.entities.findMany.mockResolvedValue([]);
      prismaMock.entities.count.mockResolvedValue(0);

      await service.findAll(queryDto);

      expect(prismaMock.entities.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'active',
            OR: expect.any(Array),
          }),
        })
      );
    });
  });
});
```

#### Integration Tests (*.integration-spec.ts)
- ✅ **REQUIRED** for all controller endpoints
- ✅ Test complete request/response cycle
- ✅ Test authentication (with/without valid tokens)
- ✅ Test authorization (admin vs user roles)
- ✅ Test actual database operations (use test database)
- ✅ Test pagination with real data
- ✅ Test edge cases and boundary conditions
- ✅ Clean up test data after each test

**Integration Test Pattern:**
```typescript
// entity.integration-spec.ts (in test/ folder)
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Entity Integration Tests', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let accessToken: string;
  let userId: string;
  let entityId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    
    await app.init();

    prisma = app.get<PrismaService>(PrismaService);

    // Login and get access token
    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({ email: 'test@example.com', password: 'Test123!' })
      .expect(200);

    accessToken = loginResponse.body.access_token;

    // Get user ID from token or database
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
    await prisma.entities.deleteMany({
      where: { user_id: userId },
    });
    await app.close();
  });

  afterEach(async () => {
    // Clean up after each test if needed
  });

  describe('POST /entities', () => {
    it('should create a new entity', async () => {
      const createDto = {
        name: 'Test Entity',
        description: 'Test description',
        status: 'active',
      };

      const response = await request(app.getHttpServer())
        .post('/entities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toMatchObject({
        id: expect.any(String),
        name: createDto.name,
        description: createDto.description,
        user_id: userId,
      });

      entityId = response.body.id;
    });

    it('should fail without authentication', async () => {
      await request(app.getHttpServer())
        .post('/entities')
        .send({ name: 'Test' })
        .expect(401);
    });

    it('should fail with invalid data', async () => {
      await request(app.getHttpServer())
        .post('/entities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' }) // Invalid
        .expect(400);
    });

    it('should fail with duplicate unique field', async () => {
      const createDto = { name: 'Unique Name' };

      // First creation
      await request(app.getHttpServer())
        .post('/entities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(201);

      // Duplicate creation
      await request(app.getHttpServer())
        .post('/entities')
        .set('Authorization', `Bearer ${accessToken}`)
        .send(createDto)
        .expect(409);
    });
  });

  describe('GET /entities', () => {
    it('should get all entities with pagination (admin)', async () => {
      const response = await request(app.getHttpServer())
        .get('/entities?page=1&limit=10')
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
        .get('/entities?status=active')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.every(e => e.status === 'active')).toBe(true);
    });

    it('should search entities', async () => {
      const response = await request(app.getHttpServer())
        .get('/entities?search=Test')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data).toBeDefined();
    });
  });

  describe('GET /entities/my-entities', () => {
    it('should get current user entities only', async () => {
      const response = await request(app.getHttpServer())
        .get('/entities/my-entities')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.data.every(e => e.user_id === userId)).toBe(true);
    });
  });

  describe('GET /entities/:id', () => {
    it('should get entity by id', async () => {
      const response = await request(app.getHttpServer())
        .get(`/entities/${entityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body).toMatchObject({
        id: entityId,
        name: expect.any(String),
      });
    });

    it('should return 404 for non-existent entity', async () => {
      await request(app.getHttpServer())
        .get('/entities/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail with invalid UUID', async () => {
      await request(app.getHttpServer())
        .get('/entities/invalid-uuid')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(400);
    });
  });

  describe('PATCH /entities/:id', () => {
    it('should update entity owned by user', async () => {
      const updateDto = { name: 'Updated Name' };

      const response = await request(app.getHttpServer())
        .patch(`/entities/${entityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
    });

    it('should fail to update entity owned by another user', async () => {
      // Create entity as different user (if you have multiple test users)
      // Then try to update it
      // expect(403)
    });

    it('should fail with invalid data', async () => {
      await request(app.getHttpServer())
        .patch(`/entities/${entityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ name: '' })
        .expect(400);
    });
  });

  describe('DELETE /entities/:id', () => {
    it('should delete entity owned by user', async () => {
      const response = await request(app.getHttpServer())
        .delete(`/entities/${entityId}`)
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(200);

      expect(response.body.message).toBeDefined();

      // Verify deletion
      const deleted = await prisma.entities.findUnique({
        where: { id: entityId },
      });
      expect(deleted).toBeNull();
    });

    it('should return 404 when deleting non-existent entity', async () => {
      await request(app.getHttpServer())
        .delete('/entities/00000000-0000-0000-0000-000000000000')
        .set('Authorization', `Bearer ${accessToken}`)
        .expect(404);
    });

    it('should fail to delete entity owned by another user', async () => {
      // Create entity as different user, try to delete
      // expect(403)
    });
  });
});
```

#### Controller Tests (*.controller.spec.ts)
- ✅ Optional but recommended for complex controllers
- ✅ Test request validation
- ✅ Test decorator functionality
- ✅ Mock service layer

**Controller Test Pattern:**
```typescript
// entity.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { EntityController } from './entity.controller';
import { EntityService } from './entity.service';

describe('EntityController', () => {
  let controller: EntityController;
  let service: EntityService;

  const mockService = {
    create: jest.fn(),
    findAll: jest.fn(),
    findOne: jest.fn(),
    findByUserId: jest.fn(),
    updateForUser: jest.fn(),
    removeForUser: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [EntityController],
      providers: [
        { provide: EntityService, useValue: mockService },
      ],
    }).compile();

    controller = module.get<EntityController>(EntityController);
    service = module.get<EntityService>(EntityService);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('create', () => {
    it('should call service.create with correct parameters', async () => {
      const createDto = { name: 'Test' };
      const userId = 'user-uuid';
      const expected = { id: 'entity-uuid', ...createDto };

      mockService.create.mockResolvedValue(expected);

      const result = await controller.create(createDto, userId);

      expect(service.create).toHaveBeenCalledWith(createDto, userId);
      expect(result).toEqual(expected);
    });
  });

  // Add similar tests for other methods
});
```

#### Test Coverage Requirements
- ✅ **Minimum 80%** overall code coverage
- ✅ **100%** coverage for critical business logic
- ✅ **100%** coverage for security-related code (auth, ownership checks)

#### Running Tests
```bash
# Unit tests
npm test

# Unit tests with coverage
npm run test:cov

# Integration tests
npm run test:e2e

# Watch mode for development
npm run test:watch

# Specific test file
npm test -- entity.service.spec.ts
npm run test:e2e -- --testNamePattern="Entity Integration"
```

#### Test Environment Setup
```typescript
// test/setup.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_TEST_URL,
    },
  },
});

beforeAll(async () => {
  // Run migrations on test database
  // Create test users, seed data
});

afterAll(async () => {
  // Clean up test database
  await prisma.$disconnect();
});
```
