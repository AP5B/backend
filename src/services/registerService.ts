import { Prisma, UserRole, User } from "@prisma/client";
import { HttpError } from "../middlewares/errorHandler";
import bcrypt from "bcrypt";
import jwt, { TokenExpiredError } from "jsonwebtoken";
import env from "../config/env";
import { generateTokens } from "../utils/setAuthCookies";
import PrismaManager from "../utils/prismaManager";

const prisma = PrismaManager.GetClient();

export interface registerRequestBody {
  username: string;
  first_name: string;
  last_name_1: string;
  last_name_2?: string;
  email: string;
  password: string;
  role: UserRole;
  confirm_password: string;
}

export type RegisterServiceBody = Omit<registerRequestBody, "confirm_password">;

export const registerUserService = async (
  regBody: RegisterServiceBody,
): Promise<User> => {
  try {
    const hashedPassword = await bcrypt.hash(regBody.password, 10);
    const userData = { ...regBody, password: hashedPassword };

    const newUser = await prisma.user.create({
      data: userData,
    });

    return newUser;
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      throw error;
    }

    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const target = (error.meta?.target ?? []) as string[];

      if (target.includes("username")) {
        throw new HttpError(409, "El nombre de usuario ya está en uso.");
      }
      if (target.includes("email")) {
        throw new HttpError(409, "El email ya está en uso.");
      }

      throw new HttpError(409, "Los datos de registro ya están en uso.");
    }

    throw new HttpError(500, "Error interno del servidor");
  }
};

export const refreshTokenService = async (refreshToken: string) => {
  try {
    const decodedToken = jwt.verify(
      refreshToken,
      env.jwt_secret,
    ) as jwt.JwtPayload;

    const userId = decodedToken.id;
    if (!userId) {
      throw new HttpError(401, "Token inválido");
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new HttpError(401, "Usuario no encontrado");
    }

    const { token: newToken, refreshToken: newRefreshToken } = generateTokens(
      user.id,
      user.email,
      user.role,
      user.username,
    );

    const { password: _password, ...userWithoutPassword } = user;

    return {
      token: newToken,
      refreshToken: newRefreshToken,
      user: userWithoutPassword,
    };
  } catch (error: unknown) {
    if (error instanceof TokenExpiredError) {
      throw new HttpError(401, "Token de refresco expirado");
    }
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, "Error interno del servidor");
  }
};
