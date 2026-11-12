import express from "express";
import { chat, tanya } from "../controllers/chatbotController.js";

// Semua route dilindungi authMiddleware + rate limit per user (dipasang di app.js)
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Chatbot (AI)
 *   description: |
 *     Asisten tanya-jawab budidaya maggot BSF (RAG dari dokumen bahan ajar), menjawab dalam Bahasa Indonesia.
 *     Backend meneruskan ke layanan chatbot AI. Jawaban bisa butuh beberapa detik (maks ±60 detik),
 *     tampilkan indikator "mengetik..." di aplikasi. Dibatasi 20 pertanyaan / menit / user.
 */

/**
 * @swagger
 * /api/chatbot/tanya:
 *   post:
 *     summary: Tanya sekali (tanpa riwayat)
 *     tags: [Chatbot (AI)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [pertanyaan]
 *             properties:
 *               pertanyaan:
 *                 type: string
 *                 maxLength: 2000
 *                 example: Berapa suhu ideal untuk penetasan telur maggot?
 *     responses:
 *       200:
 *         description: Jawaban chatbot
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 jawaban: Suhu ideal penetasan telur BSF adalah 27-30°C dengan kelembaban 70-80%...
 *                 sumber:
 *                   - { dokumen: 2._Bahan_Ajar_Budidaya_Maggot_Black_Soldier_Fly_BSF.pdf, cuplikan: "Telur BSF menetas dalam 3-4 hari pada suhu 27-30°C...", kemiripan: 0.82 }
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 */
router.post("/tanya", tanya);

/**
 * @swagger
 * /api/chatbot/chat:
 *   post:
 *     summary: Chat dengan riwayat percakapan (multi-turn)
 *     description: |
 *       Kirim seluruh riwayat percakapan (maks 20 pesan terakhir dipakai).
 *       Pesan terakhir harus `role: user`. Simpan riwayat di aplikasi.
 *     tags: [Chatbot (AI)]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [messages]
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required: [role, content]
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [user, assistant]
 *                     content:
 *                       type: string
 *                       maxLength: 2000
 *           example:
 *             messages:
 *               - { role: user, content: Apa makanan terbaik untuk maggot? }
 *               - { role: assistant, content: Maggot BSF bisa diberi sampah organik seperti sisa sayur dan buah... }
 *               - { role: user, content: Berapa banyak per hari? }
 *     responses:
 *       200:
 *         description: Jawaban chatbot (format sama dengan /tanya)
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       429:
 *         $ref: '#/components/responses/TooManyRequests'
 *       503:
 *         $ref: '#/components/responses/ServiceUnavailable'
 */
router.post("/chat", chat);

export default router;
