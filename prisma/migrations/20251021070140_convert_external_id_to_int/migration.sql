/*
  Warnings:

  - The `external_transaction_id` column on the `transactions` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "transactions" DROP COLUMN "external_transaction_id",
ADD COLUMN     "external_transaction_id" INTEGER;
