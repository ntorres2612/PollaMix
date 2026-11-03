/*
  Warnings:

  - The column `number` will become optional.
  - A unique constraint covering the columns
    `[leagueId,season,tournament,roundName]`
    will be added to the `Matchday` table.
*/

-- Add roundName as nullable first
ALTER TABLE "Matchday"
ADD COLUMN "roundName" TEXT;

-- Populate existing Matchday records
UPDATE "Matchday"
SET "roundName" = "tournament" || ' - Jornada ' || "number"
WHERE "roundName" IS NULL;

-- Make roundName required and number optional
ALTER TABLE "Matchday"
ALTER COLUMN "roundName" SET NOT NULL,
ALTER COLUMN "number" DROP NOT NULL;

-- Create unique constraint
CREATE UNIQUE INDEX "Matchday_leagueId_season_tournament_roundName_key"
ON "Matchday"("leagueId", "season", "tournament", "roundName");