import express from "express";
import { createSiklus, getAllSiklus, getDetailSiklus, getPrediksiBySiklus } from "../controllers/siklusController.js";
import { authMiddleware } from "../authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Siklus
 *   description: API untuk manajemen siklus budidaya maggot
 */

/**
 * @swagger
 * /api/siklus:
 *   post:
 *     summary: Membuat siklus baru
 *     tags: [Siklus]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - tanggalMulai
 *               - jumlahTelur
 *               - mediaTelur
 *             properties:
 *               tanggalMulai:
 *                 type: string
 *                 example: "2025-11-13"
 *               jumlahTelur:
 *                 type: integer
 *                 example: 40
 *               mediaTelur:
 *                 type: string
 *                 example: "Serbuk Kelapa"
 *               catatan:
 *                 type: string
 *                 example: "Siklus pertama saya"
 *     responses:
 *       200:
 *         description: Berhasil membuat siklus
 */

/**
 * @swagger
 * /api/siklus:
 *   get:
 *     summary: Mendapatkan semua siklus user
 *     tags: [Siklus]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil daftar siklus
 */

/**
 * @swagger
 * /api/siklus/{id}:
 *   get:
 *     summary: Mendapatkan detail siklus beserta semua fase
 *     tags: [Siklus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Detail siklus ditemukan
 */



router.post("/", createSiklus);
router.get("/", getAllSiklus);
router.get("/:id", getDetailSiklus);

export default router;