import { Response, Request, Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  registerUserController,
  refreshTokenController,
} from "../controllers/registerController";

const router = Router();

router.post("/register", registerUserController);

/**
 * @swagger
 * /register:
 *   post:
 *     summary: Registro de usuario
 *     description: |
 *       Registra un nuevo usuario en el sistema y devuelve sus datos junto con los tokens de autenticación.
 *       El backend valida los campos (patrones, longitudes y formato). El campo `role` debe corresponder
 *       al dominio del correo (por ejemplo, `uc.cl` o `estudiante.uc.cl` -> `Teacher`). Si el frontend envía
 *       `role`, debe coincidir con la deducción del backend.
 *     tags:
 *       - Auth
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - username
 *               - first_name
 *               - last_name_1
 *               - email
 *               - password
 *               - confirm_password
 *             properties:
 *               username:
 *                 type: string
 *                 description: "Solo minúsculas, números y guiones bajos. Largo entre 5 y 20 caracteres. Regex: ^[a-z0-9_]+$"
 *                 minLength: 5
 *                 maxLength: 20
 *                 pattern: '^[a-z0-9_]+'
 *                 example: usuario_01
 *               first_name:
 *                 type: string
 *                 description: "Nombre. Letras (incluye acentos) y espacios permitidos. Largo entre 3 y 30 caracteres."
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: Juan
 *               last_name_1:
 *                 type: string
 *                 description: "Primer apellido. Mismas reglas que el nombre."
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: Pérez
 *               last_name_2:
 *                 type: string
 *                 nullable: true
 *                 description: "Segundo apellido (opcional). Mismas reglas que el nombre."
 *                 minLength: 3
 *                 maxLength: 30
 *                 example: Gómez
 *               email:
 *                 type: string
 *                 format: email
 *                 description: "Email válido. Máximo 60 caracteres. El dominio puede determinar el rol (p.ej. uc.cl)."
 *                 maxLength: 60
 *                 example: nombre@uc.cl
 *               password:
 *                 type: string
 *                 format: password
 *                 description: "Contraseña con al menos 8 caracteres."
 *                 minLength: 8
 *                 example: strongPassword123
 *               confirm_password:
 *                 type: string
 *                 format: password
 *                 description: "Confirmación de contraseña. Debe ser igual al campo `password`."
 *                 minLength: 8
 *                 example: strongPassword123
 *               role:
 *                 type: string
 *                 description: "(Opcional) 'Student', 'Teacher' o 'Admin'. El backend validará que coincida con el dominio del email."
 *                 enum:
 *                   - Student
 *                   - Teacher
 *                   - Admin
 *                 example: Student
 *               phone:
 *                 type: string
 *                 nullable: true
 *                 description: "Número telefónico opcional."
 *                 example: '+56912345678'
 *     responses:
 *       201:
 *         description: Usuario registrado correctamente. Devuelve el usuario (sin contraseña) y los tokens.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     username:
 *                       type: string
 *                       example: usuario_01
 *                     first_name:
 *                       type: string
 *                       nullable: true
 *                       example: Juan
 *                     last_name_1:
 *                       type: string
 *                       nullable: true
 *                       example: Pérez
 *                     last_name_2:
 *                       type: string
 *                       nullable: true
 *                       example: Gómez
 *                     email:
 *                       type: string
 *                       example: nombre@uc.cl
 *                     role:
 *                       type: string
 *                       example: Teacher
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                       example: '+56912345678'
 *                     isDeleted:
 *                       type: boolean
 *                       example: false
 *                 token:
 *                   type: string
 *                   description: Token JWT de acceso
 *                 refreshToken:
 *                   type: string
 *                   description: Token JWT de refresco
 *       400:
 *         description: Error en los datos de entrada (validación fallida). El cuerpo incluirá un mensaje describiendo el problema.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: "El username debe tener entre 5 y 20 caracteres"
 *       409:
 *         description: Conflicto, el nombre de usuario o el correo ya están en uso.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 409
 *                 message:
 *                   type: string
 *                   example: "El nombre de usuario ya está en uso."
 *       500:
 *         description: Error interno del servidor
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 500
 *                 message:
 *                   type: string
 *                   example: "Error interno del servidor"
 */

router.get("/protected", authenticate, (req: Request, res: Response) => {
  res.status(200).json({
    message: "Esta es una ruta protegida, acceso exitoso",
  });
});
/**
 * @swagger
 * /protected:
 *   get:
 *     summary: Ruta protegida
 *     description: Requiere un token de acceso válido en las cookies (`access_token`). Devuelve un mensaje de éxito si la autenticación es correcta.
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Acceso exitoso a la ruta protegida
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Esta es una ruta protegida, acceso exitoso
 *       401:
 *         description: Error de autenticación (token inválido, expirado o ausente)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: Autenticación fallida, Token expirado.
 */

router.get("/refresh-token", refreshTokenController);
/**
 * @swagger
 * /refresh-token:
 *   get:
 *     summary: Refrescar tokens de autenticación
 *     description: Genera un nuevo access token y refresh token a partir de la cookie `refresh_token`. También renueva las cookies en la respuesta.
 *     tags:
 *       - Auth
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Tokens refrescados exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 2
 *                     username:
 *                       type: string
 *                       example: string
 *                     first_name:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     last_name_1:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     last_name_2:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     email:
 *                       type: string
 *                       example: string
 *                     role:
 *                       type: string
 *                       example: Student
 *                     phone:
 *                       type: string
 *                       nullable: true
 *                       example: null
 *                     isDeleted:
 *                       type: boolean
 *                       example: false
 *                 token:
 *                   type: string
 *                   description: Nuevo access token (JWT)
 *                 refreshToken:
 *                   type: string
 *                   description: Nuevo refresh token (JWT)
 *       400:
 *         description: Refresh token faltante
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 400
 *                 message:
 *                   type: string
 *                   example: refreshToken faltante.
 *       401:
 *         description: Refresh token inválido o expirado
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 statusCode:
 *                   type: integer
 *                   example: 401
 *                 message:
 *                   type: string
 *                   example: Autenticación denegada
 */

export default router;
