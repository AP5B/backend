import PrismaManager from "../utils/prismaManager";

const prisma = PrismaManager.GetClient();

type Rol = "Teacher" | "Student";

export const setUserRole = (userId: number, rol: Rol) => {
  const user = prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      role: rol,
    },
  });
  return user;
};
