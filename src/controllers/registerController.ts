import { Request, Response } from "express";
import { UserRole } from "@prisma/client";
import { HttpError } from "../middlewares/errorHandler";
import {
  registerRequestBody,
  registerUserService,
  refreshTokenService,
} from "../services/registerService";
import { generateTokens, setAuthCookies } from "../utils/setAuthCookies";

const roleByDomain = (email: string): UserRole => {
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

  // Normalizaciones básicas
  const username = body.username;
  const firstName = body.first_name;
  const firstLastName = body.last_name_1;
  const secondLastName = body.last_name_2;
  const email = body.email;
  const password = body.password;

  // Username
  if (!username)
    throw new HttpError(400, "El username no puede estar vacío");
  if (username.length < 5 || username.length > 20)
    throw new HttpError(400, "El username debe tener entre 5 y 20 caracteres");
  if (!usernameRegex.test(username))
    throw new HttpError(
      400,
      "El username solo puede contener minúsculas, números y guiones bajos",
    );

  // Nombre
  if (!firstName)
    throw new HttpError(400, "El nombre no puede estar vacío");
  if (firstName.length < 3 || firstName.length > 30)
    throw new HttpError(400, "El nombre debe tener entre 3 y 30 caracteres");
  if (!nameRegex.test(firstName))
    throw new HttpError(
      400,
      "El nombre solo puede contener letras, espacios, apóstrofes y guiones",
    );

  // Primer apellido
  if (!firstLastName)
    throw new HttpError(400, "El primer apellido no puede estar vacío");
  if (firstLastName.length < 3 || firstLastName.length > 30)
    throw new HttpError(
      400,
      "El primer apellido debe tener entre 3 y 30 caracteres",
    );
  if (!nameRegex.test(firstLastName))
    throw new HttpError(
      400,
      "El primer apellido contiene caracteres inválidos",
    );

  // Segundo apellido (opcional)
  if (body.last_name_2) {
    if (!secondLastName)
      throw new HttpError(400, "El segundo apellido no puede estar vacío");
    if (secondLastName.length < 3 || secondLastName.length > 30)
      throw new HttpError(
        400,
        "El segundo apellido debe tener entre 3 y 30 caracteres",
      );
    if (!nameRegex.test(secondLastName))
      throw new HttpError(
        400,
        "El segundo apellido contiene caracteres inválidos",
      );
  }

  // Email
  if (!email)
    throw new HttpError(400, "El email no puede estar vacío");
  if (email.length > 60)
    throw new HttpError(400, "El email no puede tener más de 60 caracteres");
  if (!emailRegex.test(email))
    throw new HttpError(400, "El email no tiene un formato válido");

  // Password
  if (!password)
    throw new HttpError(400, "La contraseña no puede estar vacía");
  if (password.trim().length < 8)
    throw new HttpError(
      400,
      "La contraseña debe tener al menos 8 caracteres",
    );
  if (password !== body.confirm_password)
    throw new HttpError(400, "Las contraseñas no coinciden");
};

export const registerUserController = async (req: Request, res: Response) => {
  const reqBody = req.body as registerRequestBody;

  validateRegisterBody(reqBody);

  const norm_email = reqBody.email.trim().toLowerCase();
  const role: UserRole = roleByDomain(norm_email);

  const { confirm_password: _ignore, ...rest } = reqBody;
  const registBody = { ...rest, email: norm_email, role };

  const newUser = await registerUserService(registBody);

  const { token, refreshToken } = generateTokens(
    newUser.id,
    newUser.email,
    newUser.role,
    newUser.username,
  );

  setAuthCookies(res, token, refreshToken);

  const { password:_password, ...userWithoutPassword } = newUser;

  return res.status(201).json({
    user: userWithoutPassword,
    token,
    refreshToken,
    message: "Usuario tipo " + role + " registrado correctamente",
  });
};

export const refreshTokenController = async (req: Request, res: Response) => {
  const refreshToken = req.cookies["refresh_token"];

  if (!refreshToken) {
    throw new HttpError(400, "refreshToken faltante.");
  }

  const newTokens = await refreshTokenService(refreshToken);

  setAuthCookies(res, newTokens.token, newTokens.refreshToken);
  res.status(200).json({
    user: newTokens.user,
    token: newTokens.token,
    refreshToken: newTokens.refreshToken,
  });
};
