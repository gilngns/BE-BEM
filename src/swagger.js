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
      responses: {
        BadRequest: { description: "Input tidak valid", ...errorExample("tanggal wajib diisi") },
        Unauthorized: { description: "Token tidak ada / tidak valid / sudah logout", ...errorExample("Token tidak valid") },
        NotFound: { description: "Data tidak ditemukan", ...errorExample("Data tidak ditemukan") },
        TooManyRequests: { description: "Terlalu banyak request", ...errorExample("Terlalu banyak request, coba lagi nanti") },
        ServiceUnavailable: {
          description: "Layanan prediksi (ML) tidak tersedia",
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
