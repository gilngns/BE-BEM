import app from "./app.js";
import prisma from "./lib/prisma.js";
import { getChatbotBaseUrl, getMlBaseUrl } from "./lib/aiClient.js";

// ---------- Cek konfigurasi wajib sebelum server jalan ----------
const missing = ["DATABASE_URL", "JWT_SECRET"].filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`❌ Env wajib belum diisi: ${missing.join(", ")} (lihat .env.example)`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 32) {
  console.warn("⚠️  JWT_SECRET terlalu pendek, gunakan minimal 32 karakter acak");
}
if (!process.env.TRUST_PROXY) {
  console.warn(
    "⚠️  TRUST_PROXY belum diisi. Jika server di belakang nginx/cloudflare, semua pengguna akan " +
      "terlihat dari 1 IP dan berbagi kuota rate limit. Isi TRUST_PROXY=1 (lihat .env.example)."
  );
}
const mlBase = getMlBaseUrl();
if (!mlBase) console.warn("⚠️  ML_BASE_URL belum diisi / tidak valid, fitur prediksi AI tidak akan jalan");
else console.log(`🤖 Layanan prediksi AI: ${mlBase}`);
const chatbotBase = getChatbotBaseUrl();
if (!chatbotBase) console.warn("⚠️  CHATBOT_BASE_URL belum diisi, fitur chatbot tidak akan jalan");
else console.log(`💬 Layanan chatbot AI: ${chatbotBase}`);

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
