import prisma from "../lib/prisma.js";

// -------------------------
// GET: Ambil semua notifikasi user
// -------------------------
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

// -------------------------
// PATCH: Tandai sebagai dibaca
// -------------------------
export const readNotifikasi = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);

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

// -------------------------
// DELETE: Hapus notifikasi
// -------------------------
export const deleteNotifikasi = async (req, res) => {
  try {
    const userId = req.user.id;
    const id = Number(req.params.id);

    await prisma.notifikasi.deleteMany({
      where: { id, userId }
    });

    res.json({ success: true, message: "Notifikasi dihapus" });
  } catch (err) {
    console.error("deleteNotifikasi:", err);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};
