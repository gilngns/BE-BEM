/*
  Warnings:

  - You are about to drop the column `prediksiPanen` on the `Fase` table. All the data in the column will be lost.
  - You are about to drop the column `userId` on the `Fase` table. All the data in the column will be lost.
  - You are about to drop the `Pencacahan` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `jenis` to the `Fase` table without a default value. This is not possible if the table is not empty.
  - Added the required column `siklusId` to the `Fase` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "JenisFase" AS ENUM ('PENETASAN', 'PEMBESARAN', 'PANEN');

-- DropForeignKey
ALTER TABLE "Fase" DROP CONSTRAINT "Fase_userId_fkey";

-- DropForeignKey
ALTER TABLE "Pencacahan" DROP CONSTRAINT "Pencacahan_userId_fkey";

-- AlterTable
ALTER TABLE "Fase" DROP COLUMN "prediksiPanen",
DROP COLUMN "userId",
ADD COLUMN     "jenis" "JenisFase" NOT NULL,
ADD COLUMN     "siklusId" INTEGER NOT NULL,
ALTER COLUMN "jumlahMakanan" DROP NOT NULL,
ALTER COLUMN "jumlahTelur" DROP NOT NULL;

-- DropTable
DROP TABLE "Pencacahan";

-- CreateTable
CREATE TABLE "Siklus" (
    "id" SERIAL NOT NULL,
    "tanggalMulai" TIMESTAMP(3) NOT NULL,
    "jumlahTelur" INTEGER NOT NULL,
    "mediaTelur" TEXT NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "userId" INTEGER NOT NULL,

    CONSTRAINT "Siklus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PrediksiPanen" (
    "id" SERIAL NOT NULL,
    "hasilGram" DOUBLE PRECISION NOT NULL,
    "hasilKg" DOUBLE PRECISION NOT NULL,
    "conversionRate" DOUBLE PRECISION NOT NULL,
    "conversionLabel" TEXT NOT NULL,
    "roiEstimate" DOUBLE PRECISION NOT NULL,
    "estimatedValue" DOUBLE PRECISION NOT NULL,
    "feedCost" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "faseId" INTEGER NOT NULL,

    CONSTRAINT "PrediksiPanen_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PrediksiPanen_faseId_key" ON "PrediksiPanen"("faseId");

-- AddForeignKey
ALTER TABLE "Siklus" ADD CONSTRAINT "Siklus_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fase" ADD CONSTRAINT "Fase_siklusId_fkey" FOREIGN KEY ("siklusId") REFERENCES "Siklus"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PrediksiPanen" ADD CONSTRAINT "PrediksiPanen_faseId_fkey" FOREIGN KEY ("faseId") REFERENCES "Fase"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
