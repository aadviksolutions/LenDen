-- CreateEnum
CREATE TYPE "WhatsAppConfigStatus" AS ENUM ('NOT_CONFIGURED', 'CONNECTED', 'ERROR');

-- CreateEnum
CREATE TYPE "WhatsAppMessageType" AS ENUM ('INVOICE_SHARE', 'PAYMENT_RECEIPT', 'ACCOUNT_STATEMENT', 'PAYMENT_REMINDER');

-- CreateEnum
CREATE TYPE "WhatsAppMessageStatus" AS ENUM ('QUEUED', 'SUBMITTED', 'DELIVERED', 'READ', 'FAILED');

-- AlterTable
ALTER TABLE "Customer" ADD COLUMN     "optedOutWhatsApp" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "WhatsAppConfig" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "status" "WhatsAppConfigStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "phoneNumberId" TEXT,
    "wabaId" TEXT,
    "accessToken" TEXT,
    "webhookVerifyToken" TEXT,
    "businessDisplayName" TEXT,
    "autoRemindersEnabled" BOOLEAN NOT NULL DEFAULT false,
    "reminderDaysBeforeDue" INTEGER NOT NULL DEFAULT 3,
    "reminderOnDueDate" BOOLEAN NOT NULL DEFAULT true,
    "reminderDaysAfterDue" INTEGER NOT NULL DEFAULT 3,
    "quietHoursStart" INTEGER NOT NULL DEFAULT 21,
    "quietHoursEnd" INTEGER NOT NULL DEFAULT 9,
    "isPaused" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WhatsAppMessageLog" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "customerId" TEXT,
    "invoiceId" TEXT,
    "recipientPhone" TEXT NOT NULL,
    "recipientName" TEXT,
    "messageType" "WhatsAppMessageType" NOT NULL,
    "status" "WhatsAppMessageStatus" NOT NULL DEFAULT 'SUBMITTED',
    "providerMessageId" TEXT,
    "contentSummary" TEXT NOT NULL,
    "idempotencyKey" TEXT,
    "errorMessage" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deliveredAt" TIMESTAMP(3),
    "readAt" TIMESTAMP(3),
    "actor" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WhatsAppMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppConfig_businessId_key" ON "WhatsAppConfig"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "WhatsAppMessageLog_idempotencyKey_key" ON "WhatsAppMessageLog"("idempotencyKey");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_businessId_idx" ON "WhatsAppMessageLog"("businessId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_customerId_idx" ON "WhatsAppMessageLog"("customerId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_invoiceId_idx" ON "WhatsAppMessageLog"("invoiceId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_status_idx" ON "WhatsAppMessageLog"("status");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_providerMessageId_idx" ON "WhatsAppMessageLog"("providerMessageId");

-- CreateIndex
CREATE INDEX "WhatsAppMessageLog_createdAt_idx" ON "WhatsAppMessageLog"("createdAt");

-- AddForeignKey
ALTER TABLE "WhatsAppConfig" ADD CONSTRAINT "WhatsAppConfig_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "Business"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WhatsAppMessageLog" ADD CONSTRAINT "WhatsAppMessageLog_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "Invoice"("id") ON DELETE SET NULL ON UPDATE CASCADE;
