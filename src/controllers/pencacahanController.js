import prisma from "../lib/prisma.js";
import { createNotifikasi } from "./notifikasiController.js";

// CREATE
export const createPencacahan = async (req, res) => {
  try {
    const userId = req.user.id;
    const { tanggalWaktu, totalSampah, catatan } = req.body;

    const data = await prisma.pencacahan.create({
      data: {
        tanggalWaktu,
        totalSampah,
        catatan,
        userId,
      },
    });

    // === NOTIFIKASI ===
    await createNotifikasi(
      userId,
      "Pencacahan Baru",
      `Total sampah ${totalSampah} gram berhasil dicatat.`,
      "info"
    );

    res.json({ message: "Data pencacahan berhasil dibuat", data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// GET ALL
export const getAllPencacahan = async (req, res) => {
  try {
    const data = await prisma.pencacahan.findMany({
      orderBy: { id: "desc" },
    });

    res.json({ status: "success", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// GET BY ID
export const getPencacahanById = async (req, res) => {
  try {
    const { id } = req.params;

    const data = await prisma.pencacahan.findUnique({
      where: { id: Number(id) },
    });

    if (!data) return res.status(404).json({ error: "Data tidak ditemukan" });

    res.json({ status: "success", data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE
export const updatePencacahan = async (req, res) => {
  try {
    const { id } = req.params;
    const { tanggalWaktu, totalSampah, catatan } = req.body;

    const data = await prisma.pencacahan.update({
      where: { id: Number(id) },
      data: {
        tanggalWaktu: tanggalWaktu ? new Date(tanggalWaktu) : undefined,
        totalSampah: totalSampah ? parseFloat(totalSampah) : undefined,
        catatan,
      },
    });

    res.json({
      status: "success",
      message: "Data berhasil diperbarui",
      data,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// DELETE
export const deletePencacahan = async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.pencacahan.delete({
      where: { id: Number(id) },
    });

    res.json({
      status: "success",
      message: "Data berhasil dihapus",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
