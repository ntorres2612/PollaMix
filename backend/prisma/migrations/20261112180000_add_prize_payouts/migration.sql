CREATE TABLE "PrizePayout" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "entryId" INTEGER,
    "userId" INTEGER NOT NULL,
    "amountCOP" INTEGER NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adminId" INTEGER NOT NULL,

    CONSTRAINT "PrizePayout_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PrizePayout_tournamentId_entryId_key" ON "PrizePayout"("tournamentId", "entryId");
CREATE INDEX "PrizePayout_userId_idx" ON "PrizePayout"("userId");
CREATE INDEX "PrizePayout_tournamentId_idx" ON "PrizePayout"("tournamentId");

ALTER TABLE "PrizePayout" ADD CONSTRAINT "PrizePayout_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrizePayout" ADD CONSTRAINT "PrizePayout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PrizePayout" ADD CONSTRAINT "PrizePayout_adminId_fkey" FOREIGN KEY ("adminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
