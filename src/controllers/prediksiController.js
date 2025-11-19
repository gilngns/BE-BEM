import prisma from "../lib/prisma.js";

// Ambil semua prediksi dari 1 siklus
export const getPrediksiBySiklus = async (req, res) => {
  try {
    const userId = req.user.id;
    const siklusId = Number(req.params.siklusId);

    // Cek apakah siklus milik user
    const siklus = await prisma.siklus.findFirst({
      where: { id: siklusId, userId }
    });

    if (!siklus) {
      return res.status(404).json({
        success: false,
        message: "Siklus tidak ditemukan"
      });
    }

    // Ambil semua fase panen + prediksi Panen
    const fasePanen = await prisma.fase.findMany({
      where: {
        siklusId,
        jenis: "PANEN"
      },
      include: {
        prediksiPanen: true
      }
    });

    // ambil hanya prediksi yang ada (tidak null)
    const prediksi = fasePanen
      .map(f => f.prediksiPanen)
      .filter(p => p !== null);

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

export const getTotalPrediksi = async (req, res) => {
    try {
      const userId = req.user.id;
  
      // Ambil semua prediksi via join ke fase -> siklus
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
  

  export const getWadahAktif = async (req, res) => {
    try {
      const userId = req.user.id;
  
      // Ambil semua siklus + semua fase
      const siklus = await prisma.siklus.findMany({
        where: { userId },
        include: {
          fase: {
            orderBy: { tanggal: "asc" }
          }
        }
      });
  
      // Hitung wadah aktif (fase terakhir = PENDEWASAAN)
      let wadahAktif = 0;
  
      siklus.forEach(s => {
        const last = s.fase[s.fase.length - 1];
        if (last && last.jenis === "PENDEWASAAN") {
          wadahAktif++;
        }
      });
  
      return res.json({
        success: true,
        wadahAktif
      });
  
    } catch (err) {
      console.error("getWadahAktif:", err);
      res.status(500).json({ success: false, message: "Internal server error" });
    }
  };
  