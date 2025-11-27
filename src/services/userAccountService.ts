import PrismaManager from "../utils/prismaManager";
import { HttpError } from "../middlewares/errorHandler";

const prisma = PrismaManager.GetClient();

export const deleteUserAccountService = async (userId: number) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isDeleted: true },
    });

    if (!user) {
      throw new HttpError(404, "Cuenta del usuario no encontrada.");
    }

    if (user.isDeleted === true) {
      throw new HttpError(400, "La cuenta del usuario ya fue eliminada.");
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: userId },
        data: { isDeleted: true },
      }),

      prisma.classOffer.updateMany({
        where: { authorId: userId },
        data: { isDeleted: true },
      }),
    ]);
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};
