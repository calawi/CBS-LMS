import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import path from "path";

export const setupSwagger = (app) => {
  const routesGlob = path.join(process.cwd(), "src", "routes", "*.js");
  const spec = swaggerJSDoc({
    definition: {
      openapi: "3.0.0",
      info: {
        title: "CBS LMS API",
        version: "0.1.0",
      },
      servers: [{ url: "http://localhost:4000" }],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
          },
        },
      },
      security: [{ bearerAuth: [] }],
    },
    apis: [routesGlob],
  });

  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(spec));
};

