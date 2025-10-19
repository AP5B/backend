/*
  Warnings:

  - You are about to alter the column `first_name` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `last_name_1` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `last_name_2` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(20)`.
  - You are about to alter the column `email` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(60)`.
  - You are about to alter the column `password` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(255)`.
  - You are about to alter the column `phone` on the `User` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(8)`.
  - Made the column `first_name` on table `User` required. This step will fail if there are existing NULL values in that column.
  - Made the column `last_name_1` on table `User` required. This step will fail if there are existing NULL values in that column.

*/

-- Rellena nulos con texto provisional antes de hacer NOT NULL
UPDATE "User" SET "first_name" = COALESCE("first_name", 'Nombre');
UPDATE "User" SET "last_name_1" = COALESCE("last_name_1", 'PrimerApellido');

-- Limpia phone a dígitos y recórtalo a 8. Si queda vacío, pon NULL
UPDATE "User"
SET "phone" = NULLIF(SUBSTRING(REGEXP_REPLACE(COALESCE("phone", ''), '[^0-9]', '', 'g') FROM 1 FOR 8), '');

-- AlterEnum
ALTER TYPE "UserRole" ADD VALUE 'Admin';

-- AlterTable
ALTER TABLE "User" ALTER COLUMN "first_name" SET NOT NULL,
ALTER COLUMN "first_name" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "last_name_1" SET NOT NULL,
ALTER COLUMN "last_name_1" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "last_name_2" SET DATA TYPE VARCHAR(20),
ALTER COLUMN "email" SET DATA TYPE VARCHAR(60),
ALTER COLUMN "password" SET DATA TYPE VARCHAR(255),
ALTER COLUMN "role" DROP DEFAULT,
ALTER COLUMN "phone" SET DATA TYPE VARCHAR(8);
