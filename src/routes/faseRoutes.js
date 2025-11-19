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
 *     summary: Menambahkan fase baru pada siklus
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
 *                 example: 40
 *               jumlahMakanan:
 *                 type: number
 *                 example: 20000
 *               keterangan:
 *                 type: string
 *                 example: "Siap panen"
 *     responses:
 *       200:
 *         description: Fase berhasil ditambahkan
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
 *         description: Daftar fase berhasil diambil
 */

router.post("/:siklusId/fase", tambahFase);
router.get("/:siklusId/fase", getFase);

export default router;