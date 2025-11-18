import env from "../config/env";
import { User } from "@prisma/client";
import PrismaManager from "../utils/prismaManager";
import { MercadoPagoConfig, Preference, OAuth } from "mercadopago";
import { HttpError } from "../middlewares/errorHandler";

const client = new MercadoPagoConfig({
  accessToken: env.mp_access_token,
  options: { timeout: 5000 },
});
const preference = new Preference(client);
const oauth = new OAuth(client);

const prisma = PrismaManager.GetClient();

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
          success:
            "https://frontend-software-eight.vercel.app/transaction/success", // WARN: placeholders ?
          failure:
            "https://frontend-software-eight.vercel.app/transaction/failure",
          pending:
            "https://frontend-software-eight.vercel.app/transaction/pending",
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
        transactions: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!classRequest)
      throw new HttpError(
        404,
        `Class Request con id ${classRequestId} no encontrada`,
      );
    if (userId !== classRequest?.userId)
      throw new HttpError(
        403,
        "No tienes permiso para acceder a esta class request",
      );

    let transaction = classRequest.transactions[0];
    let pref;

    if (!transaction) {
      const res = await createPreferenceService(classRequestId, userId);
      transaction = res.transaction;
      pref = res.preference;
    } else {
      pref = await preference.get({ preferenceId: transaction.preferenceId });
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

    await prisma.mercadopagoInfo.create({
      data: {
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

    if (!user) throw new HttpError(404, "Usuario no encontrado");
    if (!mercadopago)
      throw new HttpError(
        400,
        "El usuario no ha vinculado su cuenta de MercadoPago",
      );
    if (mercadopago.accessTokenExpiration < new Date()) {
      if (mercadopago.refreshTokenExpiration < new Date()) {
        throw new HttpError(
          400,
          "El token de refresco ha expirado, el usuario debe volver a vincular su cuenta de MercadoPago",
        );
      }
      await refreshOAuthTokenService(userId);
    }

    return true;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
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
  }
};

// preference.create({
//   body: {
//     back_urls: { // WARN: Es necesario que estas url llamen al backend para actualizar el estado de la transaccion
//       success: "https://frontend-software-eight.vercel.app/trans/success", // WARN: placeholder para testear
//       failure: "https://frontend-software-eight.vercel.app/trans/failure",
//       pending: "https://frontend-software-eight.vercel.app/trans/pending"
//     },
//     auto_return: "approved",
//     items: [
//       {
//         id: `1`,
//         title: "titulo",
//         description: "descripcion",
//         quantity: 1,
//         unit_price: 1
//       }
//     ],
//   }
// }).then(console.log).catch(console.error);
