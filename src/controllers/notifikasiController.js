import prisma from "../lib/prisma.js";

export const createNotifikasi = async (userId, title, message, type = "info") => {
  try {
    await prisma.notifikasi.create({
      data: { userId, title, message, type }
    });
  } catch (err) {
    console.error("Error createNotifikasi:", err);
  }
};

// GET semua notif
export const getNotifikasi = async (req, res) => {
  try {
    const userId = req.user.id;
    const list = await prisma.notifikasi.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });

    res.json({ success: true, data: list });
  } catch (err) {
    console.error("getNotifikasi:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// PATCH read notif
export const readNotifikasi = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user.id;

    const notif = await prisma.notifikasi.updateMany({
      where: { id, userId },
      data: { isRead: true }
    });

    res.json({ success: true, updated: notif.count });
  } catch (err) {
    console.error("readNotifikasi:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

// DELETE notif
export const deleteNotifikasi = async (req, res) => {
  try {
    const id = Number(req.params.id);
    const userId = req.user.id;

    await prisma.notifikasi.deleteMany({ where: { id, userId } });

    res.json({ success: true, message: "Notifikasi dihapus" });
  } catch (err) {
    console.error("deleteNotifikasi:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
