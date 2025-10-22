import {
  Inject,
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import * as Ably from 'ably';
import { OnEvent } from '@nestjs/event-emitter';
import { EVENTS, SOCKET_EVENTS } from '../common/constants/events.constants';
import { PaymentSuccessEventDto } from '../payos/dto/payment-success-event.dto';
import { PaymentFailedEventDto } from '../payos/dto/payment-failed-event.dto';

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

  @OnEvent(EVENTS.TRANSACTION.FAILED)
  async handleTransactionFailedEvent(payload: PaymentFailedEventDto) {
    this.logger.log(
      `Handling event: ${EVENTS.TRANSACTION.FAILED} for transaction ${payload.transactionId}`,
    );
    await this.publishToUser(payload.userId, SOCKET_EVENTS.TRANSACTION.FAILED, {
      transactionId: payload.transactionId,
      reason: payload.reason,
    });
  }

  @OnEvent(EVENTS.PAYMENT.LINK_CREATED)
  async handlePaymentLinkCreatedEvent(payload: {
    userId: string;
    transactionId: string;
    checkoutUrl: string;
    qrCode: string;
  }) {
    this.logger.log(
      `Handling event: ${EVENTS.PAYMENT.LINK_CREATED} for transaction ${payload.transactionId}`,
    );
    await this.publishToUser(
      payload.userId,
      SOCKET_EVENTS.PAYMENT.LINK_CREATED,
      {
        transactionId: payload.transactionId,
        checkoutUrl: payload.checkoutUrl,
        qrCode: payload.qrCode,
      },
    );
  }

  @OnEvent(EVENTS.PAYMENT.SUCCESS)
  async handlePaymentSuccessEvent(payload: PaymentSuccessEventDto) {
    this.logger.log(
      `Handling event: ${EVENTS.PAYMENT.SUCCESS} for user ${payload.userId}`,
    );
    await this.publishToUser(payload.userId, SOCKET_EVENTS.PAYMENT.SUCCESS, {
      amount: payload.amount,
      message: payload.message,
    });
  }

  /**
   * ======================
   * HELPER METHODS
   * ======================
   */

  /**
   * Publish message to specific user (alternative pattern)
   */
  async publishToUser(userId: string, eventName: string, data: any) {
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
