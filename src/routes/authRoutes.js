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

import express from "express";
import { register, login } from "../controllers/authController.js";

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/logout", auth, logout);


export default router;
