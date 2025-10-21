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
    const config = {
      headers: {
        'x-client-id': this.configService.getOrThrow<string>(
          PAYOS_CONFIG_KEY.CLIENT_ID,
        ),
        'x-api-key': this.configService.getOrThrow<string>(
          PAYOS_CONFIG_KEY.API_KEY,
        ),
      },
    };
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
    await this.transactionService.updateGatewayResponse(
      payload.data.orderCode,
      payload,
    );

    this.emitter.emit(EVENTS.PAYMENT.SUCCESS, {
      message: 'Payment successful',
      data: payload,
    });
  }
}
