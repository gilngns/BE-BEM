import express from "express";
import { register, login, logout } from "../controllers/authController.js";
import { auth } from "../middleware/auth.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: API untuk autentikasi user RW
 */

/**
 * @swagger
 * components:
 *   securitySchemes:
 *     bearerAuth:
 *       type: http
 *       scheme: bearer
 *       bearerFormat: JWT
 */

/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register user baru (RW)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *               - rw
 *             properties:
 *               username:
 *                 type: string
 *                 example: rw4
 *               password:
 *                 type: string
 *                 example: 123456
 *               rw:
 *                 type: string
 *                 enum: [RW4, RW5]
 *                 example: RW4
 *     responses:
 *       200:
 *         description: Register berhasil
 *       400:
 *         description: Username sudah digunakan
 */

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login menggunakan username dan password
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - password
 *             properties:
 *               username:
 *                 type: string
 *                 example: rw4
 *               password:
 *                 type: string
 *                 example: 123456
 *     responses:
 *       200:
 *         description: Login berhasil
 *       400:
 *         description: Username / password salah
 */

/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout user (blacklist token)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Logout berhasil
 *         content:
 *           application/json:
 *             example:
 *               message: "Logout berhasil"
 *       400:
 *         description: Token tidak ada
 *       401:
 *         description: Token tidak valid atau sudah logout
 */

router.post("/register", register);
router.post("/login", login);
router.post("/logout", auth, logout);

export default router;