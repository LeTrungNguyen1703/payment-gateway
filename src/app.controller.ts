import { Controller, Get, UseInterceptors } from '@nestjs/common';
import { AppService } from './app.service';
import { CacheInterceptor } from '@nestjs/cache-manager';
import {
  AuthenticatedUser,
  Public,
  Resource,
  RoleMatchingMode,
  Roles,
  Scopes,
} from 'nest-keycloak-connect';

@Controller()
@UseInterceptors(CacheInterceptor)
@Resource(AppController.name)
export class AppController {
  constructor(private readonly appService: AppService) {}

  // Public route - không cần authentication
  @Public()
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  // Public route - health check
  @Public()
  @Get('health')
  healthCheck() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  // Protected route - cần authentication
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

  // Protected route with role - chỉ admin mới truy cập được
  @Roles({ roles: ['admin'] })
  @Get('admin')
  getAdmin(@AuthenticatedUser() user: any) {
    return {
      message: 'Admin only route',
      user: {
        id: user?.sub,
        username: user?.preferred_username,
        roles: user?.realm_access?.roles || [],
      },
    };
  }

  // Protected route with multiple roles - user hoặc moderator có thể truy cập
  @Roles({ roles: ['user', 'moderator'], mode: RoleMatchingMode.ANY })
  @Get('dashboard')
  getDashboard(@AuthenticatedUser() user: any) {
    return {
      message: 'Dashboard route',
      user: {
        id: user?.sub,
        username: user?.preferred_username,
        roles: user?.realm_access?.roles || [],
      },
    };
  }

  // Protected route with scopes
  @Scopes('read:users')
  @Get('users')
  getUsers(@AuthenticatedUser() user: any) {
    return {
      message: 'Users list',
      requestedBy: user?.preferred_username,
    };
  }
}
