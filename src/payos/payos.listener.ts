// payos.listener.ts
import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PayosService } from './payos.service';

@Injectable()
export class PayosListener {
  constructor(private readonly payosService: PayosService) {
  }


  @OnEvent('transaction.created')
  async handleTransactionCreated(payload: any) {
    // try {
      // Call PayOS API
      const paymentResponse = await this.payosService.createPayment({
        orderId: payload.transactionId,
        amount: payload.amount,
        description: payload.description,
      });

    //   // Update transaction với checkout URL
    //   await this.transactionService.update(payload.transactionId, {
    //     external_transaction_id: paymentResponse.orderCode,
    //     status: 'awaiting_payment',
    //     gateway_response: paymentResponse,
    //   });
    //
    //   // Emit event để notify user
    //   await this.eventEmitter.emit('payment.link_ready', {
    //     transactionId: payload.transactionId,
    //     checkoutUrl: paymentResponse.checkoutUrl,
    //   });
    // } catch (error) {
    //   // Update transaction failed
    //   await this.transactionService.update(payload.transactionId, {
    //     status: 'failed',
    //     gateway_response: { error: error.message },
    //   });
    // }
  }

  @OnEvent('payment.webhook_received')
  async handleWebhook(webhookData: any) {
    // Verify signature
    // Update transaction status
    // Emit events for business logic
  }
}
