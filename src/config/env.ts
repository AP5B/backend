import dotenv from "dotenv";

dotenv.config();

interface env {
  port: number;
  nodeEnv: string;
  jwt_secret: string;
  allowedOrigins: string;
}

const env: env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwt_secret: `${process.env.JWT_SECRET}`,
  allowedOrigins: `${process.env.ALLOWED_ORIGINS}`,
};

export default env;
