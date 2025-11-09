import { Router, Request, Response } from "express";
import {
  createReservationController,
  getUserClassRequestController,
  getTutorClassRequestsController,
  updateClassRequestStateController,
  getClassRequestsByClassController
} from "../controllers/classRequestController";
import { authenticate, autorize } from "../middlewares/authMiddleware";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ClassRequest:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 12
 *         classOfferId:
 *           type: integer
 *           example: 3
 *         state:
 *           type: string
 *           enum: [Pending, Accepted, Rejected, Cancelled]
 *           example: Pending
 *         createdAt:
 *           type: string
 *           example: 2025-11-08T15:00:00.000Z
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: access_token
 */

/**
 * @swagger
 * /class-requests/protected:
 *   get:
 *     summary: Ruta protegida para tutor
 *     description: Esta ruta solo puede ser accedida por usuarios con rol "Teacher".
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Acceso exitoso
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Esta es una ruta protegida, acceso exitoso.
 *       401:
 *         description: El usuario no tiene los permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario no tiene rol Teacher.
 */
router.get(
  "/protected",
  authenticate,
  autorize("Teacher"),
  (req: Request, res: Response) => {
    res.status(200).json({
      message: "Esta es una ruta protegida, acceso exitoso",
    });
  },
);

/**
 * @swagger
 * /class-requests:
 *   post:
 *     summary: Crear una nueva solicitud de clase
 *     description: Permite a un estudiante enviar una solicitud para una clase ofrecida.
 *     tags:
 *       - Class Requests
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classOfferId
 *             properties:
 *               classOfferId:
 *                 type: integer
 *                 example: 3
 *     responses:
 *       201:
 *         description: Solicitud creada con éxito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/ClassRequest"
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Usuario no autenticado o sin permisos
 */
router.post("/", authenticate, autorize("Student"), createReservationController);

/**
 * @swagger
 * /class-requests/me:
 *   get:
 *     summary: Obtener las solicitudes de clase del usuario autenticado
 *     description: Retorna todas las solicitudes creadas por el estudiante autenticado, con paginación.
 *     tags:
 *       - Class Requests
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de solicitudes obtenida exitosamente
 *       401:
 *         description: Usuario no autenticado
 */
router.get(
  "/me",
  authenticate,
  autorize("Student"),
  getUserClassRequestController,
);

/**
 * @swagger
 * /class-requests/tutor:
 *   get:
 *     summary: Obtener las solicitudes de clase recibidas por el tutor autenticado
 *     description: Retorna todas las solicitudes recibidas en las ofertas del tutor autenticado, con paginación.
 *     tags:
 *       - Class Requests
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     responses:
 *       200:
 *         description: Lista de solicitudes recibidas obtenida exitosamente
 *       401:
 *         description: Usuario no autenticado
 */
router.get(
  "/tutor",
  authenticate,
  autorize("Teacher"),
  getTutorClassRequestsController,
);

/**
 * @swagger
 * /class-requests/update-state:
 *   patch:
 *     summary: Actualizar el estado de una solicitud de clase
 *     description: Permite al tutor actualizar el estado de una solicitud de clase (Pending, Approved, Rejected).
 *     tags:
 *       - Class Requests
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classRequestId
 *               - state
 *             properties:
 *               classRequestId:
 *                 type: integer
 *                 example: 1
 *               state:
 *                 type: string
 *                 enum: [Pending, Approved, Rejected]
 *                 example: Approved
 *     responses:
 *       200:
 *         description: Estado de la solicitud actualizado exitosamente
 *       400:
 *         description: Datos inválidos
 *       401:
 *         description: Usuario no autenticado o sin permisos
 *       403:
 *         description: El usuario no es el tutor de la clase
 *       404:
 *         description: Solicitud de clase no encontrada
 */
router.patch(
  "/update-state",
  authenticate,
  autorize("Teacher"),
  updateClassRequestStateController
);

/**
 * @swagger
 * /class-requests/class/{classOfferId}:
 *   get:
 *     summary: Obtener las reservas de una clase específica
 *     description: Permite al tutor ver todas las solicitudes/reservas hechas sobre una clase en particular que él imparte. Incluye paginación.
 *     tags:
 *       - Class Requests
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: classOfferId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la clase
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de resultados por página
 *     responses:
 *       200:
 *         description: Lista de solicitudes obtenida exitosamente
 *       400:
 *         description: ID de clase inválido
 *       401:
 *         description: Usuario no autenticado
 *       403:
 *         description: El usuario no es el tutor de esta clase
 *       404:
 *         description: Clase no encontrada
 */
router.get(
  "/class/:classOfferId",
  authenticate,
  autorize("Teacher"),
  getClassRequestsByClassController
);

export default router;
