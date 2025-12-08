import env from "../config/env";
import { ClassRequestState, MercadopagoInfo, User } from "@prisma/client";
import PrismaManager from "../utils/prismaManager";
import {
  MercadoPagoConfig,
  Preference,
  OAuth,
  PaymentRefund,
} from "mercadopago";
import { HttpError } from "../middlewares/errorHandler";

const client = new MercadoPagoConfig({
  accessToken: env.mp_access_token,
  options: { timeout: 5000 },
});
// const preference = new Preference(client);
const oauth = new OAuth(client);
const paymetRefund = new PaymentRefund(client);

const prisma = PrismaManager.GetClient();

export interface RedirectPayload {
  payment_id: string;
  status: string;
  external_reference: string;
  merchant_order_id: string;
}

/**
 * crea una preferencia de pago y unta transaccion asociada a una class request
 */
export const createPreferenceService = async (
  classRequestId: number,
  userId: number,
) => {
  try {
    const classRequest = await prisma.classRequest.findUnique({
      where: { id: classRequestId },
    });

    if (!classRequest)
      throw new HttpError(
        404,
        `Class Request con id ${classRequestId} no encontrada`,
      );
    if (classRequest.userId !== userId)
      throw new HttpError(
        403,
        "No tienes permiso para acceder a esta class request",
      );

    const classOffer = await prisma.classOffer.findUnique({
      where: { id: classRequest.classOfferId },
      include: {
        author: {
          include: {
            mercadopagoInfo: true,
          },
        },
      },
    });

    if (!classOffer)
      throw new HttpError(
        404,
        `Class Offer con id ${classRequest.classOfferId} no encontrada`,
      );

    const author = classOffer?.author as User;
    const mercadopago = classOffer?.author.mercadopagoInfo;

    if (author.id === userId)
      throw new HttpError(400, "No puedes solicitar una clase propia");
    if (!mercadopago)
      throw new HttpError(
        400,
        "El autor de la clase no ha vinculado su cuenta de MercadoPago",
      );
    if (mercadopago.accessTokenExpiration < new Date()) {
      await refreshOAuthTokenService(author.id);
    }

    const userClient = new MercadoPagoConfig({
      accessToken: mercadopago.accessToken,
    });
    const userPreference = new Preference(userClient);

    const pref = await userPreference.create({
      body: {
        back_urls: {
          success: `${env.backend_url}/transactions/wh/success/${classRequest.classOfferId}/`,
          failure: `${env.backend_url}/transactions/wh/failure/${classRequest.classOfferId}/`,
          pending: `${env.backend_url}/transactions/wh/pending/${classRequest.classOfferId}/`,
        },
        auto_return: "approved",
        items: [
          {
            id: `${classRequest.id}`,
            title: classOffer.title,
            description: classOffer.description,
            quantity: 1,
            unit_price: classOffer.price,
          },
        ],
        marketplace_fee: 0, // WARN: Comision del 0% para nosotros
      },
    });

    if (!pref || !pref.id) {
      throw new HttpError(500, "No se pudo crear la preferencia de pago");
    }

    const transaction = await prisma.transaction.create({
      data: {
        preferenceId: pref.id,
        classRequestId: classRequestId,
      },
    });

    return {
      transaction: transaction,
      preference: pref,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.error(error);
    throw new HttpError(500, "Error al crear la preferencia de pago");
  }
};

export const getPreferenceService = async (
  classRequestId: number,
  userId: number,
) => {
  try {
    const classRequest = await prisma.classRequest.findFirst({
      where: { id: classRequestId },
      include: {
        classOffer: {
          include: {
            author: {
              include: {
                mercadopagoInfo: true,
              },
            },
          },
        },
        transactions: {
          orderBy: { createdAt: "desc" },
          where: {
            status: { in: ["pending"] },
          },
        },
      },
    });

    if (!classRequest)
      throw new HttpError(
        404,
        "Class Request con id ${ classRequestId } no encontrada",
      );
    if (userId !== classRequest?.userId)
      throw new HttpError(
        403,
        "No tienes permiso para acceder a esta class request",
      );

    let transaction = classRequest.transactions[0];
    let pref;

    // NOTE: Si no existe una transacción en estado pending para esta clase
    // creamos una junto a su preferencia
    if (!transaction) {
      const res = await createPreferenceService(classRequestId, userId);
      transaction = res.transaction;
      pref = res.preference;
    } else {
      const teacherMearcadopago = classRequest.classOffer.author
        .mercadopagoInfo as MercadopagoInfo;

      const authorClient = new MercadoPagoConfig({
        accessToken: teacherMearcadopago.accessToken,
      });

      const authorPreference = new Preference(authorClient);
      pref = await authorPreference.get({
        preferenceId: transaction.preferenceId,
      });
    }

    return {
      preference: pref,
      transaction: transaction,
      status: transaction.status,
    };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, "Error al obtener la preferencia de pago");
  }
};

export const createOAuthTokenService = async (code: string, userId: number) => {
  try {
    const response = await oauth.create({
      body: {
        client_id: env.mp_client_id,
        client_secret: env.mp_client_secret,
        code: code,
        redirect_uri: env.mp_redirect_uri,
      },
    });

    const { refresh_token, access_token, expires_in } = response;

    if (!access_token || !refresh_token || !expires_in) {
      throw new HttpError(500, "No se pudieron refrescar los tokens de OAuth");
    }

    const accessTokenExpiration = new Date(Date.now() + expires_in * 1000);
    const refreshTokenExpiration = new Date(
      Date.now() + 180 * 24 * 60 * 60 * 1000,
    ); // 6 meses

    await prisma.mercadopagoInfo.upsert({
      where: { userId },
      update: {
        accessToken: access_token,
        refreshToken: refresh_token,
        accessTokenExpiration,
        refreshTokenExpiration,
      },
      create: {
        userId,
        accessToken: access_token,
        refreshToken: refresh_token,
        accessTokenExpiration,
        refreshTokenExpiration,
      },
    });

    return response;
  } catch (error: unknown) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.error(error);
    throw new HttpError(500, "Error en el proceso de OAuth con MercadoPago");
  }
};

