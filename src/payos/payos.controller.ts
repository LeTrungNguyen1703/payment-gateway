import { Controller, Get, Post, UseGuards } from '@nestjs/common';
import { PayosService } from './payos.service';
import { Public } from 'nest-keycloak-connect';
import { CurrentDbUserId } from '../user/decorators/current-user.decorator';
import { DbUserGuard } from '../user/guards/db-user.guard';
import { PaymentWebhookGuard } from './payos.guard';

@Controller('payos')
@UseGuards(DbUserGuard)
export class PayosController {
  constructor(private readonly PayosService: PayosService) {}

  @Post('webhook')
  @Public()
  @UseGuards(PaymentWebhookGuard)
  async handleWebhook(@CurrentDbUserId() userId: string) {
    return `Webhook received ${userId}`;
  }
}
