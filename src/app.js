import "dotenv/config"; // harus paling atas supaya env terbaca sebelum modul lain
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { swaggerUiServe, swaggerUiSetup } from "./swagger.js";
import authRoutes from "./routes/authRoutes.js";
import prediksiRoutes from "./routes/prediksiRoutes.js";
import pencacahanRoutes from "./routes/pencacahanRoutes.js";
import siklusRoutes from "./routes/siklusRoutes.js";
import faseRoutes from "./routes/faseRoutes.js";
import notifikasiRoutes from "./routes/notifikasiRoutes.js";
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
  app.use("/api-docs", swaggerUiServe, swaggerUiSetup);
}

app.use(helmet());
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// ---------- Rate limit ----------
const limiterOptions = {
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { success: false, message: "Terlalu banyak request, coba lagi nanti" },
};

// Global: 300 request / menit / IP
app.use("/api", rateLimit({ ...limiterOptions, windowMs: 60 * 1000, limit: 300 }));

// Login: 10 percobaan GAGAL / 15 menit / IP (login sukses tidak dihitung)
const loginLimiter = rateLimit({
  ...limiterOptions,
  windowMs: 15 * 60 * 1000,
  limit: 10,
  skipSuccessfulRequests: true,
  message: { success: false, message: "Terlalu banyak percobaan login, coba lagi 15 menit lagi" },
});
// Register: 10 akun / jam / IP
const registerLimiter = rateLimit({ ...limiterOptions, windowMs: 60 * 60 * 1000, limit: 10 });

app.use("/api/auth/login", loginLimiter);
app.use("/api/auth/register", registerLimiter);

// ---------- Routes ----------
app.get("/", (req, res) => res.json({ success: true, message: "Maggot BEM API" }));
app.get("/health", (req, res) => res.json({ success: true, status: "ok" }));

app.use("/api/auth", authRoutes);
app.use("/api/prediksi", authMiddleware, prediksiRoutes);
app.use("/api/pencacahan", authMiddleware, pencacahanRoutes);
app.use("/api/siklus", authMiddleware, siklusRoutes, faseRoutes);
app.use("/api/notifikasi", authMiddleware, notifikasiRoutes);

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
