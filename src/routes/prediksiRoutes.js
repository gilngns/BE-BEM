import { Router } from "express";
import {
  createPencacahan,
  getAllPencacahan,
  getPencacahanById,
  updatePencacahan,
  deletePencacahan,
} from "../controllers/pencacahanController.js";
import { getPrediksiBySiklus } from "../controllers/siklusController.js";
import { authMiddleware } from "../authMiddleware.js";

const router = Router();
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
router.post("/", createPencacahan);
router.get("/", getAllPencacahan);
router.get("/:id", getPencacahanById);
router.put("/:id", updatePencacahan);
router.delete("/:id", deletePencacahan);

export default router;