import express from "express";
import { createSiklus, deleteSiklus, getAllSiklus, getDetailSiklus, updateSiklus } from "../controllers/siklusController.js";

// Semua route di sini sudah dilindungi authMiddleware (dipasang di app.js)

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
 *                 type: number
 *                 description: Gram telur, boleh desimal (> 0), misal 0.5
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



/**
 * @swagger
 * /api/siklus/{id}:
 *   put:
 *     summary: Mengubah data siklus (hanya field yang dikirim)
 *     description: >
 *       Bila `jumlahTelur` berubah, fase PENETASAN ikut disesuaikan dan perkiraan panen
 *       (fase PANEN) dihitung ulang. Bila layanan AI gagal, tidak ada data yang berubah (503).
 *     tags: [Siklus]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: id
 *         in: path
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tanggalMulai:
 *                 type: string
 *                 example: "2025-11-13"
 *               jumlahTelur:
 *                 type: number
 *                 description: Gram telur, boleh desimal (> 0)
 *                 example: 0.5
 *               mediaTelur:
 *                 type: string
 *                 example: "Serbuk Kelapa"
 *               catatan:
 *                 type: string
 *                 nullable: true
 *     responses:
 *       200:
 *         description: Siklus diperbarui
 *       400:
 *         description: Data tidak valid / tidak ada yang diubah
 *       404:
 *         description: Siklus tidak ditemukan
 *   delete:
 *     summary: Menghapus siklus beserta semua fase dan perkiraannya
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
 *         description: Siklus dihapus
 *       404:
 *         description: Siklus tidak ditemukan
 */

router.post("/", createSiklus);
router.get("/", getAllSiklus);
router.get("/:id", getDetailSiklus);
router.put("/:id", updateSiklus);
router.delete("/:id", deleteSiklus);

export default router;