// Ubah & hapus siklus dan fase. Database dan layanan AI diganti tiruan, jadi tes ini
// tidak butuh PostgreSQL maupun API prediksi.
// Jalankan: npm test
import { after, before, beforeEach, describe, mock, test } from "node:test";
import assert from "node:assert/strict";
import jwt from "jsonwebtoken";
import { HttpError } from "../src/lib/validate.js";

process.env.JWT_SECRET = "test-secret-yang-panjangnya-lebih-dari-32-karakter";
process.env.DISABLE_SWAGGER = "true";

// ---------- Prisma tiruan (hanya yang dipakai controller siklus & fase) ----------
let db;
const reset = () => {
  db = {
    siklus: [
      { id: 1, userId: 1, tanggalMulai: new Date("2026-11-01"), jumlahTelur: 40, mediaTelur: "Dedak", catatan: null },
      { id: 2, userId: 2, tanggalMulai: new Date("2026-11-01"), jumlahTelur: 10, mediaTelur: "Dedak", catatan: null },
    ],
    fase: [
      { id: 10, siklusId: 1, jenis: "PENETASAN", tanggal: new Date("2026-11-01"), jumlahTelur: 40, jumlahMakanan: null, keterangan: null },
      { id: 11, siklusId: 1, jenis: "PEMBESARAN", tanggal: new Date("2026-11-14"), jumlahTelur: null, jumlahMakanan: 20000, keterangan: "awal" },
      { id: 12, siklusId: 1, jenis: "PANEN", tanggal: new Date("2026-11-14"), jumlahTelur: 40, jumlahMakanan: 20000, keterangan: "awal" },
      { id: 20, siklusId: 2, jenis: "PENETASAN", tanggal: new Date("2026-11-01"), jumlahTelur: 10, jumlahMakanan: null, keterangan: null },
    ],
    prediksi: [{ id: 100, faseId: 12, hasilKg: 4 }],
  };
};
reset();

const cocok = (row, where = {}) => Object.entries(where).every(([k, v]) => {
  if (v && typeof v === "object" && "in" in v) return v.in.includes(row[k]);
  if (k === "fase") return cocok(db.fase.find((f) => f.id === row.faseId) || {}, v);
  return row[k] === v;
});
const isi = (obj) => Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== undefined));
const denganFase = (s) => s && {
  ...s,
  fase: db.fase.filter((f) => f.siklusId === s.id).map((f) => ({ ...f, prediksiPanen: db.prediksi.find((p) => p.faseId === f.id) ?? null })),
};

const fakePrisma = {
  tokenBlacklist: { findUnique: async () => null },
  siklus: {
    findFirst: async ({ where, include }) => {
      const s = db.siklus.find((x) => cocok(x, where)) ?? null;
      return include?.fase ? denganFase(s) : s;
    },
    update: async ({ where, data }) => Object.assign(db.siklus.find((x) => x.id === where.id), isi(data)),
    delete: async ({ where }) => { db.siklus = db.siklus.filter((x) => x.id !== where.id); return {}; },
  },
  fase: {
    update: async ({ where, data }) => {
      const f = db.fase.find((x) => x.id === where.id);
      const { prediksiPanen, ...rest } = data;
      Object.assign(f, isi(rest));
      if (prediksiPanen?.upsert) {
        db.prediksi = db.prediksi.filter((p) => p.faseId !== f.id);
        db.prediksi.push({ id: 900 + f.id, faseId: f.id, ...prediksiPanen.upsert.create });
      }
      return f;
    },
    updateMany: async ({ where, data }) => {
      const rows = db.fase.filter((x) => cocok(x, where));
      rows.forEach((r) => Object.assign(r, isi(data)));
      return { count: rows.length };
    },
    deleteMany: async ({ where }) => {
      const before = db.fase.length;
      db.fase = db.fase.filter((x) => !cocok(x, where));
      return { count: before - db.fase.length };
    },
  },
  prediksiPanen: {
    deleteMany: async ({ where }) => {
      const before = db.prediksi.length;
      db.prediksi = db.prediksi.filter((x) => !cocok(x, where));
      return { count: before - db.prediksi.length };
    },
  },
  $transaction: async (ops) => Promise.all(ops),
  $disconnect: async () => {},
};
mock.module("../src/lib/prisma.js", { defaultExport: fakePrisma });

// ---------- AI tiruan: hasil = (telur + pakan) / 1000, bisa dibuat gagal ----------
let aiGagal = false;
const panggilanAi = [];
mock.module("../src/lib/aiClient.js", {
  namedExports: {
    predictPanen: async (telur, pakan) => {
      panggilanAi.push([telur, pakan]);
      if (aiGagal) throw new HttpError(503, "Layanan AI sedang tidak tersedia");
      return { hasilGram: telur + pakan, hasilKg: (telur + pakan) / 1000, conversionRate: 1, conversionLabel: "", roiEstimate: 1, estimatedValue: 1, feedCost: 1, rekomendasi: [] };
    },
    predictPenetasan: async () => ({}),
    getModelInfo: async () => ({}),
    getMlBaseUrl: () => "http://ml.test",
    getChatbotBaseUrl: () => "http://chatbot.test",
    chatbotTanya: async () => ({}),
    chatbotChat: async () => ({}),
  },
});

const { default: app } = await import("../src/app.js");

let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());
beforeEach(() => { reset(); aiGagal = false; panggilanAi.length = 0; });

