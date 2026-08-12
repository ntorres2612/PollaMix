-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ADMIN');

-- AlterTable
ALTER TABLE "Tournament" ADD COLUMN     "registrationEndsAt" TIMESTAMP(3),
ADD COLUMN     "registrationStartsAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "role" "UserRole" NOT NULL DEFAULT 'PLAYER';
