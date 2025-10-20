import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { QueryUserDto } from './dto/query-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { KeycloakAdminService } from '../keycloak/keycloak-admin.service';
import { UserResponse } from './interfaces/user.interface';
import { PrismaPagination } from '../common/helpers/prisma-pagination.helper';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
  ) {}

  async create(createUserDto: CreateUserDto): Promise<UserResponse> {
    // Check if user with same email already exists in database
    const existingUser = await this.prisma.users.findFirst({
      where: {
        email: createUserDto.email,
      },
    });

    if (existingUser) {
      throw new ConflictException('User with this email already exists');
    }

    try {
      // Extract password and parse full_name
      const { password, full_name, ...userData } = createUserDto;
      const [firstName, ...lastNameParts] = (full_name || '').split(' ');
      const lastName = lastNameParts.join(' ');

      // 1. Create user in Keycloak first
      this.logger.log(`Creating user in Keycloak: ${createUserDto.email}`);
      const keycloakUser = await this.keycloakAdmin.createUser({
        email: createUserDto.email,
        username: createUserDto.email,
        firstName: firstName || undefined,
        lastName: lastName || undefined,
        password: password,
        enabled: true,
        emailVerified: true,
      });

      // 2. Create user in database with keycloak_id
      this.logger.log(
        `Creating user in database with Keycloak ID: ${keycloakUser.id}`,
      );
      const dbUser = await this.prisma.users.create({
        data: {
          keycloak_id: keycloakUser.id,
          email: createUserDto.email,
          full_name: full_name ?? null,
          phone: userData.phone ?? null,
          metadata: userData.metadata ?? null,
        },
      });

      this.logger.log(`User created successfully: ${dbUser.id}`);

      return dbUser;
    } catch (error: any) {
      this.logger.error('Failed to create user', error);

      // If database creation failed but Keycloak user was created, we should rollback
      if (error.keycloakUser?.id) {
        try {
          await this.keycloakAdmin.deleteUser(error.keycloakUser.id);
          this.logger.log('Rolled back Keycloak user creation');
        } catch (rollbackError) {
          this.logger.error('Failed to rollback Keycloak user', rollbackError);
        }
      }

      throw error;
    }
  }

  async findAll(
    queryDto?: QueryUserDto,
  ): Promise<PaginatedResponse<UserResponse>> {
    const {
      page = 1,
      limit = 10,
      status,
      kyc_verified,
      search,
    } = queryDto || {};

    // Build where clause
    const where: any = {};

    if (status) {
      where.status = status;
    }

    if (kyc_verified !== undefined) {
      where.kyc_verified =
        kyc_verified === true || kyc_verified === ('true' as any);
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { full_name: { contains: search, mode: 'insensitive' } },
      ];
    }

    return PrismaPagination.paginate<UserResponse>(
      this.prisma.users,
      page,
      limit,
      where,
      { created_at: 'desc' },
    );
  }

  async findOne(id: string): Promise<UserResponse> {
    const user = await this.prisma.users.findUnique({
      where: { id },
      include: {
        payment_methods: true,
        kyc_verifications: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByKeycloakId(keycloakId: string): Promise<UserResponse> {
    const user = await this.prisma.users.findUnique({
      where: { keycloak_id: keycloakId },
    });

    if (!user) {
      throw new NotFoundException(
        `User with Keycloak ID ${keycloakId} not found`,
      );
    }

    return user;
  }

  async findByEmail(email: string): Promise<UserResponse> {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async update(
    id: string,
    updateUserDto: UpdateUserDto,
  ): Promise<UserResponse> {
    const user = await this.findOne(id);

    try {
      // Extract special fields and spread the rest
      const { password, full_name, ...otherUpdates } = updateUserDto;

      const dataToUpdate: any = {
        ...otherUpdates,
        updated_at: new Date(),
      };

      if (full_name !== undefined) {
        dataToUpdate.full_name = full_name;
      }

      // Update user in database
      const updatedUser = await this.prisma.users.update({
        where: { id },
        data: dataToUpdate,
      });

      // Update user in Keycloak if name or email changed
      if (full_name !== undefined || updateUserDto.email) {
        const [firstName, ...lastNameParts] = (
          full_name ||
          user.full_name ||
          ''
        ).split(' ');
        const lastName = lastNameParts.join(' ');

        await this.keycloakAdmin.updateUser(user.keycloak_id, {
          email: updateUserDto.email || user.email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        });

        this.logger.log(`Updated user in Keycloak: ${user.keycloak_id}`);
      }

      // Update password in Keycloak if provided (using separate method)
      if (password) {
        await this.keycloakAdmin.resetPassword(user.keycloak_id, password);
        this.logger.log(`Password updated for user: ${user.keycloak_id}`);
      }

      return updatedUser;
    } catch (error) {
      this.logger.error('Failed to update user', error);
      throw error;
    }
  }

  async updateLastLogin(id: string): Promise<UserResponse> {
    return this.prisma.users.update({
      where: { id },
      data: {
        last_login_at: new Date(),
      },
    });
  }

  async remove(
    id: string,
  ): Promise<{ message: string; user: Partial<UserResponse> }> {
    const user = await this.findOne(id);

    try {
      // Delete from database first
      const deletedUser = await this.prisma.users.delete({
        where: { id },
        select: {
          id: true,
          email: true,
          full_name: true,
          keycloak_id: true,
        },
      });

      // Delete from Keycloak
      await this.keycloakAdmin.deleteUser(user.keycloak_id);

      this.logger.log(`User deleted: ${id}, Keycloak ID: ${user.keycloak_id}`);

      return {
        message: `User ${deletedUser.email} has been deleted successfully`,
        user: deletedUser,
      };
    } catch (error) {
      this.logger.error('Failed to delete user', error);
      throw error;
    }
  }
}
