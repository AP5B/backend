import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
	changePasswordController,
	updateNamesController,
} from "../controllers/profileController";

const router = Router();

// Cambiar contraseña (se debe enviar userId, current_password, new_password, confirm_password?)
router.patch("/password", authenticate, changePasswordController);

// Actualizar nombre/apellidos (enviar userId, current_password, y los campos a actualizar)
router.patch("/names", authenticate, updateNamesController);

export default router;
