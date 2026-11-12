import express from "express";
import {
  getNotifikasi,
  readNotifikasi,
  deleteNotifikasi,
} from "../controllers/notifikasiController.js";

// Semua route dilindungi authMiddleware (dipasang di app.js)
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifikasi
 *   description: API notifikasi untuk pengguna
 */

/**
 * @swagger
 * /api/notifikasi:
 *   get:
 *     summary: Ambil notifikasi user (terbaru dulu, maks 200)
 *     tags: [Notifikasi]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Daftar notifikasi
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: 1
 *                   userId: 1
 *                   title: Siklus Baru Dibuat
 *                   message: Siklus baru dimulai dengan 40 telur.
 *                   type: success
 *                   isRead: false
 *                   createdAt: "2025-11-14T10:00:00.000Z"
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */
router.get("/", getNotifikasi);

/**
 * @swagger
 * /api/notifikasi/{id}/read:
 *   patch:
 *     summary: Tandai notifikasi sebagai sudah dibaca
 *     tags: [Notifikasi]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Berhasil
 *         content:
 *           application/json:
 *             example: { success: true, updated: 1 }
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.patch("/:id/read", readNotifikasi);

/**
 * @swagger
 * /api/notifikasi/{id}:
 *   delete:
 *     summary: Hapus notifikasi
 *     tags: [Notifikasi]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Notifikasi dihapus
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
router.delete("/:id", deleteNotifikasi);

export default router;
