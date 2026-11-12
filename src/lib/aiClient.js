// =============================================================
// Client terpusat untuk layanan AI (project MAGGOT_PREDICTION)
//
// 1. API prediksi (Flask, default port 5000)
//    - POST /api/predict/panen
//    - POST /api/predict/penetasan
//    - GET  /api/info              (pilihan media/cuaca/musim)
// 2. Chatbot RAG (Flask, default port 5001)
//    - POST /api/query             (tanya sekali)
//    - POST /api/chat              (multi-turn)
//
// Aplikasi Android TIDAK memanggil layanan AI langsung; semua lewat
// backend ini (pakai JWT). Layanan AI cukup bisa diakses dari server backend.
// =============================================================
import axios from "axios";
import { HttpError } from "./validate.js";

const ML_TIMEOUT_MS = Number(process.env.ML_TIMEOUT_MS) || 15000;
const CHATBOT_TIMEOUT_MS = Number(process.env.CHATBOT_TIMEOUT_MS) || 60000;
const INFO_CACHE_MS = 10 * 60 * 1000;

// ML_BASE_URL = http://host:5000
// Kompatibel dengan konfigurasi lama ML_API_URL / AI_API_URL yang berisi
// URL lengkap endpoint panen (http://host:5000/api/predict/panen).
export function getMlBaseUrl() {
  const raw = process.env.ML_BASE_URL || process.env.ML_API_URL || process.env.AI_API_URL;
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  return raw
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/api\/predict\/(panen|penetasan)$/i, "")
    .replace(/\/api$/i, "");
}

export function getChatbotBaseUrl() {
  const raw = process.env.CHATBOT_BASE_URL;
  if (!raw || !/^https?:\/\//i.test(raw)) return null;
  return raw.trim().replace(/\/+$/, "").replace(/\/api$/i, "");
}

const unavailable = (what = "prediksi") =>
  new HttpError(503, `Layanan ${what} sedang tidak tersedia, coba lagi nanti`);

/**
 * Panggil layanan AI.
 * - 400 dari AI (input ditolak model) -> diteruskan sebagai 400 dengan pesannya
 * - error lain / timeout / tidak terkonfigurasi -> 503
 */
async function callAi({ baseUrl, method = "post", path, data, timeout, label }) {
  if (!baseUrl) {
    console.error(`[AI] URL layanan ${label} belum diset di .env`);
    throw unavailable(label);
  }
  try {
    const res = await axios.request({ method, url: baseUrl + path, data, timeout });
    return res.data;
  } catch (err) {
    const status = err.response?.status;
    const aiMessage = err.response?.data?.error;
    if (status === 400 && typeof aiMessage === "string") {
      throw new HttpError(400, aiMessage);
    }
    console.error(`[AI] ${label} ${path} gagal:`, status ?? err.code, err.message);
    throw unavailable(label);
  }
}

// ---------- helper konversi ----------
// "Rp 56,520" / "Rp 56.520" -> 56520, angka dibiarkan
function parseRupiah(value) {
  if (typeof value === "number") return value;
  if (typeof value !== "string") return NaN;
  const digits = value.replace(/[^0-9]/g, "");
  return digits ? Number(digits) : NaN;
}

function toNumber(value) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value.replace(/[^0-9.\-]/g, ""));
  return NaN;
}

const toStringArray = (v) =>
  Array.isArray(v) ? v.filter((s) => typeof s === "string").map((s) => s.slice(0, 500)).slice(0, 20) : [];

// =============================================================
// PREDIKSI PANEN
// =============================================================
export async function predictPanen(jumlahTelurGram, makananGram) {
  const body = await callAi({
    baseUrl: getMlBaseUrl(),
    path: "/api/predict/panen",
    data: { jumlah_telur_gram: jumlahTelurGram, makanan_gram: makananGram },
    timeout: ML_TIMEOUT_MS,
    label: "prediksi",
  });

  const prediction = body?.prediction;
  const business = body?.business_metrics;
  const data = {
    hasilGram: toNumber(prediction?.jumlah_panen_gram),
    hasilKg: toNumber(prediction?.jumlah_panen_kg),
    conversionRate: toNumber(prediction?.conversion_rate),
    conversionLabel: typeof prediction?.conversion_label === "string" ? prediction.conversion_label : "",
    roiEstimate: toNumber(business?.roi_estimate),
    estimatedValue: parseRupiah(business?.estimated_value),
    feedCost: parseRupiah(business?.feed_cost),
    rekomendasi: toStringArray(body?.recommendations),
  };

  const numericKeys = ["hasilGram", "hasilKg", "conversionRate", "roiEstimate", "estimatedValue", "feedCost"];
  if (body?.success === false || !numericKeys.every((k) => Number.isFinite(data[k]))) {
    console.error("[AI] Respons panen tidak sesuai format:", JSON.stringify(body).slice(0, 500));
    throw unavailable("prediksi");
  }
  return data;
}

