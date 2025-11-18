import { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import {
  checkOAuthService,
  createOAuthTokenService,
  refreshOAuthTokenService,
  getPreferenceService,
  updateTransactionService,
} from "../services/transactionService";

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
  const hasOAuth = await checkOAuthService(userId);

  res.status(200).json({
    message: hasOAuth
      ? "Usuario tiene OAuth con MercadoPago"
      : "Usuario no tiene OAuth con MercadoPago",
    hasOAuth: hasOAuth,
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
