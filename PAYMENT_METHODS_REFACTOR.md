# Payment Methods Refactoring - Direct userId Usage

## Overview
Refactored the payment methods module to use the database `userId` directly instead of requiring a Keycloak ID lookup on every request. This improves performance by eliminating unnecessary database queries.

## Changes Made

### 1. New User Decorators (`src/user/decorators/current-user.decorator.ts`)
Added new decorators to access database user information:
- `CurrentDbUserId` - Returns the database user ID directly
- `CurrentDbUser` - Returns the full database user object

These decorators read from `request.dbUser` which is populated by the `DbUserGuard`.

### 2. New DbUserGuard (`src/user/guards/db-user.guard.ts`)
Created a guard that:
- Extracts the Keycloak ID from the JWT token (`request.user.sub`)
- Performs a **single** database lookup to fetch the user
- Attaches the user to `request.dbUser` for use by decorators
- Throws `NotFoundException` if user doesn't exist in database

This guard should be applied at the controller level to ensure the database user is resolved once per request.

### 3. Payment Methods Service (`src/payment-methods/payment-methods.service.ts`)
**Before:** Methods accepted `keycloakId` and performed a database lookup to find the `userId`
**After:** Methods accept `userId` directly

Changed methods:
- `create(dto, userId)` - Now accepts userId directly
- `findByUserId(userId, queryDto)` - Renamed from `findByKeycloakId`
- `updateForUser(id, dto, userId)` - Now accepts userId directly
- `removeForUser(id, userId)` - Now accepts userId directly

Removed:
- `getUserIdByKeycloakId()` helper method - no longer needed

### 4. Payment Methods Controller (`src/payment-methods/payment-methods.controller.ts`)
- Added `@UseGuards(DbUserGuard)` at controller level
- Changed all `@CurrentUserId()` (Keycloak ID) to `@CurrentDbUserId()` (database user ID)
- Updated all service method calls to pass userId instead of keycloakId

### 5. Tests (`src/payment-methods/payment-methods.service.spec.ts`)
Updated all tests to:
- Use `userId` instead of `keycloakId`
- Properly mock Prisma errors using `Prisma.PrismaClientKnownRequestError`
- Test the refactored method signatures

## Performance Benefits

### Before:
```
Request → Controller (keycloakId) → Service
  → DB Query 1: Find user by keycloakId
  → DB Query 2: Find payment methods by userId
```

### After:
```
Request → DbUserGuard (DB Query: Find user by keycloakId, attach to request)
  → Controller (userId from request.dbUser)
  → Service (DB Query: Find payment methods by userId)
```

**Result:** Eliminated redundant database queries. The user lookup happens once per request in the guard, not multiple times in different service methods.

## Usage Example

```typescript
@Controller('payment-methods')
@UseGuards(DbUserGuard) // Apply guard at controller level
export class PaymentMethodsController {
  
  @Post()
  create(
    @Body() dto: CreatePaymentMethodDto,
    @CurrentDbUserId() userId: string, // Database user ID, not Keycloak ID
  ) {
    return this.service.create(dto, userId);
  }
}
```

## Migration Notes

Any other modules that need user information should:
1. Import and use `DbUserGuard` at the controller level
2. Use `@CurrentDbUserId()` or `@CurrentDbUser()` decorators
3. Update service methods to accept `userId` instead of `keycloakId`

## Testing
All tests pass successfully:
- ✅ Create payment method using userId
- ✅ Handle Prisma constraint errors properly
- ✅ Paginate user's payment methods
- ✅ Update with ownership validation
- ✅ Delete with ownership validation

