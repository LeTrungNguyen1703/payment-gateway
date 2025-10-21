import { Body, Controller, Get, Logger, Post, UseGuards } from '@nestjs/common';
import { PayosService } from './payos.service';
import { Public } from 'nest-keycloak-connect';
import { CurrentDbUserId } from '../user/decorators/current-user.decorator';
import { DbUserGuard } from '../user/guards/db-user.guard';
import { PaymentWebhookGuard } from './payos.guard';
import { PayosWebhookBodyPayload } from './dto/payos-webhooks-body.payload';

@Controller('payos')
export class PayosController {
  private logger = new Logger(PayosController.name);

  constructor(private readonly PayosService: PayosService) {}

  @Post('webhook')
  @Public()
  @UseGuards(PaymentWebhookGuard)
  async handleWebhook( @Body() payload) {
    this.logger.log(
      `Received PayOS webhook for orderCode: ${payload.data.orderCode}, amount: ${payload.data.amount}, reference: ${payload.data.reference}`,
    );
    await this.PayosService.handleWebhook(payload);
    this.logger.log(
      `Processed PayOS webhook for orderCode: ${payload.data.orderCode}`,
    );
  }
}
