import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaService } from '../prisma/prisma.service';
import { KeycloakAdminService } from '../keycloak/keycloak-admin.service';

@Injectable()
export class UserService {
  private readonly logger = new Logger(UserService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly keycloakAdmin: KeycloakAdminService,
  ) {}

  async create(createUserDto: CreateUserDto) {
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
      this.logger.log(`Creating user in database with Keycloak ID: ${keycloakUser.id}`);
      const dbUser = await this.prisma.users.create({
        data: {
          keycloak_id: keycloakUser.id,
          email: createUserDto.email,
          full_name: full_name,
          phone: createUserDto.phone,
          metadata: createUserDto.metadata,
        },
      });

      this.logger.log(`User created successfully: ${dbUser.id}`);

      // Return user without sensitive data
      return {
        id: dbUser.id,
        keycloak_id: dbUser.keycloak_id,
        email: dbUser.email,
        full_name: dbUser.full_name,
        phone: dbUser.phone,
        status: dbUser.status,
        created_at: dbUser.created_at,
      };
    } catch (error) {
      this.logger.error('Failed to create user', error);

      // If database creation failed but Keycloak user was created, we should rollback
      // In production, consider implementing a more robust transaction/saga pattern
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

  async findAll() {
    return this.prisma.users.findMany({
      select: {
        id: true,
        keycloak_id: true,
        email: true,
        full_name: true,
        phone: true,
        status: true,
        kyc_verified: true,
        kyc_level: true,
        created_at: true,
        updated_at: true,
        last_login_at: true,
      },
    });
  }

  async findOne(id: string) {
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

  async findByKeycloakId(keycloakId: string) {
    const user = await this.prisma.users.findUnique({
      where: { keycloak_id: keycloakId },
    });

    if (!user) {
      throw new NotFoundException(`User with Keycloak ID ${keycloakId} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    const user = await this.prisma.users.findUnique({
      where: { email },
    });

    if (!user) {
      throw new NotFoundException(`User with email ${email} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id); // Check if user exists

    try {
      // Update user in database
      const updatedUser = await this.prisma.users.update({
        where: { id },
        data: {
          ...updateUserDto,
          updated_at: new Date(),
        },
      });

      // Update user in Keycloak if name changed
      if (updateUserDto.full_name || updateUserDto.email) {
        const [firstName, ...lastNameParts] = (updateUserDto.full_name || user.full_name || '').split(' ');
        const lastName = lastNameParts.join(' ');

        await this.keycloakAdmin.updateUser(user.keycloak_id, {
          email: updateUserDto.email || user.email,
          firstName: firstName || undefined,
          lastName: lastName || undefined,
        });

        this.logger.log(`Updated user in Keycloak: ${user.keycloak_id}`);
      }

      return updatedUser;
    } catch (error) {
      this.logger.error('Failed to update user', error);
      throw error;
    }
  }

  async updateLastLogin(id: string) {
    return this.prisma.users.update({
      where: { id },
      data: {
        last_login_at: new Date(),
      },
    });
  }

  async remove(id: string) {
    const user = await this.findOne(id); // Check if user exists

    try {
      // Delete from database first
      await this.prisma.users.delete({
        where: { id },
      });

      // Delete from Keycloak
      await this.keycloakAdmin.deleteUser(user.keycloak_id);

      this.logger.log(`User deleted: ${id}, Keycloak ID: ${user.keycloak_id}`);

      return { message: 'User deleted successfully', id };
    } catch (error) {
      this.logger.error('Failed to delete user', error);
      throw error;
    }
  }
}
