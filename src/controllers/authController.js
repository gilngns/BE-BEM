import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";
import { JWT_ALGORITHM, JWT_EXPIRES_IN, JWT_EXPIRES_MS } from "../middleware/auth.js";
import { badRequest, getBody, HttpError, parseEnum } from "../lib/validate.js";

const RW_LIST = ["RW4", "RW5"];
const SALT_ROUNDS = 10;
const USERNAME_REGEX = /^[a-zA-Z0-9._-]{3,30}$/;

// Hash dummy untuk menyamakan waktu respon saat username tidak ada
// (mencegah penebakan username lewat timing)
const DUMMY_HASH = bcrypt.hashSync("dummy-password-for-timing", SALT_ROUNDS);

const publicUser = (u) => ({ id: u.id, username: u.username, rw: u.rw, createdAt: u.createdAt });

function parseUsername(value) {
  if (typeof value !== "string" || !value.trim()) throw badRequest("Username wajib diisi");
  const username = value.trim();
  if (!USERNAME_REGEX.test(username)) {
    throw badRequest("Username 3-30 karakter, hanya huruf, angka, titik, underscore, atau strip");
  }
  return username;
}

function parsePassword(value) {
  if (typeof value !== "string" || value.length === 0) throw badRequest("Password wajib diisi");
  if (value.length < 6) throw badRequest("Password minimal 6 karakter");
  // bcrypt hanya memakai 72 byte pertama
  if (Buffer.byteLength(value, "utf8") > 72) throw badRequest("Password maksimal 72 karakter");
  return value;
}

// ======================== REGISTER ========================
export const register = async (req, res) => {
  const body = getBody(req);
  const username = parseUsername(body.username);
  const password = parsePassword(body.password);
  const rw = parseEnum(body.rw, "RW", RW_LIST);

  const exist = await prisma.user.findUnique({ where: { username } });
  if (exist) throw badRequest("Username sudah dipakai");

  const hashed = await bcrypt.hash(password, SALT_ROUNDS);

  let user;
  try {
    user = await prisma.user.create({ data: { username, password: hashed, rw } });
  } catch (err) {
    // race condition: 2 request register username sama bersamaan
    if (err.code === "P2002") throw badRequest("Username sudah dipakai");
    throw err;
  }

  res.json({ success: true, message: "Register berhasil", user: publicUser(user) });
};

// ======================== LOGIN ========================
export const login = async (req, res) => {
  const body = getBody(req);
  if (typeof body.username !== "string" || typeof body.password !== "string" ||
      !body.username.trim() || !body.password) {
    throw badRequest("Username dan password wajib diisi");
  }

  const username = body.username.trim();
  const user = await prisma.user.findUnique({ where: { username } });

  // Selalu jalankan bcrypt.compare supaya waktu respon sama
  const match = await bcrypt.compare(body.password, user ? user.password : DUMMY_HASH);
  if (!user || !match) throw badRequest("Username atau password salah");

  const token = jwt.sign(
    { id: user.id, username: user.username, rw: user.rw },
    process.env.JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN, algorithm: JWT_ALGORITHM }
  );

  res.json({
    success: true,
    message: "Login berhasil",
    token,
    expiresIn: JWT_EXPIRES_IN,
    user: { id: user.id, username: user.username, rw: user.rw },
  });
};

// ======================== ME ========================
export const me = async (req, res) => {
  const user = await prisma.user.findUnique({ where: { id: req.user.id } });
  if (!user) throw new HttpError(401, "User tidak ditemukan, silakan login lagi");
  res.json({ success: true, user: publicUser(user) });
};

// ======================== LOGOUT ========================
export const logout = async (req, res) => {
  // token sudah divalidasi oleh authMiddleware
  await prisma.tokenBlacklist.upsert({
    where: { token: req.token },
    update: {},
    create: { token: req.token },
  });

  // Bersihkan token blacklist yang sudah pasti expired (umur > masa berlaku JWT)
  prisma.tokenBlacklist
    .deleteMany({ where: { createdAt: { lt: new Date(Date.now() - JWT_EXPIRES_MS) } } })
    .catch((err) => console.error("cleanup tokenBlacklist:", err));

  res.json({ success: true, message: "Logout berhasil" });
};
