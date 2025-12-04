import { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import {
  changeUserPassword,
  updateUserNames,
} from "../services/profileServices";

interface ChangePasswordBody {
  current_password: string;
  new_password: string;
  confirm_password?: string;
}

interface UpdateNamesBody {
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

  if (!body.current_password)
    throw new HttpError(400, "Contraseña actual faltante.");
  if (!body.new_password)
    throw new HttpError(400, "Nueva contraseña faltante.");
  if (body.new_password.trim().length < 5)
    throw new HttpError(400, "La contraseña debe tener al menos 5 caracteres");
  if (body.confirm_password && body.new_password !== body.confirm_password)
    throw new HttpError(400, "Las contraseñas no coinciden.");

  const updatedUser = await changeUserPassword(
    userIdFromToken,
    body.current_password,
    body.new_password,
  );

  res
    .status(200)
    .json({ message: "Contraseña actualizada con éxito.", user: updatedUser });
};

export const updateNamesController = async (req: Request, res: Response) => {
  const body = req.body as UpdateNamesBody;
  if (!body) throw new HttpError(400, "Cuerpo de la petición vacío.");

  const userIdFromToken = parseInt(res.locals.user.id as string);

  if (!body.current_password)
    throw new HttpError(400, "Contraseña actual faltante.");

  if (body.first_name !== undefined) {
    if (!body.first_name)
      throw new HttpError(400, "El nombre no puede estar vacío.");
    if (body.first_name.length < 3 || body.first_name.length > 30)
      throw new HttpError(400, "El nombre debe tener entre 3 y 30 caracteres");
    if (!nameRegex.test(body.first_name))
      throw new HttpError(
        400,
        "El nombre solo puede contener letras, espacios, apóstrofes y guiones.",
      );
  }

  if (body.last_name_1 !== undefined) {
    if (!body.last_name_1)
      throw new HttpError(400, "El primer apellido no puede estar vacío.");
    if (body.last_name_1.length < 3 || body.last_name_1.length > 30)
      throw new HttpError(
        400,
        "El primer apellido debe tener entre 3 y 30 caracteres.",
      );
    if (!nameRegex.test(body.last_name_1))
      throw new HttpError(
        400,
        "El primer apellido solo puede contener letras, espacios, apóstrofes y guiones.",
      );
  }

  if (body.last_name_2 !== undefined) {
    if (body.last_name_2 !== null) {
      if (body.last_name_2.length < 3 || body.last_name_2.length > 30)
        throw new HttpError(
          400,
          "El segundo apellido debe tener entre 3 y 30 caracteres.",
        );
      if (!nameRegex.test(body.last_name_2))
        throw new HttpError(
          400,
          "El segundo apellido solo puede contener letras, espacios, apóstrofes y guiones.",
        );
    }
  }

  if (body.phone !== undefined) {
    const phoneStr = String(body.phone).trim();
    const phoneRegex = /^[2-9]\d{7}$/;
    if (!phoneRegex.test(phoneStr))
      throw new HttpError(
        400,
        "El teléfono debe tener 8 dígitos y empezar con un dígito entre 2 y 9.",
      );
  }

  const { current_password: _current_password, ...sanitized } = body;

  if (Object.keys(sanitized).length === 0) {
    throw new HttpError(400, "No se proporcionaron campos para actualizar.");
  }

  const updatedUser = await updateUserNames(
    userIdFromToken,
    body.current_password,
    sanitized,
  );

  res
    .status(200)
    .json({ message: "Datos actualizados con éxito.", user: updatedUser });
};
