-- Berat telur (gram) boleh desimal, misal 0,5 gram. Nilai bulat lama tetap sama.
ALTER TABLE "Siklus" ALTER COLUMN "jumlahTelur" SET DATA TYPE DOUBLE PRECISION;
ALTER TABLE "Fase" ALTER COLUMN "jumlahTelur" SET DATA TYPE DOUBLE PRECISION;
