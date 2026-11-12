import express from "express";
import {
  getOpsiPrediksi,
  getPrediksiBySiklus,
  getTotalPrediksi,
  getWadahAktif,
  prediksiPenetasan,
} from "../controllers/prediksiController.js";

// Semua route dilindungi authMiddleware (dipasang di app.js)

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Prediksi (AI)
 *   description: |
 *     Hasil prediksi panen maggot dari model AI.
 *
 *     **Alur prediksi AI:**
 *     1. Android memanggil `POST /api/siklus/{siklusId}/fase` dengan `jenis: "PANEN"`,
 *        `jumlahTelur` (gram), dan `jumlahMakanan` (gram).
 *     2. Backend meneruskan data ke layanan AI (`POST {ML_BASE_URL}/api/predict/panen`) dengan body
 *        `MLRequest`, timeout 15 detik.
 *     3. Layanan AI membalas `MLResponse`.
 *     4. Backend menyimpan fase PANEN + `PrediksiPanen` sekaligus,
 *        lalu mengirim notifikasi "Prediksi Panen Berhasil".
 *
 *     Struktur `MLRequest`, `MLResponse`, dan `PrediksiPanen` ada di bagian **Schemas** paling bawah.
 *     5. Jika layanan AI mati / timeout / format respons salah → `503`,
 *        **tidak ada data yang tersimpan**, aplikasi boleh mencoba lagi.
 *
 *     Selain panen, tersedia juga prediksi **lama penetasan** (`POST /api/prediksi/penetasan`)
 *     dan daftar pilihan dropdown dari model (`GET /api/prediksi/opsi`).
 *
 *     Hasil prediksi bisa diambil lagi lewat endpoint di grup ini atau lewat
 *     `GET /api/siklus/{id}` (field `fase[].prediksiPanen`).
 */

/**
 * @swagger
 * /api/prediksi/siklus/{siklusId}:
 *   get:
 *     summary: Ambil semua hasil prediksi AI milik satu siklus
 *     tags: [Prediksi (AI)]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: siklusId
 *         required: true
 *         schema:
 *           type: integer
 *         example: 3
 *     responses:
 *       200:
 *         description: List prediksi (kosong jika siklus belum punya fase PANEN)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/PrediksiPanen'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.get("/siklus/:siklusId", getPrediksiBySiklus);

/**
 * @swagger
 * /api/prediksi/total:
 *   get:
 *     summary: Total hasil prediksi AI (kg & gram) dari semua siklus milik user
 *     tags: [Prediksi (AI)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total prediksi (semua 0 jika belum ada prediksi)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 totalKg:
 *                   type: number
 *                   description: Dibulatkan 3 desimal
 *                   example: 12.54
 *                 totalGram:
 *                   type: integer
 *                   description: Dibulatkan ke gram terdekat
 *                   example: 12540
 *                 jumlahPrediksi:
 *                   type: integer
 *                   example: 4
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/total", getTotalPrediksi);

/**
 * @swagger
 * /api/prediksi/wadah-aktif:
 *   get:
 *     summary: Jumlah wadah yang masih aktif
 *     description: |
 *       Wadah (= siklus) dihitung aktif selama **belum dipanen**, yaitu belum memiliki fase `PANEN`
 *       dengan tanggal hari ini atau sebelumnya. Fase PANEN bertanggal di masa depan (misalnya
 *       dikirim untuk meminta prediksi) tidak membuat wadah dianggap selesai.
 *     tags: [Prediksi (AI)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jumlah wadah aktif
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               wadahAktif: 2
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/wadah-aktif", getWadahAktif);

/**
 * @swagger
 * /api/prediksi/opsi:
 *   get:
 *     summary: Pilihan dropdown dari model AI (media telur, cuaca, musim) + info model
 *     description: |
 *       Pakai untuk mengisi dropdown di form prediksi penetasan dan pilihan media saat membuat siklus.
 *       Nilai diambil langsung dari model AI (di-cache 10 menit), jadi selalu sinkron.
 *     tags: [Prediksi (AI)]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Opsi dan info model
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 opsi:
 *                   mediaTelur: ["Ampas atau Limbah Organik Basah", "Campuran Media (Kombinasi Kering & Basah)", "Dedak atau Bekatul", "Kotoran Ternak (Fermentasi)"]
 *                   cuaca: [Clear, Clouds, Rain, Thunderstorm]
 *                   musim: [Hujan, Kemarau, Pancaroba]
 *                 model:
 *                   penetasan: { nama: Gradient Boosting Classifier, akurasi: "78.00%" }
 *                   panen: { nama: Random Forest, r2: "0.2994", mae: "802.98 gram", mape: "20.71%" }
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 */
router.get("/opsi", getOpsiPrediksi);

/**
 * @swagger
 * /api/prediksi/penetasan:
 *   post:
 *     summary: Prediksi lama penetasan telur (AI)
 *     description: |
 *       Hasil tidak disimpan ke database. Jika `siklusId` dikirim, `jumlahTelur` dan `mediaTelur`
 *       otomatis diambil dari siklus (boleh ditimpa), dan respons berisi `estimasiTanggalMenetas`.
 *       Nilai `mediaTelur`, `cuaca`, `musim` harus sesuai `GET /api/prediksi/opsi`.
 *     tags: [Prediksi (AI)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [suhu, kelembaban, suhuMaks, cuaca, musim]
 *             properties:
 *               siklusId:
 *                 type: integer
 *                 description: Opsional
 *                 example: 3
 *               jumlahTelur:
 *                 type: number
 *                 description: Gram telur (wajib jika tanpa siklusId)
 *                 example: 40
 *               mediaTelur:
 *                 type: string
 *                 description: Wajib jika tanpa siklusId
 *                 example: Dedak atau Bekatul
 *               suhu:
 *                 type: number
 *                 description: Suhu rata-rata °C (15-45)
 *                 example: 29
 *               kelembaban:
 *                 type: number
 *                 description: Kelembaban % (30-100)
 *                 example: 75
 *               suhuMaks:
 *                 type: number
 *                 description: Suhu maksimum °C, harus > suhu
 *                 example: 31
 *               cuaca:
 *                 type: string
 *                 example: Clear
 *               musim:
 *                 type: string
 *                 example: Kemarau
 *     responses:
 *       200:
 *         description: Hasil prediksi penetasan
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 lamaPenetasanHari: 4
 *                 confidence: 85.2
 *                 confidenceLabel: Tinggi
 *                 probabilitas: { "3_hari": 5.1, "4_hari": 85.2, "5_hari": 9.7 }
 *                 rekomendasi: ["Penetasan cepat! Kondisi sudah optimal."]
 *                 estimasiTanggalMenetas: "2025-11-17T00:00:00.000Z"
 *                 input: { jumlahTelur: 40, mediaTelur: Dedak atau Bekatul, suhu: 29, kelembaban: 75, suhuMaks: 31, cuaca: Clear, musim: Kemarau }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 */
router.post("/penetasan", prediksiPenetasan);

export default router;
