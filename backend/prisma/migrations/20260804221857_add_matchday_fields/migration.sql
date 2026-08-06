/*
  Warnings:

  - Added the required column `season` to the `Matchday` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tournament` to the `Matchday` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Matchday" ADD COLUMN     "active" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "season" TEXT NOT NULL,
ADD COLUMN     "tournament" TEXT NOT NULL;
