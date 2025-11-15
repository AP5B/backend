import { Router } from "express";
import {} from "../controllers/classOfferController";
import { authenticate } from "../middlewares/authMiddleware";
import {
  createTransactionController,
  commitTransactionController,
  statusTransactionController,
} from "../controllers/transactionController";

const router = Router();

// NOTE: Intento de desacoplar funcionamiento
interface Endpoints {
  commit: string;
}

export const endpoints: Endpoints = {
  commit: "/resolve/",
};

/**
 * @swagger
 * components:
 *   schemas:
 *     transactionStatus:
 *       type: object
 *       properties:
 *         amount:
 *           type: number
 *           example: 15000
 *         status:
 *           type: string
 *           enum: [INITIALIZE, AUTHORIZED, FAILED]
 *         buy_order:
 *           type: string
 *           example: "123"
 *         session_id:
 *           type: string
 *           example: "456"
 *         accounting_date:
 *           type: string
 *           example: "0712"
 *         transaction_date:
 *           type: string
 *           format: date-time
 *           example: "2024-03-21T20:15:30.000Z"
 *         installments_number:
 *           type: integer
 *           example: 0
 *         vci:
 *           type: string
 *           enum: [TSY, TSN, NP, U3, INV, A, CNP1, EOP, BNA, ENA]
 *         card_detail:
 *           type: object
 *           properties:
 *             card_number:
 *               type: string
 *               example: "6623"
 *         authorization_code:
 *           type: string
 *           example: "1213"
 *         payment_type_code:
 *           type: string
 *           example: "VD"
 *         response_code:
 *           type: integer
 *           example: 0
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: access_token
 */

/**
 * @swagger
 * paths:
 *   /transaction/{classRequest}:
 *     post:
 *       summary: Crear una transacción
 *       description: Crea una transacción a partir de una `classRequest`. Se debe redirigir al usuario a la *url* junto a *token_ws* (como query param) para que este pueda completar el pago.
 *       tags:
 *         - Payment
 *       security:
 *         - cookieAuth: []
 *       parameters:
 *         - in: path
 *           name: classRequest
 *           description: ID de la solicitud de clase
 *       responses:
 *         200:
 *           description: Transacción creada con éxito
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   token:
 *                     type: string
 *                     example: 01ab5af1f9bda013c6d36f63912bfaf55be27f9cda20e2acf22b44b11c941ba1
 *                   url:
 *                     type: string
 *                     example: https://webpay3gint.transbank.cl/webpayserver/initTransaction
 *                   fullUrl:
 *                     type: string
 *                     example: https://webpay3gint.transbank.cl/webpayserver/initTransaction?token_ws=01ab5af1f9bd...
 *         400:
 *           description: Error en los datos de entrada
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: classrequest debe ser un número
 *         404:
 *           description: Recurso no encontrado
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: No existe una oferta de clase con id 32.
 *         500:
 *           description: Error interno del sistema
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: Error al crear la transacción de pago
 */
router.post("/:classRequest", authenticate, createTransactionController);

/**
 * El uso de este endpoint esta netamente relacionado con el callback que realiza Transback luego de que el usuario complete el formulario de pago.
 */
router.get(endpoints.commit, commitTransactionController);

/**
 * @swagger
 * /transaction/status/{classRequest}:
 *   get:
 *     summary: Obtener estado de transacción
 *     description: Obtiene información acerca de una transacción junto a su estado
 *     tags:
 *       - Payment
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: classRequest
 *         description: ID de la solicitud de clase
 *     responses:
 *       200:
 *         description: Status encontrado
 *         content:
 *           application/json:
 *             schema:
 *              $ref: "#/components/schemas/transactionStatus"
 *       400:
 *         description: Error en los datos de entrada
 *         content:
 *           application/json:
 *             type: object
 *             properties:
 *               message: classRequest debe ser un número
 *       404:
 *         description: No se encontro una solicitud de clase
 *         content:
 *           application/json:
 *             type: object
 *             properties:
 *               message: No existe una oferta de clase con id 34.
 *       500:
 *         description: Error interno del sistema
 *         content:
 *           application/json:
 *             type: object
 *             properties:
 *               message: Error al obtener el estado de la transacción de pago
 */
router.get("status/:classRequest", authenticate, statusTransactionController);

export default router;
