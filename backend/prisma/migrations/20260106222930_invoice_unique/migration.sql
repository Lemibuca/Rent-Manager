/*
  Warnings:

  - A unique constraint covering the columns `[leaseId,period]` on the table `Invoice` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Invoice_leaseId_period_key" ON "Invoice"("leaseId", "period");
