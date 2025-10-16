import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import KcAdminClient from '@keycloak/keycloak-admin-client';
import { KEYCLOAK_CONFIG_KEY } from './config/keycloak.configuation';

@Injectable()
export class KeycloakAdminService implements OnModuleInit {
  private readonly logger = new Logger(KeycloakAdminService.name);
  private kcAdminClient: KcAdminClient;

  constructor(private readonly configService: ConfigService) {
    this.kcAdminClient = new KcAdminClient({
      baseUrl: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.BASE_URL),
      realmName: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
    });
  }

  async onModuleInit() {
    try {
      await this.authenticate();
      this.logger.log('Keycloak Admin Client authenticated successfully');
    } catch (error) {
      this.logger.error('Failed to authenticate Keycloak Admin Client', error);
    }
  }

  private async authenticate() {
    // Authenticate using client credentials
    const clientId = this.configService.get<string>(
      KEYCLOAK_CONFIG_KEY.CLIENT_ID,
    );
    const clientSecret = this.configService.get<string>(
      KEYCLOAK_CONFIG_KEY.CLIENT_SECRET,
    );

    if (!clientId || !clientSecret) {
      throw new Error('Keycloak client credentials not configured');
    }

    await this.kcAdminClient.auth({
      grantType: 'client_credentials',
      clientId,
      clientSecret,
    });
  }

  private async ensureAuthenticated() {
    try {
      // Check if token is still valid, if not re-authenticate
      await this.kcAdminClient.users.find({ max: 1 });
    } catch (error) {
      this.logger.warn('Token expired, re-authenticating...');
      await this.authenticate();
    }
  }

  async createUser(userData: {
    email: string;
    username?: string;
    firstName?: string;
    lastName?: string;
    enabled?: boolean;
    emailVerified?: boolean;
    password?: string;
  }) {
    await this.ensureAuthenticated();

    const { password, ...userDetails } = userData;

    let createdUser;

    try {
      // Create user
      createdUser = await this.kcAdminClient.users.create({
        realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
        username: userDetails.username || userDetails.email,
        email: userDetails.email,
        firstName: userDetails.firstName,
        lastName: userDetails.lastName,
        enabled: userDetails.enabled ?? true,
        emailVerified: userDetails.emailVerified ?? true,
      });

      this.logger.log(`User created in Keycloak: ${createdUser.id}`);

      // Set password if provided
      if (password) {
        await this.kcAdminClient.users.resetPassword({
          realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
          id: createdUser.id,
          credential: {
            temporary: false,
            type: 'password',
            value: password,
          },
        });
        this.logger.log(`Password set for user: ${createdUser.id}`);
      }

      // Assign default 'user' role
      const roles = await this.kcAdminClient.roles.find({
        realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
      });
      const userRole = roles.find((role) => role.name === 'user');

      if (userRole?.id && userRole?.name) {
        await this.kcAdminClient.users.addRealmRoleMappings({
          realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
          id: createdUser.id,
          roles: [
            {
              id: userRole.id,
              name: userRole.name,
            },
          ],
        });
        this.logger.log(`Role 'user' assigned to user: ${createdUser.id}`);
      }

      return createdUser;
    } catch (error) {
      this.logger.error('Failed to create user in Keycloak', error);
      await this.kcAdminClient.users.del(createdUser.id);
      throw error;
    }
  }

  async updateUser(
    keycloakId: string,
    userData: {
      email?: string;
      firstName?: string;
      lastName?: string;
      enabled?: boolean;
    },
  ) {
    await this.ensureAuthenticated();

    try {
      await this.kcAdminClient.users.update(
        {
          realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
          id: keycloakId,
        },
        userData,
      );
      this.logger.log(`User updated in Keycloak: ${keycloakId}`);
    } catch (error) {
      this.logger.error('Failed to update user in Keycloak', error);
      throw error;
    }
  }

  async deleteUser(keycloakId: string) {
    await this.ensureAuthenticated();

    try {
      await this.kcAdminClient.users.del({
        realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
        id: keycloakId,
      });
      this.logger.log(`User deleted from Keycloak: ${keycloakId}`);
    } catch (error) {
      this.logger.error('Failed to delete user from Keycloak', error);
      throw error;
    }
  }

  async getUserById(keycloakId: string) {
    await this.ensureAuthenticated();

    try {
      return await this.kcAdminClient.users.findOne({
        realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
        id: keycloakId,
      });
    } catch (error) {
      this.logger.error('Failed to get user from Keycloak', error);
      throw error;
    }
  }

  async assignRole(keycloakId: string, roleName: string) {
    await this.ensureAuthenticated();

    try {
      const roles = await this.kcAdminClient.roles.find({
        realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
      });
      const role = roles.find((r) => r.name === roleName);

      if (!role || !role.id || !role.name) {
        throw new Error(`Role '${roleName}' not found`);
      }

      await this.kcAdminClient.users.addRealmRoleMappings({
        realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
        id: keycloakId,
        roles: [
          {
            id: role.id,
            name: role.name,
          },
        ],
      });
      this.logger.log(`Role '${roleName}' assigned to user: ${keycloakId}`);
    } catch (error) {
      this.logger.error('Failed to assign role in Keycloak', error);
      throw error;
    }
  }

  async removeRole(keycloakId: string, roleName: string) {
    await this.ensureAuthenticated();

    try {
      const roles = await this.kcAdminClient.roles.find({
        realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
      });
      const role = roles.find((r) => r.name === roleName);

      if (!role || !role.id || !role.name) {
        throw new Error(`Role '${roleName}' not found`);
      }

      await this.kcAdminClient.users.delRealmRoleMappings({
        realm: this.configService.get<string>(KEYCLOAK_CONFIG_KEY.REALM_NAME),
        id: keycloakId,
        roles: [
          {
            id: role.id,
            name: role.name,
          },
        ],
      });
      this.logger.log(`Role '${roleName}' removed from user: ${keycloakId}`);
    } catch (error) {
      this.logger.error('Failed to remove role from Keycloak', error);
      throw error;
    }
  }
}
