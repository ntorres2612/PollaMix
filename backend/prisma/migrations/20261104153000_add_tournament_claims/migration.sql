-- PollaMix: publicación de resultados y reclamaciones.
-- Migración aditiva. No modifica cierres históricos.

CREATE TYPE "TournamentClaimStatus" AS ENUM (
    'PENDING',
    'ACCEPTED',
    'REJECTED'
);

ALTER TABLE "Tournament"
ADD COLUMN "resultsPublishedAt" TIMESTAMP(3);

CREATE TABLE "TournamentClaim" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "userId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "TournamentClaimStatus" NOT NULL DEFAULT 'PENDING',
    "decision" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "TournamentClaim_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "TournamentClaim_tournamentId_status_idx"
ON "TournamentClaim"("tournamentId", "status");

CREATE INDEX "TournamentClaim_userId_idx"
ON "TournamentClaim"("userId");

CREATE INDEX "TournamentClaim_createdAt_idx"
ON "TournamentClaim"("createdAt");

ALTER TABLE "TournamentClaim"
ADD CONSTRAINT "TournamentClaim_tournamentId_fkey"
FOREIGN KEY ("tournamentId")
REFERENCES "Tournament"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "TournamentClaim"
ADD CONSTRAINT "TournamentClaim_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
