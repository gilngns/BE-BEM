// Simulasi demo ke masyarakat: banyak HP dari satu wifi (satu IP) registrasi dan login bersamaan.
// Database diganti tiruan di memori, jadi tes ini tidak butuh PostgreSQL.
// Jalankan: npm test
import { after, before, describe, mock, test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-yang-panjangnya-lebih-dari-32-karakter";
process.env.DISABLE_SWAGGER = "true";

// ---------- Prisma tiruan ----------
const users = [];
const blacklist = new Set();
const matchUsername = (u, w) =>
  w.username?.mode === "insensitive"
    ? u.username.toLowerCase() === w.username.equals.toLowerCase()
    : u.username === w.username;

const fakePrisma = {
  user: {
    findUnique: async ({ where }) => users.find((u) => (where.id ? u.id === where.id : u.username === where.username)) ?? null,
    findFirst: async ({ where }) => users.find((u) => matchUsername(u, where)) ?? null,
    findMany: async ({ where, take }) => users.filter((u) => matchUsername(u, where)).slice(0, take),
    create: async ({ data }) => {
      if (users.some((u) => u.username === data.username)) throw Object.assign(new Error("dup"), { code: "P2002" });
      const user = { id: users.length + 1, createdAt: new Date(), ...data };
      users.push(user);
      return user;
    },
  },
  tokenBlacklist: {
    findUnique: async ({ where }) => (blacklist.has(where.token) ? { token: where.token } : null),
    upsert: async ({ where }) => { blacklist.add(where.token); return { token: where.token }; },
    deleteMany: async () => ({ count: 0 }),
  },
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

const post = async (path, body, token) => {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
};
const me = async (token) => (await fetch(`${base}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })).status;
const statuses = (results) => results.map((r) => r.status);

describe("demo: banyak warga dari satu wifi", () => {
  test("50 warga registrasi bersamaan, semuanya berhasil", async () => {
    const results = await Promise.all(
      Array.from({ length: 50 }, (_, i) => post("/api/auth/register", { username: `warga${i}`, password: "rahasia123", rw: "RW4" }))
    );
    assert.deepEqual(statuses(results), Array(50).fill(200));
  });

  test("5 orang login ke akun yang sama bersamaan: token berbeda, logout satu tidak mengeluarkan yang lain", async () => {
    const results = await Promise.all(Array.from({ length: 5 }, () => post("/api/auth/login", { username: "warga0", password: "rahasia123" })));
    assert.deepEqual(statuses(results), Array(5).fill(200));
    const tokens = results.map((r) => r.body.token);
    assert.equal(new Set(tokens).size, 5, "setiap login harus mendapat token unik");

    assert.equal((await post("/api/auth/logout", {}, tokens[0])).status, 200);
    assert.equal(await me(tokens[0]), 401, "token yang logout harus ditolak");
    for (const t of tokens.slice(1)) assert.equal(await me(t), 200, "sesi orang lain harus tetap jalan");
  });

  test("banyak warga salah ketik password tidak memblokir warga lain", async () => {
    const typos = await Promise.all(
      Array.from({ length: 30 }, (_, i) => post("/api/auth/login", { username: `warga${i + 1}`, password: "salahketik" }))
    );
    assert.deepEqual(statuses(typos), Array(30).fill(400));
    const good = await post("/api/auth/login", { username: "warga40", password: "rahasia123" });
    assert.equal(good.status, 200);
  });

  test("username dengan huruf kapital otomatis dan spasi di akhir password tetap bisa login", async () => {
    const res = await post("/api/auth/login", { username: "Warga41", password: "rahasia123 " });
    assert.equal(res.status, 200);
    assert.equal(res.body.user.username, "warga41");
  });

  test("registrasi 'Warga1' ditolak karena 'warga1' sudah ada", async () => {
    const res = await post("/api/auth/register", { username: "Warga1", password: "rahasia123", rw: "RW5" });
    assert.equal(res.status, 400);
  });
});

describe("keamanan tetap terjaga", () => {
  test("satu akun dikunci setelah 10 kali salah password, akun lain tidak terpengaruh", async () => {
    for (let i = 0; i < 10; i++) {
      assert.equal((await post("/api/auth/login", { username: "warga45", password: "tebak" + i })).status, 400);
    }
    const locked = await post("/api/auth/login", { username: "warga45", password: "rahasia123" });
    assert.equal(locked.status, 429, "akun yang dicoba-coba harus dikunci sementara");
    const other = await post("/api/auth/login", { username: "warga46", password: "rahasia123" });
    assert.equal(other.status, 200);
  });
});
