/*
  Warnings:

  - You are about to drop the column `amount` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `payment_date` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `payment_method` on the `Transaction` table. All the data in the column will be lost.
  - You are about to drop the column `token` on the `Transaction` table. All the data in the column will be lost.
  - Added the required column `classRequestId` to the `Transaction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `preferenceId` to the `Transaction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ClassRequest" ALTER COLUMN "state" SET DEFAULT 'Created';

-- AlterTable
ALTER TABLE "Transaction" DROP COLUMN "amount",
DROP COLUMN "payment_date",
DROP COLUMN "payment_method",
DROP COLUMN "token",
ADD COLUMN     "classRequestId" INTEGER NOT NULL,
ADD COLUMN     "confirmCode" TEXT,
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "preferenceId" TEXT NOT NULL,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'pending';

-- CreateTable
CREATE TABLE "MercadopagoInfo" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "accessToken" TEXT NOT NULL,
    "accessTokenExpiration" TIMESTAMP(3) NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "refreshTokenExpiration" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MercadopagoInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MercadopagoInfo_userId_key" ON "MercadopagoInfo"("userId");

-- AddForeignKey
ALTER TABLE "MercadopagoInfo" ADD CONSTRAINT "MercadopagoInfo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_classRequestId_fkey" FOREIGN KEY ("classRequestId") REFERENCES "ClassRequest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
