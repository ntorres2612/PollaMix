CREATE TABLE "TournamentClaimNoCorrectionResolution" (
    "id" SERIAL NOT NULL,
    "claimId" INTEGER NOT NULL,
    "adminId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "resolvedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TournamentClaimNoCorrectionResolution_pkey"
        PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX
    "TournamentClaimNoCorrectionResolution_claimId_key"
ON "TournamentClaimNoCorrectionResolution"("claimId");

CREATE INDEX
    "TournamentClaimNoCorrectionResolution_adminId_idx"
ON "TournamentClaimNoCorrectionResolution"("adminId");

CREATE INDEX
    "TournamentClaimNoCorrectionResolution_resolvedAt_idx"
ON "TournamentClaimNoCorrectionResolution"("resolvedAt");

ALTER TABLE "TournamentClaimNoCorrectionResolution"
ADD CONSTRAINT "TournamentClaimNoCorrectionResolution_claimId_fkey"
FOREIGN KEY ("claimId")
REFERENCES "TournamentClaim"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "TournamentClaimNoCorrectionResolution"
ADD CONSTRAINT "TournamentClaimNoCorrectionResolution_adminId_fkey"
FOREIGN KEY ("adminId")
REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
