import PrismaManager from "../utils/prismaManager";
import bcrypt from "bcrypt";
import { HttpError } from "../middlewares/errorHandler";
const prisma = PrismaManager.GetClient();

export const changeUserPassword = async (
  userId: number,
  currentPassword: string,
  newPassword: string,
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: { id: true, password: true },
    });

    if (!user) throw new HttpError(404, "Usuario no encontrado.");

    if (userId !== user.id) {
      throw new HttpError(
        401,
        "No estas autorizado para modificar la información este usuario.",
      );
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch)
      throw new HttpError(401, "Contraseña actual incorrecta.");

    const hashed = await bcrypt.hash(newPassword, 10);

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { password: hashed },
    });

    const { password: _pw, ...safe } = updated;

    return safe;
  } catch (error) {
    console.log(error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, `Error interno del servidor:\n${error}`);
  }
};

export const updateUserNames = async (
  userId: number,
  currentPassword: string,
  data: {
    first_name?: string;
    last_name_1?: string;
    last_name_2?: string | null;
    phone?: string | null;
  },
) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: { id: true, password: true },
    });

    if (!user) throw new HttpError(404, "Usuario no encontrado.");

    if (userId !== user.id) {
      throw new HttpError(
        401,
        "No estas autorizado para modificar la información este usuario.",
      );
    }

    const passwordMatch = await bcrypt.compare(currentPassword, user.password);
    if (!passwordMatch)
      throw new HttpError(401, "Contraseña actual incorrecta.");

    const updated = await prisma.user.update({
      where: { id: userId },
      data,
    });

    const { password: _pw, ...safe } = updated;

    return safe;
  } catch (error) {
    console.log(error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, `Error interno del servidor:\n${error}`);
  }
};

export const getUserProfileService = async (userId: number) => {
  try {
    const userProfile = await prisma.user.findUnique({
      where: { id: userId, isDeleted: false },
      select: {
        id: true,
        username: true,
        first_name: true,
        last_name_1: true,
        last_name_2: true,
        email: true,
        phone: true,
        isDeleted: true,
        role: true,
      },
    });

    if (!userProfile) {
      throw new HttpError(404, "Perfil del usuario no encontrado.");
    }

    return userProfile;
  } catch (error) {
    console.log(error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, `Error interno del servidor:\n${error}`);
  }
};
