# Keycloak Integration Guide

## Cấu hình

Đã cấu hình Keycloak với thông tin:
- **Realm**: devteria
- **Client ID**: devteria_app
- **Client Secret**: 22zIfvPGn83xbYguOdUpMCicw9To6qKh
- **Auth Server URL**: http://localhost:8180

## Decorators có sẵn từ nest-keycloak-connect

Package `nest-keycloak-connect` cung cấp sẵn các decorators sau:

### 1. @Public()
Cho phép route không cần authentication.

### 2. @Roles(...roles: string[])
Yêu cầu user có một trong các roles được chỉ định.

### 3. @Scopes(...scopes: string[])
Yêu cầu user có một trong các scopes được chỉ định.

### 4. @Resource(resource: string)
Chỉ định resource cho route (dùng với Resource Guard).

### 5. @AuthenticatedUser()
Parameter decorator để lấy thông tin user đã authenticate.

### 6. @EnforcerOptions(options)
Tùy chỉnh options cho enforcer.

## Ví dụ sử dụng

### Public route - không cần authentication

```typescript
import { Controller, Get } from '@nestjs/common';
import { Public } from 'nest-keycloak-connect';

@Controller('api')
export class AppController {
  @Public()
  @Get('health')
  healthCheck() {
    return { status: 'ok' };
  }
}
```

### Protected route - cần authentication

```typescript
import { Controller, Get } from '@nestjs/common';
import { AuthenticatedUser } from 'nest-keycloak-connect';

@Controller('api')
export class AppController {
  @Get('protected')
  getProtected(@AuthenticatedUser() user: any) {
    return {
      message: 'This is a protected route',
      user: {
        id: user?.sub,
        username: user?.preferred_username,
        email: user?.email,
      },
    };
  }
}
```

### Route với single role

```typescript
import { Controller, Get } from '@nestjs/common';
import { Roles } from 'nest-keycloak-connect';

@Controller('admin')
export class AdminController {
  @Roles('admin')
  @Get('users')
  getUsers() {
    return { users: [] };
  }
}
```

### Route với multiple roles (OR logic)

```typescript
import { Controller, Get } from '@nestjs/common';
import { Roles } from 'nest-keycloak-connect';

@Controller('dashboard')
export class DashboardController {
  // User có role 'admin' HOẶC 'moderator' đều truy cập được
  @Roles('admin', 'moderator')
  @Get('stats')
  getStats() {
    return { stats: {} };
  }
}
```

### Route với scopes

```typescript
import { Controller, Get } from '@nestjs/common';
import { Scopes } from 'nest-keycloak-connect';

@Controller('api')
export class ApiController {
  @Scopes('read:users')
  @Get('users')
  getUsers() {
    return { users: [] };
  }

  @Scopes('write:users', 'admin:users')
  @Post('users')
  createUser() {
    return { created: true };
  }
}
```

### Route với resource guard

```typescript
import { Controller, Get } from '@nestjs/common';
import { Resource } from 'nest-keycloak-connect';

@Controller('files')
export class FilesController {
  @Resource('file:123')
  @Get(':id')
  getFile() {
    return { file: {} };
  }
}
```

### Kết hợp nhiều decorators

```typescript
import { Controller, Get } from '@nestjs/common';
import { Roles, Scopes, AuthenticatedUser } from 'nest-keycloak-connect';

@Controller('api')
export class ApiController {
  @Roles('admin')
  @Scopes('read:sensitive-data')
  @Get('sensitive')
  getSensitiveData(@AuthenticatedUser() user: any) {
    return {
      data: 'sensitive information',
      accessedBy: user?.preferred_username,
    };
  }
}
```

## Test với Postman hoặc curl

### Lấy token từ Keycloak:

```bash
curl -X POST http://localhost:8180/realms/devteria/protocol/openid-connect/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "client_id=devteria_app" \
  -d "client_secret=22zIfvPGn83xbYguOdUpMCicw9To6qKh" \
  -d "grant_type=password" \
  -d "username=YOUR_USERNAME" \
  -d "password=YOUR_PASSWORD"
```

### Sử dụng token để gọi API:

```bash
curl -X GET http://localhost:3001/api/protected \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Tắt Global Guards

Nếu bạn muốn tự quản lý guards cho từng route, hãy comment các providers trong `keycloak.module.ts`:

```typescript
// providers: [
//   {
//     provide: APP_GUARD,
//     useClass: AuthGuard,
//   },
//   {
//     provide: APP_GUARD,
//     useClass: ResourceGuard,
//   },
//   {
//     provide: APP_GUARD,
//     useClass: RoleGuard,
//   },
// ],
```

Sau đó áp dụng guards thủ công:

```typescript
import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard, RoleGuard, Roles } from 'nest-keycloak-connect';

@Controller('api')
@UseGuards(AuthGuard, RoleGuard)
export class AppController {
  @Roles('user')
  @Get('protected')
  protectedRoute() {
    return { message: 'This is protected' };
  }
}
```

## User Object Structure

Khi sử dụng `@AuthenticatedUser()`, bạn sẽ nhận được object với các trường:

```typescript
{
  sub: string;                    // User ID
  email_verified: boolean;
  name: string;
  preferred_username: string;
  given_name: string;
  family_name: string;
  email: string;
  realm_access: {
    roles: string[];              // Realm roles
  };
  resource_access: {
    [clientId: string]: {
      roles: string[];            // Client roles
    };
  };
  scope: string;                  // Scopes
  // ... và các trường khác tùy Keycloak config
}
```
