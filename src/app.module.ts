import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { AblyModule } from './ably/ably.module';
import { HttpModule } from '@nestjs/axios';
import { KeycloakModule } from './keycloak/keycloak.module';
import { RedisCacheModule } from './cache/redis-cache.module';
import { UserModule } from './user/user.module';
import keycloakConfiguation from './keycloak/config/keycloak.configuation';

@Module({
  imports: [
    PrismaModule,
    AblyModule,
    HttpModule,
    KeycloakModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [keycloakConfiguation],
    }),
    RedisCacheModule,
    UserModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
