import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { TransactionTimeoutQueue } from '../transaction-timeout-queue.service';
import { EVENTS } from '../../common/constants/events.constants';

@Injectable()
export class QueueListener {
  private readonly logger = new Logger(QueueListener.name);

  constructor(private readonly queueService: TransactionTimeoutQueue) {}

  /**
   * Lắng nghe event khi PayOS payment link được tạo
   * Sau khi có external_transaction_id từ PayOS, schedule timeout job
   */
  @OnEvent(EVENTS.PAYMENT.LINK_CREATED)
  async handlePaymentLinkCreated(payload: {
    transactionId: string;
    userId: string;
    checkoutUrl: string;
    qrCode: string;
    orderCode?: number;
  }) {
    this.logger.log(
      `Payment link created for transaction ${payload.transactionId}`,
    );
    // PayOS listener đã update external_transaction_id vào transaction
    // Giờ chúng ta cần lấy external_transaction_id từ DB hoặc từ payload
    if (payload.orderCode) {
      try {
        await this.queueService.scheduleTransactionTimeout({
          transactionId: payload.transactionId,
          externalTransactionId: payload.orderCode,
          userId: payload.userId,
          amount: 0, // Sẽ không dùng trong processor
          createdAt: new Date(),
        });

        this.logger.log(
          `Scheduled 15-minute timeout job for transaction ${payload.transactionId}`,
        );
      } catch (error) {
        this.logger.error(
          `Failed to schedule timeout job for transaction ${payload.transactionId}: ${error.message}`,
          error.stack,
        );
      }
    }
  }

  /**
   * Lắng nghe event khi transaction status được update
   * Nếu transaction đã completed/failed/cancelled thì cancel timeout job
   */
  @OnEvent(EVENTS.TRANSACTION.STATUS_UPDATED)
  async handleTransactionStatusUpdated(payload: {
    transactionId: string;
    status: string;
    shouldCancelTimeout: boolean;
  }) {
    this.logger.log(
      `Transaction ${payload.transactionId} status updated to ${payload.status}`,
    );

    if (payload.shouldCancelTimeout) {
      try {
        const cancelled = await this.queueService.cancelTransactionTimeout(
          payload.transactionId,
        );

        if (cancelled) {
          this.logger.log(
            `Successfully cancelled timeout job for transaction ${payload.transactionId}`,
          );
        }
      } catch (error) {
        this.logger.error(
          `Failed to cancel timeout job for transaction ${payload.transactionId}: ${error.message}`,
          error.stack,
        );
      }
    }
  }
}
