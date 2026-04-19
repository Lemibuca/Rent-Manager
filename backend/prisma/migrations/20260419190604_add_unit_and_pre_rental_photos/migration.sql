-- CreateEnum
CREATE TYPE "public"."InspectionPhotoType" AS ENUM ('PRE_RENTAL', 'POST_RENTAL');

-- AlterTable
ALTER TABLE "public"."Unit" ADD COLUMN     "coverPhotoUrl" TEXT;

-- CreateTable
CREATE TABLE "public"."LeaseInspectionPhoto" (
    "id" SERIAL NOT NULL,
    "leaseId" INTEGER NOT NULL,
    "photoUrl" TEXT NOT NULL,
    "note" TEXT,
    "type" "public"."InspectionPhotoType" NOT NULL DEFAULT 'PRE_RENTAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LeaseInspectionPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "LeaseInspectionPhoto_leaseId_idx" ON "public"."LeaseInspectionPhoto"("leaseId");

-- CreateIndex
CREATE INDEX "LeaseInspectionPhoto_type_idx" ON "public"."LeaseInspectionPhoto"("type");

-- AddForeignKey
ALTER TABLE "public"."LeaseInspectionPhoto" ADD CONSTRAINT "LeaseInspectionPhoto_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "public"."Lease"("id") ON DELETE CASCADE ON UPDATE CASCADE;
