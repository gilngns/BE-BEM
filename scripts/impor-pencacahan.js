// Impor data sampah terkumpul dari laporan mingguan GASLAH (Excel kecamatan) ke tabel pencacahan.
//
// Pakai:
//   node scripts/impor-pencacahan.js deploy/impor/gaslah-mengger-okt-nov-2026.json            (pratinjau, tidak menulis)
//   node scripts/impor-pencacahan.js deploy/impor/gaslah-mengger-okt-nov-2026.json --jalankan (simpan ke database)
//
// Setiap RW memakai akun "laporan.gaslah.rwN" (dibuat otomatis, password acak, tidak dipakai login),
// supaya data impor terpisah dari catatan petugas dan tidak muncul di riwayat HP petugas.
// Aman dijalankan ulang: catatan dengan akun + waktu yang sama dilewati.
import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readFileSync } from "node:fs";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

const [file, flag] = process.argv.slice(2);
const jalankan = flag === "--jalankan";
if (!file) {
  console.error("Pakai: node scripts/impor-pencacahan.js <file.json> [--jalankan]");
  process.exit(1);
}

const RW_LIST = ["RW1", "RW2", "RW3", "RW4", "RW5"];
const data = JSON.parse(readFileSync(file, "utf8"));
const catatan = Array.isArray(data.catatan) ? data.catatan : [];

// Validasi dulu semua baris; satu baris salah = tidak ada yang disimpan.
const salah = catatan.filter((c) => !/^\d{4}-\d{2}-\d{2}$/.test(c.tanggal) || !RW_LIST.includes(c.rw) || !(Number(c.kg) > 0));
if (!catatan.length || salah.length) {
  console.error(catatan.length ? `Ada ${salah.length} baris tidak valid, contoh: ${JSON.stringify(salah[0])}` : "File tidak berisi catatan.");
  process.exit(1);
}

// Jam 12.00 WIB pada tanggal laporan (laporan hanya mencatat tanggal, bukan jam).
const waktu = (ymd) => new Date(`${ymd}T12:00:00+07:00`);
const username = (rw) => `laporan.gaslah.${rw.toLowerCase()}`;

const prisma = new PrismaClient();
try {
  const akun = {};
  for (const rw of RW_LIST) {
    const u = await prisma.user.findUnique({ where: { username: username(rw) } });
    if (u) akun[rw] = u;
    else if (jalankan) {
      const password = await bcrypt.hash(randomBytes(24).toString("hex"), 10);
      akun[rw] = await prisma.user.create({ data: { username: username(rw), password, rw } });
      console.log(`Akun dibuat: ${username(rw)}`);
    }
  }

  let baru = 0, lewat = 0, kg = 0;
  const perRw = Object.fromEntries(RW_LIST.map((rw) => [rw, 0]));
  for (const c of catatan) {
    const user = akun[c.rw];
    const tanggalWaktu = waktu(c.tanggal);
    if (user && (await prisma.pencacahan.findFirst({ where: { userId: user.id, tanggalWaktu }, select: { id: true } }))) {
      lewat++;
      continue;
    }
    if (jalankan) {
      await prisma.pencacahan.create({
        data: { userId: user.id, tanggalWaktu, totalSampah: Number(c.kg), catatan: `Impor laporan GASLAH ${c.sumber ?? ""}`.trim() },
      });
    }
    baru++; kg += Number(c.kg); perRw[c.rw]++;
  }

  const tanggal = catatan.map((c) => c.tanggal).sort();
  console.log(`${jalankan ? "Disimpan" : "Pratinjau (belum disimpan)"}: ${baru} catatan baru, ${Math.round(kg * 100) / 100} kg, ${tanggal[0]} s/d ${tanggal.at(-1)}`);
  console.log(`Per RW: ${Object.entries(perRw).map(([rw, n]) => `${rw} ${n}`).join(", ")}`);
  if (lewat) console.log(`Dilewati karena sudah ada: ${lewat}`);
  if (!jalankan) console.log("Tambahkan --jalankan untuk menyimpan.");
} finally {
  await prisma.$disconnect();
}
