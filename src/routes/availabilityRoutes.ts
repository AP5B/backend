import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  getAvailabilityController,
  editAvailabilityController,
  uploadAvailabilitiesController,
  deleteAvailabilityController
} from "../controllers/availabilityController"

const router = Router();

router.get("/:teacherId", getAvailabilityController);
router.patch("/", authenticate, editAvailabilityController);
router.post("/", authenticate, uploadAvailabilitiesController);
router.delete("/:id", authenticate, deleteAvailabilityController);

export default router
