/*
  Warnings:

  - Added the required column `classRequestId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "classRequestId" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_classRequestId_fkey" FOREIGN KEY ("classRequestId") REFERENCES "ClassRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
