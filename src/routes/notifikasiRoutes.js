import express from "express";
import {
  getNotifikasi,
  readNotifikasi,
  deleteNotifikasi
} from "../controllers/notifikasiController.js";

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
 *     summary: Ambil semua notifikasi user
 *     tags: [Notifikasi]
 */
router.get("/", getNotifikasi);

/**
 * @swagger
 * /api/notifikasi/{id}/read:
 *   patch:
 *     summary: Tandai notifikasi sebagai sudah dibaca
 *     tags: [Notifikasi]
 */
router.patch("/:id/read", readNotifikasi);

/**
 * @swagger
 * /api/notifikasi/{id}:
 *   delete:
 *     summary: Hapus notifikasi
 *     tags: [Notifikasi]
 */
router.delete("/:id", deleteNotifikasi);

export default router;