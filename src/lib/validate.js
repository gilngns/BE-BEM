// =============================================================
// Helper validasi input + error HTTP
// Controller cukup `throw badRequest("...")`, nanti ditangkap
// oleh error handler global di app.js (Express 5 otomatis
// meneruskan error dari async handler).
// =============================================================

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message) => new HttpError(400, message);
export const notFound = (message = "Data tidak ditemukan") => new HttpError(404, message);

const MAX_INT = 2147483647; // batas kolom Int PostgreSQL

const isBlank = (v) => v === null || (typeof v === "string" && v.trim() === "");

// Ambil req.body dengan aman (bisa undefined di Express 5 / bukan object)
export function getBody(req) {
  const b = req.body;
  return b && typeof b === "object" && !Array.isArray(b) ? b : {};
}

/**
 * Cek nilai kosong.
 * - undefined      -> field tidak dikirim
 * - null / ""      -> field dikirim tapi kosong
 * Return: { done: true, value } kalau sudah diputuskan, atau { done: false }.
 */
function handleEmpty(value, name, { optional = false, nullable = true } = {}) {
  if (value === undefined) {
    if (optional) return { done: true, value: undefined };
    throw badRequest(`${name} wajib diisi`);
  }
  if (isBlank(value)) {
    if (optional && nullable) return { done: true, value: null };
    throw badRequest(`${name} wajib diisi`);
  }
  return { done: false };
}

export function parseId(value, name = "id") {
  const n = typeof value === "string" && /^\d+$/.test(value) ? Number(value) : NaN;
  if (!Number.isInteger(n) || n <= 0 || n > MAX_INT) {
    throw badRequest(`${name} tidak valid`);
  }
  return n;
}

export function parseDate(value, name, opts = {}) {
  const empty = handleEmpty(value, name, opts);
  if (empty.done) return empty.value;

  if (typeof value !== "string" && typeof value !== "number") {
    throw badRequest(`${name} harus berupa tanggal yang valid`);
  }
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    throw badRequest(`${name} harus berupa tanggal yang valid (contoh: 2025-11-13)`);
  }
  return d;
}

export function parseNumber(value, name, { integer = false, min = 0, max = 1e12, ...opts } = {}) {
  const empty = handleEmpty(value, name, opts);
  if (empty.done) return empty.value;

  if (typeof value !== "number" && typeof value !== "string") {
    throw badRequest(`${name} harus berupa angka`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) throw badRequest(`${name} harus berupa angka`);
  if (integer && !Number.isInteger(n)) throw badRequest(`${name} harus bilangan bulat`);
  const upper = integer ? Math.min(max, MAX_INT) : max;
  if (n < min || n > upper) throw badRequest(`${name} harus di antara ${min} dan ${upper}`);
  return n;
}

export function parseString(value, name, { maxLength = 255, ...opts } = {}) {
  const empty = handleEmpty(value, name, opts);
  if (empty.done) return empty.value;

  if (typeof value !== "string") throw badRequest(`${name} harus berupa teks`);
  const s = value.trim();
  if (s.length > maxLength) throw badRequest(`${name} maksimal ${maxLength} karakter`);
  return s;
}

export function parseEnum(value, name, allowed, opts = {}) {
  const empty = handleEmpty(value, name, opts);
  if (empty.done) return empty.value;

  const v = typeof value === "string" ? value.trim().toUpperCase() : value;
  if (!allowed.includes(v)) {
    throw badRequest(`${name} harus salah satu dari: ${allowed.join(", ")}`);
  }
  return v;
}
