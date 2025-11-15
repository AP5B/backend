import bcrypt from "bcrypt";
import { HttpError } from "../middlewares/errorHandler";
import PrismaManager from "../utils/prismaManager";

const prisma = PrismaManager.GetClient();

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

    if (user.isDeleted === true) {
      throw new HttpError(403, "Cuenta del usuario inhabilitada.");
    }

    if (await bcrypt.compare(logBody.password, user.password)) {
      const { password: _ignore, ...userWithoutPassword } = user;
      return userWithoutPassword;
    } else {
      throw new HttpError(401, "Contraseña incorrecta");
    }
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};
