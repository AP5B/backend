import { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import {
  createClassRequestService,
  CreateClassRequestBody,
  getUserClassRequestService,
  getTutorClassRequestsService,
  updateClassRequestStateService,
  getClassRequestsByClassService,
  acceptClassService,
  confirmClassService,
  getClassRequestByIdService,
} from "../services/classRequestService";

/**
 * Validar que el cuerpo del request para crear una reserva sea válido.
 */
const validateCreateClassRequestBody = (body: CreateClassRequestBody) => {
  if (!body.classOfferId)
    throw new HttpError(400, "El campo 'classOfferId' es obligatorio");

  if (body.slot === undefined) throw new HttpError(400, "slot es requerido.");
  if (!Number.isInteger(body.slot))
    throw new HttpError(400, `slot debe ser un número.`);
  if (body.slot < 0 || body.slot > 24)
    throw new HttpError(400, `slot fuera de rango (0 - 24).`);

  if (body.day === undefined) throw new HttpError(400, "day es requerido.");
  if (!Number.isInteger(body.day))
    throw new HttpError(400, "day debe ser un entero.");
  if (body.day > 7 || body.day < 1)
    throw new HttpError(400, "day fuera de rango (1 - 7).");
};

/**
 * Crear una nueva reserva
 */
export const createReservationController = async (
  req: Request,
  res: Response,
) => {
  const userId = res.locals.user.id;
  const body = req.body as CreateClassRequestBody;

  validateCreateClassRequestBody(body);

  const sanitizedBody = {
    classOfferId: body.classOfferId,
    day: body.day,
    slot: body.slot,
  };

  const reservation = await createClassRequestService(userId, sanitizedBody);

  return res.status(201).json({
    message: "Reserva creada exitosamente",
    reservation,
  });
};

/**
 * Obtener todas las reservas del usuario autenticado
 */
export const getUserClassRequestController = async (
  req: Request,
  res: Response,
) => {
  const userId = res.locals.user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const normPage = page > 0 ? page : 1;
  const normLimit = limit > 0 ? limit : 10;

  const classRequests = await getUserClassRequestService(
    userId,
    normPage,
    normLimit,
  );

  return res.status(200).json({
    data: classRequests,
  });
};

/**
 * Obtener todas las solicitudes recibidas por el tutor autenticado
 */
export const getTutorClassRequestsController = async (
  req: Request,
  res: Response,
) => {
  const tutorId = res.locals.user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const normPage = page > 0 ? page : 1;
  const normLimit = limit > 0 ? limit : 10;

  const classRequests = await getTutorClassRequestsService(
    tutorId,
    normPage,
    normLimit,
  );

  return res.status(200).json({
    data: classRequests,
  });
};

/**
 * El tutor actualiza el estado de una solicitud de clase
 */
export const updateClassRequestStateController = async (
  req: Request,
  res: Response,
) => {
  const tutorId = res.locals.user.id;
  const classRequestId = parseInt(req.params.classRequestId as string);
  const state = req.body.state;

  if (!classRequestId) {
    throw new HttpError(400, "ID de la reserva faltante.");
  }

  if (!state.trim()) {
    throw new HttpError(400, "El campo 'state' es obligatorio");
  }

  const states = ["Pending", "Approved", "Rejected"];
  if (!states.includes(state)) {
    throw new HttpError(
      400,
      `'${state}' no es un valor válido para el estado de la reserva.`,
    );
  }

  const updatedRequest = await updateClassRequestStateService(
    tutorId,
    classRequestId,
    state,
  );

  return res.status(200).json({
    message: "Estado de la reserva actualizado exitosamente",
    updatedRequest,
  });
};

/**
 * Obtener las reservas de una clase específica del tutor autenticado
 */
export const getClassRequestsByClassController = async (
  req: Request,
  res: Response,
) => {
  const tutorId = res.locals.user.id;
  const classOfferId = parseInt(req.params.classOfferId as string);

  if (!classOfferId) {
    throw new HttpError(400, "ID de la clase faltante.");
  }

  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const normPage = page > 0 ? page : 1;
  const normLimit = limit > 0 ? limit : 10;

  const data = await getClassRequestsByClassService(
    tutorId,
    classOfferId,
    normPage,
    normLimit,
  );

  return res.status(200).json({
    data,
  });
};

export const acceptClassRequestController = async (
  req: Request,
  res: Response,
) => {
  const classRequestId = parseInt(req.params.classRequestId as string);
  const accept = req.body.state as boolean;

  if (accept !== true && accept !== false) {
    throw new HttpError(400, "El campo 'state' debe ser true o false");
  }

  if (Number.isNaN(classRequestId))
    throw new HttpError(400, "classRequestId debe ser un numero");

  await acceptClassService(classRequestId, accept);

  res.status(200).json({
    message: "Solicitud de clase aceptada exitosamente",
  });
};

export const confirmClassRequestController = async (
  req: Request,
  res: Response,
) => {
  const classRequestId = parseInt(req.params.classRequestId as string);
  const code = req.query.code as string;

  if (Number.isNaN(classRequestId))
    throw new HttpError(400, "classRequestId debe ser un numero");

  await confirmClassService(classRequestId, code);

  res.status(200).json({
    message: "Clase confirmada exitosamente",
  });
};

export const getClassRequestByIdController = async (
  req: Request,
  res: Response,
) => {
  const classRequestId = parseInt(req.params.classRequestId as string);
  if (!classRequestId) {
    throw new HttpError(400, "Id de la reserva faltante.");
  }

  const classReq = await getClassRequestByIdService(classRequestId);

  return res.status(200).json({ classReq });
};
