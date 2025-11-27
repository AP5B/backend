import { Response, Request, Router } from "express";
import {
  getClassOffersController,
  getClassOfferByIdController,
  createClassOfferController,
  editClassOfferController,
  deleteClassOfferController,
  getMyClassOffersController,
} from "../controllers/classOfferController";
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
 *     classOffer:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         authorId:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: Clase de Introducción a la Programación
 *         description:
 *           type: string
 *           example: Soy ayudante de Intro a la Progra', estoy en 5to año y...
 *         price:
 *           type: integer
 *           example: 20000
 *         createdAt:
 *           type: string
 *           example: 2025-10-07T22:51:55.000Z
 *         category:
 *           type: string
 *           enum: [Calculo, Dinamica, Economia, Quimica, Computacion, Otro]
 *           example: Otro
 *   securitySchemes:
 *     cookieAuth:
 *       type: apiKey
 *       in: cookie
 *       name: access_token
 */

/**
 * @swagger
 * paths:
 *   /class-offer/protected:
 *     get:
 *       summary: Ruta protegida para profesor
 *       description: Esta ruta solo puede ser accedida por usuarios con el rol Teacher
 *       tags:
 *         - Auth
 *       security:
 *         - cookieAuth: []
 *       responses:
 *         200:
 *           description: Acceso exitoso
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: Esta es una ruta protegida, acceso exitoso.
 *         401:
 *           description: El usuario no tiene los permisos suficientes
 *           content:
 *             application/json:
 *               schema:
 *                 type: object
 *                 properties:
 *                   message:
 *                     type: string
 *                     example: Usuario no tiene rol Teacher.
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
 * /class-offer:
 *   get:
 *     summary: Ofertas de clase paginadas
 *     description: Retorna un arreglo de tamaño `limit` con ofertas de clases, incluyendo información del autor y su rating promedio.
 *     tags:
 *       - Class Offer
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Número de página, empezando en 1.
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de elementos por página.
 *       - in: query
 *         name: title
 *         schema:
 *           type: string
 *         description: Filtrar por texto contenido en el título.
 *       - in: query
 *         name: category
 *         schema:
 *           type: string
 *           enum: [Calculo, Dinamica, Economia, Quimica, Computacion, Otro]
 *         description: Categoría de la oferta.
 *       - in: query
 *         name: price
 *         schema:
 *           type: number
 *         description: Precio exacto.
 *       - in: query
 *         name: minPrice
 *         schema:
 *           type: number
 *         description: Precio mínimo.
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *         description: Precio máximo.
 *     responses:
 *       200:
 *         description: Registros encontrados.
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
 *                         type: number
 *                         example: 1
 *                       title:
 *                         type: string
 *                         example: "clase 1"
 *                       category:
 *                         type: string
 *                         example: "Otro"
 *                       description:
 *                         type: string
 *                         example: "descripcion clase 1"
 *                       price:
 *                         type: number
 *                         example: 100
 *                       createdAt:
 *                         type: string
 *                         example: "2025-11-02"
 *                       author:
 *                         type: object
 *                         properties:
 *                           avgRating:
 *                             type: number
 *                             example: 3
 *                           id:
 *                             type: number
 *                             example: 1
 *                           first_name:
 *                             type: string
 *                             example: "prueba"
 *                           last_name_1:
 *                             type: string
 *                             example: "prueba"
 *                           username:
 *                             type: string
 *                             example: "prueba"
 *
 *       400:
 *         description: Parámetros de consulta inválidos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Parámetros inválidos"
 *       404:
 *         description: No se encontraron ofertas de clases.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "No se encontraron registros"
 *       500:
 *         description: Error interno del servidor.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Error interno del servidor"
 */
router.get("/", getClassOffersController);

