import app from "./app.js";
import prisma from "./lib/prisma.js";

// ---------- Cek konfigurasi wajib sebelum server jalan ----------
const missing = ["DATABASE_URL", "JWT_SECRET"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Env wajib belum diisi: ${missing.join(", ")} (lihat .env.example)`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn("⚠️  JWT_SECRET terlalu pendek, gunakan minimal 32 karakter acak");
}
if (!process.env.ML_API_URL && !process.env.AI_API_URL) {
  console.warn("⚠️  ML_API_URL belum diisi, fitur prediksi panen tidak akan jalan");
}

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// ---------- Graceful shutdown ----------
const shutdown = (signal) => {
  console.log(`${signal} diterima, mematikan server...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000).unref();
};
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
