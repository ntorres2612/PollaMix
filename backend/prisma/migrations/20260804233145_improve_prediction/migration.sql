/*
  Warnings:

  - You are about to drop the column `prediction` on the `Prediction` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[userId,matchId]` on the table `Prediction` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `awayScore` to the `Prediction` table without a default value. This is not possible if the table is not empty.
  - Added the required column `homeScore` to the `Prediction` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prediction" DROP COLUMN "prediction",
ADD COLUMN     "awayScore" INTEGER NOT NULL,
ADD COLUMN     "homeScore" INTEGER NOT NULL,
ADD COLUMN     "points" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "Prediction_userId_matchId_key" ON "Prediction"("userId", "matchId");
