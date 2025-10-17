import { Module } from '@nestjs/common';
import {
  KeycloakConnectModule,
  ResourceGuard,
  RoleGuard,
  AuthGuard,
} from 'nest-keycloak-connect';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { KeycloakAdminService } from './keycloak-admin.service';

@Module({
  imports: [
    KeycloakConnectModule.registerAsync({
      useFactory: (config: ConfigService) => {
        return {
          authServerUrl:
            config.get<string>('KEYCLOAK_AUTH_SERVER_URL') ||
            'http://localhost:8180',
          realm: config.get<string>('KEYCLOAK_REALM') || 'devteria',
          clientId: config.get<string>('KEYCLOAK_CLIENT_ID') || 'devteria_app',
          secret:
            config.get<string>('KEYCLOAK_CLIENT_SECRET') ||
            '22zIfvPGn83xbYguOdUpMCicw9To6qKh',
          // Optional: Uncomment these for production settings
          // cookieKey: 'KEYCLOAK_JWT',
          logLevels: ['verbose'],
        };
      },
      inject: [ConfigService],
      imports: [ConfigModule],
    }),
  ],
  providers: [
    KeycloakAdminService,
    // Global guards to protect all routes by default
    // Remove or comment out if you want to manually apply guards per route
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RoleGuard,
    },
  ],
  exports: [KeycloakConnectModule, KeycloakAdminService],
})
export class KeycloakModule {}
