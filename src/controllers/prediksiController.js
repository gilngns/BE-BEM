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
