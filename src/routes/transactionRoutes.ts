import { Router } from "express";
import {
  authenticate,
  checkUserIsDeleted,
} from "../middlewares/authMiddleware";
import {
  checkOAuthController,
  createOAuthTokenController,
  getTrantactionController,
  webhookPaymentController,
  refreshOAuthTokenController,
  updateTransactionController,
  refundTransactionController,
} from "../controllers/transactionController";

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 42
 *         preferenceId:
 *           type: string
 *           example: "123456789"
 *         paymentId:
 *           type: string
 *           nullable: true
 *           example: "987654321"
 *         status:
 *           type: string
 *           example: "pending"
 *         classRequestId:
 *           type: integer
 *           example: 10
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-10-01T15:32:10.000Z"
 *     PreferenceItem:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "15"
 *         title:
 *           type: string
 *           example: "Clases de Álgebra Lineal"
 *         description:
 *           type: string
 *           example: "Sesión de 60 minutos personalizada"
 *         quantity:
 *           type: integer
 *           example: 1
 *         unit_price:
 *           type: number
 *           example: 25000
 *     Preference:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           example: "PREF-123"
 *         items:
 *           type: array
 *           items:
 *             $ref: "#/components/schemas/PreferenceItem"
 *         back_urls:
 *           type: object
 *           properties:
 *             success:
 *               type: string
 *               example: "https://frontend-software-eight.vercel.app/trans/success"
 *             failure:
 *               type: string
 *               example: "https://frontend-software-eight.vercel.app/trans/failure"
 *             pending:
 *               type: string
 *               example: "https://frontend-software-eight.vercel.app/trans/pending"
 *         auto_return:
 *           type: string
 *           example: "approved"
 *     TransactionPreferenceResponse:
 *       type: object
 *       properties:
 *         item:
 *           $ref: "#/components/schemas/PreferenceItem"
 *           nullable: true
 *         preferenceId:
 *           type: string
 *           example: "PREF-123"
 *         transaction:
 *           $ref: "#/components/schemas/Transaction"
 *         status:
 *           type: string
 *           example: "pending"
 *     MessageResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Operación realizada con éxito"
 *     OAuthStatusResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Usuario tiene OAuth con MercadoPago"
 *         hasOAuth:
 *           type: boolean
 *           example: true
 *   parameters:
 *     ClassRequestIdParam:
 *       in: path
 *       name: classRequest
 *       required: true
 *       schema:
 *         type: integer
 *       description: ID numérico de la class request asociada a la transacción.
 *     UserIdParam:
 *       in: path
 *       name: userId
 *       required: true
 *       schema:
 *         type: integer
 *       description: ID del usuario cuya integración OAuth será refrescada.
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: access_token
 */

/**
 * @swagger
 * /transactions/{classRequest}:
 *   get:
 *     summary: Obtener preferencia y transacción asociada
 *     description: Retorna la última transacción y la preferencia de MercadoPago asociada a una class request del usuario autenticado. Crea una nueva preferencia si no existe una transacción previa.
 *     tags:
 *       - Transactions
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ClassRequestIdParam'
 *     responses:
 *       200:
 *         description: Preferencia obtenida exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TransactionPreferenceResponse'
 *       400:
 *         description: El parámetro classRequest debe ser numérico
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'classRequest debe ser un numero'
 *       403:
 *         description: El usuario no pertenece a la class request solicitada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'No tienes permiso para actualizar esta transaccion'
 *       404:
 *         description: No se encontró la class request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'No se encontro transaccion para la class request con id 1'
 *       500:
 *         description: Error del servidor al obtener la preferencia
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'Error al obtener la preferencia de pago'
 */
router.get(
  "/:classRequest",
  authenticate,
  checkUserIsDeleted,
  getTrantactionController,
);

/**
 * @swagger
 * /transactions/{classRequest}:
 *   post:
 *     summary: Actualizar estado de una transacción
 *     description: Actualiza el estado de la transacción más reciente asociada a la class request del usuario autenticado. Este endpoint se usa principalmente an los callbacks de MercadoPago, ya que el estado de la transaccion se deberia actualizar en cada GET en `/transactions/:classRequest`
 *     tags:
 *       - Transactions
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ClassRequestIdParam'
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *                 example: 'approved'
 *                 description: Nuevo estado para la transacción.
 *     responses:
 *       200:
 *         description: Estado actualizado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'Transaccion actualizada exitosamente'
 *       400:
 *         description: classRequest inválido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'classRequest debe ser un numero'
 *       403:
 *         description: El usuario no puede modificar esta transacción
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'No tienes permiso para actualizar esta transaccion'
 *       404:
 *         description: No existe la class request o la transacción
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'No se encontro transaccion para la class request con id 1'
 *       500:
 *         description: Error al actualizar la transacción
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'Error al actualizar la transaccion'
 */
