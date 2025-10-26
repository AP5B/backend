import { UserRole } from "@prisma/client";
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
  role?: UserRole;
  phone?: string;
  confirm_password: string;
}

export const registerUserService = async (
  regBody: Omit<registerRequestBody, "confirm_password">,
) => {
  try {
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email: regBody.email }, { username: regBody.username }],
      },
    });

    if (existingUser) {
      throw new HttpError(409, "Nombre de usuario o email ya en uso.");
    }

    const hashedPassword = await bcrypt.hash(regBody.password, 10);
    const userData = { ...regBody, password: hashedPassword };

    return await prisma.user.create({
      data: userData,
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      throw error;
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
    const user = await prisma.user.findUnique({
      where: {
        id: userId,
      },
    });

    if (!user) return;
    const { token: newToken, refreshToken: newRefreshToken } = generateTokens(
      user.id,
      user.email,
      user.role,
      user.username,
    );

    const { password: _, ...userWithoutPassword } = user;
    return {
      token: newToken,
      refreshToken: newRefreshToken,
      user: userWithoutPassword,
    };
  } catch (error: unknown) {
    if (error instanceof TokenExpiredError) {
      throw new HttpError(401, "Token de refresco expirado");
    }
    throw new HttpError(500, "Error interno del servidor");
  }
};
