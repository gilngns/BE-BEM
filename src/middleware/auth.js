import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

export const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) return res.status(401).json({ message: "Token tidak ada" });

    // cek apakah token di-blacklist
    const blacklisted = await prisma.tokenBlacklist.findUnique({
      where: { token }
    });

    if (blacklisted) {
      return res.status(401).json({ message: "Token sudah logout, silakan login lagi" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ message: "Token tidak valid" });
  }
};
