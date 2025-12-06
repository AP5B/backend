/*
  Warnings:

  - The values [Pending] on the enum `ClassRequestState` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "ClassRequestState_new" AS ENUM ('Created', 'PaymentPending', 'Paid', 'Approved', 'Rejected', 'PaymentRefunded');
ALTER TABLE "public"."ClassRequest" ALTER COLUMN "state" DROP DEFAULT;
ALTER TABLE "ClassRequest" ALTER COLUMN "state" TYPE "ClassRequestState_new" USING ("state"::text::"ClassRequestState_new");
ALTER TYPE "ClassRequestState" RENAME TO "ClassRequestState_old";
ALTER TYPE "ClassRequestState_new" RENAME TO "ClassRequestState";
DROP TYPE "public"."ClassRequestState_old";
ALTER TABLE "ClassRequest" ALTER COLUMN "state" SET DEFAULT 'Created';
COMMIT;
