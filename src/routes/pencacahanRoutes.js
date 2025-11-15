/**
 * @swagger
 * tags:
 *   name: Pencacahan
 *   description: API untuk mencatat histori pencacahan maggot
 */

/**
 * @swagger
 * /api/pencacahan:
 *   post:
 *     summary: Buat data pencacahan
 *     tags: [Pencacahan]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tanggalWaktu:
 *                 type: string
 *                 example: "2025-11-14T10:00:00Z"
 *               totalSampah:
 *                 type: number
 *                 example: 12.5
 *               catatan:
 *                 type: string
 *                 example: "Sampah organik RW 4"
 *     responses:
 *       200:
 *         description: Data pencacahan berhasil dibuat
 */

/**
 * @swagger
 * /api/pencacahan:
 *   get:
 *     summary: Ambil semua pencacahan
 *     tags: [Pencacahan]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Berhasil mengambil data
 */

/**
 * @swagger
 * /api/pencacahan/{id}:
 *   get:
 *     summary: Ambil pencacahan berdasarkan ID
 *     tags: [Pencacahan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Data ditemukan
 *       404:
 *         description: Data tidak ditemukan
 */

/**
 * @swagger
 * /api/pencacahan/{id}:
 *   put:
 *     summary: Update pencacahan berdasarkan ID
 *     tags: [Pencacahan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               totalSampah:
 *                 type: number
 *                 example: 18.3
 *               catatan:
 *                 type: string
 *                 example: "update catatan"
 *     responses:
 *       200:
 *         description: Data berhasil diupdate
 *       404:
 *         description: Data tidak ditemukan
 */

/**
 * @swagger
 * /api/pencacahan/{id}:
 *   delete:
 *     summary: Hapus pencacahan berdasarkan ID
 *     tags: [Pencacahan]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *         example: 1
 *     responses:
 *       200:
 *         description: Data berhasil dihapus
 *       404:
 *         description: Data tidak ditemukan
 */


import { Router } from "express";
import {
  createPencacahan,
  getAllPencacahan,
  getPencacahanById,
  updatePencacahan,
  deletePencacahan,
} from "../controllers/pencacahanController.js";
import { authMiddleware } from "../authMiddleware.js";

const router = Router();

router.post("/", authMiddleware, createPencacahan);
router.get("/", getAllPencacahan);
router.get("/:id", getPencacahanById);
router.put("/:id", updatePencacahan);
router.delete("/:id", deletePencacahan);

export default router;