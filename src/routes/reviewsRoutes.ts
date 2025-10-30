import { Router } from "express";
import { authenticate } from "../middlewares/authMiddleware";
import {
  createReviewController,
  getTeacherReviewsController,
  deleteReviewController,
  updateReviewController,
  getCurrentUserReviewsController,
} from "../controllers/reviewsController";

const router = Router();

router.post("/:teacherId", authenticate, createReviewController);
router.get("/:teacherId", authenticate, getTeacherReviewsController);
router.patch("/:reviewId", authenticate, updateReviewController);
router.delete("/:reviewId", authenticate, deleteReviewController);
router.get("/user", authenticate, getCurrentUserReviewsController);

export default router;
