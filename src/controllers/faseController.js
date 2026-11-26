import prisma from "../lib/prisma.js";
import { predictPanen } from "../lib/aiClient.js";
import { siapkanPanenUlang } from "../lib/panenUlang.js";
import { createNotifikasi } from "./notifikasiController.js";
import {
  badRequest, getBody, notFound, parseDate, parseEnum, parseId, parseNumber, parseRef, parseString,
} from "../lib/validate.js";

export const JENIS_FASE = ["PENETASAN", "PEMBESARAN", "PANEN"];

export const tambahFase = async (req, res) => {
  const userId = req.user.id;
  const siklusRef = parseRef(req.params.siklusId, "siklusId");
  const body = getBody(req);

  const jenis = parseEnum(body.jenis, "jenis", JENIS_FASE);
  const tanggal = parseDate(body.tanggal, "tanggal");
  const isPanen = jenis === "PANEN";
  const jumlahTelur = parseNumber(body.jumlahTelur, "jumlahTelur", {
    optional: !isPanen, min: isPanen ? 0.01 : 0, max: 1e6,
  });
  const jumlahMakanan = parseNumber(body.jumlahMakanan, "jumlahMakanan", {
    optional: !isPanen, min: isPanen ? 1 : 0,
  });
  const keterangan = parseString(body.keterangan, "keterangan", { optional: true, maxLength: 1000 });

  const siklus = await prisma.siklus.findFirst({ where: { ...siklusRef, userId } });
  if (!siklus) throw notFound("Siklus tidak ditemukan");
  const siklusId = siklus.id;

  const faseData = {
    jenis,
    tanggal,
    jumlahTelur: jumlahTelur ?? null,
    jumlahMakanan: jumlahMakanan ?? null,
    keterangan: keterangan ?? null,
    siklusId,
  };

  // ---------- Fase biasa ----------
  if (!isPanen) {
    const fase = await prisma.fase.create({ data: faseData });

    await createNotifikasi(
      userId,
      `Fase ${jenis} Ditambahkan`,
      `Fase ${jenis} berhasil ditambahkan ke siklus ${siklusId}.`,
      "info"
    );

    return res.json({ success: true, data: fase });
  }

  // ---------- Fase PANEN ----------
  // Panggil ML dulu; kalau gagal, tidak ada data yang tersimpan.
  const prediksi = await predictPanen(jumlahTelur, jumlahMakanan);

  // Fase + prediksi disimpan dalam satu operasi (atomik)
  const { prediksiPanen, ...fase } = await prisma.fase.create({
    data: { ...faseData, prediksiPanen: { create: prediksi } },
    include: { prediksiPanen: true },
  });

  await createNotifikasi(
    userId,
    "Prediksi Panen Berhasil",
    `Fase PANEN ditambahkan dan prediksi panen untuk siklus ${siklusId} berhasil dibuat.`,
    "success"
  );

  res.json({ success: true, data: { fase, prediksiPanen } });
};

export const getFase = async (req, res) => {
  const siklus = await prisma.siklus.findFirst({
    where: { ...parseRef(req.params.siklusId, "siklusId"), userId: req.user.id },
  });
  if (!siklus) throw notFound("Siklus tidak ditemukan");
  const siklusId = siklus.id;

  const fase = await prisma.fase.findMany({
    where: { siklusId },
    orderBy: [{ tanggal: "asc" }, { id: "asc" }],
    include: { prediksiPanen: true },
  });

  res.json({ success: true, data: fase });
};

/** Siklus milik user beserta fase-fasenya, dan fase yang diminta. */
async function cariFaseMilikUser(req) {
  const siklusRef = parseRef(req.params.siklusId, "siklusId");
  const faseId = parseId(req.params.faseId, "faseId");
  const siklus = await prisma.siklus.findFirst({
    where: { ...siklusRef, userId: req.user.id },
    include: { fase: { include: { prediksiPanen: true } } },
  });
  if (!siklus) throw notFound("Siklus tidak ditemukan");
  const fase = siklus.fase.find((f) => f.id === faseId);
  if (!fase) throw notFound("Fase tidak ditemukan");
  return { siklus, fase };
}

/**
 * Fase PANEN dibuat aplikasi bersamaan dengan fase PEMBESARAN (tanggal & pakan sama) untuk
 * meminta perkiraan. Jadi fase PANEN ikut berubah / terhapus bersama fase PEMBESARAN-nya.
 */
const panenTerkait = (siklus, fase) =>
  fase.jenis === "PEMBESARAN" ? siklus.fase.filter((f) => f.jenis === "PANEN") : fase.jenis === "PANEN" ? [fase] : [];

// UPDATE fase (hanya field yang dikirim yang diubah)
export const updateFase = async (req, res) => {
  const body = getBody(req);
  const tanggal = parseDate(body.tanggal, "tanggal", { optional: true, nullable: false });
  const jumlahMakanan = parseNumber(body.jumlahMakanan, "jumlahMakanan", { optional: true, nullable: false, min: 1 });
  const keterangan = parseString(body.keterangan, "keterangan", { optional: true, maxLength: 1000 });

  if ([tanggal, jumlahMakanan, keterangan].every((v) => v === undefined)) {
    throw badRequest("Tidak ada data yang diubah");
  }

  const { siklus, fase } = await cariFaseMilikUser(req);
  const panen = panenTerkait(siklus, fase);
  const pakanBerubah = jumlahMakanan !== undefined && jumlahMakanan !== fase.jumlahMakanan;
  // Pakan berubah: perkiraan dihitung ulang dulu (AI dipanggil sebelum ada yang disimpan).
  const opsPanen = pakanBerubah
    ? await siapkanPanenUlang(panen, { jumlahMakanan, tanggal, keterangan }, siklus.jumlahTelur)
    : panen.map((p) => prisma.fase.update({ where: { id: p.id }, data: { tanggal, keterangan } }));

  const ops = [
    ...(fase.jenis !== "PANEN" ? [prisma.fase.update({ where: { id: fase.id }, data: { tanggal, jumlahMakanan, keterangan } })] : []),
    ...opsPanen,
  ];
  const [data] = await prisma.$transaction(ops);
  res.json({ success: true, message: "Fase berhasil diperbarui", data });
};

// DELETE fase (fase PEMBESARAN ikut menghapus fase PANEN & perkiraannya)
export const deleteFase = async (req, res) => {
  const { siklus, fase } = await cariFaseMilikUser(req);
  const ids = [fase.id, ...panenTerkait(siklus, fase).map((f) => f.id)].filter((v, i, a) => a.indexOf(v) === i);

  await prisma.$transaction([
    prisma.prediksiPanen.deleteMany({ where: { faseId: { in: ids } } }),
    prisma.fase.deleteMany({ where: { id: { in: ids } } }),
  ]);
  res.json({ success: true, message: "Fase berhasil dihapus" });
};
