import { Request, Response } from "express"
import { HttpError } from "../middlewares/errorHandler"
import { Availability, AvailabilityPayload, saveAvailabilityService } from "../services/availabilityService"

const MAX_UPLOAD_SIZE: number = 30;

// --- Validacion ---
const validateTime = (time: string) => {
  const exp = /^[0-9]{2}:[0-9]{2}$/

  return exp.test(time);
}

const sanitizeAvailabilities = (userId: number, av: Array<Availability>): Array<AvailabilityPayload> => {
  const sanitized = av.map((a) => {
    return {
      userId: userId,
      from: a.from,
      to: a.to,
      day: a.day
    };
  })
  return sanitized
}

const validateAvailability = (av: Availability) => {
  if (!av.from?.trim())
    throw new HttpError(400, "from no puede estar vacio")
  if (!validateTime(av.from))
    throw new HttpError(400, `${av.from} no tiene el formato correcto`)
  if (!av?.to.trim())
    throw new HttpError(400, "to no puede estar vacio")
  if (!validateTime(av.to))
    throw new HttpError(400, `${av.to} no tiene el formato correcto`)
  if (!av?.day)
    throw new HttpError(400, "day es requerido")
  if (!Number.isInteger(av?.day))
    throw new HttpError(400, "day debe ser un entero")
  if (av.day > 7 || av.day < 0)
    throw new HttpError(400, "day fuera de rango (1 - 7)")
}

/**
  * Valida y sanitiza el request body
*/
const validateRequestBody = (body: Array<Availability>) => {
  // es un arreglo
  console.log(body)
  if (Array.isArray(body)) {
    if (body.length > MAX_UPLOAD_SIZE)
      throw new HttpError(400, `La cantidad de disponibilidades a crear excede el máximo (${MAX_UPLOAD_SIZE}).`)

    body.forEach((av: Availability) => {
      validateAvailability(av)
    })
  }
  else {
    throw new HttpError(400, "La request debe ser un arreglo")
  }
}

// --- Controladores de solicitud ---
export const getAvailabilityController = async (req: Request, res: Response) => {
}

export const editAvailabilityController = (req: Request, res: Response) => {

}

export const uploadAvailabilitiesController = async (req: Request, res: Response) => {
  const reqBody = req.body as Array<Availability>;

  validateRequestBody(reqBody);
  const sanBody: Array<AvailabilityPayload> = sanitizeAvailabilities(res.locals.user.id, reqBody)


  const av = await saveAvailabilityService(sanBody);

  res.status(201).send(av)
}

export const deleteAvailabilityController = (req: Request, res: Response) => {

}
