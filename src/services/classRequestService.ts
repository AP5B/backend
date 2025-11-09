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
  body: CreateClassRequestBody,) => {
  try {
    // Verificar que la clase exista
    const classOffer = await prisma.classOffer.findUnique({
      where: { id: body.classOfferId },
    });
    if (!classOffer) {
      throw new HttpError(404, "La clase especificada no existe");
    }

    // Verificar que el usuario exista
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new HttpError(404, "El usuario especificado no existe");
    }

    // POSIBLE ELIMINACIÓN: PUEDE QUE UN USER SI PUEDA TENER MAS DE UNA RESERVA PARA LA MISMA CLASE
    // // Verificar si ya existe una reserva del mismo usuario para esta clase
    // const existingRequest = await prisma.classRequest.findFirst({
    //   where: {
    //     classOfferId: body.classOfferId,
    //     userId,
    //   },
    // });

    // if (existingRequest) {
    //   throw new HttpError(409, "Ya existe una reserva para esta clase");
    // }

    // Crear la reserva
    const newReservation = await prisma.classRequest.create({
      data: {
        classOfferId: body.classOfferId,
        userId,
        state: "Pending", // estado inicial
      },
      include: {
        classOffer: {
          select: { id: true, title: true, authorId: true, price: true },
        },
      },
    });

    return newReservation as ClassRequestResponse;
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
  limit: number, ) => {
  try {
    // Validar existencia del usuario
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    if (!user) {
      throw new HttpError(404, "El usuario especificado no existe");
    }

    const offset = (page - 1) * limit;

    // Buscar reservas con datos de la clase
    const classRequests = await prisma.classRequest.findMany({
      where: { userId },
      include: {
        classOffer: {
          select: {
            id: true,
            title: true,
            authorId: true,
            price: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      skip: offset,
      take: limit,
    });

    const totalItems = await prisma.classRequest.count({ where: { userId } });
    const totalPages = Math.ceil(totalItems / limit);

    return [classRequests as ClassRequestResponse[], totalItems, totalPages];
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
    // Validar existencia del tutor
    const tutor = await prisma.user.findUnique({
      where: { id: tutorId },
    });
    if (!tutor) {
      throw new HttpError(404, "El tutor especificado no existe");
    }

    const offset = (page - 1) * limit;

    // Buscar solicitudes relacionadas con las clases del tutor
    const classRequests = await prisma.classRequest.findMany({
      where: {
        classOffer: { authorId: tutorId },
      },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        classOffer: {
          select: {
            id: true,
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

    const totalItems = await prisma.classRequest.count({
      where: { classOffer: { authorId: tutorId } },
    });
    const totalPages = Math.ceil(totalItems / limit);

    // Mapear al formato de respuesta deseado
    const data: TutorClassRequestResponse[] = classRequests.map((cr) => ({
      id: cr.id,
      state: cr.state,
      createdAt: cr.createdAt,
      student: {
        id: cr.user.id,
        username: cr.user.username,
        email: cr.user.email,
      },
      classOffer: {
        id: cr.classOffer.id,
        title: cr.classOffer.title,
        category: cr.classOffer.category,
        price: cr.classOffer.price,
      },
    }));

    return { data, totalItems, totalPages };
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
  newState: ClassRequestState ) => {
  try {
    // Buscar la solicitud con su oferta asociada
    const classRequest = await prisma.classRequest.findUnique({
      where: { id: classRequestId },
      include: {
        classOffer: { select: { authorId: true } },
      },
    });

    if (!classRequest) {
      throw new HttpError(404, "La solicitud de clase no existe");
    }

    // Validar que el tutor sea el autor de la oferta
    if (classRequest.classOffer.authorId !== tutorId) {
      throw new HttpError(403, "No tienes permisos para modificar esta solicitud");
    }

    // Validar que el estado sea distinto
    if (classRequest.state === newState) {
      throw new HttpError(400, "La solicitud ya se encuentra en este estado");
    }

    // Validar que el nuevo estado sea válido
    if (!["Approved", "Rejected", "Pending"].includes(newState)) {
      throw new HttpError(400, "Estado inválido");
    }

    // Actualizar el estado
    const updatedRequest = await prisma.classRequest.update({
      where: { id: classRequestId },
      data: { state: newState },
      include: {
        classOffer: {
          select: { id: true, title: true },
        },
      },
    });

    return updatedRequest;
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
  limit: number ) => {
  try {
    // Validar que la clase exista y pertenezca al tutor
    const classOffer = await prisma.classOffer.findUnique({
      where: { id: classOfferId },
    });
    if (!classOffer) {
      throw new HttpError(404, "La clase especificada no existe");
    }
    if (classOffer.authorId !== tutorId) {
      throw new HttpError(403, "No eres el tutor de esta clase");
    }

    const offset = (page - 1) * limit;

    // Obtener reservas de la clase
    const classRequests = await prisma.classRequest.findMany({
      where: { classOfferId },
      include: {
        user: {
          select: {
            id: true,
            username: true,
            email: true,
          },
        },
        classOffer: {
          select: {
            id: true,
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

    const totalItems = await prisma.classRequest.count({
      where: { classOfferId },
    });
    const totalPages = Math.ceil(totalItems / limit);

    // Formatear respuesta según TutorClassRequestResponse
    const data: TutorClassRequestResponse[] = classRequests.map((cr) => ({
      id: cr.id,
      state: cr.state,
      createdAt: cr.createdAt,
      student: {
        id: cr.user.id,
        username: cr.user.username,
        email: cr.user.email,
      },
      classOffer: {
        id: cr.classOffer.id,
        title: cr.classOffer.title,
        category: cr.classOffer.category,
        price: cr.classOffer.price,
      },
    }));

    return { data, totalItems, totalPages };
  } catch (error: unknown) {
    console.error("Error en getClassRequestsByClassService:", error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error al obtener las reservas de la clase");
  }
};
