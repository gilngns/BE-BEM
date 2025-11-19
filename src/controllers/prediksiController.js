import prisma from "../lib/prisma.js";
import { createNotifikasi } from "./notifikasiController.js";


// ======================================================
// GET: Semua prediksi panen dari satu siklus
// ======================================================
export const getPrediksiBySiklus = async (req, res) => {
  try {
    const userId = req.user.id;
    const siklusId = Number(req.params.siklusId);

    // Pastikan siklus milik user
    const siklus = await prisma.siklus.findFirst({
      where: { id: siklusId, userId }
    });

    if (!siklus) {
      return res.status(404).json({
        success: false,
        message: "Siklus tidak ditemukan"
      });
    }

    // Ambil fase PANEN + prediksi
    const fasePanen = await prisma.fase.findMany({
      where: {
        siklusId,
        jenis: "PANEN"
      },
      include: {
        prediksiPanen: true
      }
    });

    // Filter prediksi yang tidak null
    const prediksi = fasePanen
      .map(f => f.prediksiPanen)
      .filter(p => p !== null);

    // === NOTIFIKASI: Jika prediksi ditemukan ===
    if (prediksi.length > 0) {
      await createNotifikasi(
        userId,
        "Hasil Prediksi Ditemukan",
        `Terdapat ${prediksi.length} hasil prediksi panen pada siklus ${siklusId}.`,
        "info"
      );
    }

    return res.json({
      success: true,
      data: prediksi
    });

  } catch (err) {
    console.error("getPrediksiBySiklus:", err);
    res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};




// ======================================================
// GET: Total semua prediksi user (kg & gram)
// ======================================================
export const getTotalPrediksi = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ambil semua prediksi terkait user
    const prediksi = await prisma.prediksiPanen.findMany({
      where: {
        fase: {
          siklus: {
            userId: userId
          }
        }
      },
      select: {
        hasilGram: true,
        hasilKg: true
      }
    });

    if (prediksi.length === 0) {
      return res.json({
        success: true,
        totalKg: 0,
        totalGram: 0,
        jumlahPrediksi: 0
      });
    }

    const totalKg = prediksi.reduce((t, p) => t + (p.hasilKg || 0), 0);
    const totalGram = prediksi.reduce((t, p) => t + (p.hasilGram || 0), 0);

    // === NOTIFIKASI ===
    await createNotifikasi(
      userId,
      "Total Prediksi Diproses",
      `Total hasil prediksi: ${totalKg.toFixed(2)} kg.`,
      "info"
    );

    return res.json({
      success: true,
      totalKg: Number(totalKg.toFixed(3)),
      totalGram: Math.round(totalGram),
      jumlahPrediksi: prediksi.length
    });

  } catch (err) {
    console.error("getTotalPrediksi:", err);
    return res.status(500).json({
      success: false,
      message: "Internal server error"
    });
  }
};




// ======================================================
// GET: Total wadah aktif (fase terakhir = PENDEWASAAN)
// ======================================================
export const getWadahAktif = async (req, res) => {
  try {
    const userId = req.user.id;

    // Ambil semua siklus + fase
    const siklus = await prisma.siklus.findMany({
      where: { userId },
      include: {
        fase: {
          orderBy: { tanggal: "asc" }
        }
      }
    });

    let wadahAktif = 0;

    siklus.forEach(s => {
      const lastFase = s.fase[s.fase.length - 1]; // fase terakhir

      if (lastFase && lastFase.jenis === "PENDEWASAAN") {
        wadahAktif++;
      }
    });

    // === NOTIFIKASI ===
    await createNotifikasi(
      userId,
      "Wadah Aktif Dihitung",
      `Saat ini terdapat ${wadahAktif} wadah aktif.`,
      "info"
    );

    return res.json({
      success: true,
      wadahAktif
    });

  } catch (err) {
    console.error("getWadahAktif:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
