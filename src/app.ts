import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import exampleRoutes from "./routes/exampleRoutes";
import healthRoutes from "./routes/healthRoutes";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import registerRoutes from "./routes/registerRoutes";
import loginRoutes from "./routes/loginRoutes";
import classRoutes from "./routes/classOfferRoutes"
import cookieParser from "cookie-parser";

// Swagger setup
const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Claseando API",
      version: "1.0.0",
    },
  },
  apis: ["./src/routes/*.ts"], // Ruta de las anotaciones
};

const swaggerSpec = swaggerJSDoc(options);

export const createApp = () => {
  const app = express();

  app.use(cors());

  app.use(express.json()); // body parser
  app.use(cookieParser());

  app.use("/", exampleRoutes);
  app.use("/", healthRoutes);
  app.use("/", registerRoutes);
  app.use("/", loginRoutes);
  app.use("/class-offer/", classRoutes)
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // Swagger

  app.use(errorHandler);
  return app;
};
