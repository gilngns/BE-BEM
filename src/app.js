import "dotenv/config"; // harus paling atas supaya env terbaca sebelum modul lain
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { swaggerSpec, swaggerUiServe, swaggerUiSetup } from "./swagger.js";
import authRoutes from "./routes/authRoutes.js";
import prediksiRoutes from "./routes/prediksiRoutes.js";
import pencacahanRoutes from "./routes/pencacahanRoutes.js";
import siklusRoutes from "./routes/siklusRoutes.js";
import faseRoutes from "./routes/faseRoutes.js";
import notifikasiRoutes from "./routes/notifikasiRoutes.js";
import chatbotRoutes from "./routes/chatbotRoutes.js";
import { authMiddleware } from "./middleware/auth.js";
import { HttpError } from "./lib/validate.js";

const app = express();

// Di belakang reverse proxy (nginx, dll) supaya req.ip = IP asli client.
// Isi TRUST_PROXY=1 kalau server di belakang 1 proxy.
if (process.env.TRUST_PROXY) {
  const v = process.env.TRUST_PROXY;
  app.set("trust proxy", /^\d+$/.test(v) ? Number(v) : v);
}
app.disable("x-powered-by");

// ---------- CORS ----------
// Aplikasi Android (native) tidak terpengaruh CORS.
// CORS_ORIGIN diisi daftar origin web yang boleh akses, dipisah koma.
const corsOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
app.use(cors(corsOrigins.length ? { origin: corsOrigins } : undefined));

// ---------- Swagger ----------
// Dipasang sebelum helmet karena Swagger UI butuh CSP yang lebih longgar.
if (process.env.DISABLE_SWAGGER !== "true") {
  // Spec mentah (OpenAPI JSON) untuk import ke Postman / generator client Android
  app.get("/api-docs.json", (req, res) => res.json(swaggerSpec));
  app.use("/api-docs", swaggerUiServe, swaggerUiSetup);
}

app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// ---------- Rate limit ----------
// Saat demo/sosialisasi, puluhan HP warga biasanya memakai wifi yang sama, jadi
// terlihat dari SATU IP. Batas per IP harus longgar; batas ketat dipasang per akun.
// Semua angka bisa diubah lewat .env tanpa mengubah kode.
const envLimit = (name, fallback) => {
  const n = Number(process.env[name]);
  return Number.isInteger(n) && n > 0 ? n : fallback;
};
const loginUsername = (req) =>
  typeof req.body?.username === "string" ? req.body.username.trim().toLowerCase() : "";

const limiterOptions = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Terlalu banyak request, coba lagi nanti" },
};

// Global: 3000 request / menit / IP (±50 HP aktif di satu wifi)
app.use("/api", rateLimit({ ...limiterOptions, windowMs: 60 * 1000, limit: envLimit("RATE_LIMIT_GLOBAL_PER_MIN", 3000) }));

// Login per akun: 10 percobaan GAGAL / 15 menit untuk username yang sama dari IP yang sama.
// Salah ketik satu warga tidak lagi memblokir warga lain di wifi yang sama.
const loginAccountLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  limit: envLimit("RATE_LIMIT_LOGIN_FAIL_PER_ACCOUNT", 10),
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `login:${req.ip}:${loginUsername(req)}`,
  message: { success: false, message: "Terlalu banyak percobaan login untuk akun ini, coba lagi 15 menit lagi" },
});
// Login per IP: rem untuk brute force ke banyak username sekaligus (login sukses tidak dihitung)
const loginIpLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  limit: envLimit("RATE_LIMIT_LOGIN_FAIL_PER_IP", 300),
  skipSuccessfulRequests: true,
  message: { success: false, message: "Terlalu banyak percobaan login, coba lagi 15 menit lagi" },
});
// Register: 300 akun / jam / IP (cukup untuk registrasi massal saat demo)
const registerLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 60 * 60 * 1000,
  limit: envLimit("RATE_LIMIT_REGISTER_PER_HOUR", 300),
  message: { success: false, message: "Terlalu banyak registrasi dari jaringan ini, coba lagi nanti" },
});

app.use("/api/auth/login", loginIpLimiter, loginAccountLimiter);
app.use("/api/auth/register", registerLimiter);

// ---------- Routes ----------
app.get("/", (req, res) => res.json({ success: true, message: "Maggot BEM API" }));
app.get("/health", (req, res) => res.json({ success: true, status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/prediksi", authMiddleware, prediksiRoutes);
app.use("/api/pencacahan", authMiddleware, pencacahanRoutes);
app.use("/api/siklus", authMiddleware, siklusRoutes, faseRoutes);
app.use("/api/notifikasi", authMiddleware, notifikasiRoutes);

// Chatbot AI: 20 pertanyaan / menit / sesi login (memanggil LLM berbayar).
// Per sesi (bukan per user) supaya beberapa orang yang memakai akun bersama tidak berbagi kuota.
const chatbotLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 60 * 1000,
  limit: envLimit("RATE_LIMIT_CHATBOT_PER_MIN", 20),
  keyGenerator: (req) => `session:${req.sessionId}`,
  message: { success: false, message: "Terlalu banyak pertanyaan, tunggu sebentar lalu coba lagi" },
});
app.use("/api/chatbot", authMiddleware, chatbotLimiter, chatbotRoutes);

// ---------- 404 ----------
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Endpoint ${req.method} ${req.path} tidak ditemukan` });
});

// ---------- Error handler global ----------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ success: false, message: err.message });
  }
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ success: false, message: "Format JSON tidak valid" });
  }
  if (err.type === "entity.too.large") {
    return res.status(413).json({ success: false, message: "Ukuran body terlalu besar" });
  }
  if (err.code === "P2025") {
    return res.status(404).json({ success: false, message: "Data tidak ditemukan" });
  }
  if (err.code === "P2002") {
    return res.status(409).json({ success: false, message: "Data sudah ada" });
  }

  console.error(`[${req.method} ${req.originalUrl}]`, err);
  res.status(500).json({ success: false, message: "Internal server error" });
});

export default app;
