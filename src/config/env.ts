import dotenv from "dotenv";

dotenv.config();

interface env {
  port: number;
  nodeEnv: string;
  jwt_secret: string;
  allowedOrigins: string;
  database_url: string;
  mp_access_token: string;
  mp_client_id: string;
  mp_client_secret: string;
  mp_redirect_uri: string;
  frontend_url: string;
  backend_url: string;
}

const env: env = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || "development",
  jwt_secret: `${process.env.JWT_SECRET}`,
  allowedOrigins: `${process.env.ALLOWED_ORIGINS}`,
  database_url: `${process.env.DATABASE_URL}`,
  mp_access_token: `${process.env.MP_ACCESS_TOKEN}`,
  mp_client_id: `${process.env.MP_CLIENT_ID}`,
  mp_client_secret: `${process.env.MP_CLIENT_SECRET}`,
  mp_redirect_uri: `${process.env.MP_REDIRECT_URI}`,
  frontend_url: `${process.env.FRONTEND_URL}`,
  backend_url: `${process.env.BACKEND_URL}`,
};

export default env;
