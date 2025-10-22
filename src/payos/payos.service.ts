import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PayosRequestPaymentPayload } from './dto/payos-request-payment.payload';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PAYOS_CONFIG_KEY } from './payos.configuation';
import { generateSignature } from './payos.util';
import { PayosPaymentCreatedResponse } from './dto/payos-payment-created.response';
import { PayosWebhookBodyPayload } from './dto/payos-webhooks-body.payload';
import { TransactionService } from '../transaction/transaction.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENTS } from '../common/constants/events.constants';
import { PaymentSuccessEventDto } from './dto/payment-success-event.dto';
import { TransactionStatus } from '../transaction/dto/create-transaction.dto';
import { PaymentFailedEventDto } from './dto/payment-failed-event.dto';

@Injectable()
export class PayosService {
  private readonly logger = new Logger(PayosService.name);

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
    private readonly transactionService: TransactionService,
    private readonly emitter: EventEmitter2,
  ) {}

  async createPayment(
    body: CreatePaymentDto,
  ): Promise<PayosPaymentCreatedResponse> {
    const orderCode = Number(String(Date.now()).slice(-9));
    const url = `https://api-merchant.payos.vn/v2/payment-requests`;
    const config = this.getXClientIdandXApiKeyHeaders();

    const dataForSignature = {
      orderCode: orderCode,
      amount: body.amount,
      description: body.description,
      cancelUrl: 'https://example.com/cancel',
      returnUrl: 'https://example.com/return',
    };
    const signature = generateSignature(
      dataForSignature,
      this.configService.getOrThrow<string>(PAYOS_CONFIG_KEY.CHECKSUM_KEY),
    );
    const payload: PayosRequestPaymentPayload = {
      ...dataForSignature,
      signature,
    };
    try {
      const response = await firstValueFrom(
        this.httpService.post(url, payload, config),
      );
      this.logger.log(response.data);

      return response.data;
    } catch (error) {
      throw new Error(`PayOS create payment failed: ${error.message}`);
    }
  }

  async handleWebhook(payload: PayosWebhookBodyPayload) {
    this.logger.log(
      `handleWebhook: Received webhook for orderCode ${payload.data.orderCode}`,
    );

    const user = await this.transactionService.getUserIdByExternalTransactionId(
      payload.data.orderCode,
    );

    // If webhook Payos is for successful payment
    if (payload.code == '00') {
      this.logger.log(
        `handleWebhook: Payment successful for orderCode ${payload.data.orderCode}`,
      );
      await this.transactionService.updateGatewayResponse(
        payload.data.orderCode,
        payload,
        TransactionStatus.COMPLETED,
      );

      const data: PaymentSuccessEventDto = {
        userId: user.user_id,
        email: user.users.email,
        fullName: user.users.full_name,
        amount: payload.data.amount,
        message: 'Payment successful',
      };
      this.emitter.emit(EVENTS.PAYMENT.SUCCESS, data);
    } else {
      this.logger.log(
        `handleWebhook: Payment failed for orderCode ${payload.data.orderCode} with code ${payload.code}`,
      );
      await this.transactionService.updateGatewayResponse(
        payload.data.orderCode,
        payload,
        TransactionStatus.FAILED,
      );

      const data: PaymentFailedEventDto = {
        userId: user.user_id,
        email: user.users.email,
        fullName: user.users.full_name,
        amount: payload.data.amount,
        reason: `Payment failed with code: ${payload.code} - ${payload.desc}`,
      };

      this.emitter.emit(EVENTS.PAYMENT.FAILED, data);
    }
  }

  async getInvoice(orderCode: string) {
    const url = `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}`;
    const config = this.getXClientIdandXApiKeyHeaders();

    try {
      const response = await firstValueFrom(this.httpService.get(url, config));
      this.logger.log(response.data);

      return response.data;
    } catch (error) {
      throw new Error(`PayOS get invoice failed: ${error.message}`);
    }
  }

  async cancelPayment(orderCode: number) {
    const url = `https://api-merchant.payos.vn/v2/payment-requests/${orderCode}/cancel`;
    const config = this.getXClientIdandXApiKeyHeaders();

    try {
      const response = await firstValueFrom(
        this.httpService.post(url, {}, config),
      );
      this.logger.log(
        `Payment cancelled for orderCode ${orderCode}`,
        response.data,
      );

      return response.data;
    } catch (error) {
      this.logger.error(
        `PayOS cancel payment failed for orderCode ${orderCode}: ${error.message}`,
      );
      throw new Error(`PayOS cancel payment failed: ${error.message}`);
    }
  }

  // Helper method **********************

  //helper method to get x-client-id and x-api-key headers
  private getXClientIdandXApiKeyHeaders() {
    return {
      headers: {
        'x-client-id': this.configService.getOrThrow<string>(
          PAYOS_CONFIG_KEY.CLIENT_ID,
        ),
        'x-api-key': this.configService.getOrThrow<string>(
          PAYOS_CONFIG_KEY.API_KEY,
        ),
      },
    };
  }
}
