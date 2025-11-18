import { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import {
	ProfileUpdatePayload,
	updateUserProfileService,
} from "../services/profileServices";

/**
 * Actualiza el perfil del usuario autenticado.
 * Campos permitidos: first_name, last_name_1, last_name_2, phone
 */
export const updateProfileController = async (
	req: Request,
	res: Response,
) => {
	const body = req.body as ProfileUpdatePayload;

	// Simple validation: no empty strings
	if (body.first_name === "" || body.last_name_1 === "" || body.last_name_2 === "") {
		throw new HttpError(400, "Los campos de nombre/apellidos no pueden ser cadenas vacías");
	}
    const phoneRegex = /^[1-9]\d{7}$/;

    if (body.phone) {
        if (!phoneRegex.test(body.phone)) {
            throw new HttpError(400, "El número de teléfono no tiene un formato válido");
        }
    }
    

	const userIdRaw = res.locals.user?.id;
	if (!userIdRaw) throw new HttpError(401, "Usuario no autenticado");

	const userId = Number(userIdRaw);
	if (Number.isNaN(userId)) throw new HttpError(500, "Id de usuario inválido");

	const updated = await updateUserProfileService(userId, body);

	return res.status(200).json({ user: updated });
};