router.post(
  "/:classRequest",
  authenticate,
  checkUserIsDeleted,
  updateTransactionController,
);

/**
 * @swagger
 * /transactions/refund/{classRequest}:
 *   post:
 *     summary: Solicitar reembolso de una transacción
 *     description: Crea una solicitud de reembolso para la transacción más reciente asociada al class request del usuario autenticado.
 *     tags:
 *       - Transactions
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - $ref: '#/components/parameters/ClassRequestIdParam'
 *     responses:
 *       200:
 *         description: Reembolso solicitado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'Reembolso solicitado correctamente'
 *       400:
 *         description: classRequest inválido o reembolso no permitido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'classRequest debe ser un numero'
 *       403:
 *         description: El usuario no puede solicitar reembolso para esta transacción
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'No tienes permiso para solicitar este reembolso'
 *       404:
 *         description: No existe la class request o la transacción asociada
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'No se encontro transaccion para la class request con id 1'
 *       500:
 *         description: Error al procesar el reembolso
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'Error al solicitar el reembolso'
 */
router.post(
  "/refund/:classRequest",
  authenticate,
  checkUserIsDeleted,
  refundTransactionController,
);

/**
 * @swagger
 * /transactions/oauth/check:

 *   get:
 *     summary: Verificar estado de vinculación OAuth con MercadoPago
 *     description: Determina si el usuario autenticado tiene tokens de MercadoPago vigentes. Refresca el token automáticamente si el access token está vencido pero el refresh token sigue vigente.
 *     tags:
 *       - Transactions
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Estado de OAuth obtenido
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/OAuthStatusResponse'
 *       400:
 *         description: El usuario no tiene tokens vinculados o el refresh token expiró
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'El usuario no ha vinculado su cuenta de MercadoPago'
 *       404:
 *         description: Usuario no encontrado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'Usuario no encontrado'
 *       500:
 *         description: Error al verificar OAuth
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'Error al verificar el estado de OAuth'
 */
router.get(
  "/oauth/check",
  authenticate,
  checkUserIsDeleted,
  checkOAuthController,
);

/**
 * @swagger
 * /transactions/oauth/token:
 *   post:
 *     summary: Intercambiar código OAuth por tokens de MercadoPago
 *     description: Intercambia el código de autorización recibido desde MercadoPago por tokens de acceso y refresco, y los persiste asociados al usuario autenticado.
 *     tags:
 *       - Transactions
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - code
 *             properties:
 *               code:
 *                 type: string
 *                 example: "TG-6622045344"
 *     responses:
 *       200:
 *         description: Tokens almacenados correctamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             examples:
 *               success:
 *                 value:
 *                   message: 'OAuth token obtenido exitosamente'
 *       500:
 *         description: Error al realizar el intercambio OAuth
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'Error en el proceso de OAuth con MercadoPago'
 */
router.post(
  "/oauth/token",
  authenticate,
  checkUserIsDeleted,
  createOAuthTokenController,
);

/**
 * @swagger
 * /transactions/oauth/refresh/{userId}:
 *   post:
 *     summary: Refrescar tokens OAuth de un usuario (uso interno)
 *     description: Endpoint pensado para tareas internas o cron jobs que refrescan el token de MercadoPago de un usuario específico usando su refresh token almacenado.
 *     tags:
 *       - Transactions
 *     parameters:
 *       - $ref: '#/components/parameters/UserIdParam'
 *     responses:
 *       200:
 *         description: Token refrescado exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       400:
 *         description: userId inválido o refresh token expirado
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'El token de refresco ha expirado, el usuario debe volver a vincular su cuenta de MercadoPago'
 *       404:
 *         description: Usuario sin información de MercadoPago
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'Usuario no encontrado'
 *       500:
 *         description: Error al refrescar el token
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *             example:
 *               message: 'No se pudieron refrescar los tokens de OAuth'
 */
// uso interno, ideal para un cron job
router.post("/oauth/refresh/:userId", refreshOAuthTokenController);

router.get("/wh/:status/:classRequest", webhookPaymentController);

export default router;
