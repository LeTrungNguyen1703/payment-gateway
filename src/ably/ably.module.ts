import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import * as Ably from 'ably';
import { ABLY_CLIENT } from './constant.ably';
import { AblyGateway } from './ably.gateway';
import { AblyController } from './ably.controller';

// Token để inject Ably client

@Global() // Để module này available toàn app
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: ABLY_CLIENT,
      useFactory: (configService: ConfigService) => {
        const apiKey = configService.get<string>('ABLY_API_KEY');

        // Tạo Ably Realtime client
        const client = new Ably.Realtime({
          key: apiKey,
          // Optional: Config thêm
          clientId: 'payos-backend', // ID của server
          echoMessages: false, // Không nhận lại message mình gửi
          queueMessages: true, // Queue messages khi offline
        });

        // Log connection state
        client.connection.on('connected', () => {
          console.log('✅ Ably connected');
        });

        client.connection.on('disconnected', () => {
          console.log('❌ Ably disconnected');
        });

        client.connection.on('failed', (error) => {
          console.error('❌ Ably connection failed:', error);
        });

        return client;
      },
      inject: [ConfigService],
    },
    AblyGateway,
  ],
  exports: [ABLY_CLIENT],
  controllers: [AblyController],
})
export class AblyModule {}
