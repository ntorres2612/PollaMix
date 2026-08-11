-- Agregar temporalmente tournamentId permitiendo NULL
ALTER TABLE "Prediction"
ADD COLUMN "tournamentId" INTEGER;

-- Asociar las predicciones existentes a la Polla #1
UPDATE "Prediction"
SET "tournamentId" = 1
WHERE "tournamentId" IS NULL;

-- Convertir tournamentId en obligatorio
ALTER TABLE "Prediction"
ALTER COLUMN "tournamentId" SET NOT NULL;

-- Crear relación con Tournament
ALTER TABLE "Prediction"
ADD CONSTRAINT "Prediction_tournamentId_fkey"
FOREIGN KEY ("tournamentId")
REFERENCES "Tournament"("id")
ON DELETE RESTRICT
ON UPDATE CASCADE;

-- Eliminar la restricción anterior
DROP INDEX IF EXISTS "Prediction_userId_matchId_key";

-- Nueva restricción: un usuario puede tener un pronóstico
-- por partido dentro de cada Polla
CREATE UNIQUE INDEX "Prediction_userId_matchId_tournamentId_key"
ON "Prediction"("userId", "matchId", "tournamentId");