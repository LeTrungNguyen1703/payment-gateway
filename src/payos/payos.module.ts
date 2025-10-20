import { Module } from '@nestjs/common';
import { PayosController } from './payos.controller';
import { PayosService } from './payos.service';
import { HttpModule } from '@nestjs/axios';

@Module({
  providers: [PayosService],
  controllers: [PayosController],
  imports:[HttpModule],
})
export class PayosModule {}
