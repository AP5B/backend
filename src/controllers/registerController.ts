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
  if (["uc.cl", "estudiante.uc.cl"].includes(domain)) {
    return "Teacher";
  }
  return "Student";
};

const validateRegisterBody = (body: registerRequestBody) => {
  const usernameRegex = /^[a-z0-9_]+$/;
  const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  const username = body.username;
  if (!username)
    throw new HttpError(400, "El username no puede estar vacío");
  if (username?.trim().length < 5 || username?.trim().length > 20)
    throw new HttpError(400, "El username debe tener entre 5 y 20 caracteres");
  if (!usernameRegex.test(username))
    throw new HttpError(400, "El username solo puede contener minúsculas, números y guiones bajos");

  const firstName = body.first_name;
  if (!firstName)
    throw new HttpError(400, "El nombre no puede estar vacío");
  if (firstName?.trim().length < 3 || firstName?.trim().length > 30)
    throw new HttpError(400, "El nombre debe tener entre 3 y 30 caracteres");
  const isFirstNameValid = nameRegex.test(firstName);
  if (!isFirstNameValid)
    throw new HttpError(400, "El nombre contiene caracteres inválidos");
  
  const firstLastName = body.last_name_1;
  if (!firstLastName)
    throw new HttpError(400, "El primer apellido no puede estar vacío");
  if (firstLastName?.trim().length < 3 || firstLastName?.trim().length > 30)
    throw new HttpError(400, "El primer apellido debe tener entre 3 y 30 caracteres");
  const isLastName1Valid = nameRegex.test(firstLastName);
  if (!isLastName1Valid)
    throw new HttpError(400, "El primer apellido contiene caracteres inválidos");

  const secondLastName = body.last_name_2;
  if (body.last_name_2) {
    if (!secondLastName)
      throw new HttpError(400, "El segundo apellido no puede estar vacío");
    if (secondLastName?.trim().length < 3 || secondLastName?.trim().length > 30)
      throw new HttpError(400, "El segundo apellido debe tener entre 3 y 30 caracteres");
    const isLastName2Valid = nameRegex.test(body.last_name_2);
    if (!isLastName2Valid)
      throw new HttpError(400, "El segundo apellido contiene caracteres inválidos");
  }

  // Eliminar estas validaciones una vez frontend elimine el envío del rol en el body
  const role: UserRole = roleByDomain(body.email);
  if (body.role !== role)
    throw new HttpError(400, "El rol no coincide con el dominio del email");
  if (body.role !== "Student" && body.role !== "Teacher" && body.role !== "Admin")
    throw new HttpError(400, "El rol debe ser 'Student', 'Teacher' o 'Admin'");

  const email = body.email;
  if (!email)
    throw new HttpError(400, "El email no puede estar vacío");
  if (email?.trim().length > 60)
    throw new HttpError(400, "El email no puede tener más de 60 caracteres");
  const isEmail = emailRegex.test(email);
  if (!isEmail)
    throw new HttpError(400, "El email no tiene un formato válido");

  const password = body.password;
  if (!password)
    throw new HttpError(400, "La contraseña no puede estar vacía");
  if (password?.trim().length < 8)
    throw new HttpError(400, "La contraseña debe tener al menos 8 caracteres");
  if (password !== body.confirm_password)
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
    message: "Usuario tipo " + role + " registrado correctamente",
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
