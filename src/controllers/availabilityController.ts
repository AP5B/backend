import { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import {
  Availability,
  AvailabilityCreatePayload,
  AvailabilityUpdatePayload,
  deleteAvailabilitiesService,
  getAvailailitiesService,
  saveAvailabilityService,
} from "../services/availabilityService";

const MAX_UPLOAD_SIZE = 100;

const sanitizeCreateAvailabilities = (
  userId: number,
  av: Omit<Availability, "id">[],
): AvailabilityCreatePayload[] => {
  const sanitized = av.map((a) => {
    return {
      userId,
      day: a.day,
      slot: a.slot,
    };
  });

  return sanitized;
};

const sanitizeUploadAvailabilities = (
  userId: number,
  av: Availability[],
): AvailabilityUpdatePayload[] => {
  const sanitized = av.map((a) => {
    return {
      id: a.id,
      userId,
      slot: a.slot,
      day: a.day,
    };
  });
  return sanitized;
};

const validateAvailability = (av: Omit<Availability, "id">) => {
  if (!av?.slot) throw new HttpError(400, "slot es requerido.");
  if (!Number.isInteger(av.slot))
    throw new HttpError(400, `slot debe ser un número.`);
  if (av.slot < 0 || av.slot > 24)
    throw new HttpError(400, `slot fuera de rango (0 - 24).`);
  if (!av?.day) throw new HttpError(400, "day es requerido.");
  if (!Number.isInteger(av.day))
    throw new HttpError(400, "day debe ser un entero.");
  if (av.day > 7 || av.day < 1)
    throw new HttpError(400, "day fuera de rango (1 - 7).");
};

/**
 * Valida y sanitiza el request body
 */
const validateRequestBody = (body: Omit<Availability, "id">[]) => {
  // es un arreglo
  if (Array.isArray(body)) {
    if (body.length > MAX_UPLOAD_SIZE)
      throw new HttpError(
        400,
        `La cantidad de disponibilidades a crear excede el máximo (${MAX_UPLOAD_SIZE}).`,
      );

    body.forEach((av: Omit<Availability, "id">) => {
      validateAvailability(av);
    });
  } else {
    throw new HttpError(400, "La request debe ser un arreglo.");
  }
};

// --- Controladores de solicitud ---
export const createAvailabilitiesController = async (
  req: Request,
  res: Response,
) => {
  const reqBody = req.body as Omit<Availability, "id">[]; //id no relevante para crear

  validateRequestBody(reqBody);
  const sanBody: AvailabilityCreatePayload[] = sanitizeCreateAvailabilities(
    res.locals.user.id,
    reqBody,
  );

  const av = await saveAvailabilityService(sanBody);

  res.status(201).send({
    data: av,
    count: av.length,
    message: "Disponibilidades creadas con éxito.",
  });
};

export const getAvailabilityController = async (
  req: Request,
  res: Response,
) => {
  const teacherId = parseInt(req.params.teacherId as string, 10);

  if (Number.isNaN(teacherId))
    throw new HttpError(400, "teacherId debe ser un número");

  const av = await getAvailailitiesService(teacherId);
  res.status(200).send({
    data: av,
    message: "Disponibilidades obtenidas con éxito.",
  });
};

/**
 * Con la estructura actual de days/slots no tiene sentido el editar la disponibilidad
 * Este controlador no debería ser usado a menos que se haga un refactor del funcionamiento completo del modelo
 */
export const editAvailabilityController = (req: Request, res: Response) => {
  const userId = parseInt(req.params.teacherId as string, 10);
  const reqBody = req.body as Availability[];

  if (Number.isInteger(userId))
    throw new HttpError(400, "teacherId debe ser un entero.");
  validateRequestBody(reqBody);
  const sanitizedBody = sanitizeUploadAvailabilities(userId, reqBody);

  // llamar al servicio
  console.log(sanitizedBody);

  res.status(200).send();
};

/**
 * Este controlador permite eliminar un arreglo con id's de disponibilidad
 */
export const deleteAvailabilityController = async (
  req: Request,
  res: Response,
) => {
  const avParam = req.query.av;
  const avTupQuery = Array.isArray(avParam) ? avParam : [avParam as string]; // ['1,2', '2,3']

  if (!avTupQuery || avTupQuery.length === 0) {
    throw new HttpError(
      400,
      "Se requiere al menos una par de disponibilidad para eliminar.",
    );
  }

  const avTup: [number, number][] = avTupQuery.map((x): [number, number] => {
    // parsing data
    if (!x || x.length === 0) {
      throw new HttpError(400, `Par con formato inválido.`);
    }

    const split = (x as string).split(",") as [string, string];
    if (split.length != 2) {
      throw new HttpError(400, "Formato de par inválido. Deben ser day,slot");
    }
    const [dayStr, slotStr] = split;
    const day = parseInt(dayStr);
    const slot = parseInt(slotStr);

    if (Number.isNaN(day) || Number.isNaN(slot)) {
      throw new HttpError(
        400,
        `day y slot deben ser números enteros. (${split[0]},${split[1]})`,
      );
    }

    return [day, slot];
  }); // [[1,2], [2,3]]

  const deletedAv = await deleteAvailabilitiesService(
    res.locals.user.id,
    avTup,
  );

  res.status(200).send({
    count: deletedAv.count,
    message: "Disponibilidades eliminadas con éxito.",
  });
};
