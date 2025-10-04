import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";
import { HttpError } from "../middlewares/errorHandler";

const prisma = new PrismaClient();

export interface loginRequestBody {
  login: string;
  password: string;
}

export const loginUserService = async (logBody: loginRequestBody) => {
  try {
    const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(logBody.login);

    const user = await prisma.user.findFirst({
      where: isEmail ? { email: logBody.login } : { username: logBody.login },
    });

    if (!user) {
      throw new HttpError(
        401,
        "No se encontro usuario con ese nombre o correo",
      );
    }

    if (await bcrypt.compare(logBody.password, user.password)) {
      return user;
    } else {
      throw new HttpError(401, "Contraseña incorrecta");
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, "Error interno del servidor");
  }
  // insert to db
};
