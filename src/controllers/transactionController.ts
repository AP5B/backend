import { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import {
  checkOAuthService,
  createOAuthTokenService,
  refreshOAuthTokenService,
  getPreferenceService,
  updateTransactionService,
  RedirectPayload,
  redirectHandlerService,
  refundPaymentService,
} from "../services/transactionService";
import env from "../config/env";

export const getTrantactionController = async (req: Request, res: Response) => {
  const classResquestId = parseInt(req.params.classRequest as string);
  const userId = res.locals.user.id;

  if (isNaN(classResquestId)) {
    throw new HttpError(400, "classRequest debe ser un numero");
  }

  const response = await getPreferenceService(classResquestId, userId);
  const { transaction, preference, status } = response;

  const item =
    preference.items && preference.items.length > 0
      ? preference.items[0]
      : null;

  res.status(200).json({
    item: item,
    preferenceId: preference.id,
    transaction: transaction,
    status: status,
  });
};

export const updateTransactionController = async (
  req: Request,
  res: Response,
) => {
  const classResquestId = parseInt(req.params.classRequest as string);
  const status = req.query.status as string;
  const userId = res.locals.user.id;

  if (isNaN(classResquestId)) {
    throw new HttpError(400, "classRequest debe ser un numero");
  }

  await updateTransactionService(classResquestId, userId, status);

  res.status(200).json({
    message: "Transaccion actualizada exitosamente",
  });
};

export const refundTransactionController = async (
  req: Request,
  res: Response,
) => {
  const classResquestId = parseInt(req.params.classRequest as string);
  const userId = res.locals.user.id;

  const refund = await refundPaymentService(classResquestId, userId);

  res.status(200).json({
    status: refund.status,
    resaon: refund.reason,
    amount_refunded: refund.amount_refunded_to_payer,
  });
};

export const createOAuthTokenController = async (
  req: Request,
  res: Response,
) => {
  const code = req.query.code as string;
  const userId = res.locals.user.id;

  await createOAuthTokenService(code, userId);

  res.status(200).json({
    message: "OAuth token obtenido exitosamente",
  });
};

export const checkOAuthController = async (_req: Request, res: Response) => {
  const userId = res.locals.user.id;

  const response = await checkOAuthService(userId);
  res.status(200).json({
    message: response.message,
    hasOAuth: response.hasOAuth,
  });
};

export const refreshOAuthTokenController = async (
  req: Request,
  res: Response,
) => {
  const userId = parseInt(req.params.userId as string);

  if (isNaN(userId)) {
    throw new HttpError(400, "userId debe ser un numero");
  }

  await refreshOAuthTokenService(userId);

  res.status(200).json({
    message: "OAuth token refrescado exitosamente",
  });
};

export const webhookPaymentController = async (req: Request, res: Response) => {
  const { payment_id, status, external_reference, merchant_order_id } =
    req.query;
  const classRequestId = parseInt(req.params.classRequest as string, 10);

  //https://www.mercadopago.cl/developers/es/docs/your-integrations/notifications/webhooks#editor_2
  // const header = req.header("x-signature"); // TODO: Validar fuente

  if (Number.isNaN(classRequestId))
    throw new HttpError(400, "Invalid classRequest parameter");

  // Validate that all required properties exist
  if (
    typeof payment_id !== "string" ||
    typeof status !== "string" ||
    typeof external_reference !== "string" ||
    typeof merchant_order_id !== "string"
  ) {
    throw new HttpError(400, "Invalid query parameters for payment redirect");
  }

  const payload: RedirectPayload = {
    payment_id,
    status,
    external_reference,
    merchant_order_id,
  };

  await redirectHandlerService(classRequestId, payload);

  res.redirect(`${env.frontend_url}/courses/${classRequestId}`);
};
