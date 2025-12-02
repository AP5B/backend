import { Router, Request, Response } from "express";
import {
  createReservationController,
  getUserClassRequestController,
  getTutorClassRequestsController,
  updateClassRequestStateController,
  getClassRequestsByClassController,
} from "../controllers/classRequestController";
import {
  authenticate,
  autorize,
  checkUserIsDeleted,
} from "../middlewares/authMiddleware";

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
 *     summary: Crear una nueva reserva
 *     description: Permite a un estudiante crear una reserva para una clase en un día y horario específico.
 *     tags:
 *       - Class Requests
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - classOfferId
 *               - day
 *               - slot
 *             properties:
 *               classOfferId:
 *                 type: integer
 *                 example: 12
 *                 description: ID de la oferta de clase.
 *               day:
 *                 type: integer
 *                 example: 3
 *                 description: Día de la semana (1 = Lunes, 7 = Domingo).
 *               slot:
 *                 type: integer
 *                 example: 10
 *                 description: Slot horario del día (0 a 24).
 *     responses:
 *       201:
 *         description: Reserva creada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reserva creada exitosamente
 *                 reservation:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 55
 *                     day:
 *                       type: integer
 *                       example: 3
 *                     slot:
 *                       type: integer
 *                       example: 10
 *                     createdAt:
 *                       type: string
 *                       example: "2025-10-31"
 *                     state:
 *                       type: string
 *                       example: "Pending"
 *                     classOffer:
 *                       type: object
 *                       properties:
 *                         title:
 *                           type: string
 *                           example: Clase de Yoga
 *                         price:
 *                           type: number
 *                           example: 15000
 *                         category:
 *                           type: string
 *                           example: Deportes
 *                         author:
 *                           type: object
 *                           properties:
 *                             username:
 *                               type: string
 *                               example: instructorPedro
 *                             first_name:
 *                               type: string
 *                               example: Pedro
 *                             last_name_1:
 *                               type: string
 *                               example: López
 *       400:
 *         description: Error en los datos enviados
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "El campo 'slot' es requerido"
 *       403:
 *         description: |
 *           La cuenta del usuario que realiza la solicitud fue eliminada o
 *           el profesor intenta hacer una reserva en su propia clase.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Operación denegada, tu cuenta fue suspendida || No puedes hacer una reserva en tu propia clase"
 *       404:
 *         description: La clase especificada no existe
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "La clase especificada no existe"
 *       409:
 *         description: Ya existe una reserva en ese horario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Ya existe una reserva para esta clase en ese horario"
 *       500:
 *         description: Error interno al crear la reserva
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error al crear la reserva"
 */

router.post(
  "/",
  authenticate,
  checkUserIsDeleted,
  autorize("Student"),
  createReservationController,
);

/**
 * @swagger
 * /class-requests/me:
 *   get:
 *     summary: Obtener las reservas del estudiante autenticado
 *     description: Retorna todas las reservas realizadas por el usuario autenticado, incluyendo información de la clase y del profesor.
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
 *           minimum: 1
 *         required: false
 *         description: Número de página (empieza desde 1).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Cantidad de elementos por página.
 *     responses:
 *       200:
 *         description: Lista de reservas del usuario autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 5
 *                       day:
 *                         type: integer
 *                         example: 4
 *                       slot:
 *                         type: integer
 *                         example: 2
 *                       createdAt:
 *                         type: string
 *                         example: "2025-11-15"
 *                       state:
 *                         type: string
 *                         example: "Pending"
 *                       classOffer:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                             example: "calculo 1"
 *                           price:
 *                             type: number
 *                             example: 100
 *                           category:
 *                             type: string
 *                             example: "Calculo"
 *                           author:
 *                             type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                                 example: "profe"
 *                               first_name:
 *                                 type: string
 *                                 nullable: true
 *                                 example: null
 *                               last_name_1:
 *                                 type: string
 *                                 nullable: true
 *                                 example: null
 *                               isDeleted:
 *                                 type: bool
 *                                 example: false
 *       401:
 *         description: Usuario no autenticado o sin permisos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario no tiene rol Student"
 *       403:
 *         description: La cuenta del usuario que realiza la solicitud fue eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Operación denegada, tu cuenta fue suspendida"
 *       500:
 *         description: Error interno al obtener las reservas del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error al obtener las reservas del usuario"
 */
router.get(
  "/me",
  authenticate,
  checkUserIsDeleted,
  autorize("Student"),
  getUserClassRequestController,
);