const token = jwt.sign({ id: 1, username: "pengelola", rw: "RW5" }, process.env.JWT_SECRET, { algorithm: "HS256" });
const kirim = async (method, path, body) => {
  const res = await fetch(base + path, {
    method,
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  return { status: res.status, body: await res.json().catch(() => null) };
};
const fase = (id) => db.fase.find((f) => f.id === id);
const prediksiFase = (id) => db.prediksi.find((p) => p.faseId === id);

describe("PUT /api/siklus/:id", () => {
  test("ubah catatan & media tanpa memanggil AI", async () => {
    const r = await kirim("PUT", "/api/siklus/1", { mediaTelur: "Serbuk Kelapa", catatan: "Wadah 2" });
    assert.equal(r.status, 200);
    assert.equal(db.siklus[0].mediaTelur, "Serbuk Kelapa");
    assert.equal(db.siklus[0].catatan, "Wadah 2");
    assert.equal(panggilanAi.length, 0);
  });

  test("berat telur desimal berubah -> PENETASAN & perkiraan PANEN ikut dihitung ulang", async () => {
    const r = await kirim("PUT", "/api/siklus/1", { jumlahTelur: 0.5 });
    assert.equal(r.status, 200);
    assert.equal(db.siklus[0].jumlahTelur, 0.5);
    assert.equal(fase(10).jumlahTelur, 0.5);
    assert.equal(fase(12).jumlahTelur, 0.5);
    assert.deepEqual(panggilanAi, [[0.5, 20000]]);
    assert.equal(prediksiFase(12).hasilKg, 20.0005);
  });

  test("AI gagal -> 503 dan tidak ada data yang berubah", async () => {
    aiGagal = true;
    const r = await kirim("PUT", "/api/siklus/1", { jumlahTelur: 55 });
    assert.equal(r.status, 503);
    assert.equal(db.siklus[0].jumlahTelur, 40);
    assert.equal(fase(10).jumlahTelur, 40);
    assert.equal(prediksiFase(12).hasilKg, 4);
  });

  test("validasi: body kosong 400, berat 0 400, siklus milik akun lain 404", async () => {
    assert.equal((await kirim("PUT", "/api/siklus/1", {})).status, 400);
    assert.equal((await kirim("PUT", "/api/siklus/1", { jumlahTelur: 0 })).status, 400);
    assert.equal((await kirim("PUT", "/api/siklus/1", { mediaTelur: "" })).status, 400);
    assert.equal((await kirim("PUT", "/api/siklus/2", { catatan: "x" })).status, 404);
    assert.equal(db.siklus[1].catatan, null);
  });
});

describe("DELETE /api/siklus/:id", () => {
  test("menghapus siklus beserta fase & perkiraannya", async () => {
    const r = await kirim("DELETE", "/api/siklus/1");
    assert.equal(r.status, 200);
    assert.equal(db.siklus.some((s) => s.id === 1), false);
    assert.equal(db.fase.some((f) => f.siklusId === 1), false);
    assert.equal(db.prediksi.length, 0);
    assert.equal(db.fase.some((f) => f.siklusId === 2), true); // data akun lain aman
  });

  test("siklus akun lain tidak bisa dihapus", async () => {
    assert.equal((await kirim("DELETE", "/api/siklus/2")).status, 404);
    assert.equal(db.siklus.length, 2);
  });
});

describe("PUT/DELETE /api/siklus/:siklusId/fase/:faseId", () => {
  test("ubah pakan fase besar -> PANEN ikut berubah & perkiraan dihitung ulang", async () => {
    const r = await kirim("PUT", "/api/siklus/1/fase/11", { jumlahMakanan: 30000, tanggal: "2026-11-15", keterangan: "revisi" });
    assert.equal(r.status, 200);
    assert.equal(fase(11).jumlahMakanan, 30000);
    assert.equal(fase(12).jumlahMakanan, 30000);
    assert.equal(fase(12).keterangan, "revisi");
    assert.equal(fase(12).tanggal.toISOString().slice(0, 10), "2026-11-15");
    assert.deepEqual(panggilanAi, [[40, 30000]]);
    assert.equal(prediksiFase(12).hasilKg, 30.04);
  });

  test("ubah keterangan saja tidak memanggil AI", async () => {
    const r = await kirim("PUT", "/api/siklus/1/fase/11", { keterangan: "catatan baru" });
    assert.equal(r.status, 200);
    assert.equal(fase(11).keterangan, "catatan baru");
    assert.equal(fase(12).keterangan, "catatan baru");
    assert.equal(panggilanAi.length, 0);
  });

  test("hapus fase besar ikut menghapus PANEN & perkiraannya", async () => {
    const r = await kirim("DELETE", "/api/siklus/1/fase/11");
    assert.equal(r.status, 200);
    assert.equal(fase(11), undefined);
    assert.equal(fase(12), undefined);
    assert.equal(prediksiFase(12), undefined);
    assert.ok(fase(10)); // PENETASAN tetap ada
  });

  test("fase di siklus akun lain / fase tidak ada -> 404", async () => {
    assert.equal((await kirim("PUT", "/api/siklus/2/fase/20", { keterangan: "x" })).status, 404);
    assert.equal((await kirim("DELETE", "/api/siklus/1/fase/20")).status, 404);
    assert.ok(fase(20));
  });
});
