/*
  Warnings:

  - You are about to drop the column `isActive` on the `Tournament` table. All the data in the column will be lost.
  - You are about to drop the column `prizePool` on the `Tournament` table. All the data in the column will be lost.
  - Added the required column `endsAt` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `prize` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `season` to the `Tournament` table without a default value. This is not possible if the table is not empty.
  - Added the required column `startsAt` to the `Tournament` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Tournament" DROP COLUMN "isActive",
DROP COLUMN "prizePool",
ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "endsAt" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "prize" DOUBLE PRECISION NOT NULL,
ADD COLUMN     "season" INTEGER NOT NULL,
ADD COLUMN     "startsAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "TournamentParticipant" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paid" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "TournamentParticipant_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TournamentParticipant_tournamentId_userId_key" ON "TournamentParticipant"("tournamentId", "userId");

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TournamentParticipant" ADD CONSTRAINT "TournamentParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
