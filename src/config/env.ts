import dotenv from "dotenv";
import { IntegrationApiKeys, IntegrationCommerceCodes } from "transbank-sdk";

dotenv.config();

interface env {
  port: number;
  nodeEnv: string;
  jwt_secret: string;
  allowedOrigins: string;
  database_url: string;
  comerceCode: string;
  comerceApiKey: string;
  frontendUrl: string;
}

const env: env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwt_secret: `${process.env.JWT_SECRET}`,
  allowedOrigins: `${process.env.ALLOWED_ORIGINS}`,
  database_url: `${process.env.DATABASE_URL}`,
  comerceCode: process.env.COMERCE_CODE || IntegrationCommerceCodes.WEBPAY_PLUS,
  comerceApiKey: process.env.COMERCE_API || IntegrationApiKeys.WEBPAY,
  frontendUrl: process.env.FRONTEND_URL || "http://localhost:3000",
};

export default env;
