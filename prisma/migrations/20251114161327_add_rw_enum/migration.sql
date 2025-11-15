/*
  Warnings:

  - Changed the type of `rw` on the `User` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "RW" AS ENUM ('RW4', 'RW5');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "rw",
ADD COLUMN     "rw" "RW" NOT NULL;
