import { Router } from "express";
import axios from "axios";
import prisma from "../lib/prisma.js";

const router = Router();

router.post("/", async (req, res) => {
  try {
    const { tanggal, jumlahMakanan, jumlahTelur, keterangan } = req.body;

    if (!tanggal || !jumlahMakanan || !jumlahTelur) {
      return res.status(400).json({ message: "Semua field wajib diisi." });
    }

    const faseBaru = await prisma.fase.create({
      data: {
        tanggal: new Date(tanggal),
        jumlahMakanan: Number(jumlahMakanan),
        jumlahTelur: Number(jumlahTelur),
        keterangan,
      },
    });

    const aiResponse = await axios.post("http://localhost:5000/api/predict/panen", {
      jumlah_telur_gram: jumlahTelur,
      makanan_gram: jumlahMakanan * 1000, 
    });

    const prediksi = aiResponse.data.prediction?.jumlah_panen_gram || 0;

    const faseUpdate = await prisma.fase.update({
      where: { id: faseBaru.id },
      data: { prediksiPanen: prediksi },
    });

    res.status(201).json({
      message: "Data berhasil disimpan dan diprediksi",
      data: faseUpdate,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      message: "Gagal memproses prediksi",
      error: error.message,
    });
  }
});

export default router;
