import { Request, Response, NextFunction } from "express";
import env from "../config/env";
import { HttpError } from "./errorHandler";
import jwt, { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import PrismaManager from "../utils/prismaManager";

export interface TokenPayload {
  id: string;
  email: string;
  role: string;
  username: string;
}

interface AuthUser {
  id: string;
  email: string;
  role: string;
  username: string;
}

const prisma = PrismaManager.GetClient();

/**
 * Valida Acces Token
 * Guarda en `res.locals.user` los datos del usuario
 */
export const authenticate = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const token = req.cookies["access_token"];
  if (!token) throw new HttpError(401, "Autenticación fallida.");

  try {
    const decoded = jwt.verify(token, env.jwt_secret) as TokenPayload;
    // luego en los controladores y servicios se puede acceder a algunos datos del usuario
    res.locals.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role,
      username: decoded.username,
    } as AuthUser;

    next();
  } catch (error) {
    let errorMessage = "Token inválido o expirado.";
    if (error instanceof TokenExpiredError) {
      errorMessage = "Autenticación fallida: Token expirado.";
    } else if (error instanceof JsonWebTokenError) {
      errorMessage = `Autenticación fallida: ${error.message}`;
    } else {
      console.error(
        "Error inesperado durante la verificación del token:",
        error,
      );
      errorMessage =
        "Autenticación fallida por un error inesperado durante la verificación del token.";
    }
    throw new HttpError(401, errorMessage);
  }
};

/**
 * Verifica que el `rol` del **usuario** este incluido en `roles`
 */
export const autorize =
  (...roles: string[]) =>
  (req: Request, res: Response, next: NextFunction) => {
    const userRol = res.locals.user.role;

    if (!roles.includes(userRol)) {
      throw new HttpError(401, `Usuario no tiene rol: ${roles.join(", ")}.`);
    }

    next();
  };

export const checkUserIsDeleted = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const userId = parseInt(res.locals.user.id as string);
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isDeleted: true },
    });

    if (user && user.isDeleted === true) {
      throw new HttpError(403, "Operación denegada, tu cuenta fue suspendida.");
    }
    next();
  } catch (error) {
    console.log(error);
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, `Error interno del servidor:\n${error}`);
  }
};
