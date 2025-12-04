import PrismaManager from "../utils/prismaManager";
import bcrypt from "bcrypt";
import { HttpError } from "../middlewares/errorHandler";
const prisma = PrismaManager.GetClient();

export const changeUserPassword = async (
	userId: number,
	currentPassword: string,
	newPassword: string,
) => {
	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) throw new HttpError(404, "Usuario no encontrado.");

	const passwordMatch = await bcrypt.compare(currentPassword, user.password);
	if (!passwordMatch) throw new HttpError(401, "Contraseña actual incorrecta.");

	const hashed = await bcrypt.hash(newPassword, 10);

	const updated = await prisma.user.update({
		where: { id: userId },
		data: { password: hashed },
	});

	const { password: _pw, ...safe } = updated;
	return safe;
};

export const updateUserNames = async (
	userId: number,
	currentPassword: string,
	names: {
		first_name?: string;
		last_name_1?: string;
		last_name_2?: string | null;
		phone?: string | null;
	},
) => {
	const user = await prisma.user.findUnique({ where: { id: userId } });
	if (!user) throw new HttpError(404, "Usuario no encontrado.");

	const passwordMatch = await bcrypt.compare(currentPassword, user.password);
	if (!passwordMatch) throw new HttpError(401, "Contraseña actual incorrecta.");

	const data: any = {};
	if (typeof names.first_name !== "undefined") data.first_name = names.first_name;
	if (typeof names.last_name_1 !== "undefined") data.last_name_1 = names.last_name_1;
	if (typeof names.last_name_2 !== "undefined") data.last_name_2 = names.last_name_2;
	if (typeof names.phone !== "undefined") data.phone = names.phone;

	if (Object.keys(data).length === 0) {
		throw new HttpError(400, "No se proporcionaron campos para actualizar.");
	}

	const updated = await prisma.user.update({
		where: { id: userId },
		data,
	});

	const { password: _pw, ...safe } = updated;
	return safe;
};
