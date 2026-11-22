import { timingSafeEqual } from "node:crypto";
import prisma from "../lib/prisma.js";
import { badRequest, HttpError, parseEnum } from "../lib/validate.js";

// Data sampah masuk SEMUA RW untuk web admin kelurahan.
// Dipanggil antar-server (server web admin -> backend), bukan dari browser atau Android,
// jadi dilindungi kunci rahasia MONITORING_API_KEY, bukan JWT akun warga.

const RW_LIST = ["RW4", "RW5"];
const MAKS_HARI = 366;
const WIB = "+07:00";

function kunciCocok(dikirim, rahasia) {
  const a = Buffer.from(String(dikirim ?? ""));
  const b = Buffer.from(rahasia);
  return a.length === b.length && timingSafeEqual(a, b);
}

export const requireMonitoringKey = (req, res, next) => {
  const rahasia = process.env.MONITORING_API_KEY;
  // Tanpa kunci di .env, endpoint dianggap tidak ada (aman secara bawaan).
  if (!rahasia || rahasia.length < 32) throw new HttpError(404, `Endpoint ${req.method} ${req.originalUrl} tidak ditemukan`);
  if (!kunciCocok(req.get("x-monitoring-key"), rahasia)) throw new HttpError(401, "Kunci monitoring tidak valid");
  next();
};

/** "2026-11-01" -> awal hari itu (WIB). akhir=true -> awal hari berikutnya (batas eksklusif). */
function tanggalWib(value, name, akhir = false) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw badRequest(`${name} wajib format YYYY-MM-DD`);
  }
  const d = new Date(`${value}T00:00:00${WIB}`);
  if (Number.isNaN(d.getTime())) throw badRequest(`${name} tidak valid`);
  return akhir ? new Date(d.getTime() + 24 * 60 * 60 * 1000) : d;
}

// GET /api/monitoring/sampah?dari=2026-11-01&sampai=2026-11-30&rw=RW4
export const getSampahMasuk = async (req, res) => {
  const dari = tanggalWib(req.query.dari, "dari");
  const sebelum = tanggalWib(req.query.sampai, "sampai", true);
  if (sebelum <= dari) throw badRequest("sampai tidak boleh sebelum dari");
  if ((sebelum - dari) / 86_400_000 > MAKS_HARI) throw badRequest(`Rentang maksimal ${MAKS_HARI} hari`);
  const rw = parseEnum(req.query.rw, "rw", RW_LIST, { optional: true }) ?? undefined;

  const baris = await prisma.pencacahan.findMany({
    where: {
      tanggalWaktu: { gte: dari, lt: sebelum },
      ...(rw ? { user: { rw } } : {}),
    },
    orderBy: [{ tanggalWaktu: "asc" }, { id: "asc" }],
    select: {
      id: true,
      tanggalWaktu: true,
      totalSampah: true,
      catatan: true,
      user: { select: { username: true, rw: true } },
    },
  });

  res.set("Cache-Control", "no-store").json({
    success: true,
    data: baris.map((b) => ({
      id: b.id,
      tanggalWaktu: b.tanggalWaktu,
      totalSampahKg: b.totalSampah,
      catatan: b.catatan,
      rw: b.user?.rw ?? null,
      petugas: b.user?.username ?? null,
    })),
  });
};
