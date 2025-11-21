import { HttpError } from "../middlewares/errorHandler";
import PrismaManager from "../utils/prismaManager";

const prisma = PrismaManager.GetClient();

/**
 * Posibles estados de una solicitud de clase.
 */
export const classRequestStates = ["Pending", "Approved", "Rejected"] as const;
export type ClassRequestState = (typeof classRequestStates)[number];

/**
 * Datos esperados al crear una nueva solicitud de clase.
 */
export interface CreateClassRequestBody {
  classOfferId: number;
  day: number;
  slot: number;
}

/**
 * Estructura de una solicitud de clase completa.
 */
export interface ClassRequestResponse {
  id: number;
  classOfferId: number;
  userId: number;
  state: ClassRequestState;
  createdAt: Date;
  classOffer: {
    id: number;
    title: string;
    authorId: number;
    price: number;
  };
}

/**
 * Estructura de una solicitud de clase vista por un tutor.
 */
export interface TutorClassRequestResponse {
  id: number;
  state: string;
  createdAt: Date;
  student: {
    id: number;
    username: string;
    email: string;
  };
  classOffer: {
    id: number;
    title: string;
    category: string;
    price: number;
  };
}

/**
 * Crea una nueva reserva para una clase existente.
 */
export const createClassRequestService = async (
  userId: number,
  body: CreateClassRequestBody,
) => {
  try {
    // Verificar que la clase exista
    const classOffer = await prisma.classOffer.findUnique({
      where: { id: body.classOfferId },
      select: {
        author: { select: { isDeleted: true, id: true } },
      },
    });

    if (!classOffer) {
      throw new HttpError(404, "La clase especificada no existe");
    }

    if (classOffer.author.id === userId) {
      throw new HttpError(
        403,
        "No puedes hacer una reserva en tu propia clase",
      );
    }

    if (classOffer.author.isDeleted === true) {
      throw new HttpError(
        403,
        "La cuenta del profesor asociado a la clase fue suspendida",
      );
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isDeleted: true },
    });

    if (user && user.isDeleted === true) {
      throw new HttpError(403, "Operación denegada, tu cuenta fue suspendida.");
    }

    const existingRequest = await prisma.classRequest.findFirst({
      where: {
        classOfferId: body.classOfferId,
        userId: userId,
        day: body.day,
        slot: body.slot,
      },
    });

    if (existingRequest) {
      throw new HttpError(
        409,
        "Ya existe una reserva para esta clase en ese horario",
      );
    }

    // Crear la reserva
    const newReservation = await prisma.classRequest.create({
      data: {
        classOfferId: body.classOfferId,
        userId: userId,
        state: "Pending", // estado inicial
        day: body.day,
        slot: body.slot,
      },
      select: {
        id: true,
        day: true,
        slot: true,
        createdAt: true,
        state: true,
        classOffer: {
          select: {
            title: true,
            price: true,
            category: true,
            author: {
              select: {
                username: true,
                first_name: true,
                last_name_1: true,
              },
            },
          },
        },
      },
    });

    const formattedCreatedAt = newReservation.createdAt
      .toISOString()
      .split("T")[0];

    return {
      ...newReservation,
      createdAt: formattedCreatedAt,
    };
  } catch (error: unknown) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error al crear la reserva");
  }
};

/**
 * Devuelve todas las reservas de un estudiante con paginación
 *
 * @param userId - ID del estudiante autenticado (desde el token)
 * @param page - Página actual (por defecto 1)
 * @param limit - Cantidad de resultados por página (por defecto 10)
 * @returns [classRequests, totalItems, totalPages]
 */
