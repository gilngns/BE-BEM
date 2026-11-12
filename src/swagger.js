import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const errorExample = (message) => ({
  content: {
    "application/json": {
      example: { success: false, message },
    },
  },
});

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Maggot BEM API Documentation",
      version: "1.1.0",
      description:
        "API untuk Auth, Siklus, Fase, Prediksi, Pencacahan, dan Notifikasi.\n\n" +
        "Semua endpoint (kecuali register & login) wajib header `Authorization: Bearer <token>`.\n\n" +
        "Format error selalu: `{ \"success\": false, \"message\": \"...\" }`.",
    },
    servers: [
      { url: process.env.API_BASE_URL || "https://api.smartmaggot.my.id" },
      { url: `http://localhost:${process.env.PORT || 5001}`, description: "Local" },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
        },
      },
      schemas: {
        Fase: {
          type: "object",
          properties: {
            id: { type: "integer", example: 12 },
            jenis: { type: "string", enum: ["PENETASAN", "PEMBESARAN", "PANEN"], example: "PANEN" },
            tanggal: { type: "string", format: "date-time", example: "2025-11-20T00:00:00.000Z" },
            jumlahTelur: { type: "integer", nullable: true, description: "Gram telur", example: 40 },
            jumlahMakanan: { type: "number", nullable: true, description: "Gram makanan", example: 20000 },
            keterangan: { type: "string", nullable: true, example: "Siap panen" },
            createdAt: { type: "string", format: "date-time" },
            siklusId: { type: "integer", example: 3 },
          },
        },
        PrediksiPanen: {
          type: "object",
          description: "Hasil prediksi AI yang tersimpan di database (1 prediksi per fase PANEN).",
          properties: {
            id: { type: "integer", example: 7 },
            hasilGram: { type: "number", description: "Prediksi jumlah panen maggot (gram)", example: 3768.01 },
            hasilKg: { type: "number", description: "Prediksi jumlah panen maggot (kg)", example: 3.768 },
            conversionRate: { type: "number", description: "Konversi pakan → maggot dalam persen (hasil / pakan × 100)", example: 18.84 },
            conversionLabel: {
              type: "string",
              enum: ["Sangat Baik", "Baik", "Cukup", "Perlu Perbaikan"],
              description: ">= 25% Sangat Baik, >= 20% Baik, >= 15% Cukup, selain itu Perlu Perbaikan",
              example: "Cukup",
            },
            roiEstimate: { type: "number", description: "Estimasi ROI (%), asumsi harga maggot Rp15/gram & pakan Rp2/gram", example: 41.3 },
            estimatedValue: { type: "number", description: "Estimasi nilai jual panen (Rupiah)", example: 56520 },
            feedCost: { type: "number", description: "Estimasi biaya pakan (Rupiah)", example: 40000 },
            rekomendasi: {
              type: "array",
              items: { type: "string" },
              description: "Saran dari model AI (bisa kosong)",
              example: ["Pakan kurang optimal. Pertimbangkan menambah ke 18840g untuk hasil maksimal."],
            },
            createdAt: { type: "string", format: "date-time" },
            faseId: { type: "integer", example: 12 },
          },
        },
        FaseDenganPrediksi: {
          allOf: [
            { $ref: "#/components/schemas/Fase" },
            {
              type: "object",
              properties: {
                prediksiPanen: {
                  nullable: true,
                  allOf: [{ $ref: "#/components/schemas/PrediksiPanen" }],
                  description: "Terisi hanya untuk fase PANEN, null untuk fase lain",
                },
              },
            },
          ],
        },
        MLRequest: {
          type: "object",
          description:
            "Body yang dikirim backend ke layanan AI (`POST {ML_BASE_URL}/api/predict/panen`). " +
            "**Tidak dipanggil langsung oleh aplikasi Android.**",
          required: ["jumlah_telur_gram", "makanan_gram"],
          properties: {
            jumlah_telur_gram: { type: "number", example: 40 },
            makanan_gram: { type: "number", example: 20000 },
          },
        },
        MLResponse: {
          type: "object",
          description:
            "Respons yang WAJIB dikembalikan layanan AI. Jika format tidak sesuai / timeout, " +
            "backend membalas 503 dan fase PANEN tidak disimpan.",
          required: ["prediction", "business_metrics"],
          properties: {
            prediction: {
              type: "object",
              required: ["jumlah_panen_gram", "jumlah_panen_kg", "conversion_rate", "conversion_label"],
              properties: {
                jumlah_panen_gram: { type: "number", example: 3768.01 },
                jumlah_panen_kg: { type: "number", example: 3.768 },
                conversion_rate: { type: "number", description: "persen", example: 18.84 },
                conversion_label: { type: "string", example: "Cukup" },
              },
            },
            business_metrics: {
              type: "object",
              required: ["roi_estimate", "estimated_value", "feed_cost"],
              properties: {
                roi_estimate: { type: "number", example: 41.3 },
                estimated_value: {
                  oneOf: [{ type: "string" }, { type: "number" }],
                  description: "Boleh angka atau teks Rupiah, contoh \"Rp 56,520\"",
                  example: "Rp 56,520",
                },
                feed_cost: {
                  oneOf: [{ type: "string" }, { type: "number" }],
                  example: "Rp 40,000",
                },
              },
            },
            recommendations: {
              type: "array",
              items: { type: "string" },
              description: "Opsional, disimpan ke kolom PrediksiPanen.rekomendasi",
            },
          },
        },
      },
      responses: {
        BadRequest: { description: "Input tidak valid", ...errorExample("tanggal wajib diisi") },
        Unauthorized: { description: "Token tidak ada / tidak valid / sudah logout", ...errorExample("Token tidak valid") },
        NotFound: { description: "Data tidak ditemukan", ...errorExample("Data tidak ditemukan") },
        TooManyRequests: { description: "Terlalu banyak request", ...errorExample("Terlalu banyak request, coba lagi nanti") },
        ServiceUnavailable: {
          description: "Layanan AI (prediksi / chatbot) tidak tersedia, timeout, atau belum dikonfigurasi",
          ...errorExample("Layanan prediksi sedang tidak tersedia, coba lagi nanti"),
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },

  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(swaggerSpec);
