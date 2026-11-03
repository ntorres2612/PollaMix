-- DropIndex
DROP INDEX "League_id_season_key";

-- CreateIndex
CREATE INDEX "Match_matchdayId_idx" ON "Match"("matchdayId");

-- CreateIndex
CREATE INDEX "Match_leagueId_idx" ON "Match"("leagueId");

-- CreateIndex
CREATE INDEX "Match_date_idx" ON "Match"("date");

-- CreateIndex
CREATE INDEX "Prediction_userId_idx" ON "Prediction"("userId");

-- CreateIndex
CREATE INDEX "Prediction_matchId_idx" ON "Prediction"("matchId");

-- CreateIndex
CREATE INDEX "Prediction_tournamentId_idx" ON "Prediction"("tournamentId");
