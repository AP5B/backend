/* Ints
 * |---------------------|---------------------|---------------------------------------------------------------------------|
 * | Tipo de tarjeta     | Detalle             | Resultado                                                                 |
 * |---------------------|---------------------|---------------------------------------------------------------------------|
 * | VISA                | 4051 8856 0044 6623 | CVV 123, cualquier fecha de expiración → Genera transacciones aprobadas.  |
 * | AMEX                | 3700 0000 0002 032  | CVV 1234, cualquier fecha de expiración → Genera transacciones aprobadas. |
 * | MASTERCARD          | 5186 0595 5959 0568 | CVV 123, cualquier fecha de expiración → Genera transacciones rechazadas. |
 * | Redcompra           | 4051 8842 3993 7763 | Genera transacciones aprobadas (débito Redcompra).                        |
 * | Redcompra           | 4511 3466 6003 7060 | Genera transacciones aprobadas (débito Redcompra).                        |
 * | Redcompra           | 5186 0085 4123 3829 | Genera transacciones rechazadas (débito Redcompra).                       |
 * | Prepago VISA        | 4051 8860 0005 6590 | CVV 123, cualquier fecha de expiración → Genera transacciones aprobadas.  |
 * | Prepago MASTERCARD  | 5186 1741 1062 9480 | CVV 123, cualquier fecha de expiración → Genera transacciones rechazadas. |
 * |---------------------|---------------------|---------------------------------------------------------------------------|
 */

import { Environment, Options, WebpayPlus } from "transbank-sdk";

import env from "../config/env";
import { HttpError } from "../middlewares/errorHandler";
import PrismaManager from "../utils/prismaManager";

const prisma = PrismaManager.GetClient();

const tx = new WebpayPlus.Transaction(
  new Options(
    env.comerceCode,
    env.comerceApiKey,
    Environment.Integration, // WARN: esto quedara en modo integracion para siempre?
  ),
);

interface CreateTransactionResponse {
  token: string;
  url: string;
}

// https://www.transbankdevelopers.cl/producto/webpay#vci
enum VCI {
  TSY,
  TSN,
  NP,
  U3,
  INV,
  A,
  CNP1,
  EOP,
  BNA,
  ENA,
}

export enum PaymentStatus {
  INITIALIZE,
  AUTHORIZED,
  FAILED,
}

interface CardDetail {
  card_number: string; // Últimos 4 dígitos de la tarjeta
}

interface TransactionStatus {
  amount: number;
  status: TransactionStatus;
  buy_order: string;
  session_id: string;
  accounting_date: string;
  transaction_date: string;
  installments_number: number;
}

interface CommitTransactionStatus extends TransactionStatus {
  vci: VCI;
  card_detail: CardDetail;
  authorization_code: string;
  payment_type_code: string;
  response_code: number;
}

export const createTransactionService = async (
  classRequestId: number,
  callbackEnpoint: string,
) => {
  try {
    const result = await prisma.$transaction(async (prisma) => {
      const classRequest = await prisma.classRequest.findUnique({
        where: { id: classRequestId },
        include: {
          classOffer: true,
        },
      });

      if (!classRequest) {
        throw new HttpError(
          404,
          `No existe una oferta de clase con id ${classRequestId}.`,
        );
      }

      const { price: amount, authorId: sessionId } = classRequest.classOffer;

      const createResponse: CreateTransactionResponse = await tx.create(
        `${classRequestId}`, // buyOrder
        `${sessionId}`, // sessionId
        amount, // amount
        callbackEnpoint, // returnUrl
      );

      await prisma.transaction.create({
        // WARN: evaluar la opcion de ocupar upsert y modificar la relacion de 1..N -> 1..1
        data: {
          amount,
          classRequestId,
          token: createResponse.token,
          payment_date: new Date(), // FIX: que diferencia tiene con createdAt?
        },
      });

      return createResponse;
    });

    return result;
  } catch (error) {
    console.log(error);
    throw new HttpError(500, "Error al crear la transacción de pago");
  }
};

export const commitTransactionService = async (token: string) => {
  const commitResponse: CommitTransactionStatus = await tx.commit(token);
  return commitResponse;
};

export const statusTransactionService = async (classRequestId: number) => {
  try {
    const classRequest = await prisma.classRequest.findUnique({
      where: { id: classRequestId },
      include: {
        transaction: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!classRequest) {
      throw new HttpError(
        404,
        `No existe una oferta de clase con id ${classRequestId}.`,
      );
    }

    const latestTransaction = classRequest.transaction?.[0];

    if (!latestTransaction) {
      throw new HttpError(
        404,
        `No existe una transacción asociada a la clase con id ${classRequestId}.`,
      );
    }

    const statusResponse: TransactionStatus | CommitTransactionStatus =
      await tx.status(latestTransaction.token);
    return statusResponse;
  } catch (error) {
    console.log(error);
    throw new HttpError(
      500,
      "Error al obtener el estado de la transacción de pago",
    );
  }
};
