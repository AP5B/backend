import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { HttpError } from "../middlewares/errorHandler";
import {
  registerRequestBody,
  registerUserService,
  refreshTokenService,
} from "../services/registerService";
import { generateTokens, setAuthCookies } from "../utils/setAuthCookies";

const roleByDomain = (email: string) => {
  const domain = email.split("@")[1] as string;
  if (["uc.cl", "estudiantes.uc.cl"].includes(domain)) {
    return "Teacher";
  }
  return "Student";
};

const validateRegisterBody = (body: registerRequestBody) => {
  const isEmail = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(body.email);

  if (body.username?.trim().length < 5 || body.username?.trim().length > 20)
    throw new HttpError(400, "El username debe tener entre 5 y 20 caracteres");
  if (!body.first_name?.trim())
    throw new HttpError(400, "El nombre no puede estar vacío");
  if (!body.last_name_1?.trim())
    throw new HttpError(400, "El primer apellido no puede estar vacío");
  if (!isEmail)
    throw new HttpError(400, "El email no tiene un formato válido");
  if (!body.password?.trim())
    throw new HttpError(400, "La contraseña no puede estar vacía");
  if (body.password !== body.confirm_password)
    throw new HttpError(400, "Las contraseñas no coinciden");
};

export const registerUserController = async (req: Request, res: Response) => {
  const reqBody = req.body as registerRequestBody;

  validateRegisterBody(reqBody);

  const role: UserRole = roleByDomain(reqBody.email);

  const norm_email = reqBody.email.toLowerCase();
  const { confirm_password: _ignore, ...rest } = reqBody;
  const registBody = { ...rest, email: norm_email, role: role };
  const newUser = await registerUserService(registBody);

  const { token, refreshToken } = generateTokens(
    newUser.id,
    newUser.email,
    newUser.role,
    newUser.username,
  );

  setAuthCookies(res, token, refreshToken);

  return res.status(201).json({
    user: newUser,
    token: token,
    refreshToken: refreshToken,
  });
};

export const refreshTokenController = async (req: Request, res: Response) => {
  const refreshToken = req.cookies["refresh_token"];

  if (!refreshToken) {
    throw new HttpError(400, "refreshToken faltante.");
  }

  const newTokens = await refreshTokenService(refreshToken);
  if (!newTokens) {
    throw new HttpError(401, "Autenticación denegada");
  }

  setAuthCookies(res, newTokens.token, newTokens.refreshToken);
  res.status(200).json({
    user: newTokens.user,
    token: newTokens.token,
    refreshToken: newTokens.refreshToken,
  });
};
