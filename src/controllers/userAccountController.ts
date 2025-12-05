import { Request, Response } from "express";
import { deleteUserAccountService } from "../services/userAccountService";

export const deleteUserAccountController = async (
  req: Request,
  res: Response,
) => {
  const userId = parseInt(res.locals.user.id as string);

  await deleteUserAccountService(userId);

  res.status(200).json({
    message: "Cuenta eliminada con éxito",
  });
};
