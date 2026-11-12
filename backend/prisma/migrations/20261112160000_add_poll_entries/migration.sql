CREATE TABLE "PollEntry" (
  "id" SERIAL NOT NULL,
  "tournamentId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "participantId" INTEGER NOT NULL,
  "paid" BOOLEAN NOT NULL DEFAULT false,
  "predictionsSubmittedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PollEntry_pkey" PRIMARY KEY ("id")
);

INSERT INTO "PollEntry" (
  "tournamentId",
  "userId",
  "participantId",
  "paid",
  "predictionsSubmittedAt",
  "createdAt"
)
SELECT
  "tournamentId",
  "userId",
  "id",
  "paid",
  "predictionsSubmittedAt",
  "joinedAt"
FROM "TournamentParticipant";

ALTER TABLE "Prediction" ADD COLUMN "entryId" INTEGER;

UPDATE "Prediction" AS prediction
SET "entryId" = entry."id"
FROM "PollEntry" AS entry
WHERE entry."userId" = prediction."userId"
  AND entry."tournamentId" = prediction."tournamentId";

ALTER TABLE "Prediction" ALTER COLUMN "entryId" SET NOT NULL;

DROP INDEX "Prediction_userId_matchId_tournamentId_key";

ALTER TABLE "Payment" ADD COLUMN "entryId" INTEGER;

UPDATE "Payment" AS payment
SET "entryId" = entry."id"
FROM "PollEntry" AS entry
WHERE payment."participantId" = entry."participantId";

UPDATE "Payment" AS payment
SET "entryId" = entry."id"
FROM "PollEntry" AS entry
WHERE payment."entryId" IS NULL
  AND entry."userId" = payment."userId"
  AND entry."tournamentId" = payment."tournamentId";

ALTER TABLE "PollEntry"
  ADD CONSTRAINT "PollEntry_tournamentId_fkey"
  FOREIGN KEY ("tournamentId") REFERENCES "Tournament"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PollEntry"
  ADD CONSTRAINT "PollEntry_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "PollEntry"
  ADD CONSTRAINT "PollEntry_participantId_fkey"
  FOREIGN KEY ("participantId") REFERENCES "TournamentParticipant"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Prediction"
  ADD CONSTRAINT "Prediction_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "PollEntry"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Payment"
  ADD CONSTRAINT "Payment_entryId_fkey"
  FOREIGN KEY ("entryId") REFERENCES "PollEntry"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE UNIQUE INDEX "Prediction_entryId_matchId_key" ON "Prediction"("entryId", "matchId");
CREATE INDEX "Prediction_entryId_idx" ON "Prediction"("entryId");
CREATE INDEX "PollEntry_tournamentId_userId_idx" ON "PollEntry"("tournamentId", "userId");
CREATE INDEX "PollEntry_participantId_idx" ON "PollEntry"("participantId");
CREATE INDEX "Payment_entryId_idx" ON "Payment"("entryId");
