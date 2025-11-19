import express from "express";
import { 
  getPrediksiBySiklus, 
  getTotalPrediksi 
} from "../controllers/prediksiController.js";
import { getWadahAktif } from "../controllers/prediksiController.js";
import { authMiddleware } from "../authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Prediksi
 *   description: API untuk hasil prediksi panen maggot
 */

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


/**
 * @swagger
 * /api/prediksi/total:
 *   get:
 *     summary: Mengambil total hasil prediksi (KG & Gram) dari semua siklus milik user
 *     tags: [Prediksi]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Total prediksi berhasil dihitung
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
 *                   example: 12.54
 *                 totalGram:
 *                   type: number
 *                   example: 12540
 *                 jumlahPrediksi:
 *                   type: integer
 *                   example: 4
 */
/**
 * @swagger
 * /api/prediksi/wadah-aktif:
 *   get:
 *     summary: Mengambil jumlah wadah yang masih aktif (fase terakhir = PENDEWASAAN)
 *     tags: [Prediksi]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Jumlah wadah aktif berhasil dihitung
 */
router.get("/wadah-aktif", authMiddleware, getWadahAktif);
router.get("/total", authMiddleware, getTotalPrediksi);

export default router;
