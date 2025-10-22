import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PayosService } from './payos.service';
import { Public } from 'nest-keycloak-connect';
import { PaymentWebhookGuard } from './payos.guard';
import {
  ApiExcludeEndpoint,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

@ApiTags('PayOS')
@Controller('payos')
export class PayosController {
  private logger = new Logger(PayosController.name);

  constructor(private readonly PayosService: PayosService) {}

  @Post('webhook')
  @Public()
  @UseGuards(PaymentWebhookGuard)
  @ApiExcludeEndpoint()
  async handleWebhook(@Body() payload) {
    this.logger.log(
      `Received PayOS webhook for orderCode: ${payload.data.orderCode}, amount: ${payload.data.amount}, reference: ${payload.data.reference}`,
    );
    await this.PayosService.handleWebhook(payload);
    this.logger.log(
      `Processed PayOS webhook for orderCode: ${payload.data.orderCode}`,
    );
  }

  @Get('invoice/:orderCode')
  @Public()
  @ApiOperation({
    summary: 'Get invoice by order code',
    description: 'Retrieve invoice details from PayOS using order code',
  })
  @ApiParam({
    name: 'orderCode',
    description: 'PayOS order code',
    example: '123456',
  })
  @ApiResponse({ status: 200, description: 'Invoice retrieved successfully' })
  @ApiResponse({ status: 404, description: 'Invoice not found' })
  getInvoice(@Param('orderCode') orderCode: string) {
    return this.PayosService.getInvoice(orderCode);
  }
}
