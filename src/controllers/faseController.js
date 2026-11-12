import prisma from "../lib/prisma.js";
import { predictPanen } from "../lib/aiClient.js";
import { createNotifikasi } from "./notifikasiController.js";
import {
  getBody, notFound, parseDate, parseEnum, parseId, parseNumber, parseString,
} from "../lib/validate.js";

export const JENIS_FASE = ["PENETASAN", "PEMBESARAN", "PANEN"];

export const tambahFase = async (req, res) => {
  const userId = req.user.id;
  const siklusId = parseId(req.params.siklusId, "siklusId");
  const body = getBody(req);

  const jenis = parseEnum(body.jenis, "jenis", JENIS_FASE);
  const tanggal = parseDate(body.tanggal, "tanggal");
  const isPanen = jenis === "PANEN";
  const jumlahTelur = parseNumber(body.jumlahTelur, "jumlahTelur", {
    integer: true, optional: !isPanen, min: isPanen ? 1 : 0,
  });
  const jumlahMakanan = parseNumber(body.jumlahMakanan, "jumlahMakanan", {
    optional: !isPanen, min: isPanen ? 1 : 0,
  });
  const keterangan = parseString(body.keterangan, "keterangan", { optional: true, maxLength: 1000 });

  const siklus = await prisma.siklus.findFirst({ where: { id: siklusId, userId } });
  if (!siklus) throw notFound("Siklus tidak ditemukan");

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
  const siklusId = parseId(req.params.siklusId, "siklusId");

  const siklus = await prisma.siklus.findFirst({ where: { id: siklusId, userId: req.user.id } });
  if (!siklus) throw notFound("Siklus tidak ditemukan");

  const fase = await prisma.fase.findMany({
    where: { siklusId },
    orderBy: [{ tanggal: "asc" }, { id: "asc" }],
    include: { prediksiPanen: true },
  });

  res.json({ success: true, data: fase });
};
