// Endpoint sampah masuk untuk web admin kelurahan (database tiruan, tanpa PostgreSQL).
import { after, before, describe, mock, test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-yang-panjangnya-lebih-dari-32-karakter";
process.env.DISABLE_SWAGGER = "true";
const KUNCI = "kunci-monitoring-yang-panjangnya-lebih-dari-32";
process.env.MONITORING_API_KEY = KUNCI;

const users = { 1: { username: "operator", rw: "RW4" }, 2: { username: "petugas5", rw: "RW5" } };
const pencacahan = [
  { id: 1, tanggalWaktu: new Date("2026-10-31T16:59:00Z"), totalSampah: 99, catatan: null, userId: 1 }, // 31 Okt 23.59 WIB
  { id: 2, tanggalWaktu: new Date("2026-10-31T17:00:00Z"), totalSampah: 12.5, catatan: "pasar", userId: 1 }, // 1 Nov 00.00 WIB
  { id: 3, tanggalWaktu: new Date("2026-11-30T16:30:00Z"), totalSampah: 7, catatan: null, userId: 2 }, // 30 Nov 23.30 WIB
  { id: 4, tanggalWaktu: new Date("2026-11-30T17:00:00Z"), totalSampah: 50, catatan: null, userId: 2 }, // 1 Des WIB
];
let lastWhere;
const fakePrisma = {
  pencacahan: {
    findMany: async ({ where }) => {
      lastWhere = where;
      return pencacahan
        .filter((p) => p.tanggalWaktu >= where.tanggalWaktu.gte && p.tanggalWaktu < where.tanggalWaktu.lt)
        .filter((p) => !where.user || users[p.userId].rw === where.user.rw)
        .map((p) => ({ ...p, user: users[p.userId] }));
    },
  },
  tokenBlacklist: { findUnique: async () => null },
  $disconnect: async () => {},
};
mock.module("../src/lib/prisma.js", { defaultExport: fakePrisma });

const { default: app } = await import("../src/app.js");

let server;
let base;
before(async () => {
  server = app.listen(0);
  await new Promise((r) => server.once("listening", r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => server.close());

const get = async (qs, key = KUNCI) => {
  const res = await fetch(`${base}/api/monitoring/sampah?${qs}`, { headers: key ? { "X-Monitoring-Key": key } : {} });
  return { status: res.status, body: await res.json() };
};

describe("monitoring sampah masuk", () => {
  test("tanpa kunci / kunci salah ditolak", async () => {
    assert.equal((await get("dari=2026-11-01&sampai=2026-11-30", null)).status, 401);
    assert.equal((await get("dari=2026-11-01&sampai=2026-11-30", "salah")).status, 401);
  });

  test("batas tanggal memakai WIB dan 'sampai' inklusif", async () => {
    const res = await get("dari=2026-11-01&sampai=2026-11-30");
    assert.equal(res.status, 200);
    assert.deepEqual(res.body.data.map((r) => r.id), [2, 3]);
    assert.deepEqual(res.body.data[0], {
      id: 2, tanggalWaktu: "2026-10-31T17:00:00.000Z", totalSampahKg: 12.5, catatan: "pasar", rw: "RW4", petugas: "operator",
    });
  });

  test("filter RW", async () => {
    const res = await get("dari=2026-11-01&sampai=2026-11-30&rw=RW5");
    assert.deepEqual(res.body.data.map((r) => r.id), [3]);
    assert.deepEqual(lastWhere.user, { rw: "RW5" });
  });

  test("validasi tanggal", async () => {
    assert.equal((await get("dari=01-11-2026&sampai=2026-11-30")).status, 400);
    assert.equal((await get("dari=2026-11-30&sampai=2026-11-01")).status, 400);
    assert.equal((await get("dari=2025-01-01&sampai=2026-11-30")).status, 400);
    assert.equal((await get("dari=2026-11-01&sampai=2026-11-30&rw=RW9")).status, 400);
    assert.equal((await get("dari=2026-11-01&sampai=2026-11-30&rw=RW1")).status, 200, "RW1 sampai RW5 diterima");
  });
});
