import { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import {
  createClassRequestService,
  CreateClassRequestBody,
  getUserClassRequestService,
  getTutorClassRequestsService,
  updateClassRequestStateService,
  getClassRequestsByClassService
} from "../services/classRequestService";


/**
 * Validar que el cuerpo del request para crear una reserva sea válido.
 */
const validateCreateClassRequestBody = (body: CreateClassRequestBody) => {
  if (!body.classOfferId)
    throw new HttpError(400, "El campo 'classOfferId' es obligatorio");
};

/**
 * Crear una nueva reserva
 */
export const createReservationController = async (req: Request, res: Response) => {
  const userId = res.locals.user.id;
  const body = req.body as CreateClassRequestBody;

  validateCreateClassRequestBody(body);

  const reservation = await createClassRequestService(userId, body);

  return res.status(201).json({
    message: "Reserva creada exitosamente",
    reservation,
  });
};

/**
 * Obtener todas las reservas del usuario autenticado
 */
export const getUserClassRequestController = async (req: Request, res: Response) => {
  try {
    const userId = res.locals.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const normPage = page > 0 ? page : 1;
    const normLimit = limit > 0 ? limit : 10;

    const [classRequests, totalItems, totalPages] = await getUserClassRequestService(
      userId,
      normPage,
      normLimit,
    );

    return res.status(200).json({
      data: classRequests,
      pagination: {
        page: normPage,
        limit: normLimit,
        totalItems,
        totalPages,
      },
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};


/**
 * Obtener todas las solicitudes recibidas por el tutor autenticado
 */
export const getTutorClassRequestsController = async (req: Request, res: Response) => {
  try {
    const tutorId = res.locals.user.id;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const normPage = page > 0 ? page : 1;
    const normLimit = limit > 0 ? limit : 10;

    const { data: classRequests, totalItems, totalPages } = await getTutorClassRequestsService(
      tutorId,
      normPage,
      normLimit
    );

    return res.status(200).json({
      data: classRequests,
      pagination: {
        page: normPage,
        limit: normLimit,
        totalItems,
        totalPages,
      },
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error en getTutorClassRequestsController:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};

/**
 * El tutor actualiza el estado de una solicitud de clase
 */
export const updateClassRequestStateController = async (req: Request, res: Response) => {
  try {
    const tutorId = res.locals.user.id;
    const classRequestId = Number(req.body.classRequestId);
    const state = req.body.state;

    if (isNaN(classRequestId)) {
      throw new HttpError(400, "El ID de la solicitud debe ser un número válido");
    }

    if (!state) {
      throw new HttpError(400, "El campo 'state' es obligatorio");
    }

    const updatedRequest = await updateClassRequestStateService(
      tutorId,
      classRequestId,
      state
    );

    return res.status(200).json({
      message: "Estado de la solicitud actualizado exitosamente",
      updatedRequest,
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error en updateClassRequestStateController:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};


/**
 * Obtener las reservas de una clase específica del tutor autenticado
 */
export const getClassRequestsByClassController = async (req: Request, res: Response) => {
  try {
    const tutorId = res.locals.user.id;
    const classOfferId = Number(req.params.classOfferId);
    if (isNaN(classOfferId)) {
      throw new HttpError(400, "El ID de la clase debe ser un número");
    }

    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const normPage = page > 0 ? page : 1;
    const normLimit = limit > 0 ? limit : 10;

    const { data, totalItems, totalPages } = await getClassRequestsByClassService(
      tutorId,
      classOfferId,
      normPage,
      normLimit
    );

    return res.status(200).json({
      data,
      pagination: {
        page: normPage,
        limit: normLimit,
        totalItems,
        totalPages,
      },
    });
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      return res.status(error.status).json({ error: error.message });
    }
    console.error("Error en getClassRequestsByClassController:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
};