// =============================================================
// PREDIKSI PENETASAN
// =============================================================
export async function predictPenetasan(input) {
  const body = await callAi({
    baseUrl: getMlBaseUrl(),
    path: "/api/predict/penetasan",
    data: {
      jumlah_telur_gram: input.jumlahTelurGram,
      media_telur: input.mediaTelur,
      temp: input.suhu,
      humidity: input.kelembaban,
      temp_max: input.suhuMaks,
      weather_main: input.cuaca,
      season: input.musim,
    },
    timeout: ML_TIMEOUT_MS,
    label: "prediksi",
  });

  const p = body?.prediction;
  const lamaHari = toNumber(p?.lama_penetasan_hari);
  const confidence = toNumber(p?.confidence);
  if (body?.success === false || !Number.isFinite(lamaHari) || !Number.isFinite(confidence)) {
    console.error("[AI] Respons penetasan tidak sesuai format:", JSON.stringify(body).slice(0, 500));
    throw unavailable("prediksi");
  }

  const probabilitas = {};
  if (body.probabilities && typeof body.probabilities === "object") {
    for (const [k, v] of Object.entries(body.probabilities)) {
      const n = toNumber(v);
      if (Number.isFinite(n)) probabilitas[k] = Number(n.toFixed(2));
    }
  }

  return {
    lamaPenetasanHari: lamaHari,
    confidence,
    confidenceLabel: typeof p.confidence_label === "string" ? p.confidence_label : "",
    probabilitas,
    rekomendasi: toStringArray(body.recommendations),
  };
}

// =============================================================
// OPSI DROPDOWN (media, cuaca, musim) + info model — di-cache 10 menit
// =============================================================
let infoCache = null;
let infoCacheAt = 0;

export async function getModelInfo() {
  if (infoCache && Date.now() - infoCacheAt < INFO_CACHE_MS) return infoCache;

  const body = await callAi({
    baseUrl: getMlBaseUrl(),
    method: "get",
    path: "/api/info",
    timeout: ML_TIMEOUT_MS,
    label: "prediksi",
  });

  const pen = body?.penetasan_model ?? {};
  const pan = body?.panen_model ?? {};
  infoCache = {
    opsi: {
      mediaTelur: toStringArray(pen.media_options),
      cuaca: toStringArray(pen.weather_options),
      musim: toStringArray(pen.season_options),
    },
    model: {
      penetasan: { nama: pen.name ?? null, akurasi: pen.accuracy ?? null },
      panen: { nama: pan.name ?? null, r2: pan.r2_score ?? null, mae: pan.mae ?? null, mape: pan.mape ?? null },
    },
  };
  infoCacheAt = Date.now();
  return infoCache;
}

// =============================================================
// CHATBOT
// =============================================================
function normalizeChatbotResponse(body) {
  const answer = typeof body?.answer === "string" ? body.answer : null;
  if (!answer) {
    console.error("[AI] Respons chatbot tidak sesuai format:", JSON.stringify(body).slice(0, 500));
    throw unavailable("chatbot");
  }
  if (body.error === true) {
    // chatbot gagal di sisi LLM; jawaban berisi pesan ramah dari chatbot
    console.error("[AI] chatbot mengembalikan error:", answer.slice(0, 200));
    throw unavailable("chatbot");
  }
  const sources = Array.isArray(body.sources)
    ? body.sources.slice(0, 10).map((s) => ({
        dokumen: typeof s?.filename === "string" ? s.filename : null,
        cuplikan: typeof s?.text === "string" ? s.text.slice(0, 300) : null,
        kemiripan: typeof s?.similarity === "number" ? Number(s.similarity.toFixed(3)) : null,
      }))
    : [];
  return { jawaban: answer, sumber: sources };
}

export async function chatbotTanya(pertanyaan) {
  const body = await callAi({
    baseUrl: getChatbotBaseUrl(),
    path: "/api/query",
    data: { question: pertanyaan },
    timeout: CHATBOT_TIMEOUT_MS,
    label: "chatbot",
  });
  return normalizeChatbotResponse(body);
}

export async function chatbotChat(messages) {
  const body = await callAi({
    baseUrl: getChatbotBaseUrl(),
    path: "/api/chat",
    data: { messages },
    timeout: CHATBOT_TIMEOUT_MS,
    label: "chatbot",
  });
  return normalizeChatbotResponse(body);
}
