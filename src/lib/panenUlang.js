import prisma from "./prisma.js";
import { predictPanen } from "./aiClient.js";

/**
 * Hitung ulang perkiraan panen untuk fase PANEN yang datanya berubah.
 * Perkiraan bergantung pada berat telur (gram) dan pakan (gram), jadi bila salah satunya
 * diubah, angka lama tidak berlaku lagi.
 *
 * AI dipanggil SEBELUM database diubah: kalau layanan AI gagal, request ditolak dan
 * tidak ada data yang berubah.
 *
 * @param panenList fase PANEN (boleh berisi prediksiPanen)
 * @param ubah nilai baru: { jumlahTelur?, jumlahMakanan?, tanggal?, keterangan? }
 * @param telurCadangan berat telur siklus, dipakai bila fase PANEN tidak menyimpannya
 * @returns operasi Prisma untuk dijalankan di dalam $transaction
 */
export async function siapkanPanenUlang(panenList, ubah, telurCadangan) {
  const hasil = [];
  for (const fase of panenList) {
    const jumlahTelur = ubah.jumlahTelur ?? fase.jumlahTelur ?? telurCadangan;
    const jumlahMakanan = ubah.jumlahMakanan ?? fase.jumlahMakanan;
    const data = { jumlahTelur, jumlahMakanan };
    if (ubah.tanggal !== undefined) data.tanggal = ubah.tanggal;
    if (ubah.keterangan !== undefined) data.keterangan = ubah.keterangan;

    const hitung = jumlahTelur > 0 && jumlahMakanan > 0;
    const prediksi = hitung ? await predictPanen(jumlahTelur, jumlahMakanan) : null;
    if (prediksi) data.prediksiPanen = { upsert: { create: prediksi, update: prediksi } };
    hasil.push({ faseId: fase.id, data });
  }
  return hasil.map(({ faseId, data }) => prisma.fase.update({ where: { id: faseId }, data }));
}
