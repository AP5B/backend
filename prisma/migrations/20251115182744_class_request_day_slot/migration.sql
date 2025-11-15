/*
  Warnings:

  - Added the required column `day` to the `ClassRequest` table without a default value. This is not possible if the table is not empty.
  - Added the required column `slot` to the `ClassRequest` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ClassRequest" ADD COLUMN     "day" INTEGER NOT NULL,
ADD COLUMN     "slot" INTEGER NOT NULL;
