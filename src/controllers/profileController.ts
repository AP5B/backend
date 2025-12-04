import { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import {
  changeUserPassword,
  updateUserNames,
} from "../services/profileServices";

interface ChangePasswordBody {
  userId: number;
  current_password: string;
  new_password: string;
  confirm_password?: string;
}

interface UpdateNamesBody {
  userId: number;
  current_password: string;
  first_name?: string;
  last_name_1?: string;
  last_name_2?: string | null;
  phone?: string | null;
}

const nameRegex = /^[a-zA-ZÀ-ÿ\s'-]+$/;

export const changePasswordController = async (req: Request, res: Response) => {
  const body = req.body as ChangePasswordBody;

  if (!body) throw new HttpError(400, "Cuerpo de la petición vacío.");
  const userIdFromToken = parseInt(res.locals.user.id as string);

  if (!body.userId || body.userId !== userIdFromToken) {
    throw new HttpError(401, "No autorizado para modificar este usuario.");
  }

  if (!body.current_password) throw new HttpError(400, "Contraseña actual faltante.");
  if (!body.new_password) throw new HttpError(400, "Nueva contraseña faltante.");
  if (body.new_password.trim().length < 5)
    throw new HttpError(400, "La contraseña debe tener al menos 5 caracteres");
  if (body.confirm_password && body.new_password !== body.confirm_password)
    throw new HttpError(400, "Las contraseñas no coinciden.");

  const updatedUser = await changeUserPassword(
    userIdFromToken,
    body.current_password,
    body.new_password,
  );

  res.status(200).json({ message: "Contraseña actualizada con éxito.", user: updatedUser });
};

export const updateNamesController = async (req: Request, res: Response) => {
  const body = req.body as UpdateNamesBody;
  if (!body) throw new HttpError(400, "Cuerpo de la petición vacío.");

  const userIdFromToken = parseInt(res.locals.user.id as string);
  if (!body.userId || body.userId !== userIdFromToken) {
    throw new HttpError(401, "No autorizado para modificar este usuario.");
  }

  if (!body.current_password) throw new HttpError(400, "Contraseña actual faltante.");

  // Validate provided name fields
  const sanitized: any = {};
  if (typeof body.first_name !== "undefined") {
    if (!body.first_name) throw new HttpError(400, "El nombre no puede estar vacío.");
    if (body.first_name.length < 3 || body.first_name.length > 30)
      throw new HttpError(400, "El nombre debe tener entre 3 y 30 caracteres");
    if (!nameRegex.test(body.first_name))
      throw new HttpError(400, "El nombre solo puede contener letras, espacios, apóstrofes y guiones.");
    sanitized.first_name = body.first_name;
  }

  if (typeof body.last_name_1 !== "undefined") {
    if (!body.last_name_1) throw new HttpError(400, "El primer apellido no puede estar vacío.");
    if (body.last_name_1.length < 3 || body.last_name_1.length > 30)
      throw new HttpError(400, "El primer apellido debe tener entre 3 y 30 caracteres.");
    if (!nameRegex.test(body.last_name_1))
      throw new HttpError(400, "El primer apellido solo puede contener letras, espacios, apóstrofes y guiones.");
    sanitized.last_name_1 = body.last_name_1;
  }

  if (typeof body.last_name_2 !== "undefined") {
    if (body.last_name_2 !== null) {
      if (body.last_name_2.length < 3 || body.last_name_2.length > 30)
        throw new HttpError(400, "El segundo apellido debe tener entre 3 y 30 caracteres.");
      if (!nameRegex.test(body.last_name_2))
        throw new HttpError(400, "El segundo apellido solo puede contener letras, espacios, apóstrofes y guiones.");
    }
    sanitized.last_name_2 = body.last_name_2;
  }

  if (typeof body.phone !== "undefined") {
    if (body.phone === null) {
      sanitized.phone = null;
    } else {
      const phoneStr = String(body.phone).trim();
      const phoneRegex = /^[2-9]\d{7}$/; // 8 digits, first digit cannot be 0 or 1
      if (!phoneRegex.test(phoneStr))
        throw new HttpError(400, "El teléfono debe tener 8 dígitos y empezar con un dígito entre 2 y 9.");
      sanitized.phone = phoneStr;
    }
  }

  if (Object.keys(sanitized).length === 0) {
    throw new HttpError(400, "No se proporcionaron campos para actualizar.");
  }

  const updatedUser = await updateUserNames(userIdFromToken, body.current_password, sanitized);

  res.status(200).json({ message: "Datos actualizados con éxito.", user: updatedUser });
};
