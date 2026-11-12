import axios from "axios";
import prisma from "../lib/prisma.js";
import { createNotifikasi } from "./notifikasiController.js";
import {
  getBody, HttpError, notFound, parseDate, parseEnum, parseId, parseNumber, parseString,
} from "../lib/validate.js";

export const JENIS_FASE = ["PENETASAN", "PEMBESARAN", "PANEN"];

const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 15000;

// "Rp 25.000" -> 25000, angka biasa dibiarkan
function parseRupiah(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return 0;
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : 0;
}

// Terima number atau string angka ("12.5", "35%")
function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value.replace(/[^0-9.\-]/g, ""));
  return NaN;
}

const mlUnavailable = () =>
  new HttpError(503, "Layanan prediksi sedang tidak tersedia, coba lagi nanti");

async function requestPrediksi(jumlahTelur, jumlahMakanan) {
  const url = process.env.ML_API_URL || process.env.AI_API_URL;
  if (!url) {
    console.error("ML_API_URL belum diset");
    throw mlUnavailable();
  }

  let response;
  try {
    response = await axios.post(
      url,
      { jumlah_telur_gram: jumlahTelur, makanan_gram: jumlahMakanan },
      { timeout: ML_TIMEOUT_MS }
    );
  } catch (err) {
    console.error("ML API error:", err.response?.status ?? err.code, err.message);
    throw mlUnavailable();
  }

  const prediction = response.data?.prediction;
  const business = response.data?.business_metrics;

  const data = {
    hasilGram: toNumber(prediction?.jumlah_panen_gram),
    hasilKg: toNumber(prediction?.jumlah_panen_kg),
    conversionRate: toNumber(prediction?.conversion_rate),
    conversionLabel: String(prediction?.conversion_label ?? ""),
    roiEstimate: toNumber(business?.roi_estimate),
    estimatedValue: parseRupiah(business?.estimated_value),
    feedCost: parseRupiah(business?.feed_cost),
  };

  const numericOk = ["hasilGram", "hasilKg", "conversionRate", "roiEstimate"].every((k) =>
    Number.isFinite(data[k])
  );
  if (!prediction || !business || !numericOk) {
    console.error("Respons ML tidak sesuai format:", JSON.stringify(response.data).slice(0, 500));
    throw mlUnavailable();
  }

  return data;
}

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
  const prediksi = await requestPrediksi(jumlahTelur, jumlahMakanan);

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
