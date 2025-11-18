import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;

// ======================== REGISTER ========================
export const register = async (req, res) => {
    try {
      const { username, password, rw } = req.body;
  
      if (!["RW4", "RW5"].includes(rw)) {
        return res.status(400).json({ message: "RW harus RW4 atau RW5" });
      }
  
      const exist = await prisma.user.findUnique({
        where: { username },
      });
  
      if (exist)
        return res.status(400).json({ message: "Username sudah dipakai" });
  
      const hashed = await bcrypt.hash(password, 10);
  
      const user = await prisma.user.create({
        data: {
          username,
          password: hashed,
          rw, 
        },
      });
  
      res.json({
        message: "Register berhasil",
        user,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };  

// ======================== LOGIN ========================
export const login = async (req, res) => {
    try {
      const { username, password } = req.body;
  
      if (!username || !password) {
        return res.status(400).json({ message: "Username dan password wajib diisi" });
      }
  
      const user = await prisma.user.findUnique({
        where: { username },
      });
  
      if (!user) {
        return res.status(400).json({ message: "Username tidak ditemukan" });
      }
  
      const match = await bcrypt.compare(password, user.password);
  
      if (!match) {
        return res.status(400).json({ message: "Password salah" });
      }
  
      // Token payload
      const token = jwt.sign(
        { id: user.id, username: user.username, rw: user.rw },
        process.env.JWT_SECRET,
        { expiresIn: "7d" }
      );
  
      res.json({
        message: "Login berhasil",
        token,
        user: {
          id: user.id,
          username: user.username,
          rw: user.rw,
        },
      });
  
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };  

// ======================== LOGOUT ========================

  export const logout = async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
  
      if (!token) {
        return res.status(400).json({ message: "Token tidak ada" });
      }
  
      await prisma.tokenBlacklist.create({
        data: { token }
      });
  
      res.json({ message: "Logout berhasil" });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  };
  