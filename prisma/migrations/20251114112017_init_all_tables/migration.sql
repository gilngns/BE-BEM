-- CreateTable
CREATE TABLE "Fase" (
    "id" SERIAL NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL,
    "jumlahMakanan" DOUBLE PRECISION NOT NULL,
    "jumlahTelur" INTEGER NOT NULL,
    "keterangan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "prediksiPanen" DOUBLE PRECISION,

    CONSTRAINT "Fase_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pencacahan" (
    "id" SERIAL NOT NULL,
    "tanggalWaktu" TIMESTAMP(3) NOT NULL,
    "totalSampah" DOUBLE PRECISION NOT NULL,
    "catatan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pencacahan_pkey" PRIMARY KEY ("id")
);
