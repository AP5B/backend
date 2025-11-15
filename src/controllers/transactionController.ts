import { Request, Response } from "express";
import {
  commitTransactionService,
  createTransactionService,
  statusTransactionService,
} from "../services/transactionServices";
import { endpoints } from "../routes/transactionRoutes";
import { HttpError } from "../middlewares/errorHandler";
import env from "../config/env";

export const createTransactionController = async (
  req: Request,
  res: Response,
) => {
  const classRequest = parseInt(req.params.classRequest as string);
  const callbackUrl = `${req.protocol}://${req.headers.host}${req.baseUrl}${endpoints.commit}`;

  if (Number.isNaN(classRequest)) {
    throw new HttpError(400, "classrequest debe ser un número");
  }

  const createResponse = await createTransactionService(
    classRequest,
    callbackUrl,
  );

  const { token, url } = createResponse;

  const fullUrl = `${url}?token_ws=${token}`;

  res.status(200).json({
    url,
    token,
    fullUrl,
  });
};

export const commitTransactionController = async (
  req: Request,
  res: Response,
) => {
  console.log(req.query);
  await commitTransactionService(req.query.token_ws as string);

  res.redirect(`${env.frontendUrl}?token_ws=${req.query.token_ws}`); // WARN: esto se puede manejar de mejor forma?
};

export const statusTransactionController = async (
  req: Request,
  res: Response,
) => {
  const classRequestId = parseInt(req.params.classRequest as string);

  if (Number.isNaN(classRequestId)) {
    throw new HttpError(400, "classRequest debe ser un número");
  }

  const statusResponse = await statusTransactionService(classRequestId);

  res.status(200).json(statusResponse);
};
