import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

export interface TransactionTimeoutJobData {
  transactionId: string;
  externalTransactionId: number;
  userId: string;
  amount: number;
  createdAt: Date;
}

@Injectable()
export class QueueService {
  private readonly logger = new Logger(QueueService.name);

  constructor(
    @InjectQueue('transaction-timeout')
    private readonly transactionTimeoutQueue: Queue,
  ) {}

  /**
   * Schedule a transaction timeout job to run after 15 minutes
   */
  async scheduleTransactionTimeout(data: TransactionTimeoutJobData) {
    const delay = 60 * 1000; // 15 minutes in milliseconds

    try {
      const job = await this.transactionTimeoutQueue.add(
        'check-and-cancel',
        data,
        {
          delay,
          jobId: `timeout-${data.transactionId}`,
          removeOnComplete: true,
          removeOnFail: false,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
        },
      );

      this.logger.log(
        `Scheduled timeout job for transaction ${data.transactionId} (Job ID: ${job.id})`,
      );

      return job;
    } catch (error) {
      this.logger.error(
        `Failed to schedule timeout job for transaction ${data.transactionId}: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cancel a scheduled timeout job (e.g., when payment is completed)
   */
  async cancelTransactionTimeout(transactionId: string) {
    try {
      const jobId = `timeout-${transactionId}`;
      const job = await this.transactionTimeoutQueue.getJob(jobId);

      if (job) {
        await job.remove();
        this.logger.log(
          `Cancelled timeout job for transaction ${transactionId}`,
        );
        return true;
      }

      this.logger.warn(`No timeout job found for transaction ${transactionId}`);
      return false;
    } catch (error) {
      this.logger.error(
        `Failed to cancel timeout job for transaction ${transactionId}: ${error.message}`,
        error.stack,
      );
      return false;
    }
  }
}
