import { ClassRequestState, MercadopagoInfo } from "@prisma/client";
import { HttpError } from "../middlewares/errorHandler";
import PrismaManager from "../utils/prismaManager";
import { createPreferenceService } from "./transactionService";
import MercadoPagoConfig, { Preference } from "mercadopago";
import { PreferenceResponse } from "mercadopago/dist/clients/preference/commonTypes";

const prisma = PrismaManager.GetClient();

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
      where: { id: body.classOfferId, isDeleted: false },
      select: {
        authorId: true,
        price: true,
      },
    });

    if (!classOffer) {
      throw new HttpError(404, "La clase especificada no existe");
    }

    if (classOffer.authorId === userId) {
      throw new HttpError(
        403,
        "No puedes hacer una reserva en tu propia clase",
      );
    }

    const existingRequest = await prisma.classRequest.findFirst({
      where: {
        classOfferId: body.classOfferId,
        userId: userId,
        day: body.day,
        slot: body.slot,
      },
      select: { id: true },
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
        day: body.day,
        slot: body.slot,
        priceCreatedAt: classOffer.price,
      },
      select: {
        id: true,
        day: true,
        slot: true,
        createdAt: true,
        state: true,
        priceCreatedAt: true,
        classOffer: {
          select: {
            title: true,
            price: true,
            category: true,
            isDeleted: true,
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

    // Buscar reservas con datos de la clase
    const classRequestsRaw = await prisma.classRequest.findMany({
      where: { userId },
      select: {
        id: true,
        day: true,
        slot: true,
        createdAt: true,
        state: true,
        priceCreatedAt: true,
        transactions: {
          orderBy: { createdAt: "desc" },
          where: {
            status: { in: ["pending", "approved"] },
          },
          omit: {
            classRequestId: true,
          },
        },
        classOffer: {
          select: {
            id: true,
            title: true,
            price: true,
            category: true,
            isDeleted: true,
            author: {
              select: {
                username: true,
                first_name: true,
                last_name_1: true,
                isDeleted: true,
                mercadopagoInfo: true,
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

    const classRequests = [];

    for (const req of classRequestsRaw) {
      if (!req) continue;
      const transaction = req.transactions[0];

      let pref: PreferenceResponse | undefined;
      let sanPref: Partial<PreferenceResponse> = {};
      if (!transaction && req.state === ClassRequestState.PaymentPending) {
        const res = await createPreferenceService(req.id, userId);
        pref = res.preference;
      } else if (
        transaction &&
        req.state === ClassRequestState.PaymentPending
      ) {
        const teacherMearcadopago = req.classOffer.author
          .mercadopagoInfo as MercadopagoInfo;

        const authorClient = new MercadoPagoConfig({
          accessToken: teacherMearcadopago.accessToken,
        });

        const authorPreference = new Preference(authorClient);
        const res = await authorPreference.get({
          preferenceId: transaction.preferenceId,
        });
        pref = res;
      }

      if (pref) {
        sanPref = {
          init_point: pref?.init_point ?? "",
          items: pref?.items ?? [],
          date_created: pref?.date_created ?? "",
          client_id: pref?.client_id ?? "",
        };
      }

      classRequests.push({
        ...req,
        preference: sanPref ? pref : null,
      });
    }

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

    // Buscar solicitudes relacionadas con las clases del tutor
    const classRequests = await prisma.classRequest.findMany({
      where: {
        classOffer: {
          authorId: tutorId,
          isDeleted: false,
        },
      },
      select: {
        id: true,
        state: true,
        day: true,
        slot: true,
        createdAt: true,
        priceCreatedAt: true,
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
            isDeleted: true,
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

    // Actualizar el estado
    const updatedRequest = await prisma.classRequest.update({
      where: { id: classRequestId, classOffer: { isDeleted: false } },
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
      where: { id: classOfferId, isDeleted: false },
      select: { authorId: true },
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
      select: {
        id: true,
        state: true,
        day: true,
        slot: true,
        createdAt: true,
        priceCreatedAt: true,
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
            isDeleted: true,
          },
        },
        transactions: {
          select: {
            confirmCode: true,
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

/**
 * El profesor acepta una solicitud de clase, cambiando su estado a 'PaymentPending'
 * Para esperar que el estudiante realice el pago.
 */
export const acceptClassService = async (
  classRequestId: number,
  accept: boolean,
) => {
  try {
    const state = accept
      ? ClassRequestState.PaymentPending
      : ClassRequestState.Rejected;

    const updatedClassRequest = await prisma.classRequest.update({
      where: { id: classRequestId },
      data: { state: state },
    });

    return updatedClassRequest;
  } catch (error) {
    console.error(error);
    throw new HttpError(500, "Error al aceptar la solicitud de clase");
  }
};

/**
 * Confirma la transaccion y la bloquea para evitar refunds
 * @param code Codigo de confirmacion enviado al estudiante
 */
export const confirmClassService = async (
  classRequestId: number,
  code: string,
) => {
  const transaction = await prisma.transaction.findMany({
    where: { classRequestId: classRequestId },
    orderBy: { createdAt: "desc" },
  });

  if (!transaction[0])
    throw new HttpError(
      404,
      `No se encontro transaccion para la class request con id ${classRequestId}`,
    );

  if (transaction[0].confirmCode !== code)
    throw new HttpError(400, "Codigo de confirmacion invalido");

  const updatedClassRequest = await prisma.classRequest.update({
    where: { id: classRequestId },
    data: {
      state: ClassRequestState.Approved,
    },
  });

  return updatedClassRequest;
};

export const getClassRequestByIdService = async (classRequestId: number) => {
  try {
    const classReq = await prisma.classRequest.findUnique({
      where: { id: classRequestId },
      select: {
        id: true,
        day: true,
        slot: true,
        createdAt: true,
        state: true,
        priceCreatedAt: true,
        classOffer: {
          select: {
            title: true,
            price: true,
            category: true,
            isDeleted: true,
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
    });

    if (!classReq) {
      throw new HttpError(404, `La reserva especificada no existe.`);
    }

    const formattedCreatedAt = classReq.createdAt.toISOString().split("T")[0];
    return { ...classReq, createdAt: formattedCreatedAt };
  } catch (error) {
    console.error(error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, `Error interno del servidor: ${error}`);
  }
};

export const getUserReqInClassOfferService = async (
  userId: number,
  classOfferId: number,
) => {
  try {
    const classReqs = await prisma.classRequest.findMany({
      where: { userId: userId, classOfferId: classOfferId },
      select: {
        id: true,
        day: true,
        slot: true,
        createdAt: true,
        state: true,
        priceCreatedAt: true,
        classOffer: {
          select: {
            title: true,
            price: true,
            category: true,
            isDeleted: true,
            author: {
              select: {
                username: true,
                first_name: true,
                last_name_1: true,
                isDeleted: true,
                mercadopagoInfo: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          where: {
            status: { in: ["pending", "approved"] },
          },
          omit: {
            classRequestId: true,
          },
        },
      },
    });

    const classRequests = [];

    for (const req of classReqs) {
      if (!req) continue;
      const transaction = req.transactions[0];

      let pref: PreferenceResponse | undefined;
      let sanPref: Partial<PreferenceResponse> = {};
      if (!transaction && req.state === ClassRequestState.PaymentPending) {
        const res = await createPreferenceService(req.id, userId);
        pref = res.preference;
      } else if (
        transaction &&
        req.state === ClassRequestState.PaymentPending
      ) {
        const teacherMearcadopago = req.classOffer.author
          .mercadopagoInfo as MercadopagoInfo;

        const authorClient = new MercadoPagoConfig({
          accessToken: teacherMearcadopago.accessToken,
        });

        const authorPreference = new Preference(authorClient);
        const res = await authorPreference.get({
          preferenceId: transaction.preferenceId,
        });
        pref = res;
      }

      if (pref) {
        sanPref = {
          init_point: pref?.init_point ?? "",
          items: pref?.items ?? [],
          date_created: pref?.date_created ?? "",
          client_id: pref?.client_id ?? "",
        };
      }

      classRequests.push({
        ...req,
        preference: sanPref ? pref : null,
      });
    }

    const formattedClassRequests = classRequests.map((classReq) => {
      const formattedCreatedAt = classReq.createdAt.toISOString().split("T")[0];
      return { ...classReq, createdAt: formattedCreatedAt };
    });

    return formattedClassRequests;
  } catch (error) {
    console.error(error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, `Error interno del servidor: ${error}`);
  }
};

export const deleteClassRequestService = async (
  userId: number,
  classRequestId: number,
) => {
  try {
    const classRequest = await prisma.classRequest.findUnique({
      where: { id: classRequestId },
      select: { userId: true },
    });

    if (!classRequest) {
      throw new HttpError(404, "Reserva a eliminar no encontrada.");
    }

    if (userId !== classRequest.userId) {
      throw new HttpError(401, `El recurso no le pertenece al usuario actual.`);
    }

    await prisma.classRequest.delete({
      where: { id: classRequestId },
    });
  } catch (error) {
    console.error(error);
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, `Error interno del servidor: ${error}`);
  }
};