export const updateTransactionService = async (
  classRequestId: number,
  userId: number,
  status: string,
) => {
  try {
    const classRequest = await prisma.classRequest.findUnique({
      where: { id: classRequestId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });
    const transaction = classRequest?.transactions[0];

    if (!classRequest)
      throw new HttpError(
        404,
        `Class Request con id ${classRequestId} no encontrada`,
      );
    if (!transaction)
      throw new HttpError(
        404,
        `No se encontro transaccion para la class request con id ${classRequestId}`,
      );
    if (userId !== classRequest.userId)
      throw new HttpError(
        403,
        "No tienes permiso para actualizar esta transaccion",
      );

    const updatedTransaction = await prisma.transaction.update({
      where: { id: transaction.id },
      data: { status: status },
    });

    return updatedTransaction;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, "Error al actualizar la transaccion");
  }
};

export const checkOAuthService = async (userId: number) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { mercadopagoInfo: true },
    });

    const mercadopago = user?.mercadopagoInfo;

    if (!user)
      return {
        status: 404,
        message: "Usuario no encontrado",
        hasOAuth: false,
      };

    if (!mercadopago)
      return {
        status: 400,
        message: "El usuario no ha vinculado su cuenta de MercadoPago",
        hasOAuth: false,
      };

    if (mercadopago.accessTokenExpiration < new Date()) {
      if (mercadopago.refreshTokenExpiration < new Date()) {
        return {
          status: 400,
          message:
            "El token de refresco ha expirado, el usuario debe volver a vincular su cuenta de MercadoPago",
          hasOAuth: false,
        };
      }
      await refreshOAuthTokenService(userId);
    }

    return {
      status: 200,
      message: "Usuario tiene OAuth con MercadoPago",
      hasOAuth: true,
    };
  } catch (error) {
    console.error(error);
    throw new HttpError(500, "Error al verificar el estado de OAuth");
  }
};

export const refreshOAuthTokenService = async (userId: number) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { mercadopagoInfo: true },
    });

    const mercadopago = user?.mercadopagoInfo;

    if (!user) throw new HttpError(404, "Usuario no encontrado");
    if (!mercadopago)
      throw new HttpError(
        400,
        "El usuario no ha vinculado su cuenta de MercadoPago",
      );
    if (mercadopago.refreshTokenExpiration < new Date())
      throw new HttpError(
        400,
        "El token de refresco ha expirado, el usuario debe volver a vincular su cuenta de MercadoPago",
      );

    const response = await oauth.refresh({
      body: {
        client_id: env.mp_client_id,
        client_secret: env.mp_client_secret,
        refresh_token: mercadopago.refreshToken,
      },
    });

    const { refresh_token, access_token, expires_in } = response;

    if (!access_token || !refresh_token || !expires_in) {
      throw new HttpError(500, "No se pudieron refrescar los tokens de OAuth");
    }

    const accessTokenExpiration = new Date(Date.now() + expires_in * 1000);
    const refreshTokenExpiration = new Date(
      Date.now() + 180 * 24 * 60 * 60 * 1000,
    ); // 6 meses

    await prisma.mercadopagoInfo.update({
      where: { userId },
      data: {
        userId,
        accessToken: access_token,
        refreshToken: refresh_token,
        accessTokenExpiration,
        refreshTokenExpiration,
      },
    });

    return response;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    throw new HttpError(500, "Error al refrescar los tokens de OAuth");
  }
};

export const refundPaymentService = async (
  classRequestId: number,
  userId: number,
) => {
  const classRequest = await prisma.classRequest.findUnique({
    where: { id: classRequestId },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  const noPagado: ClassRequestState[] = [
    ClassRequestState.PaymentPending,
    ClassRequestState.Created,
  ];

  if (!classRequest)
    throw new HttpError(
      404,
      `Class Request con id ${classRequestId} no encontrada`,
    );
  if (classRequest.userId !== userId)
    throw new HttpError(
      403,
      "No tienes permiso para acceder a esta oferta de clase",
    );
  if (noPagado.includes(classRequest.state))
    throw new HttpError(400, "La class request aun no ha sido pagada");
  if (classRequest.state === ClassRequestState.Approved)
    throw new HttpError(400, "No se puede reembolsar una clase aprobada");
  if (classRequest.state === ClassRequestState.PaymentRefunded)
    throw new HttpError(400, "La class request ya ha sido reembolsada");

  const transaction = classRequest?.transactions[0];

  if (!transaction?.paymentId)
    throw new HttpError(400, "La transaccion no tiene un pago asociado");

  console.log("se va a refundear");

  const refund = await paymetRefund.create({
    payment_id: transaction.paymentId,
  });

  console.log(refund);

  return refund;
};

export const redirectHandlerService = async (
  classRequestId: number,
  payload: RedirectPayload,
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

  const code = (Math.floor(Math.random() * 9000) + 1000).toString(); //numero random de 4 digitos

  await prisma.transaction.update({
    where: { id: transaction[0].id },
    data: {
      paymentId: payload.payment_id,
      status: payload.status,
      confirmCode: code,
    },
  });

  await prisma.classRequest.update({
    where: { id: classRequestId },
    data: {
      state: ClassRequestState.Paid,
    },
  });
};
