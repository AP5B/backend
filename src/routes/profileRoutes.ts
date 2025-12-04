import { Router } from "express";
import {
  authenticate,
  checkUserIsDeleted,
} from "../middlewares/authMiddleware";
import {
  changePasswordController,
  updateNamesController,
  getUserProfileController,
} from "../controllers/profileController";

const router = Router();

/**
 * @swagger
 * /profile/password:
 *   patch:
 *     summary: Cambiar contraseña del usuario autenticado
 *     description: Permite al usuario autenticado actualizar su contraseña enviando la contraseña actual y la nueva.
 *     tags:
 *       - User Profile
 *     security:
 *       - cookieAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *               - new_password
 *             properties:
 *               current_password:
 *                 type: string
 *                 example: "miClaveActual123"
 *               new_password:
 *                 type: string
 *                 example: "NuevaClaveSegura456"
 *               confirm_password:
 *                 type: string
 *                 example: "NuevaClaveSegura456"
 *
 *     responses:
 *       200:
 *         description: Contraseña actualizada con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Contraseña actualizada con éxito."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *
 *       400:
 *         description: Datos faltantes o inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Nueva contraseña faltante."
 *
 *       401:
 *         description: Contraseña actual incorrecta o intento no autorizado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Contraseña actual incorrecta."
 *
 *       403:
 *         description: La cuenta del usuario está suspendida.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Operación denegada, tu cuenta fue suspendida."
 *
 *       404:
 *         description: Usuario no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Usuario no encontrado."
 *
 *       500:
 *         description: Error interno del servidor.
 */
router.patch(
  "/password",
  authenticate,
  checkUserIsDeleted,
  changePasswordController,
);

/**
 * @swagger
 * /profile/names:
 *   patch:
 *     summary: Actualizar nombre, apellidos o teléfono del usuario autenticado
 *     description: >
 *       Permite actualizar los datos personales del usuario (nombre, apellidos o teléfono).
 *       **Requiere enviar la contraseña actual** para confirmar la identidad del usuario.
 *     tags:
 *       - User Profile
 *     security:
 *       - cookieAuth: []
 *
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - current_password
 *             properties:
 *               current_password:
 *                 type: string
 *                 example: "MiClaveActual123"
 *               first_name:
 *                 type: string
 *                 example: "Juan"
 *               last_name_1:
 *                 type: string
 *                 example: "Pérez"
 *               last_name_2:
 *                 type: string
 *                 nullable: true
 *                 example: "Gómez"
 *               phone:
 *                 type: string
 *                 nullable: true
 *                 example: "98765432"
 *
 *     responses:
 *       200:
 *         description: Datos actualizados con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Datos actualizados con éxito."
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     email:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name_1:
 *                       type: string
 *                     last_name_2:
 *                       type: string
 *                       nullable: true
 *                     phone:
 *                       type: string
 *                       nullable: true
 *
 *       400:
 *         description: Datos faltantes o inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "El nombre debe tener entre 3 y 30 caracteres"
 *
 *       401:
 *         description: Contraseña incorrecta o intento de editar otro usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Contraseña actual incorrecta."
 *
 *       403:
 *         description: La cuenta está suspendida.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Operación denegada, tu cuenta fue suspendida."
 *
 *       404:
 *         description: Usuario no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Usuario no encontrado."
 *
 *       500:
 *         description: Error interno del servidor.
 */
router.patch("/names", authenticate, checkUserIsDeleted, updateNamesController);

/**
 * @swagger
 * /profile/{userId}:
 *   get:
 *     summary: Obtener el perfil público de un usuario
 *     description: >
 *       Obtiene la información pública del perfil de un usuario según su ID.
 *       No requiere autenticación.
 *       Si el usuario no existe o está eliminado, retornará un error 404.
 *     tags:
 *       - User Profile
 *
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del usuario cuyo perfil se desea obtener.
 *         example: 42
 *
 *     responses:
 *       200:
 *         description: Perfil de usuario obtenido con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Perfil del usuario obtenido con éxito"
 *                 userProfile:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                     username:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name_1:
 *                       type: string
 *                     last_name_2:
 *                       type: string
 *                       nullable: true
 *                     email:
 *                       type: string
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                     role:
 *                       type: string
 *                       enum: [Student, Teacher]
 *                     isDeleted:
 *                       type: boolean
 *                   example:
 *                     id: 42
 *                     username: "juanperez"
 *                     first_name: "Juan"
 *                     last_name_1: "Pérez"
 *                     last_name_2: "Gómez"
 *                     email: "juan@uc.cl"
 *                     phone: "98765432"
 *                     role: "Student"
 *                     isDeleted: false
 *
 *       400:
 *         description: Parámetro userId faltante o inválido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Id del usuario faltante."
 *
 *       404:
 *         description: El perfil del usuario no existe o el usuario fue eliminado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *               example:
 *                 message: "Perfil del usuario no encontrado."
 *
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/systemError"
 */
router.get("/:userId", getUserProfileController);

export default router;
