import { Router } from "express";
import { authenticate, autorize } from "../middlewares/authMiddleware";
import {
  createReviewController,
  getTeacherReviewsController,
  deleteReviewController,
  updateReviewController,
  getCurrentUserReviewsController,
} from "../controllers/reviewsController";

const router = Router();

router.get("/user", authenticate, getCurrentUserReviewsController);
/**
 * @swagger
 * /reviews/user:
 *   get:
 *     summary: Obtener las reviews creadas por el usuario autenticado
 *     description: Retorna todas las reviews que el usuario autenticado ha dejado a distintos tutores, con soporte de paginación.
 *     tags:
 *       - Reviews
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - name: page
 *         in: query
 *         description: Número de página (por defecto 1)
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *       - name: limit
 *         in: query
 *         description: Cantidad de resultados por página (por defecto 10)
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *     responses:
 *       200:
 *         description: Reviews del usuario obtenidas con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Reviews del usuario obtenidas con éxito.
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 2
 *                       reviewerId:
 *                         type: integer
 *                         example: 3
 *                       teacherId:
 *                         type: integer
 *                         example: 4
 *                       rating:
 *                         type: number
 *                         example: 2
 *                       content:
 *                         type: string
 *                         example: editado
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: 2025-10-31
 *                       reviewer:
 *                         type: object
 *                         properties:
 *                           username:
 *                             type: string
 *       401:
 *         description: No autorizado. El token JWT es inválido o no fue proporcionado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Autenticación fallida
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error interno del servidor
 */

router.post(
  "/:teacherId",
  authenticate,
  autorize("Student"),
  createReviewController,
);
/**
 * @swagger
 * /reviews/{teacherId}:
 *   post:
 *     summary: Crear una reseña para un tutor
 *     description: Permite a un usuario autenticado dejar una reseña (review) a un tutor específico. Cada usuario solo puede dejar una reseña por tutor.
 *     tags:
 *       - Reviews
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tutor al que se deja la reseña
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 example: 5
 *                 description: Puntuación numérica de la reseña (por ejemplo, de 1 a 5)
 *               content:
 *                 type: string
 *                 example: "Excelente profesor, muy claro en sus explicaciones."
 *                 description: Contenido o comentario de la reseña
 *     responses:
 *       200:
 *         description: Review creada con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Review creada con éxito
 *                 review:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     reviewerId:
 *                       type: integer
 *                       example: 3
 *                     teacherId:
 *                       type: integer
 *                       example: 4
 *                     rating:
 *                       type: number
 *                       example: 5
 *                     content:
 *                       type: string
 *                       example: "Excelente profesor, muy claro en sus explicaciones."
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-10-31"
 *                     reviewer:
 *                       type: object
 *                       properties:
 *                         username:
 *                           type: string
 *       400:
 *         description: Id del tutor no fue proporcionado correctamente, el usuario ya dejó una reseña para este tutor o la puntuación no está entre 1 y 5.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Ya dejaste una review a este tutor
 *       401:
 *         description: Usuario no autenticado o sin autorización
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Autenticación fallida
 *       403:
 *         description: Cuenta del profesor eliminada.
 *         content:
 *           aplication/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La cuenta del profesor fue suspendida.
 *       404:
 *         description: Tutor no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tutor no encontrado
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error interno del servidor
 */

router.get("/:teacherId", getTeacherReviewsController);
/**
 * @swagger
 * /reviews/{teacherId}:
 *   get:
 *     summary: Obtener reseñas de un tutor
 *     description: Devuelve una lista paginada de reseñas asociadas a un tutor específico.
 *     tags:
 *       - Reviews
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: teacherId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID del tutor cuyas reseñas se desean obtener
 *       - in: query
 *         name: page
 *         required: false
 *         schema:
 *           type: integer
 *           example: 1
 *         description: Número de página para la paginación (por defecto 1)
 *       - in: query
 *         name: limit
 *         required: false
 *         schema:
 *           type: integer
 *           example: 10
 *         description: Cantidad máxima de reseñas por página (por defecto 10)
 *     responses:
 *       200:
 *         description: Operación exitosa. Devuelve la lista de reseñas del tutor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Operación exitosa
 *                 reviews:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 2
 *                       reviewerId:
 *                         type: integer
 *                         example: 3
 *                       teacherId:
 *                         type: integer
 *                         example: 4
 *                       rating:
 *                         type: number
 *                         example: 5
 *                       content:
 *                         type: string
 *                         example: hola
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                         example: "2025-10-31"
 *                       reviewer:
 *                         type: object
 *                         properties:
 *                           username:
 *                             type: string
 *       400:
 *         description: Faltan parámetros o el ID del tutor no fue proporcionado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Id del tutor faltante.
 *       403:
 *         description: Cuenta del profesor eliminada.
 *         content:
 *           aplication/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La cuenta del profesor fue suspendida.
 *       404:
 *         description: Tutor no encontrado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Tutor no encontrado.
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error interno del servidor.
 */

router.patch(
  "/:reviewId",
  authenticate,
  autorize("Student"),
  updateReviewController,
);
/**
 * @swagger
 * /reviews/{reviewId}:
 *   patch:
 *     summary: Editar una reseña existente
 *     description: Permite al usuario que creó una reseña modificar su contenido o puntuación. Solo el autor de la reseña puede editarla.
 *     tags:
 *       - Reviews
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la reseña que se desea editar
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               rating:
 *                 type: number
 *                 example: 2
 *                 description: Nueva puntuación (de 1 a 5)
 *               content:
 *                 type: string
 *                 example: "editado"
 *                 description: Nuevo contenido de la reseña
 *     responses:
 *       200:
 *         description: Review editada con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Review editada con éxito.
 *                 review:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     reviewerId:
 *                       type: integer
 *                       example: 3
 *                     teacherId:
 *                       type: integer
 *                       example: 4
 *                     rating:
 *                       type: number
 *                       example: 2
 *                     content:
 *                       type: string
 *                       example: editado
 *                     createdAt:
 *                       type: string
 *                       format: date-time
 *                       example: "2025-10-31"
 *                     reviewer:
 *                       type: object
 *                       properties:
 *                         username:
 *                           type: string
 *       400:
 *         description: Solicitud inválida (falta el ID de la review o los datos a actualizar no son válidos).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No se proporcionaron datos para actualizar la review.
 *       401:
 *         description: El usuario no es el autor de la review o no está autenticado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: El recurso no le pertenece al usuario actual.
 *       404:
 *         description: Review no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Review no encontrada.
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error interno del servidor.
 */

router.delete("/:reviewId", authenticate, deleteReviewController);
/**
 * @swagger
 * /reviews/{reviewId}:
 *   delete:
 *     summary: Eliminar una reseña
 *     description: Permite al usuario eliminar una reseña que haya creado previamente. Solo el autor de la reseña puede eliminarla.
 *     tags:
 *       - Reviews
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: reviewId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la reseña que se desea eliminar
 *     responses:
 *       200:
 *         description: Review eliminada con éxito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Review eliminada con éxito.
 *       400:
 *         description: ID de la review no fue proporcionado correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Id de la review no fue proporcionada correctamente.
 *       401:
 *         description: El usuario no es el autor de la review o no está autenticado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: El recurso no le pertenece al usuario actual.
 *       404:
 *         description: Review no encontrada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Review no encontrada.
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error interno del servidor.
 */

export default router;
