# Pagination Implementation - Payment Gateway

## ✅ Đã Hoàn Thành

### 1. **Common Pagination Infrastructure**
Các file cơ sở đã tồn tại và sẵn sàng sử dụng:

- ✅ `src/common/dto/pagination.dto.ts` - Base DTO với validation cho page/limit
- ✅ `src/common/helpers/prisma-pagination.helper.ts` - Helper function để paginate
- ✅ `src/common/interfaces/paginated-response.interface.ts` - Interface cho response

### 2. **User Module - Reference Implementation**

#### **Đã tạo Query DTO**
📁 `src/user/dto/query-user.dto.ts`

```typescript
export class QueryUserDto extends PaginationDto {
  status?: string;           // Filter by status
  kyc_verified?: boolean;    // Filter by KYC status
  search?: string;           // Search by email or name
}
```

#### **Đã update User Service**
📁 `src/user/user.service.ts`

**Thay đổi:**
- ✅ Import `PrismaPagination` và `PaginatedResponse`
- ✅ Import `QueryUserDto`
- ✅ Method `findAll()` giờ nhận `QueryUserDto` và return `PaginatedResponse<UserResponse>`
- ✅ Hỗ trợ filtering: status, kyc_verified, search
- ✅ Search trong email và full_name (case-insensitive)
- ✅ Mặc định sắp xếp theo `created_at: 'desc'`

#### **Đã update User Controller**
📁 `src/user/user.controller.ts`

**Thay đổi:**
- ✅ Import `Query` decorator, `QueryUserDto`, và `PaginatedResponse`
- ✅ Endpoint `GET /user` giờ nhận query parameters
- ✅ Full Swagger documentation với example response
- ✅ Return type là `PaginatedResponse<UserResponse>`

### 3. **Updated Instruction File**
📁 `.github/CRUD-payment-gateway.instruction.md`

**Đã thêm:**
- ✅ Pattern 4: Pagination Implementation - Complete guide
- ✅ Pattern 5: Advanced Pagination with Relations
- ✅ Section 11: Pagination Best Practices
- ✅ Updated file structure to include query DTOs

## 📋 Cách Sử Dụng Pagination

### **Example API Calls**

#### 1. **Get all users with default pagination**
```bash
GET /user?page=1&limit=10
```

#### 2. **Filter by status**
```bash
GET /user?page=1&limit=10&status=active
```

#### 3. **Filter by KYC verified**
```bash
GET /user?page=2&limit=20&kyc_verified=true
```

#### 4. **Search by email or name**
```bash
GET /user?page=1&limit=10&search=john
```

#### 5. **Combined filters**
```bash
GET /user?page=1&limit=10&status=active&kyc_verified=true&search=nguyen
```

### **Response Format**
```json
{
  "data": [
    {
      "id": "123e4567-e89b-12d3-a456-426614174000",
      "keycloak_id": "550e8400-e29b-41d4-a716-446655440000",
      "email": "user@example.com",
      "full_name": "Nguyen Van A",
      "phone": "+84123456789",
      "status": "active",
      "kyc_verified": false,
      "kyc_level": 0,
      "metadata": null,
      "created_at": "2025-01-01T00:00:00.000Z",
      "updated_at": "2025-01-01T00:00:00.000Z",
      "last_login_at": null
    }
  ],
  "meta": {
    "total": 250,
    "page": 1,
    "limit": 10,
    "totalPages": 25,
    "hasNextPage": true,
    "hasPreviousPage": false
  }
}
```

## 🎯 Pattern để Apply cho Modules Khác

### **Step 1: Create Query DTO**
```typescript
// dto/query-[entity].dto.ts
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class QueryEntityDto extends PaginationDto {
  @ApiPropertyOptional({ enum: ['active', 'inactive'] })
  @IsOptional()
  @IsEnum(['active', 'inactive'])
  status?: string;

  @ApiPropertyOptional()
  @IsOptional()
  search?: string;
}
```

### **Step 2: Update Service**
```typescript
import { PrismaPagination } from '../common/helpers/prisma-pagination.helper';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { QueryEntityDto } from './dto/query-entity.dto';

async findAll(queryDto?: QueryEntityDto): Promise<PaginatedResponse<EntityResponse>> {
  const { page = 1, limit = 10, status, search } = queryDto || {};

  const where: any = {};
  if (status) where.status = status;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
    ];
  }

  return PrismaPagination.paginate<EntityResponse>(
    this.prisma.entities,
    page,
    limit,
    where,
    { created_at: 'desc' },
  );
}
```

### **Step 3: Update Controller**
```typescript
import { Query } from '@nestjs/common';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { QueryEntityDto } from './dto/query-entity.dto';

@Get()
@ApiResponse({ 
  status: 200,
  schema: {
    example: {
      data: [...],
      meta: {
        total: 100,
        page: 1,
        limit: 10,
        totalPages: 10,
        hasNextPage: true,
        hasPreviousPage: false
      }
    }
  }
})
findAll(@Query() queryDto: QueryEntityDto): Promise<PaginatedResponse<EntityResponse>> {
  return this.service.findAll(queryDto);
}
```

## 🔥 Key Features

### **1. Automatic Validation**
- Page must be >= 1
- Limit must be between 1 and 100
- Auto transform string to number

### **2. Performance Optimized**
- Parallel execution of data fetch and count query
- Skip calculation for efficient pagination
- Safe limit to prevent overloading

### **3. Flexible Filtering**
- Support multiple filters
- Case-insensitive search
- OR conditions support

### **4. Type Safe**
- Generic type support: `PaginatedResponse<T>`
- Full TypeScript typing
- Swagger documentation

### **5. Consistent Response**
- Same format across all endpoints
- Clear metadata
- Navigation hints (hasNextPage, hasPreviousPage)

## 📊 Validation Rules

| Parameter | Type | Min | Max | Default | Required |
|-----------|------|-----|-----|---------|----------|
| page      | number | 1 | ∞ | 1 | No |
| limit     | number | 1 | 100 | 10 | No |
| status    | string | - | - | - | No |
| search    | string | - | - | - | No |

## ⚡ Performance Tips

1. **Use indexes** on filtered/searched columns
2. **Avoid including relations** unless necessary
3. **Set reasonable default limit** (10-20 items)
4. **Use select** to exclude heavy fields when not needed
5. **Cache total count** for frequently accessed lists

## 🚀 Next Steps

Có thể áp dụng pattern này cho:
- [ ] Transactions module
- [ ] Payment Methods module
- [ ] Notifications module
- [ ] KYC Verifications module
- [ ] Refunds module

Mỗi module chỉ cần:
1. Tạo QueryDto extends PaginationDto
2. Update service method findAll()
3. Update controller để sử dụng @Query()
4. Thêm Swagger documentation

## ✅ Verified Working

- ✅ TypeScript compilation: SUCCESS
- ✅ No errors or warnings
- ✅ User module ready as reference
- ✅ Instruction file updated

---

**Created**: October 17, 2025  
**Status**: ✅ Production Ready

