-- Kelurahan Mengger punya 5 RW. Sebelumnya hanya RW4 dan RW5 yang bisa mendaftar.
-- Nilai baru ditaruh sebelum RW4 supaya urutannya RW1..RW5. Data lama tidak berubah.
ALTER TYPE "RW" ADD VALUE IF NOT EXISTS 'RW1' BEFORE 'RW4';
ALTER TYPE "RW" ADD VALUE IF NOT EXISTS 'RW2' BEFORE 'RW4';
ALTER TYPE "RW" ADD VALUE IF NOT EXISTS 'RW3' BEFORE 'RW4';
