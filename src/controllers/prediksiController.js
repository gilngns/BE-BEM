import prisma from "../lib/prisma.js";
import { getModelInfo, predictPenetasan } from "../lib/aiClient.js";
import {
  badRequest, getBody, notFound, parseId, parseNumber, parseString,
} from "../lib/validate.js";

// ======================================================
// GET: Pilihan dropdown dari model AI (media, cuaca, musim)
// ======================================================
export const getOpsiPrediksi = async (req, res) => {
  const info = await getModelInfo();
  res.json({ success: true, data: info });
};

// ======================================================
// POST: Prediksi lama penetasan telur (AI)
// Tidak disimpan ke database, hanya diteruskan ke model AI.
// jumlahTelur & mediaTelur boleh diambil dari siklus (kirim siklusId).
// ======================================================
export const prediksiPenetasan = async (req, res) => {
  const body = getBody(req);

  let siklus = null;
  if (body.siklusId !== undefined && body.siklusId !== null && body.siklusId !== "") {
    const siklusId = parseId(String(body.siklusId), "siklusId");
    siklus = await prisma.siklus.findFirst({ where: { id: siklusId, userId: req.user.id } });
    if (!siklus) throw notFound("Siklus tidak ditemukan");
  }

  const jumlahTelurGram = parseNumber(body.jumlahTelur ?? siklus?.jumlahTelur, "jumlahTelur", { min: 0.01, max: 1e6 });
  const mediaTelur = parseString(body.mediaTelur ?? siklus?.mediaTelur, "mediaTelur", { maxLength: 100 });
  const suhu = parseNumber(body.suhu, "suhu", { min: 15, max: 45 });
  const kelembaban = parseNumber(body.kelembaban, "kelembaban", { min: 30, max: 100 });
  const suhuMaks = parseNumber(body.suhuMaks, "suhuMaks", { min: 15, max: 60 });
  const cuaca = parseString(body.cuaca, "cuaca", { maxLength: 50 });
  const musim = parseString(body.musim, "musim", { maxLength: 50 });

  if (suhuMaks <= suhu) throw badRequest("suhuMaks harus lebih besar dari suhu");

  // Validasi pilihan kategori dengan daftar dari model (pesan lebih jelas)
  const { opsi } = await getModelInfo();
  const cek = (nilai, daftar, nama) => {
    if (daftar.length && !daftar.includes(nilai)) {
      throw badRequest(`${nama} harus salah satu dari: ${daftar.join(", ")}`);
    }
  };
  cek(mediaTelur, opsi.mediaTelur, "mediaTelur");
  cek(cuaca, opsi.cuaca, "cuaca");
  cek(musim, opsi.musim, "musim");

  const hasil = await predictPenetasan({ jumlahTelurGram, mediaTelur, suhu, kelembaban, suhuMaks, cuaca, musim });

  // Estimasi tanggal menetas jika siklus diketahui
  let estimasiTanggalMenetas = null;
  if (siklus) {
    const d = new Date(siklus.tanggalMulai);
    d.setDate(d.getDate() + hasil.lamaPenetasanHari);
    estimasiTanggalMenetas = d;
  }

  res.json({
    success: true,
    data: {
      ...hasil,
      estimasiTanggalMenetas,
      input: { jumlahTelur: jumlahTelurGram, mediaTelur, suhu, kelembaban, suhuMaks, cuaca, musim },
    },
  });
};

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
