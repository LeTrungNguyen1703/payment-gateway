import { Global, Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { KeycloakModule } from '../keycloak/keycloak.module';
import { DbUserGuard } from './guards/db-user.guard';

@Global()
@Module({
  imports: [PrismaModule, KeycloakModule],
  controllers: [UserController],
  providers: [UserService],
  exports: [UserService],
})
export class UserModule {}