export const getUserClassRequestService = async (
  userId: number,
  page: number,
  limit: number,
) => {
  try {
    const offset = (page - 1) * limit;

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { isDeleted: true },
    });

    if (user && user.isDeleted === true) {
      throw new HttpError(403, "Operación denegada, tu cuenta fue suspendida.");
    }

    // Buscar reservas con datos de la clase
    const classRequests = await prisma.classRequest.findMany({
      where: { userId },
      select: {
        id: true,
        day: true,
        slot: true,
        createdAt: true,
        state: true,
        classOffer: {
          select: {
            title: true,
            price: true,
            category: true,
            author: {
              select: {
                username: true,
                first_name: true,
                last_name_1: true,
                isDeleted: true,
              },
            },
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    });

    const formattedClassRequests = classRequests.map((classReq) => {
      const formattedCreatedAt = classReq.createdAt.toISOString().split("T")[0];
      return { ...classReq, createdAt: formattedCreatedAt };
    });

    return formattedClassRequests;
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error al obtener las reservas del usuario");
  }
};

/**
 * Devuelve todas las solicitudes de clases recibidas por un tutor (paginadas)
 *
 * @param tutorId - ID del tutor autenticado (desde el token)
 * @param page - Página actual (por defecto 1)
 * @param limit - Cantidad de resultados por página (por defecto 10)
 */
export const getTutorClassRequestsService = async (
  tutorId: number,
  page: number,
  limit: number,
) => {
  try {
    const offset = (page - 1) * limit;

    const tutor = await prisma.user.findUnique({
      where: { id: tutorId },
      select: { isDeleted: true },
    });

    if (tutor && tutor.isDeleted === true) {
      throw new HttpError(403, "Operación denegada, tu cuenta fue suspendida.");
    }

    // Buscar solicitudes relacionadas con las clases del tutor
    const classRequests = await prisma.classRequest.findMany({
      where: {
        classOffer: { authorId: tutorId },
      },
      select: {
        id: true,
        state: true,
        day: true,
        slot: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            email: true,
            first_name: true,
            last_name_1: true,
            isDeleted: true,
          },
        },
        classOffer: {
          select: {
            title: true,
            category: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    const formattedClassRequests = classRequests.map((classReq) => {
      const formattedCreatedAt = classReq.createdAt.toISOString().split("T")[0];
      return { ...classReq, createdAt: formattedCreatedAt };
    });

    return formattedClassRequests;
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error al obtener las solicitudes del tutor");
  }
};

/**
 * Actualiza el estado de una solicitud de clase, validando que el tutor sea el autor.
 *
 * @param tutorId - ID del tutor autenticado (desde el token)
 * @param classRequestId - ID de la solicitud de clase
 * @param newState - Nuevo estado ('Approved' o 'Rejected')
 * @returns La solicitud actualizada
 */
export const updateClassRequestStateService = async (
  tutorId: number,
  classRequestId: number,
  newState: ClassRequestState,
) => {
  try {
    // Buscar la solicitud con su oferta asociada
    const classRequest = await prisma.classRequest.findUnique({
      where: { id: classRequestId },
      select: {
        state: true,
        classOffer: {
          select: {
            authorId: true,
            author: { select: { isDeleted: true } },
          },
        },
      },
    });

    if (!classRequest) {
      throw new HttpError(404, "La solicitud de clase no existe");
    }

    // Validar que el tutor sea el autor de la oferta
    if (classRequest.classOffer.authorId !== tutorId) {
      throw new HttpError(
        403,
        "No tienes permisos para modificar esta solicitud",
      );
    }

    if (classRequest.classOffer.author.isDeleted === true) {
      throw new HttpError(403, "Operación denegada, tu cuenta fue suspendida.");
    }

    // Actualizar el estado
    const updatedRequest = await prisma.classRequest.update({
      where: { id: classRequestId },
      data: { state: newState },
      select: {
        id: true,
        state: true,
        day: true,
        slot: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            email: true,
            first_name: true,
            last_name_1: true,
            isDeleted: true,
          },
        },
        classOffer: {
          select: {
            title: true,
            category: true,
            price: true,
          },
        },
      },
    });

    const formattedCreatedAt = updatedRequest.createdAt
      .toISOString()
      .split("T")[0];

    return { ...updatedRequest, createdAt: formattedCreatedAt };
  } catch (error: unknown) {
    console.error(error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error al actualizar el estado de la solicitud");
  }
};

/**
 * Obtiene las reservas de una clase específica del tutor autenticado
 * @param tutorId ID del tutor (desde token)
 * @param classOfferId ID de la clase a consultar
 * @param page Página actual (default 1)
 * @param limit Cantidad de resultados por página (default 10)
 */
export const getClassRequestsByClassService = async (
  tutorId: number,
  classOfferId: number,
  page: number,
  limit: number,
) => {
  try {
    // Validar que la clase exista y pertenezca al tutor
    const classOffer = await prisma.classOffer.findUnique({
      where: { id: classOfferId },
      select: { authorId: true, author: { select: { isDeleted: true } } },
    });

    if (!classOffer) {
      throw new HttpError(404, "La clase especificada no existe");
    }
    if (classOffer.authorId !== tutorId) {
      throw new HttpError(403, "No eres el tutor de esta clase");
    }
    if (classOffer.author.isDeleted === true) {
      throw new HttpError(403, "Operación denegada, tu cuenta fue suspendida.");
    }

    const offset = (page - 1) * limit;

    // Obtener reservas de la clase
    const classRequests = await prisma.classRequest.findMany({
      where: { classOfferId },
      select: {
        id: true,
        state: true,
        day: true,
        slot: true,
        createdAt: true,
        user: {
          select: {
            username: true,
            email: true,
            first_name: true,
            last_name_1: true,
            isDeleted: true,
          },
        },
        classOffer: {
          select: {
            title: true,
            category: true,
            price: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
      skip: offset,
      take: limit,
    });

    const formattedClassRequests = classRequests.map((classReq) => {
      const formattedCreatedAt = classReq.createdAt.toISOString().split("T")[0];
      return { ...classReq, createdAt: formattedCreatedAt };
    });

    return formattedClassRequests;
  } catch (error: unknown) {
    console.error("Error en getClassRequestsByClassService:", error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error al obtener las reservas de la clase");
  }
};
