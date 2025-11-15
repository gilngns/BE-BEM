import { Router } from "express";
import {
  createPencacahan,
  getAllPencacahan,
  getPencacahanById,
  updatePencacahan,
  deletePencacahan,
} from "../controllers/pencacahanController.js";

const router = Router();

router.post("/", createPencacahan);
router.get("/", getAllPencacahan);
router.get("/:id", getPencacahanById);
router.put("/:id", updatePencacahan);
router.delete("/:id", deletePencacahan);

export default router;