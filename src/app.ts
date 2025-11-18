import express from "express";
import cors from "cors";
import { errorHandler } from "./middlewares/errorHandler";
import exampleRoutes from "./routes/exampleRoutes";
import healthRoutes from "./routes/healthRoutes";
import swaggerUi from "swagger-ui-express";
import swaggerJSDoc from "swagger-jsdoc";
import registerRoutes from "./routes/registerRoutes";
import loginRoutes from "./routes/loginRoutes";
import profileRoutes from "./routes/profileRoutes";
import classRoutes from "./routes/classOfferRoutes";
import availabilityRoutes from "./routes/availabilityRoutes";
import cookieParser from "cookie-parser";
import env from "./config/env";
import reviewsRoutes from "./routes/reviewsRoutes";

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

  const allowedOrigins = env.allowedOrigins?.split(",") || [];

  app.use(
    cors({
      origin: function(origin, callback) {
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) === -1) {
          const msg =
            "The CORS policy for this site does not " +
            "allow access from the specified Origin.";
          return callback(new Error(msg), false);
        }
        return callback(null, true);
      },
      credentials: true,
    }),
  );

  app.use(express.json()); // body parser
  app.use(cookieParser());

  app.use("/", exampleRoutes);
  app.use("/", healthRoutes);
  app.use("/", registerRoutes);
  app.use("/", loginRoutes);
  app.use("/class-offer/", classRoutes);
  app.use("/availability/", availabilityRoutes);
  app.use("/profile/", profileRoutes);
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec)); // Swagger
  app.use("/reviews/", reviewsRoutes);

  app.use(errorHandler);
  return app;
};
