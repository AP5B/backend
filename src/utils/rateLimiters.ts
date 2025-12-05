import rateLimit from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: 3 * 60 * 1000,
  max: 100,
  message: {
    error: "Demasiadas solicitudes.",
    retryAfter: "3 minutos",
  },
  standardHeaders: true,
  legacyHeaders: false,
});

export const authLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 50,
  message: {
    error: "Demasiadas solicitudes.",
    retryAfter: "1 minuto",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});
