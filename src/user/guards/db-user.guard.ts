import { Injectable, CanActivate, ExecutionContext, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Guard that resolves the database user from Keycloak ID and attaches it to the request
 * This prevents repeated database lookups in services
 */
@Injectable()
export class DbUserGuard implements CanActivate {
  constructor(private readonly prisma: PrismaService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const keycloakId = request.user?.sub;

    if (!keycloakId) {
      // If no Keycloak ID, let Keycloak guard handle it
      return true;
    }

    // Fetch the database user once and attach to request
    const dbUser = await this.prisma.users.findUnique({
      where: { keycloak_id: keycloakId },
      select: {
        id: true,
        keycloak_id: true,
        email: true,
        full_name: true,
        phone: true,
        status: true,
        kyc_verified: true,
        created_at: true,
        updated_at: true,
      },
    });

    if (!dbUser) {
      throw new NotFoundException('User not found in database');
    }

    // Attach to request for use by decorators
    request.dbUser = dbUser;

    return true;
  }
}

