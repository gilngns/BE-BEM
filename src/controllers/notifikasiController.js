import prisma from "../lib/prisma.js";
import { notFound, parseId } from "../lib/validate.js";

// Dipakai controller lain. Error tidak dilempar supaya kegagalan
// notifikasi tidak menggagalkan proses utama.
export const createNotifikasi = async (userId, title, message, type = "info") => {
  try {
    await prisma.notifikasi.create({ data: { userId, title, message, type } });
  } catch (err) {
    console.error("Error createNotifikasi:", err);
  }
};

// GET semua notif milik user
export const getNotifikasi = async (req, res) => {
  const list = await prisma.notifikasi.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  res.json({ success: true, data: list });
};

// PATCH tandai sudah dibaca
export const readNotifikasi = async (req, res) => {
  const id = parseId(req.params.id);

  const result = await prisma.notifikasi.updateMany({
    where: { id, userId: req.user.id },
    data: { isRead: true },
  });
  if (result.count === 0) throw notFound("Notifikasi tidak ditemukan");

  res.json({ success: true, updated: result.count });
};

// DELETE notif
export const deleteNotifikasi = async (req, res) => {
  const id = parseId(req.params.id);

  const result = await prisma.notifikasi.deleteMany({ where: { id, userId: req.user.id } });
  if (result.count === 0) throw notFound("Notifikasi tidak ditemukan");

  res.json({ success: true, message: "Notifikasi dihapus" });
};
