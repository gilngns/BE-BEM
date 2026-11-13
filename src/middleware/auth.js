import jwt from "jsonwebtoken";
import prisma from "../lib/prisma.js";

export const JWT_EXPIRES_IN = "7d";
export const JWT_EXPIRES_MS = 7 * 24 * 60 * 60 * 1000;
export const JWT_ALGORITHM = "HS256";

// Ambil token dari header "Authorization: Bearer <token>"
export const extractToken = (req) => {
  const header = req.headers.authorization;
  if (typeof header !== "string") return null;
  const [scheme, token] = header.trim().split(/\s+/);
  if (!token || scheme.toLowerCase() !== "bearer") return null;
  return token;
};

/**
 * Middleware auth tunggal untuk semua route yang butuh login.
 * - verifikasi signature + expiry JWT (algoritma dikunci ke HS256)
 * - tolak token yang sudah logout (ada di tabel TokenBlacklist)
 */
export const authMiddleware = async (req, res, next) => {
  const token = extractToken(req);
  if (!token) {
    return res.status(401).json({
      success: false,
      message: "Token tidak ditemukan, format header: Authorization: Bearer <token>",
    });
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET, { algorithms: [JWT_ALGORITHM] });
  } catch (err) {
    const message =
      err.name === "TokenExpiredError"
        ? "Token sudah kedaluwarsa, silakan login lagi"
        : "Token tidak valid";
    return res.status(401).json({ success: false, message });
  }

  if (!Number.isInteger(decoded?.id)) {
    return res.status(401).json({ success: false, message: "Token tidak valid" });
  }

  // Error DB di sini dilempar ke error handler (500), bukan dianggap token salah
  const blacklisted = await prisma.tokenBlacklist.findUnique({ where: { token } });
  if (blacklisted) {
    return res.status(401).json({
      success: false,
      message: "Token sudah logout, silakan login lagi",
    });
  }

  req.user = { id: decoded.id, username: decoded.username, rw: decoded.rw };
  req.token = token;
  // jti unik per login; token lama (sebelum ada jti) memakai token itu sendiri sebagai id sesi
  req.sessionId = typeof decoded.jti === "string" ? decoded.jti : token;
  next();
};

// Alias supaya import lama `auth` tetap jalan
export const auth = authMiddleware;
