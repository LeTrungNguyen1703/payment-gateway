import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { TransactionTimeoutJobData } from '../queue.service';
import { TransactionService } from '../../transaction/transaction.service';
import { PayosService } from '../../payos/payos.service';
import { TransactionStatus } from '../../transaction/dto/create-transaction.dto';

@Processor('transaction-timeout')
export class TransactionTimeoutProcessor extends WorkerHost {
  private readonly logger = new Logger(TransactionTimeoutProcessor.name);

  constructor(
    private readonly transactionService: TransactionService,
    private readonly payosService: PayosService,
  ) {
    super();
  }

  async process(job: Job<TransactionTimeoutJobData>): Promise<any> {
    const { transactionId, externalTransactionId } = job.data;

    this.logger.log(
      `Processing timeout for transaction ${transactionId} (External ID: ${externalTransactionId})`,
    );

    try {
      // Get current transaction status
      const transaction = await this.transactionService.findOne(transactionId);

      // Only process if transaction is still in pending/awaiting payment state
      if (
        transaction.status === TransactionStatus.PENDING ||
        transaction.status === TransactionStatus.AWAITING_PAYMENT
      ) {
        this.logger.log(
          `Transaction ${transactionId} is still ${transaction.status}, proceeding with cancellation`,
        );

        // Call PayOS cancel API
        try {
          await this.payosService.cancelPayment(externalTransactionId);
          this.logger.log(
            `Successfully cancelled payment on PayOS for order ${externalTransactionId}`,
          );
        } catch (payosError) {
          this.logger.warn(
            `Failed to cancel on PayOS (order ${externalTransactionId}): ${payosError.message}. Proceeding with local status update.`,
          );
          // Continue even if PayOS cancellation fails
        }

        // Update transaction status to FAILED
        await this.transactionService.updateStatus(
          transactionId,
          TransactionStatus.FAILED,
        );

        this.logger.log(
          `Transaction ${transactionId} status updated to FAILED due to timeout`,
        );

        return {
          success: true,
          transactionId,
          externalTransactionId,
          message: 'Transaction cancelled due to timeout',
        };
      } else {
        this.logger.log(
          `Transaction ${transactionId} is in ${transaction.status} state, skipping timeout cancellation`,
        );

        return {
          success: false,
          transactionId,
          status: transaction.status,
          message: 'Transaction already processed, skipping timeout',
        };
      }
    } catch (error) {
      this.logger.error(
        `Error processing timeout for transaction ${transactionId}: ${error.message}`,
        error.stack,
      );
      throw error; // This will trigger retry
    }
  }
}
