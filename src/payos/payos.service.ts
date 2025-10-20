import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { PayosRequestPaymentPayload } from './dto/payos-request-payment.payload';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PAYOS_CONFIG_KEY } from './payos.configuation';
import { generateSignature } from './payos.util';

@Injectable()
export class PayosService {
  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {}

  async createPayment(body: CreatePaymentDto): Promise<any> {
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
      orderCode: Number(body.orderId),
      amount: body.amount,
      description: body.description,
      cancelUrl: 'https://example.com/cancel',
      returnUrl: 'https://example.com/return',
    };
    const signature = generateSignature(
      dataForSignature,
      this.configService.getOrThrow<string>('PAYOS_CHECKSUM_KEY'),
    );
    const payload: PayosRequestPaymentPayload = {
      ...dataForSignature,
      signature,
    };
    const response = await firstValueFrom(
      this.httpService.post(url, payload, config),
    );
    return response.data;
  }

  handleWebhook() {
    // TODO: Parse provider event and update payment
    return { received: true };
  }
}
