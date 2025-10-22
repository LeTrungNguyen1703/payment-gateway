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
import { AuthModule } from './auth/auth.module';
import { PaymentMethodsModule } from './payment-methods/payment-methods.module';
import { PayosModule } from './payos/payos.module';
import { TransactionModule } from './transaction/transaction.module';
import { QueueModule } from './queue/queue.module';
import keycloakConfiguation from './keycloak/config/keycloak.configuation';
import payosConfiguation from './payos/payos.configuation';
import { EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [
    PrismaModule,
    AblyModule,
    HttpModule,
    KeycloakModule,
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      load: [keycloakConfiguation, payosConfiguation],
    }),
    RedisCacheModule,
    UserModule,
    AuthModule,
    PaymentMethodsModule,
    PayosModule,
    TransactionModule,
    QueueModule,
    EventEmitterModule.forRoot(),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
