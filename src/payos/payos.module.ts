import { Module } from '@nestjs/common';
import { PayosController } from './payos.controller';
import { PayosService } from './payos.service';
import { HttpModule } from '@nestjs/axios';
import { PayosListener } from './payos.listener';
import { TransactionModule } from '../transaction/transaction.module';

@Module({
  providers: [PayosService, PayosListener],
  controllers: [PayosController],
  imports:[HttpModule, TransactionModule],
})
export class PayosModule {}
