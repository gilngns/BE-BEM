import express from "express";
import { getPrediksiBySiklus } from "../controllers/prediksiController.js";
import { authMiddleware } from "../authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * /api/prediksi/siklus/{siklusId}:
 *   get:
 *     summary: Ambil semua hasil prediksi milik satu siklus
 *     tags: [Prediksi]
 *     parameters:
 *       - in: path
 *         name: siklusId
 *         required: true
 *         schema:
 *           type: integer
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List prediksi berhasil diambil
 */
router.get("/siklus/:siklusId", authMiddleware, getPrediksiBySiklus);

export default router;
