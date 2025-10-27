import { Request, Response } from "express"
import { HttpError } from "../middlewares/errorHandler"
import {
  Availability,
  AvailabilityCreatePayload,
  AvailabilityUpdatePayload,
  deleteAvailabilitiesService,
  getAvailailitiesService,
  saveAvailabilityService
} from "../services/availabilityService"

const MAX_UPLOAD_SIZE: number = 100;

const sanitizeCreateAvailabilities = (
  userId: number,
  av: Omit<Availability, "id">[]
): AvailabilityCreatePayload[] => {
  const sanitized = av.map((a) => {
    return {
      userId,
      day: a.day,
      slot: a.slot
    }
  })

  return sanitized;
}

const sanitizeUploadAvailabilities = (
  userId: number,
  av: Availability[],
): AvailabilityUpdatePayload[] => {
  const sanitized = av.map((a) => {
    return {
      id: a.id,
      userId,
      slot: a.slot,
      day: a.day
    };
  })
  return sanitized
}

const validateAvailability = (av: Omit<Availability, "id">) => {
  if (!av?.slot)
    throw new HttpError(400, "slot es requerido.")
  if (!Number.isInteger(av.slot))
    throw new HttpError(400, `slot debe ser un numbero.`)
  if (av.slot < 0 || av.slot > 24)
    throw new HttpError(400, `slot fuera de rango (0 - 24).`)
  if (!av?.day)
    throw new HttpError(400, "day es requerido.")
  if (!Number.isInteger(av.day))
    throw new HttpError(400, "day debe ser un entero.")
  if (av.day > 7 || av.day < 1)
    throw new HttpError(400, "day fuera de rango (1 - 7).")
}

/**
  * Valida y sanitiza el request body
*/
const validateRequestBody = (body: Omit<Availability, "id">[]) => {
  // es un arreglo
  if (Array.isArray(body)) {
    if (body.length > MAX_UPLOAD_SIZE)
      throw new HttpError(400, `La cantidad de disponibilidades a crear excede el máximo (${MAX_UPLOAD_SIZE}).`)

    body.forEach((av: Omit<Availability, "id">) => {
      validateAvailability(av)
    })
  }
  else {
    throw new HttpError(400, "La request debe ser un arreglo.")
  }
}

// --- Controladores de solicitud ---
export const createAvailabilitiesController = async (req: Request, res: Response) => {
  const reqBody = req.body as Omit<Availability, "id">[]; //id no relevante para crear

  validateRequestBody(reqBody);
  const sanBody: AvailabilityCreatePayload[] = sanitizeCreateAvailabilities(res.locals.user.id, reqBody)

  const av = await saveAvailabilityService(sanBody);

  res.status(201).send({
    data: av,
    count: av.length
  })
}

export const getAvailabilityController = async (req: Request, res: Response) => {
  const teacherId = parseInt(req.params.teacherId as string, 10);

  if (Number.isNaN(teacherId))
    throw new HttpError(400, "teacherId debe ser un numero")

  const av = await getAvailailitiesService(teacherId)
  res.status(200).send({
    data: av,
    count: av.length
  })
}

/**
  * Con la estrucutra actual de days/slots no tiene sentido el editar la disponibilidad
  * Este controlador no deberia ser usado a menos que se haga un refactor del funcionamiento completo del modelo
*/
export const editAvailabilityController = (req: Request, res: Response) => {
  const avId = parseInt(req.params.teacherId as string, 10);
  const reqBody = req.body as Availability[]

  if (Number.isInteger(avId))
    throw new HttpError(400, "teacherId debe ser un entero.")
  validateRequestBody(reqBody)
}

/*
  * Este controldor permite eliminar un arreglo con id's de disponibilidad
*/
export const deleteAvailabilityController = async (req: Request, res: Response) => {
  const avIdsQuery = req.query.ids as string // "1,2,3"

  const avIds = avIdsQuery.split(',').map(x => parseInt(x, 10)) // [1,2,3]

  if (!avIds.every(id => Number.isInteger(id)))
    throw new HttpError(400, "Las ids tienen que ser numeros enteros.")

  const deletedAv = await deleteAvailabilitiesService(res.locals.user.id, avIds)

  res.status(200).send({
    count: deletedAv.count,
    message: "Disponibilidades eliminadas con éxito."
  })
}
