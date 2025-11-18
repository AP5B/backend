("use strict");
import { Prisma } from "@prisma/client";
import { HttpError } from "../middlewares/errorHandler";
import PrismaManager from "../utils/prismaManager";

const prisma = PrismaManager.GetClient();

export interface ProfileUpdatePayload {
	first_name?: string | null;
	last_name_1?: string | null;
	last_name_2?: string | null;
	phone?: string | null;
}

export const updateUserProfileService = async (
	userId: number,
	payload: ProfileUpdatePayload,
) => {
	try {
			const data: Record<string, unknown> = {};
			if (Object.prototype.hasOwnProperty.call(payload, "first_name")) data.first_name = payload.first_name;
			if (Object.prototype.hasOwnProperty.call(payload, "last_name_1")) data.last_name_1 = payload.last_name_1;
			if (Object.prototype.hasOwnProperty.call(payload, "last_name_2")) data.last_name_2 = payload.last_name_2;
			if (Object.prototype.hasOwnProperty.call(payload, "phone")) data.phone = payload.phone;

			const updated = await prisma.user.update({
				where: { id: userId },
				data: data as any,
				select: {
				id: true,
				username: true,
				first_name: true,
				last_name_1: true,
				last_name_2: true,
				role: true,
				phone: true,
				isDeleted: true,
				email: true,
			},
		});

		return updated;
	} catch (err) {
		if (err instanceof Prisma.PrismaClientKnownRequestError) {
			// Unique constraint, e.g., username/email collision if those were changed
			if (err.code === "P2002") {
				throw new HttpError(400, "Datos en conflicto al actualizar el perfil");
			}
		}
		console.error(err);
		throw new HttpError(500, "Error interno del sistema.");
	}
};

