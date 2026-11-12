import express from "express";
import { register, login, logout, me } from "../controllers/authController.js";
import { authMiddleware } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API untuk autentikasi user RW
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register user baru (RW)
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password, rw]
 *             properties:
 *               username:
 *                 type: string
 *                 description: 3-30 karakter (huruf, angka, titik, underscore, strip)
 *                 example: rw4
 *               password:
 *                 type: string
 *                 description: 6-72 karakter
 *                 example: "123456"
 *               rw:
 *                 type: string
 *                 enum: [RW4, RW5]
 *                 example: RW4
 *     responses:
 *       200:
 *         description: Register berhasil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Register berhasil
 *               user: { id: 1, username: rw4, rw: RW4, createdAt: "2025-11-14T10:00:00.000Z" }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login menggunakan username dan password
 *     tags: [Auth]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, password]
 *             properties:
 *               username:
 *                 type: string
 *                 example: rw4
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Login berhasil. Simpan `token`, kirim di header `Authorization Bearer <token>`.
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Login berhasil
 *               token: eyJhbGciOiJIUzI1NiIs...
 *               expiresIn: 7d
 *               user: { id: 1, username: rw4, rw: RW4 }
 *       400:
 *         description: Username atau password salah / tidak diisi
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 */

/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Ambil data user yang sedang login (cek token masih valid)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Data user
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               user: { id: 1, username: rw4, rw: RW4, createdAt: "2025-11-14T10:00:00.000Z" }
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (token di-blacklist, tidak bisa dipakai lagi)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout berhasil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               message: Logout berhasil
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 */

router.post("/register", register);
router.post("/login", login);
router.get("/me", authMiddleware, me);
router.post("/logout", authMiddleware, logout);

export default router;
