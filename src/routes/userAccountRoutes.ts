import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import { deleteUserAccountController } from "../controllers/userAccountController";

const router = Router();

router.patch("/delete", authenticate, deleteUserAccountController);
/**
 * @swagger
 * /user-account/delete:
 *   patch:
 *     summary: Eliminar cuenta de usuario
 *     description: >
 *       Marca la cuenta del usuario autenticado como eliminada mediante la propiedad `isDeleted`.
 *       Esta operación no elimina físicamente el registro en la base de datos (soft delete).
 *     tags:
 *       - User Account
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cuenta eliminada con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cuenta eliminada con éxito
 *
 *       400:
 *         description: La cuenta ya fue eliminada previamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La cuenta del usuario ya fue eliminada.
 *
 *       404:
 *         description: No se encontró la cuenta del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Cuenta del usuario no encontrada.
 *
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/systemError"
 */

export default router;
