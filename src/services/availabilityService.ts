import { PrismaClient } from "@prisma/client";
import { HttpError } from "../middlewares/errorHandler";

const prisma = new PrismaClient();

export interface Availability {
  from: string,
  to: string,
  day: number
}

export interface AvailabilityPayload {
  userId: number,
  from: string,
  to: string,
  day: number
}

export const saveAvailabilityService = async (availabilities: Array<AvailabilityPayload>) => {
  try {
    const avties = await prisma.availability.createMany({
      data: availabilities
    })
    return avties
  } catch (err: any) {
    console.log(err)
    throw new HttpError(500, "Error interno del sistema")
  }

}
