import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  getAvailabilityController,
  createAvailabilitiesController,
  deleteAvailabilityController
} from "../controllers/availabilityController"




const router = Router();
/**
 * @swagger
 * components:
 *   schemas:
 *     availability:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         userId:
 *           type: integer
 *           example: 1
 *         day:
 *           type: integer
 *           minimum: 1
 *           maximum: 7
 *           example: 1
 *         slot:
 *           type: integer
 *           minimum: 0
 *           maximum: 24
 *           example: 1
 *     systemError:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: Error interno del sistema
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: access_token
 */

/**
 * @swagger
 * paths:
 *   /availability/{teacherId}:
 *     get:
 *       summary: Obtener disponibilidad de profesor
 *       description: Estaruta entrega un arreglo con la disponibilidad del profesor
 *       tags:
 *         - Availability
 *       parameters:
 *         - in: path
 *           required: true
 *           name: teacherId
 *           schema:
 *             type: integer
 *       responses:
 *         200:
 *           description: Disponibilidad encontrada
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   data:
 *                     type: array
 *                     items:
 *                       $ref: "#/components/schemas/availability"
 *                   count:
 *                     type: integer
 *                     example: 3
 *         400:
 *           description: Error en la solicitud
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   messsage:
 *                     type: string
 *                     example: "teacherId debe ser un entero."
 *         500:
 *           description: Error interno del sistema
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: "#/components/schemas/systemError"
 */
router.get("/:teacherId", getAvailabilityController);

//router.patch("/", authenticate, editAvailabilityController);

/**
 * @swagger
 *   /availability:
 *     post:
 *       summary: Asigna una disponibilidad a el usuario
 *       description: Esta ruta crea una disponibilidad asociada al usuario logueado. La solicitud de ejemplo representa una peticion para el dia *lunes* a las *1pm*.
 *       tags:
 *         - Availability
 *       security:
 *         - cookieAuth: []
 *       requestBody:
 *         required: true
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   day:
 *                     type: integer
 *                     example: 1
 *                   slot:
 *                     type: integer
 *                     example: 13
 *                 required:
 *                   - day
 *                   - slot
 *       responses:
 *         201:
 *           description: Disponibilidad asignada con éxito.
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   data:
 *                     type: array
 *                     items:
 *                       $ref: "#/components/schemas/availability"
 *                   count:
 *                     type: integer
 *                     example: 3
 *         400:
 *           description: Request body no tiene el formato correcto.
 *           content:
 *             appliation/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: La request debe ser un arreglo.
 *         401:
 *           description: El usuario no tiene los permisos suficientes
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: Autenticación fallida.
 *         500:
 *           description: Error interno del sistema
 *           content:
 *             application/json:
 *               schema:
 *                 $ref: "#/components/schemas/systemError"
 */
router.post("/", authenticate, createAvailabilitiesController);

/**
 * @swagger
 * /availability:
 *   delete:
 *     summary: Elimina disponibilidad
 *     description: Elimina uno o varios slots de disponibilidad
 *     tags:
 *       - Availability
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: query
 *         name: ids
 *         explode: false
 *         style: form
 *         required: true
 *         description: arreglo con ids a eliminar
 *         schema:
 *           type: array
 *           items:
 *             type: integer
 *     responses:
 *       200:
 *         description: Disponibilidades eliminadas con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 count:
 *                   type: integer
 *                   example: 20
 *                 messsage:
 *                   type: string
 *                   example: Disponibilidades eliminadas con éxito.
 *       400:
 *         description: Error en el parametro de query
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Las ids tienen que ser numeros enteros.
 *       500:
 *         description: Error interno del sistema
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/systemError"
 */
router.delete("/", authenticate, deleteAvailabilityController);

export default router
