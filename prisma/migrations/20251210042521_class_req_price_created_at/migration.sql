/*
  Warnings:

  - Added the required column `priceCreatedAt` to the `ClassRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ClassRequest" ADD COLUMN     "priceCreatedAt" INTEGER NOT NULL;
