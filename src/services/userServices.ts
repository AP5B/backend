import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

type Rol = "Teacher" | "Student";

export const setUserRole = (userId: number, rol: Rol) => {
  const user = prisma.user.update({
    where: {
      id: userId
    },
    data: {
      role: rol
    }
  })
  return user
}