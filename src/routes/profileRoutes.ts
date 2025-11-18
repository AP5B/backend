import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { updateProfileController } from "../controllers/profileController";

const router = Router();

/**
 * @swagger
 * /profile:
 *   patch:
 *     summary: Actualizar perfil del usuario autenticado
 *     description: Actualiza los campos editables del perfil del usuario (nombre, apellidos, teléfono).
 *     tags:
 *       - Profile
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               first_name:
 *                 type: string
 *               last_name_1:
 *                 type: string
 *               last_name_2:
 *                 type: string
 *               phone:
 *                 type: string
 *     responses:
 *       200:
 *         description: Perfil actualizado correctamente
 */
router.patch("/", authenticate, updateProfileController);

export default router;
