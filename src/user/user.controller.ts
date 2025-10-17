import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { UserService } from './user.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import {
  Public,
  Resource,
  RoleMatchingMode,
  Roles,
  Scopes,
} from 'nest-keycloak-connect';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrentUserId } from './decorators/current-user.decorator';

@ApiTags('users')
@ApiBearerAuth()
@Controller('user')
@Resource('user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post()
  @Public()
  @ApiOperation({ summary: 'Create a new user (Admin only)' })
  create(@Body() createUserDto: CreateUserDto) {
    return this.userService.create(createUserDto);
  }

  @Get()
  @Roles({ roles: ['admin'] })
  @ApiOperation({ summary: 'Get all users (Admin only)' })
  findAll() {
    return this.userService.findAll();
  }

  @Get('profile')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@CurrentUserId() keycloakId: string) {
    if (!keycloakId) {
      return { message: 'User not authenticated' };
    }
    return this.userService.findByKeycloakId(keycloakId);
  }

  @Get(':id')
  // @Scopes('user:read')
  @ApiBearerAuth('access-token')
  @Roles({ roles: ['realm:user'], mode: RoleMatchingMode.ANY })
  @ApiOperation({ summary: 'Get user by ID' })
  findOne(@Param('id') id: string) {
    return this.userService.findOne(id);
  }

  @Patch(':id')
  @Scopes('user:update')
  @ApiOperation({ summary: 'Update user' })
  update(@Param('id') id: string, @Body() updateUserDto: UpdateUserDto) {
    return this.userService.update(id, updateUserDto);
  }

  @Patch('profile/me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(
    @CurrentUserId() keycloakId: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    if (!keycloakId) {
      return { message: 'User not authenticated' };
    }

    const user = await this.userService.findByKeycloakId(keycloakId);
    return this.userService.update(user.id, updateUserDto);
  }

  @Delete(':id')
  @Roles({ roles: ['admin'] })
  @ApiOperation({ summary: 'Delete user (Admin only)' })
  remove(@Param('id') id: string) {
    return this.userService.remove(id);
  }
}
