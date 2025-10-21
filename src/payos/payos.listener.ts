// payos.listener.ts
import { Injectable } from '@nestjs/common';
import { EventEmitter2, OnEvent } from '@nestjs/event-emitter';
import { PayosService } from './payos.service';
import { EVENTS } from '../common/constants/events.constants';
import { TransactionService } from '../transaction/transaction.service';
import { TransactionStatus } from '../transaction/dto/create-transaction.dto';

@Injectable()
export class PayosListener {
  constructor(
    private readonly payosService: PayosService,
    private readonly transactionService: TransactionService,
    private readonly emitter: EventEmitter2,
  ) {}

  @OnEvent(EVENTS.TRANSACTION.CREATED)
  async handleTransactionCreated(payload: {
    transactionId: string;
    userId: string;
    amount: number;
    currency: string;
    description: string;
    paymentMethodId?: string;
  }) {
    try {
      await this.transactionService.updateStatus(
        payload.transactionId,
        TransactionStatus.PROCESSING,
      );
      // Call PayOS API
      const paymentResponse = await this.payosService.createPayment({
        orderId: payload.transactionId,
        amount: payload.amount,
        description: payload.description,
      });

      // Update transaction với checkout URL
      await this.transactionService.update(payload.transactionId, {
        external_transaction_id: paymentResponse.data.orderCode,
        status: TransactionStatus.AWAITING_PAYMENT,
        gateway_response: paymentResponse,
      });

      // Emit event để notify user
      this.emitter.emit(EVENTS.PAYMENT.LINK_CREATED, {
        transactionId: payload.transactionId,
        checkoutUrl: paymentResponse.data.checkoutUrl,
      });
    } catch (error) {
      // Update transaction failed
      await this.transactionService.update(payload.transactionId, {
        status: TransactionStatus.FAILED,
        gateway_response: {
          error: error.message,
          timestamp: new Date().toISOString(),
        },
      });

      //Todo : Emit event to notify failure
    }
  }
}
