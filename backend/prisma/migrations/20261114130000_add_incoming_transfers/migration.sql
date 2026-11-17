ALTER TABLE "Notification" ADD COLUMN "incomingId" INTEGER;

CREATE UNIQUE INDEX "Notification_userId_incomingId_key" ON "Notification"("userId", "incomingId");

CREATE TABLE "MailboxConnection" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "refreshToken" TEXT NOT NULL,
    "connectedById" INTEGER NOT NULL,
    "lastSyncAt" TIMESTAMP(3),
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MailboxConnection_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IncomingTransfer" (
    "id" SERIAL NOT NULL,
    "externalId" TEXT NOT NULL,
    "amountCOP" INTEGER NOT NULL,
    "payerName" TEXT,
    "concept" TEXT,
    "bankReference" TEXT,
    "fromDomain" TEXT NOT NULL,
    "receivedAt" TIMESTAMP(3) NOT NULL,
    "authenticated" BOOLEAN NOT NULL DEFAULT false,
    "status" TEXT NOT NULL,
    "paymentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IncomingTransfer_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "IncomingTransfer_externalId_key" ON "IncomingTransfer"("externalId");
CREATE UNIQUE INDEX "IncomingTransfer_bankReference_key" ON "IncomingTransfer"("bankReference");
CREATE UNIQUE INDEX "IncomingTransfer_paymentId_key" ON "IncomingTransfer"("paymentId");
CREATE INDEX "IncomingTransfer_status_createdAt_idx" ON "IncomingTransfer"("status", "createdAt");

ALTER TABLE "MailboxConnection" ADD CONSTRAINT "MailboxConnection_connectedById_fkey" FOREIGN KEY ("connectedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "IncomingTransfer" ADD CONSTRAINT "IncomingTransfer_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
