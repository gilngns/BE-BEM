import prisma from "../lib/prisma.js";
import { siapkanPanenUlang } from "../lib/panenUlang.js";
import { createNotifikasi } from "./notifikasiController.js";
import { badRequest, getBody, notFound, parseDate, parseId, parseNumber, parseString } from "../lib/validate.js";

export const createSiklus = async (req, res) => {
  const userId = req.user.id;
  const body = getBody(req);

  const tanggalMulai = parseDate(body.tanggalMulai, "tanggalMulai");
  const jumlahTelur = parseNumber(body.jumlahTelur, "jumlahTelur", { min: 0.01, max: 1e6 });
  const mediaTelur = parseString(body.mediaTelur, "mediaTelur", { maxLength: 100 });
  const catatan = parseString(body.catatan, "catatan", { optional: true, maxLength: 1000 });

  const siklus = await prisma.siklus.create({
    data: { tanggalMulai, jumlahTelur, mediaTelur, catatan: catatan ?? null, userId },
  });

  await createNotifikasi(
    userId,
    "Siklus Baru Dibuat",
    `Siklus baru dimulai dengan ${String(jumlahTelur).replace(".", ",")} gram telur.`,
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

// UPDATE (hanya field yang dikirim yang diubah)
export const updateSiklus = async (req, res) => {
  const userId = req.user.id;
  const id = parseId(req.params.id);
  const body = getBody(req);

  const tanggalMulai = parseDate(body.tanggalMulai, "tanggalMulai", { optional: true, nullable: false });
  const jumlahTelur = parseNumber(body.jumlahTelur, "jumlahTelur", { optional: true, nullable: false, min: 0.01, max: 1e6 });
  const mediaTelur = parseString(body.mediaTelur, "mediaTelur", { optional: true, nullable: false, maxLength: 100 });
  const catatan = parseString(body.catatan, "catatan", { optional: true, maxLength: 1000 });

  if ([tanggalMulai, jumlahTelur, mediaTelur, catatan].every((v) => v === undefined)) {
    throw badRequest("Tidak ada data yang diubah");
  }

  const siklus = await prisma.siklus.findFirst({
    where: { id, userId },
    include: { fase: { include: { prediksiPanen: true } } },
  });
  if (!siklus) throw notFound("Siklus tidak ditemukan");

  // Berat telur berubah: perkiraan panen dihitung ulang dulu (AI dipanggil sebelum ada yang
  // disimpan), lalu fase PENETASAN & PANEN ikut disesuaikan dalam satu transaksi.
  const telurBerubah = jumlahTelur !== undefined && jumlahTelur !== siklus.jumlahTelur;
  const opsPanen = telurBerubah
    ? await siapkanPanenUlang(siklus.fase.filter((f) => f.jenis === "PANEN"), { jumlahTelur }, jumlahTelur)
    : [];

  const ops = [
    prisma.siklus.update({ where: { id }, data: { tanggalMulai, jumlahTelur, mediaTelur, catatan } }),
    ...(telurBerubah ? [prisma.fase.updateMany({ where: { siklusId: id, jenis: "PENETASAN" }, data: { jumlahTelur } })] : []),
    ...opsPanen,
  ];
  const [data] = await prisma.$transaction(ops);
  res.json({ success: true, message: "Siklus berhasil diperbarui", data });
};

// DELETE: siklus beserta semua fase dan perkiraannya
export const deleteSiklus = async (req, res) => {
  const userId = req.user.id;
  const id = parseId(req.params.id);

  const siklus = await prisma.siklus.findFirst({ where: { id, userId } });
  if (!siklus) throw notFound("Siklus tidak ditemukan");

  await prisma.$transaction([
    prisma.prediksiPanen.deleteMany({ where: { fase: { siklusId: id } } }),
    prisma.fase.deleteMany({ where: { siklusId: id } }),
    prisma.siklus.delete({ where: { id } }),
  ]);
  res.json({ success: true, message: "Siklus berhasil dihapus" });
};
