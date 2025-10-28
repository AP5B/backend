import { Prisma } from "@prisma/client";
import { HttpError } from "../middlewares/errorHandler";
import PrismaManager from "../utils/prismaManager";

const prisma = PrismaManager.GetClient();

export interface Availability {
  id: number;
  slot: number;
  day: number;
}

export interface AvailabilityCreatePayload {
  userId: number;
  slot: number;
  day: number;
}

export interface AvailabilityUpdatePayload {
  id: number;
  userId: number;
  slot: number;
  day: number;
}

export const saveAvailabilityService = async (
  availabilities: AvailabilityCreatePayload[],
) => {
  try {
    const avties = await prisma.availability.createManyAndReturn({
      data: availabilities,
      select: {
        id: true,
        day: true,
        slot: true,
      },
    });
    return avties;
  } catch (err) {
    if (err instanceof Prisma.PrismaClientKnownRequestError) {
      if (err.code === "P2002") {
        // Unique constraint failed on the fields: (`userId`,`slot`,`day`)
        throw new HttpError(400, "Uno de los slots ya está asignado");
      }
    }

    console.log(err);
    throw new HttpError(500, "Error interno del sistema");
  }
};

export const getAvailailitiesService = async (teacherId: number) => {
  try {
    const avties = await prisma.availability.findMany({
      where: {
        userId: teacherId,
      },
    });

    return avties;
  } catch (err) {
    console.log(err);
    throw new HttpError(500, "Error interno del sistema.");
  }
};

export const deleteAvailabilitiesService = async (
  userId: number,
  avIds: number[],
) => {
  try {
    const av = await prisma.availability.findMany({
      select: { id: true, userId: true },
      where: {
        id: {
          in: avIds,
        },
        userId: {
          equals: userId,
        },
      },
    });

    av.forEach((a) => {
      if (a.userId != userId)
        throw new HttpError(
          403,
          `Usuario no es propietario de la disponibilidad con id ${a.id}.`,
        );
    });

    const deleted = await prisma.availability.deleteMany({
      where: {
        id: {
          in: avIds,
        },
        userId: {
          equals: userId,
        },
      },
    });

    return deleted;
  } catch (err) {
    console.log(err);
    throw new HttpError(500, "Error interno del sistema.");
  }
};
