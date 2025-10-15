import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as Ably from 'ably';
import { RealtimeChannel } from 'ably';
import { OnEvent } from '@nestjs/event-emitter';

@Injectable()
export class AblyGateway implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(AblyGateway.name);

  constructor(
    @Inject('ABLY_CLIENT') private readonly ablyClient: Ably.Realtime,
  ) {}

  async onModuleDestroy() {
    this.logger.log('🛑 Closing Ably connection...');
    this.ablyClient.close();
  }

  onModuleInit() {
    this.logger.log('🚀 Initializing Ably Gateway...');
    this.logger.log('✅ Ably Gateway initialized');
  }

  /**
   * ======================
   * HELPER METHODS
   * ======================
   */

  /**
   * Publish message to specific user (alternative pattern)
   */
  async publishToUser(userId: number, eventName: string, data: any) {
    const userChannel = this.ablyClient.channels.get(`user:${userId}`);

    await userChannel.publish({
      name: eventName,
      data,
    });
  }

  /**
   * Broadcast to all users
   */
  // async broadcast(eventName: string, data: any) {
  //   await this.expenseChannel.publish({
  //     name: eventName,
  //     data,
  //   });
  // }
}
