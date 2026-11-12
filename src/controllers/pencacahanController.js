import prisma from "../lib/prisma.js";
import { createNotifikasi } from "./notifikasiController.js";
import { badRequest, getBody, notFound, parseDate, parseId, parseNumber, parseString } from "../lib/validate.js";

// Semua query dibatasi ke data milik user yang login (userId dari token).

// CREATE
export const createPencacahan = async (req, res) => {
  const userId = req.user.id;
  const body = getBody(req);

  // tanggalWaktu opsional -> default waktu sekarang
  const tanggalWaktu =
    parseDate(body.tanggalWaktu, "tanggalWaktu", { optional: true }) ?? new Date();
  const totalSampah = parseNumber(body.totalSampah, "totalSampah");
  const catatan = parseString(body.catatan, "catatan", { optional: true, maxLength: 1000 });

  const data = await prisma.pencacahan.create({
    data: { tanggalWaktu, totalSampah, catatan: catatan ?? null, userId },
  });

  await createNotifikasi(
    userId,
    "Pencacahan Baru",
    `Total sampah ${totalSampah} kg berhasil dicatat.`,
    "info"
  );

  res.json({ success: true, status: "success", message: "Data pencacahan berhasil dibuat", data });
};

// GET ALL (milik user)
export const getAllPencacahan = async (req, res) => {
  const data = await prisma.pencacahan.findMany({
    where: { userId: req.user.id },
    orderBy: { id: "desc" },
  });

  res.json({ success: true, status: "success", data });
};

// GET BY ID
export const getPencacahanById = async (req, res) => {
  const id = parseId(req.params.id);

  const data = await prisma.pencacahan.findFirst({ where: { id, userId: req.user.id } });
  if (!data) throw notFound();

  res.json({ success: true, status: "success", data });
};

// UPDATE (hanya field yang dikirim yang diubah)
export const updatePencacahan = async (req, res) => {
  const id = parseId(req.params.id);
  const body = getBody(req);

  const tanggalWaktu = parseDate(body.tanggalWaktu, "tanggalWaktu", { optional: true, nullable: false });
  const totalSampah = parseNumber(body.totalSampah, "totalSampah", { optional: true, nullable: false });
  const catatan = parseString(body.catatan, "catatan", { optional: true, maxLength: 1000 });

  if (tanggalWaktu === undefined && totalSampah === undefined && catatan === undefined) {
    throw badRequest("Tidak ada data yang diubah");
  }

  const existing = await prisma.pencacahan.findFirst({ where: { id, userId: req.user.id } });
  if (!existing) throw notFound();

  const data = await prisma.pencacahan.update({
    where: { id },
    data: { tanggalWaktu, totalSampah, catatan },
  });

  res.json({ success: true, status: "success", message: "Data berhasil diperbarui", data });
};

// DELETE
export const deletePencacahan = async (req, res) => {
  const id = parseId(req.params.id);

  const result = await prisma.pencacahan.deleteMany({ where: { id, userId: req.user.id } });
  if (result.count === 0) throw notFound();

  res.json({ success: true, status: "success", message: "Data berhasil dihapus" });
};
