import prisma from "../lib/prisma.js";
import { createNotifikasi } from "./notifikasiController.js";
import { getBody, notFound, parseDate, parseId, parseNumber, parseString } from "../lib/validate.js";

export const createSiklus = async (req, res) => {
  const userId = req.user.id;
  const body = getBody(req);

  const tanggalMulai = parseDate(body.tanggalMulai, "tanggalMulai");
  const jumlahTelur = parseNumber(body.jumlahTelur, "jumlahTelur", { integer: true, min: 1 });
  const mediaTelur = parseString(body.mediaTelur, "mediaTelur", { maxLength: 100 });
  const catatan = parseString(body.catatan, "catatan", { optional: true, maxLength: 1000 });

  const siklus = await prisma.siklus.create({
    data: { tanggalMulai, jumlahTelur, mediaTelur, catatan: catatan ?? null, userId },
  });

  await createNotifikasi(
    userId,
    "Siklus Baru Dibuat",
    `Siklus baru dimulai dengan ${jumlahTelur} telur.`,
    "success"
  );

  res.json({ success: true, data: siklus });
};

export const getAllSiklus = async (req, res) => {
  const siklus = await prisma.siklus.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });

  res.json({ success: true, data: siklus });
};

export const getDetailSiklus = async (req, res) => {
  const id = parseId(req.params.id);

  const siklus = await prisma.siklus.findFirst({
    where: { id, userId: req.user.id },
    include: {
      fase: {
        orderBy: [{ tanggal: "asc" }, { id: "asc" }],
        include: { prediksiPanen: true },
      },
    },
  });

  if (!siklus) throw notFound("Siklus tidak ditemukan");

  res.json({ success: true, data: siklus });
};
