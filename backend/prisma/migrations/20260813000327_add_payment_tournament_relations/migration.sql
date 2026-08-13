/*
  Warnings:

  - Added the required column `tournamentId` to the `Payment` table without a default value. This is not possible if the table is not empty.
  - Made the column `registrationEndsAt` on table `Tournament` required. This step will fail if there are existing NULL values in that column.
  - Made the column `registrationStartsAt` on table `Tournament` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "method" TEXT,
ADD COLUMN     "paidAt" TIMESTAMP(3),
ADD COLUMN     "participantId" INTEGER,
ADD COLUMN     "tournamentId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Tournament" ALTER COLUMN "registrationEndsAt" SET NOT NULL,
ALTER COLUMN "registrationStartsAt" SET NOT NULL;

-- CreateIndex
CREATE INDEX "Payment_userId_idx" ON "Payment"("userId");

-- CreateIndex
CREATE INDEX "Payment_tournamentId_idx" ON "Payment"("tournamentId");

-- CreateIndex
CREATE INDEX "Payment_participantId_idx" ON "Payment"("participantId");

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_participantId_fkey" FOREIGN KEY ("participantId") REFERENCES "TournamentParticipant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
