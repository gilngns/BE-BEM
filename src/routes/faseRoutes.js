import express from "express";
import { tambahFase, getFase } from "../controllers/faseController.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Fase
 *   description: API untuk pengelolaan fase penetasan, pembesaran, dan panen
 */

/**
 * @swagger
 * /api/siklus/{siklusId}/fase:
 *   post:
 *     summary: Menambahkan fase baru pada siklus (PANEN = memicu prediksi AI)
 *     description: |
 *       Untuk `jenis: PANEN`, backend memanggil layanan AI dan menyimpan hasil
 *       prediksinya. Lihat alur lengkap di grup **Prediksi (AI)**.
 *       Request PANEN bisa butuh beberapa detik (maks ±15 detik) — tampilkan loading di aplikasi.
 *     tags: [Fase]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: siklusId
 *         in: path
 *         required: true
 *         description: ID siklus
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - jenis
 *               - tanggal
 *             properties:
 *               jenis:
 *                 type: string
 *                 enum: [PENETASAN, PEMBESARAN, PANEN]
 *                 example: PANEN
 *               tanggal:
 *                 type: string
 *                 example: "2025-11-13"
 *               jumlahTelur:
 *                 type: integer
 *                 description: Gram telur. WAJIB (>= 1) jika jenis = PANEN
 *                 example: 40
 *               jumlahMakanan:
 *                 type: number
 *                 description: Gram makanan. WAJIB (>= 1) jika jenis = PANEN
 *                 example: 20000
 *               keterangan:
 *                 type: string
 *                 example: "Siap panen"
 *           examples:
 *             panen:
 *               summary: PANEN (memicu prediksi AI)
 *               value: { jenis: PANEN, tanggal: "2025-11-20", jumlahTelur: 40, jumlahMakanan: 20000, keterangan: "Siap panen" }
 *             pembesaran:
 *               summary: PEMBESARAN
 *               value: { jenis: PEMBESARAN, tanggal: "2025-11-15", keterangan: "Mulai pembesaran" }
 *             penetasan:
 *               summary: PENETASAN
 *               value: { jenis: PENETASAN, tanggal: "2025-11-13", jumlahTelur: 40 }
 *     responses:
 *       200:
 *         description: |
 *           Fase berhasil ditambahkan.
 *           - PENETASAN/PEMBESARAN → `data` = object Fase
 *           - PANEN → `data` = `{ fase, prediksiPanen }`
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   oneOf:
 *                     - $ref: '#/components/schemas/Fase'
 *                     - type: object
 *                       properties:
 *                         fase:
 *                           $ref: '#/components/schemas/Fase'
 *                         prediksiPanen:
 *                           $ref: '#/components/schemas/PrediksiPanen'
 *             examples:
 *               panen:
 *                 summary: Respons PANEN
 *                 value:
 *                   success: true
 *                   data:
 *                     fase: { id: 12, jenis: PANEN, tanggal: "2025-11-20T00:00:00.000Z", jumlahTelur: 40, jumlahMakanan: 20000, keterangan: "Siap panen", createdAt: "2025-11-20T08:00:00.000Z", siklusId: 3 }
 *                     prediksiPanen: { id: 7, hasilGram: 3768.01, hasilKg: 3.768, conversionRate: 18.84, conversionLabel: "Cukup", roiEstimate: 41.3, estimatedValue: 56520, feedCost: 40000, rekomendasi: [], createdAt: "2025-11-20T08:00:00.000Z", faseId: 12 }
 *               pembesaran:
 *                 summary: Respons PEMBESARAN
 *                 value:
 *                   success: true
 *                   data: { id: 11, jenis: PEMBESARAN, tanggal: "2025-11-15T00:00:00.000Z", jumlahTelur: null, jumlahMakanan: null, keterangan: "Mulai pembesaran", createdAt: "2025-11-15T08:00:00.000Z", siklusId: 3 }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 */

/**
 * @swagger
 * /api/siklus/{siklusId}/fase:
 *   get:
 *     summary: Mengambil semua fase pada siklus (termasuk prediksi panen)
 *     tags: [Fase]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: siklusId
 *         in: path
 *         required: true
 *         description: ID siklus
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Daftar fase urut tanggal (lama → baru)
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
 *                     $ref: '#/components/schemas/FaseDenganPrediksi'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */

router.post("/:siklusId/fase", tambahFase);
router.get("/:siklusId/fase", getFase);

export default router;