/*
  Warnings:

  - A unique constraint covering the columns `[apiId]` on the table `Match` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `apiId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leagueId` to the `Match` table without a default value. This is not possible if the table is not empty.
  - Added the required column `leagueId` to the `Matchday` table without a default value. This is not possible if the table is not empty.
  - Changed the type of `season` on the `Matchday` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.
  - Added the required column `leagueId` to the `Team` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "apiId" INTEGER NOT NULL,
ADD COLUMN     "leagueId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Matchday" ADD COLUMN     "leagueId" INTEGER NOT NULL,
DROP COLUMN "season",
ADD COLUMN     "season" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Team" ADD COLUMN     "leagueId" INTEGER NOT NULL,
ALTER COLUMN "id" DROP DEFAULT;
DROP SEQUENCE "Team_id_seq";

-- CreateTable
CREATE TABLE "League" (
    "id" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "countryCode" TEXT,
    "logo" TEXT,
    "season" INTEGER NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "League_id_season_key" ON "League"("id", "season");

-- CreateIndex
CREATE UNIQUE INDEX "Match_apiId_key" ON "Match"("apiId");

-- AddForeignKey
ALTER TABLE "Team" ADD CONSTRAINT "Team_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Matchday" ADD CONSTRAINT "Matchday_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Match" ADD CONSTRAINT "Match_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
