import prisma from "../lib/prisma.js";
import axios from "axios";
import { createNotifikasi } from "./notifikasiController.js";

function parseRupiah(str) {
  if (!str) return 0;
  return Number(str.replace(/[^0-9]/g, ""));
}

export const tambahFase = async (req, res) => {
  try {
    const userId = req.user.id;
    const siklusId = Number(req.params.siklusId);
    const { jenis, tanggal, jumlahTelur, jumlahMakanan, keterangan } = req.body;

    const siklus = await prisma.siklus.findFirst({ where: { id: siklusId, userId } });
    if (!siklus) return res.status(404).json({ message: "Siklus tidak ditemukan" });

    const fase = await prisma.fase.create({
      data: {
        jenis,
        tanggal: new Date(tanggal),
        jumlahTelur: jumlahTelur || null,
        jumlahMakanan: jumlahMakanan || null,
        keterangan: keterangan || null,
        siklusId
      }
    });

    // === NOTIF FASE APAPUN ===
    await createNotifikasi(
      userId,
      `Fase ${jenis} Ditambahkan`,
      `Fase ${jenis} berhasil ditambahkan ke siklus ${siklusId}.`,
      "info"
    );

    // Jika bukan PANEN → return langsung
    if (jenis !== "PANEN") {
      return res.json({ success: true, data: fase });
    }

    // Validasi panen
    if (!jumlahTelur || !jumlahMakanan) {
      return res.status(400).json({ message: "Data panen tidak lengkap" });
    }

    // Request ML
    const ml = await axios.post(process.env.ML_API_URL, {
      jumlah_telur_gram: Number(jumlahTelur),
      makanan_gram: Number(jumlahMakanan)
    });

    const prediction = ml.data.prediction;
    const business = ml.data.business_metrics;

    const prediksiPanen = await prisma.prediksiPanen.create({
      data: {
        hasilGram: prediction.jumlah_panen_gram,
        hasilKg: prediction.jumlah_panen_kg,
        conversionRate: prediction.conversion_rate,
        conversionLabel: prediction.conversion_label,
        roiEstimate: business.roi_estimate,
        estimatedValue: parseRupiah(business.estimated_value),
        feedCost: parseRupiah(business.feed_cost),
        faseId: fase.id
      }
    });

    // === NOTIFIKASI PREDIKSI BERHASIL ===
    await createNotifikasi(
      userId,
      "Prediksi Panen Berhasil",
      `Prediksi panen untuk siklus ${siklusId} berhasil dibuat.`,
      "success"
    );

    res.json({ success: true, data: { fase, prediksiPanen } });
  } catch (err) {
    console.error("tambahFase:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};


export const getFase = async (req, res) => {
  try {
    const userId = req.user.id;
    const siklusId = Number(req.params.siklusId);

    const siklus = await prisma.siklus.findFirst({ where: { id: siklusId, userId } });
    if (!siklus) return res.status(404).json({ message: "Siklus tidak ditemukan" });

    const fase = await prisma.fase.findMany({
      where: { siklusId },
      include: { prediksiPanen: true }
    });

    res.json({ success: true, data: fase });
  } catch (err) {
    console.error("getFase:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};