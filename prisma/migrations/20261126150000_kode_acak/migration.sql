-- Kode acak untuk URL aplikasi web, supaya ID angka tidak tampil di alamat halaman.
-- Data lama diisi kode acak 16 karakter (huruf, angka, - dan _), data baru diisi Prisma (nanoid).
CREATE OR REPLACE FUNCTION pg_temp.kode_acak() RETURNS text AS $$
  SELECT substr(translate(encode(sha256((gen_random_uuid()::text || clock_timestamp()::text)::bytea), 'base64'), '+/=', '-_x'), 1, 16)
$$ LANGUAGE sql VOLATILE;

ALTER TABLE "Siklus" ADD COLUMN "kode" TEXT;
UPDATE "Siklus" SET "kode" = pg_temp.kode_acak();
ALTER TABLE "Siklus" ALTER COLUMN "kode" SET NOT NULL;
CREATE UNIQUE INDEX "Siklus_kode_key" ON "Siklus"("kode");

ALTER TABLE "pencacahan" ADD COLUMN "kode" TEXT;
UPDATE "pencacahan" SET "kode" = pg_temp.kode_acak();
ALTER TABLE "pencacahan" ALTER COLUMN "kode" SET NOT NULL;
CREATE UNIQUE INDEX "pencacahan_kode_key" ON "pencacahan"("kode");

ALTER TABLE "Notifikasi" ADD COLUMN "kode" TEXT;
UPDATE "Notifikasi" SET "kode" = pg_temp.kode_acak();
ALTER TABLE "Notifikasi" ALTER COLUMN "kode" SET NOT NULL;
CREATE UNIQUE INDEX "Notifikasi_kode_key" ON "Notifikasi"("kode");
