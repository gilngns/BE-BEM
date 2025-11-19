import prisma from "../lib/prisma.js";
import { createNotifikasi } from "./notifikasiController.js";

export const createSiklus = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tanggalMulai, jumlahTelur, mediaTelur, catatan } = req.body;

    const siklus = await prisma.siklus.create({
      data: {
        tanggalMulai: new Date(tanggalMulai),
        jumlahTelur: Number(jumlahTelur),
        mediaTelur,
        catatan: catatan || null,
        userId
      }
    });

    // === NOTIFIKASI ===
    await createNotifikasi(
      userId,
      "Siklus Baru Dibuat",
      `Siklus baru dimulai dengan ${jumlahTelur} telur.`,
      "success"
    );

    res.json({ success: true, data: siklus });
  } catch (err) {
    console.error("createSiklus:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getAllSiklus = async (req, res) => {
  try {
    const userId = req.user.id;

    const siklus = await prisma.siklus.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: siklus });
  } catch (err) {
    console.error("getAllSiklus:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export const getDetailSiklus = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);

    const siklus = await prisma.siklus.findFirst({
      where: { id, userId },
      include: {
        fase: {
          orderBy: { tanggal: "asc" },
          include: { prediksiPanen: true }
        }
      }
    });

    if (!siklus) {
      return res.status(404).json({ success: false, message: "Siklus tidak ditemukan" });
    }

    res.json({ success: true, data: siklus });
  } catch (err) {
    console.error("getDetailSiklus:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