/**
 * @swagger
 * /class-offer/me:
 *   get:
 *     summary: Obtener las ofertas de clase del profesor autenticado
 *     description: Retorna una lista paginada de las ofertas de clase creadas por el usuario autenticado.
 *     tags:
 *       - Class Offer
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *           minimum: 1
 *         description: Número de página, empezando por 1.
 *         required: false
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: Cantidad de elementos por página.
 *         required: false
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Ofertas del profesor autenticado.
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
 *                         example: 3
 *                       title:
 *                         type: string
 *                         example: "clase 3"
 *                       category:
 *                         type: string
 *                         example: "Otro"
 *                       description:
 *                         type: string
 *                         example: "descripcion clase 3"
 *                       price:
 *                         type: number
 *                         example: 200
 *                       createdAt:
 *                         type: string
 *                         example: "2025-11-02"
 *                       author:
 *                         type: object
 *                         properties:
 *                           avgRating:
 *                             type: integer
 *                             example: 3
 *                           id:
 *                             type: integer
 *                             example: 0
 *                           first_name:
 *                             type: string
 *                             example: "prueba"
 *                           last_name_1:
 *                             type: string
 *                             example: "prueba"
 *                           username:
 *                             type: string
 *                             example: "prueba"
 *       401:
 *         description: El usuario no está autenticado o no tiene el rol requerido.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario no tiene rol Teacher
 *       403:
 *         description: La cuenta de el usuario que realiza la petición fue eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Operación denegada, tu cuenta fue suspendida.
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

router.get(
  "/me",
  authenticate,
  checkUserIsDeleted,
  autorize("Teacher"),
  getMyClassOffersController,
);

/**
 * @swagger
 * /class-offer/{classId}:
 *   get:
 *     summary: Obtener oferta de clase por id
 *     description: Retorna la información de una oferta de clase junto con sus reviews paginados.
 *     tags:
 *       - Class Offer
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: integer
 *         description: ID de la oferta de clase.
 *       - in: query
 *         name: reviewsPage
 *         required: false
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Número de página para los reviews (paginación).
 *       - in: query
 *         name: reviewsLimit
 *         required: false
 *         schema:
 *           type: integer
 *           default: 5
 *         description: Cantidad de reviews por página.
 *     responses:
 *       200:
 *         description: Clase encontrada correctamente.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                 title:
 *                   type: string
 *                 description:
 *                   type: string
 *                 price:
 *                   type: number
 *                 createdAt:
 *                   type: string
 *                   example: "2025-11-02"
 *                 category:
 *                   type: string
 *                 author:
 *                   type: object
 *                   properties:
 *                     avgRating:
 *                       type: number
 *                     id:
 *                       type: number
 *                     username:
 *                       type: string
 *                     first_name:
 *                       type: string
 *                     last_name_1:
 *                       type: string
 *                     availabilities:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           day:
 *                             type: number
 *                           slot:
 *                             type: number
 *                     receivedReviews:
 *                       type: array
 *                       description: Reviews paginados del profesor.
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: integer
 *                           rating:
 *                             type: integer
 *                           content:
 *                             type: string
 *                           createdAt:
 *                             type: string
 *                             example: "2025-10-31"
 *                           reviewer:
 *                             type: object
 *                             properties:
 *                               username:
 *                                 type: string
 *                               isDeleted:
 *                                 type: bool
 *                                 example: false
 *       400:
 *         description: Error en los datos de entrada (ID inválida).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La id, de la oferta de clase, debe ser un número.
 *       404:
 *         description: No se encontró la oferta de clase con el ID especificado o fue eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Oferta de clase no encontrada.
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
router.get("/:classId", getClassOfferByIdController);

/**
 * @swagger
 * /class-offer:
 *   post:
 *     summary: Crear oferta de clase
 *     description: Crea una oferta de clase solo, si el usuario tiene rol "Teacher"
 *     tags:
 *       - Class Offer
 *     security:
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - description
 *               - price
 *             properties:
 *               title:
 *                 type: string
 *                 example: Clases de Teoria de Autómatas
 *               description:
 *                 type: string
 *                 example: Soy ayudante de Teoria de Autómatas...
 *               price:
 *                 type: integer
 *                 example: 25000
 *     responses:
 *       201:
 *         description: Clase creada con éxito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/classOffer"
 *       400:
 *         description: Error en los datos de entrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: El titulo no puede estar vacío
 *       401:
 *         description: El usuario no tiene los permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Usuario no tiene rol Teacher
 *       403:
 *         description: La cuenta del usuario que intenta crear la clase fue eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Operación denegada, tu cuenta fue suspendida.
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
router.post(
  "/",
  authenticate,
  checkUserIsDeleted,
  autorize("Teacher"),
  createClassOfferController,
);

/**
 * @swagger
 * /class-offer/{classId}:
 *   patch:
 *     summary: Actualizar oferta de clase
 *     description: Actualiza la oferta de clase con el body entregado
 *     tags:
 *       - Class Offer
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: integer
 *           description: Id de la oferta de clase
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 example: Pide ya tu clase de Introducción a la Progra!
 *               description:
 *                 type: string
 *                 example: No completé la media por dedicarme a leer documentación
 *               price:
 *                 type: integer
 *                 example: 30000
 *     responses:
 *       200:
 *         description: Recurso editado con éxito
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/classOffer"
 *       400:
 *         description: Error en los datos de entrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La id, de la oferta de clase, debe ser un número.
 *       401:
 *         description: El usuario no tiene los permisos suficientes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: El recurso no pertenece al usuario.
 *       403:
 *         description: La cuenta del usuario que intenta editar la clase fue eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Operación denegada, tu cuenta fue suspendida.
 *       404:
 *         description: No se encontro la clase con id `classId`
 *         content:
 *           application/json:
 *             schema:
 *               tpye: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No existe una oferta de clase con id 1
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               tpye: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Error interno del servidor
 */
router.patch(
  "/:classId",
  authenticate,
  checkUserIsDeleted,
  autorize("Teacher"),
  editClassOfferController,
);

/**
 * @swagger
 * /class-offer/{classId}:
 *   delete:
 *     summary: Elimina una oferta de clase
 *     description: Elimina la oferta de clase con ide `classId`
 *     tags:
 *       - Class Offer
 *     security:
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: classId
 *         required: true
 *         schema:
 *           type: integer
 *           description: Id de la oferta de clase.
 *     responses:
 *       200:
 *         description: Usuario eliminado con exito.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 deleted:
 *                   $ref: "#/components/schemas/classOffer"
 *                 message:
 *                   type: string
 *                   example: Oferta de clase eliminada con éxito.
 *       400:
 *         description: Error en los datos de entrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: La id, de la oferta de clase, debe ser un número.
 *       401:
 *         description: El usuario no tiene los permisos suficientes.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: El recurso no pertenece al usuario.
 *       403:
 *         description: La cuenta del usuario que intenta borrar la clase fue eliminada.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Operación denegada, tu cuenta fue suspendida.
 *       404:
 *         description: No se encontro la clase con id `classId`.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: No existe una oferta de clase con id 1.
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
router.delete(
  "/:classId",
  authenticate,
  checkUserIsDeleted,
  autorize("Teacher"),
  deleteClassOfferController,
);

export default router;
