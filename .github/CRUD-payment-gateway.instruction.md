# CRUD Module Guidelines for Payment Gateway

## Core Requirements Summary

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

## File Structure
```
src/
  [entity-name]/
    [entity-name].controller.ts
    [entity-name].service.ts
    [entity-name].module.ts
    dto/
      create-[entity-name].dto.ts
      update-[entity-name].dto.ts
      query-[entity-name].dto.ts  // For pagination & filtering
    interfaces/
      [entity-name].interface.ts  // Contains both Interface and Response class
  common/
    dto/
      pagination.dto.ts  // Base pagination DTO
    helpers/
      prisma-pagination.helper.ts  // Reusable pagination helper
    interfaces/
      paginated-response.interface.ts  // Generic paginated response
```

## Example: User Module (Reference Implementation)

See `src/user/` for complete reference implementation following these guidelines:
- **user.service.ts**: Clean service with no verbose selects, proper error handling
- **user.controller.ts**: Full Swagger documentation, proper decorators
- **interfaces/user.interface.ts**: Response class with all fields properly typed
- **dto/**: Proper validation and Swagger decorators

## Common Mistakes to Avoid

1. ❌ Using interface instead of class for Response types
2. ❌ Taking userId from URL params or request body
3. ❌ Not resolving internal user_id from keycloak_id
4. ❌ Using `?:` optional instead of `| null` for nullable fields
5. ❌ Forgetting @ApiBearerAuth decorator
6. ❌ Verbose select statements listing all fields
7. ❌ Using ParseIntPipe for UUIDs (use ParseUUIDPipe)
8. ❌ Not handling Keycloak sync for user operations

## Validation Checklist

- [ ] Response class (not interface) with @Expose() and @ApiProperty()
- [ ] All endpoints use Keycloak guards (@Roles, @Resource)
- [ ] keycloakId extracted from @CurrentUserId() decorator
- [ ] User_id resolved from keycloak_id in database
- [ ] Full Swagger documentation
- [ ] Proper error handling (404, 400, 409)
- [ ] Service exported from module
- [ ] No verbose select statements (unless necessary)
- [ ] UUID validation with ParseUUIDPipe
- [ ] Keycloak sync for user-related operations