/**
 * @swagger
 * /class-requests/tutor:
 *   get:
 *     summary: Obtener las solicitudes de clase recibidas por el tutor autenticado
 *     description: Retorna todas las solicitudes realizadas por estudiantes a las ofertas del tutor autenticado, incluyendo información del estudiante y de la clase.
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
 *           minimum: 1
 *         required: false
 *         description: Número de página (empieza desde 1).
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Cantidad de elementos por página.
 *     responses:
 *       200:
 *         description: Lista de solicitudes recibidas por el tutor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 7
 *                       state:
 *                         type: string
 *                         example: "Pending"
 *                       day:
 *                         type: integer
 *                         example: 4
 *                       slot:
 *                         type: integer
 *                         example: 2
 *                       createdAt:
 *                         type: string
 *                         example: "2025-11-15"
 *                       user:
 *                         type: object
 *                         properties:
 *                           username:
 *                             type: string
 *                             example: "estudiante123"
 *                           email:
 *                             type: string
 *                             example: "estudiante@example.com"
 *                           first_name:
 *                             type: string
 *                             nullable: true
 *                             example: "Juan"
 *                           last_name_1:
 *                             type: string
 *                             nullable: true
 *                             example: "Pérez"
 *                           isDeleted:
 *                             type: bool
 *                             example: false
 *                       classOffer:
 *                         type: object
 *                         properties:
 *                           title:
 *                             type: string
 *                             example: "Clases de Álgebra"
 *                           category:
 *                             type: string
 *                             example: "Matemáticas"
 *                           price:
 *                             type: number
 *                             example: 15000
 *       401:
 *         description: Usuario no autenticado o sin rol Teacher
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Usuario no tiene rol Teacher"
 *       403:
 *         description: La cuenta del usuario que realiza la solicitud fue eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Operación denegada, tu cuenta fue suspendida"
 *       500:
 *         description: Error interno al obtener las solicitudes del tutor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error al obtener las solicitudes del tutor"
 */
router.get(
  "/tutor",
  authenticate,
  checkUserIsDeleted,
  autorize("Teacher"),
  getTutorClassRequestsController,
);

/**
 * @swagger
 * /class-requests/{classRequestId}:
 *   patch:
 *     summary: Actualizar el estado de una solicitud de clase
 *     description: Permite al tutor actualizar el estado de una solicitud de clase (Pending, Approved, Rejected).
 *     tags:
 *       - Class Requests
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: classRequestId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la solicitud de clase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - state
 *             properties:
 *               state:
 *                 type: string
 *                 enum: [Pending, Approved, Rejected]
 *                 example: Approved
 *     responses:
 *       200:
 *         description: Estado de la solicitud actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Estado de la reserva actualizado exitosamente
 *                 updatedRequest:
 *                   type: object
 *                   properties:
 *                     id: { type: integer, example: 4 }
 *                     state: { type: string, example: Approved }
 *                     day: { type: integer, example: 4 }
 *                     slot: { type: integer, example: 0 }
 *                     createdAt: { type: string, example: 2025-11-15 }
 *                     user:
 *                       type: object
 *                       properties:
 *                         username: { type: string, example: vicentoide3 }
 *                         email: { type: string, example: email3@uc.cl }
 *                         first_name: { type: string, nullable: true, example: null }
 *                         last_name_1: { type: string, nullable: true, example: null }
 *                         isDeleted: { type: bool, example: false }
 *                     classOffer:
 *                       type: object
 *                       properties:
 *                         title: { type: string, example: calculo 1 }
 *                         category: { type: string, example: Calculo }
 *                         price: { type: integer, example: 100 }
 *
 *       400:
 *         description: Datos inválidos
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: El campo 'state' es obligatorio
 *
 *       401:
 *         description: Usuario no autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Usuario no autenticado
 *
 *       403:
 *         description: El usuario que realiza la solicitud no es el tutor de la clase o su cuenta fue eliminada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: No tienes permisos para modificar esta solicitud || Operación denegada, tu cuenta fue suspendida
 *
 *       404:
 *         description: Solicitud de clase no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: La solicitud de clase no existe
 */
router.patch(
  "/:classRequestId",
  authenticate,
  checkUserIsDeleted,
  autorize("Teacher"),
  updateClassRequestStateController,
);

/**
 * @swagger
 * /class-requests/{classOfferId}:
 *   get:
 *     summary: Obtener las solicitudes/reservas de una clase específica
 *     description: Permite al tutor ver todas las solicitudes realizadas sobre una clase que él imparte. Incluye paginación.
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
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de resultados por página
 *
 *     responses:
 *       200:
 *         description: Lista de solicitudes obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer, example: 5 }
 *                       state: { type: string, example: Pending }
 *                       day: { type: integer, example: 4 }
 *                       slot: { type: integer, example: 2 }
 *                       createdAt: { type: string, example: "2025-11-15" }
 *                       user:
 *                         type: object
 *                         properties:
 *                           username: { type: string, example: alumno1 }
 *                           email: { type: string, example: alumno1@uc.cl }
 *                           first_name: { type: string, nullable: true, example: null }
 *                           last_name_1: { type: string, nullable: true, example: null }
 *                       classOffer:
 *                         type: object
 *                         properties:
 *                           title: { type: string, example: Calculo 1 }
 *                           category: { type: string, example: Calculo }
 *                           price: { type: integer, example: 100 }
 *
 *       400:
 *         description: ID de clase inválido
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: ID de la clase faltante.
 *
 *       401:
 *         description: Usuario no autenticado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: Usuario no autenticado
 *
 *       403:
 *         description: El usuario que realiza la solicitud no es el tutor de esta clase o su cuenta fue eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: No eres el tutor de esta clase || Operación denegada, tu cuenta fue suspendida
 *
 *       404:
 *         description: Clase no encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                   example: La clase especificada no existe
 */
router.get(
  "/:classOfferId",
  authenticate,
  checkUserIsDeleted,
  autorize("Teacher"),
  getClassRequestsByClassController,
);

export default router;
