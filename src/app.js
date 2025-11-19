import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { swaggerUiServe, swaggerUiSetup } from "./swagger.js";
import authRoutes from "./routes/authRoutes.js";
import prediksiRoutes from "./routes/prediksiRoutes.js";
import pencacahanRoutes from "./routes/pencacahanRoutes.js";
import siklusRoutes from "./routes/siklusRoutes.js";
import faseRoutes from "./routes/faseRoutes.js";
import { authMiddleware } from "./authMiddleware.js";
import notifikasiRoutes from "./routes/notifikasiRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/prediksi", prediksiRoutes);
app.use("/api/pencacahan", pencacahanRoutes);
app.use("/api/siklus", authMiddleware, siklusRoutes);
app.use("/api/siklus", authMiddleware, faseRoutes);
app.use("/api/notifikasi", authMiddleware, notifikasiRoutes);
app.use("/api-docs", swaggerUiServe, swaggerUiSetup);

export default app;