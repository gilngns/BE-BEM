/**
 * @swagger
 * /api/monitoring/sampah:
 *   get:
 *     summary: Sampah masuk semua RW (untuk web admin kelurahan)
 *     description: |
 *       Khusus antar-server. Wajib header `X-Monitoring-Key` berisi MONITORING_API_KEY.
 *       Bila MONITORING_API_KEY tidak diisi di .env, endpoint ini membalas 404.
 *       Tanggal dihitung menurut WIB; `sampai` ikut dihitung (inklusif). Rentang maksimal 366 hari.
 *     tags: [Pencacahan]
 *     parameters:
 *       - in: header
 *         name: X-Monitoring-Key
 *         required: true
 *         schema: { type: string }
 *       - in: query
 *         name: dari
 *         required: true
 *         schema: { type: string, example: "2026-11-01" }
 *       - in: query
 *         name: sampai
 *         required: true
 *         schema: { type: string, example: "2026-11-30" }
 *       - in: query
 *         name: rw
 *         schema: { type: string, enum: [RW4, RW5] }
 *     responses:
 *       200:
 *         description: Berhasil
 *         content:
 *           application/json:
 *             example:
 *               success: true
 *               data:
 *                 - id: 12
 *                   tanggalWaktu: "2026-11-21T02:30:00.000Z"
 *                   totalSampahKg: 12.5
 *                   catatan: "Sampah organik pasar"
 *                   rw: RW4
 *                   petugas: operator
 *       401:
 *         description: Kunci monitoring tidak valid
 */

import { Router } from "express";
import { getSampahMasuk, requireMonitoringKey } from "../controllers/monitoringController.js";

const router = Router();

router.get("/sampah", requireMonitoringKey, getSampahMasuk);

export default router;
