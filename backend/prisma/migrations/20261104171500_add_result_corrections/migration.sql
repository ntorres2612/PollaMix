-- PollaMix: auditoría de correcciones oficiales.
-- Migración aditiva. No altera los resultados existentes.

ALTER TABLE "Tournament"
ADD COLUMN "resultsRevisedAt" TIMESTAMP(3);

CREATE TABLE "TournamentResultCorrection" (
    "id" SERIAL NOT NULL,
    "claimId" INTEGER NOT NULL,
    "matchId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,

    "oldHomeScore" INTEGER NOT NULL,
    "oldAwayScore" INTEGER NOT NULL,

    "newHomeScore" INTEGER NOT NULL,
    "newAwayScore" INTEGER NOT NULL,

    "reason" TEXT NOT NULL,
    "appliedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentResultCorrection_pkey"
    PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentResultCorrection_claimId_key"
ON "TournamentResultCorrection"("claimId");

CREATE INDEX "TournamentResultCorrection_matchId_idx"
ON "TournamentResultCorrection"("matchId");

CREATE INDEX "TournamentResultCorrection_adminId_idx"
ON "TournamentResultCorrection"("adminId");

CREATE INDEX "TournamentResultCorrection_appliedAt_idx"
ON "TournamentResultCorrection"("appliedAt");

ALTER TABLE "TournamentResultCorrection"
ADD CONSTRAINT "TournamentResultCorrection_claimId_fkey"
FOREIGN KEY ("claimId")
REFERENCES "TournamentClaim"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "TournamentResultCorrection"
ADD CONSTRAINT "TournamentResultCorrection_matchId_fkey"
FOREIGN KEY ("matchId")
REFERENCES "Match"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

ALTER TABLE "TournamentResultCorrection"
ADD CONSTRAINT "TournamentResultCorrection_adminId_fkey"
FOREIGN KEY ("adminId")
REFERENCES "User"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
