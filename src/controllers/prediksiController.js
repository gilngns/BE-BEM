import prisma from "../lib/prisma.js";
import { notFound, parseId } from "../lib/validate.js";

// Catatan: endpoint GET di sini sengaja TIDAK membuat notifikasi,
// karena dipanggil setiap kali halaman dibuka (bikin notifikasi spam).

// ======================================================
// GET: Semua prediksi panen dari satu siklus
// ======================================================
export const getPrediksiBySiklus = async (req, res) => {
  const siklusId = parseId(req.params.siklusId, "siklusId");

  const siklus = await prisma.siklus.findFirst({ where: { id: siklusId, userId: req.user.id } });
  if (!siklus) throw notFound("Siklus tidak ditemukan");

  const prediksi = await prisma.prediksiPanen.findMany({
    where: { fase: { siklusId, jenis: "PANEN" } },
    orderBy: { createdAt: "asc" },
  });

  res.json({ success: true, data: prediksi });
};

// ======================================================
// GET: Total semua prediksi user (kg & gram)
// ======================================================
export const getTotalPrediksi = async (req, res) => {
  const agg = await prisma.prediksiPanen.aggregate({
    where: { fase: { siklus: { userId: req.user.id } } },
    _sum: { hasilKg: true, hasilGram: true },
    _count: { _all: true },
  });

  const totalKg = agg._sum.hasilKg ?? 0;
  const totalGram = agg._sum.hasilGram ?? 0;

  res.json({
    success: true,
    totalKg: Number(totalKg.toFixed(3)),
    totalGram: Math.round(totalGram),
    jumlahPrediksi: agg._count._all,
  });
};

// ======================================================
// GET: Total wadah aktif
// Wadah dihitung aktif bila fase terakhir siklusnya = PEMBESARAN
// (tahap pendewasaan maggot). Enum di database tidak punya
// "PENDEWASAAN", sehingga kode lama selalu menghasilkan 0.
// ======================================================
export const getWadahAktif = async (req, res) => {
  const siklus = await prisma.siklus.findMany({
    where: { userId: req.user.id },
    select: {
      fase: {
        select: { jenis: true },
        orderBy: [{ tanggal: "desc" }, { id: "desc" }],
        take: 1,
      },
    },
  });

  const wadahAktif = siklus.filter((s) => s.fase[0]?.jenis === "PEMBESARAN").length;

  res.json({ success: true, wadahAktif });
};
