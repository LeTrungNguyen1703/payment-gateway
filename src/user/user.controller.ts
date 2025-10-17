import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  HttpStatus,
  HttpCode,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import {
  Public,
  Resource,
  RoleMatchingMode,
  Roles,
} from 'nest-keycloak-connect';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import { CurrentUserId } from './decorators/current-user.decorator';
import { UserResponse } from './interfaces/user.interface';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@ApiTags('users')
@Controller('user')
@Resource('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Public()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a new user (Public registration)' })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: UserResponse
  })
  @ApiResponse({ status: 409, description: 'User with this email already exists' })
  create(@Body() createUserDto: CreateUserDto): Promise<UserResponse> {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Roles({ roles: ['admin'] })
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get all users with pagination (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated users',
    schema: {
      example: {
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            email: 'user@example.com',
            full_name: 'Nguyen Van A',
            phone: '+84123456789',
            status: 'active',
            kyc_verified: false,
            kyc_level: 0,
            metadata: null,
            created_at: '2025-01-01T00:00:00.000Z',
            updated_at: '2025-01-01T00:00:00.000Z',
            last_login_at: null
          }
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
  findAll(@Query() queryDto: QueryUserDto): Promise<PaginatedResponse<UserResponse>> {
    return this.userService.findAll(queryDto);
  }

  @Get('profile')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Returns current user profile',
    type: UserResponse
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getProfile(@CurrentUserId() keycloakId: string): Promise<UserResponse> {
    return this.userService.findByKeycloakId(keycloakId);
  }

  @Get(':id')
  @Roles({ roles: ['admin'], mode: RoleMatchingMode.ANY })
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Get user by ID' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Returns user details',
    type: UserResponse
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  findOne(@Param('id') id: string): Promise<UserResponse> {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update user by ID' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: UserResponse
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  update(
    @Param('id') id: string,
    @Body() updateUserDto: UpdateUserDto
  ): Promise<UserResponse> {
    return this.userService.update(id, updateUserDto);
  }

  @Patch('profile/me')
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Update current user profile' })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    type: UserResponse
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  async updateProfile(
    @CurrentUserId() keycloakId: string,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    const user = await this.userService.findByKeycloakId(keycloakId);
    return this.userService.update(user.id, updateUserDto);
  }

  @Delete(':id')
  @Roles({ roles: ['admin'] })
  @ApiBearerAuth('access-token')
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  @ApiParam({ name: 'id', description: 'User ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'User deleted successfully',
    schema: {
      example: {
        message: 'User user@example.com has been deleted successfully',
        user: {
          id: '123e4567-e89b-12d3-a456-426614174000',
          email: 'user@example.com',
          full_name: 'Nguyen Van A',
          keycloak_id: '550e8400-e29b-41d4-a716-446655440000'
        }
      }
    }
  })
  @ApiResponse({ status: 404, description: 'User not found' })
  remove(@Param('id') id: string): Promise<{ message: string; user: Partial<UserResponse> }> {
    return this.userService.remove(id);
  }
}
