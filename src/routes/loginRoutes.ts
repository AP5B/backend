import { Response, Request, Router } from "express";
import { loginUserController } from "../controllers/loginController";
import { unsetAuthCookies } from "../utils/setAuthCookies";

const router = Router();

/**
 * @swagger
 * /login:
 *   post:
 *     summary: Logueo de usuario
 *     description: Loguea a un usuario usando su username o email, y contraseña. Devuelve sus datos junto a tokens de autenticación
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - login
 *               - password
 *             properties:
 *               login:
 *                 type: string
 *               password:
 *                 type: string
 *           examples:
 *             userUsername:
 *               summary: Login con usuario
 *               value:
 *                 login: "username"
 *                 password: "pwd"
 *             userEmail:
 *               summary: Login con email
 *               value:
 *                 login: "email@domain.com"
 *                 password: "pwd"
 *     responses:
 *       200:
 *         description: Usuario logueado correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                  user:
 *                    type: object
 *                    properties:
 *                      id:
 *                        type: integer
 *                        example: 2
 *                      username:
 *                        type: string
 *                        example: "username"
 *                      first_name:
 *                        type: string
 *                        nullable: true
 *                        example: "Nombre"
 *                      last_name_1:
 *                        type: string
 *                        nullable: true
 *                        example: "Apellido 1"
 *                      last_name_2:
 *                        type: string
 *                        nullable: true
 *                        example: "Apellido 2"
 *                      role:
 *                        type: string
 *                        example: Student
 *                      phone:
 *                        type: string
 *                        nullable: true
 *                      isDeleted:
 *                        type: boolean
 *                        example: false
 *                  token:
 *                    type: string
 *                    description: Token JWT de acceso
 *                    example: "fja832..."
 *                  refreshToken:
 *                    type: string
 *                    description: Token JWT de refresco
 *                    example: "sadjh2..."
 *       400:
 *         description: Error en los datos de entrada (validación fallida)
 *       401:
 *         description: Las credenciales entregadas no pertenecen a un usuario
 *       500:
 *         description: Error interno del servidor
 *
 */
router.post("/login", loginUserController);

/**
 * @swagger
 * /logout:
 *   post:
 *     summary: Eliminar cookies
 *     description: Elimina `access_token` y `refresh_token` de la cookies.
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Cookies eliminadas con éxito
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Cookies eliminadas con éxito"
 */
router.post("/logout", (req: Request, res: Response) => {
  unsetAuthCookies(res);
  res.status(200).json({
    message: "Cookies eliminadas con éxito",
  });
});

export default router;
