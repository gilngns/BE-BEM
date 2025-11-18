import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Maggot BEM API Documentation",
      version: "1.0.0",
      description: "API Dokumentasi untuk Login, Fase, dan Pencacahan",
    },
    servers: [
      {
        url: "https://api.smartmaggot.my.id",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "Bearer",
          bearerFormat: "JWT",
        },
      },
    },
    security: [
      {
        bearerAuth: [],
      },
    ],
  },
  
  apis: ["./src/routes/*.js"],
};

export const swaggerSpec = swaggerJsdoc(options);
export const swaggerUiServe = swaggerUi.serve;
export const swaggerUiSetup = swaggerUi.setup(swaggerSpec);
