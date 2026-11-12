-- AlterTable
ALTER TABLE "PrediksiPanen" ADD COLUMN     "rekomendasi" TEXT[] DEFAULT ARRAY[]::TEXT[];
