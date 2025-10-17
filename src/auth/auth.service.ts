import {
  Injectable,
  UnauthorizedException,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { LoginDto } from './dto/login.dto';
import { KEYCLOAK_CONFIG_KEY } from '../keycloak/config/keycloak.configuation';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly httpService: HttpService,
    private readonly prisma: PrismaService,
  ) {}

  private getKeycloakConfig() {
    const baseUrl = this.configService.get<string>(
      KEYCLOAK_CONFIG_KEY.BASE_URL,
    );
    const realm = this.configService.get<string>(
      KEYCLOAK_CONFIG_KEY.REALM_NAME,
    );
    const clientId = this.configService.get<string>(
      KEYCLOAK_CONFIG_KEY.CLIENT_ID,
    );
    const clientSecret = this.configService.get<string>(
      KEYCLOAK_CONFIG_KEY.CLIENT_SECRET,
    );

    if (!baseUrl || !realm || !clientId || !clientSecret) {
      this.logger.error('Missing Keycloak configuration');
      throw new InternalServerErrorException(
        'Keycloak configuration is incomplete',
      );
    }

    return { baseUrl, realm, clientId, clientSecret };
  }

  async login(loginDto: LoginDto) {
    const { baseUrl, realm, clientId, clientSecret } = this.getKeycloakConfig();
    const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'password');
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('username', loginDto.email);
      params.append('password', loginDto.password);

      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      this.logger.log(`User logged in successfully: ${loginDto.email}`);

      // Update last login time
      try {
        await this.prisma.users.updateMany({
          where: { email: loginDto.email },
          data: { last_login_at: new Date() },
        });
      } catch (error) {
        this.logger.warn('Failed to update last login time', error);
      }

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        refresh_expires_in: response.data.refresh_expires_in,
        token_type: response.data.token_type,
      };
    } catch (error: any) {
      this.logger.error('Login failed', error.response?.data || error.message);

      if (error.response?.status === 401) {
        throw new UnauthorizedException('Invalid email or password');
      }

      throw new InternalServerErrorException(
        'Login failed. Please try again later.',
      );
    }
  }

  async refreshToken(refreshToken: string) {
    const { baseUrl, realm, clientId, clientSecret } = this.getKeycloakConfig();
    const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;

    try {
      const params = new URLSearchParams();
      params.append('grant_type', 'refresh_token');
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('refresh_token', refreshToken);

      const response = await firstValueFrom(
        this.httpService.post(tokenUrl, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      this.logger.log('Token refreshed successfully');

      return {
        access_token: response.data.access_token,
        refresh_token: response.data.refresh_token,
        expires_in: response.data.expires_in,
        refresh_expires_in: response.data.refresh_expires_in,
        token_type: response.data.token_type,
      };
    } catch (error: any) {
      this.logger.error(
        'Token refresh failed',
        error.response?.data || error.message,
      );

      if (error.response?.status === 401 || error.response?.status === 400) {
        throw new UnauthorizedException('Invalid or expired refresh token');
      }

      throw new InternalServerErrorException(
        'Token refresh failed. Please try again later.',
      );
    }
  }

  async logout(refreshToken: string) {
    const { baseUrl, realm, clientId, clientSecret } = this.getKeycloakConfig();
    const logoutUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/logout`;

    try {
      const params = new URLSearchParams();
      params.append('client_id', clientId);
      params.append('client_secret', clientSecret);
      params.append('refresh_token', refreshToken);

      await firstValueFrom(
        this.httpService.post(logoutUrl, params.toString(), {
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        }),
      );

      this.logger.log('User logged out successfully');

      return { message: 'Logged out successfully' };
    } catch (error: any) {
      this.logger.error('Logout failed', error.response?.data || error.message);

      // Even if logout fails, we can consider it successful on client side
      return { message: 'Logged out successfully' };
    }
  }
}
