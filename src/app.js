import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import prediksiRoutes from "./routes/prediksiRoutes.js";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use("/api/prediksi", prediksiRoutes);

export default app;
