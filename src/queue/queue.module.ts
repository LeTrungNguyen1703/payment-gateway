import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TransactionTimeoutProcessor } from './processors/transaction-timeout.processor';
import { TransactionTimeoutQueue } from './transaction-timeout-queue.service';
import { QueueListener } from './listeners/queue.listener';
import { TransactionModule } from '../transaction/transaction.module';
import { PayosModule } from '../payos/payos.module';

@Module({
  imports: [
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
        },
      }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({
      name: 'transaction-timeout',
    }),
    forwardRef(() => TransactionModule),
    PayosModule,
  ],
  providers: [
    TransactionTimeoutProcessor,
    TransactionTimeoutQueue,
    QueueListener,
  ],
  exports: [TransactionTimeoutQueue],
})
export class QueueModule {}
