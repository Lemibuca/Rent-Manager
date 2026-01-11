-- AlterTable
ALTER TABLE "Lease" ADD COLUMN "endDate" DATETIME;

-- CreateIndex
CREATE INDEX "Lease_unitId_idx" ON "Lease"("unitId");

-- CreateIndex
CREATE INDEX "Lease_tenantId_idx" ON "Lease"("tenantId");

-- CreateIndex
CREATE INDEX "Lease_active_idx" ON "Lease"("active");
