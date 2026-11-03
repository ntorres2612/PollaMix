-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "predictionsCloseAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TournamentParticipant" ADD COLUMN     "predictionsSubmittedAt" TIMESTAMP(3);
