-- AlterTable
ALTER TABLE "public"."Lease" ADD COLUMN     "concludedAt" TIMESTAMP(3),
ADD COLUMN     "conclusionReason" TEXT;
