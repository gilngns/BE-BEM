/*
  Warnings:

  - You are about to drop the column `email` on the `User` table. All the data in the column will be lost.
  - Added the required column `userId` to the `Fase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `userId` to the `Pencacahan` table without a default value. This is not possible if the table is not empty.
  - Added the required column `rw` to the `User` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "User_email_key";

-- AlterTable
ALTER TABLE "Fase" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Pencacahan" ADD COLUMN     "userId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "User" DROP COLUMN "email",
ADD COLUMN     "rw" INTEGER NOT NULL;

-- AddForeignKey
ALTER TABLE "Fase" ADD CONSTRAINT "Fase_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pencacahan" ADD CONSTRAINT "Pencacahan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
