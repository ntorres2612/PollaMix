-- Registro permanente de la distribución de premios por torneo.
-- Los importes son pesos colombianos enteros.

CREATE TABLE "TournamentPrizeClosure" (
    "id" SERIAL NOT NULL,
    "tournamentId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'COP',
    "paidPlayers" INTEGER NOT NULL,
    "revenueCOP" INTEGER NOT NULL,
    "prizePoolCOP" INTEGER NOT NULL,
    "profitCOP" INTEGER NOT NULL,
    "firstCOP" INTEGER NOT NULL,
    "secondCOP" INTEGER NOT NULL,
    "thirdCOP" INTEGER NOT NULL,
    "winners" JSONB NOT NULL,
    "allocatedCOP" INTEGER NOT NULL,
    "undistributedCOP" INTEGER NOT NULL,
    "rulesVersion" TEXT NOT NULL DEFAULT '1.0',
    "closedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentPrizeClosure_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TournamentPrizeClosure_tournamentId_key"
ON "TournamentPrizeClosure"("tournamentId");

ALTER TABLE "TournamentPrizeClosure"
ADD CONSTRAINT "TournamentPrizeClosure_tournamentId_fkey"
FOREIGN KEY ("tournamentId")
REFERENCES "Tournament"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;
