import { Request, Response } from "express";
import { HttpError } from "../middlewares/errorHandler";
import {
  createReviewService,
  getTeacherReviewsService,
  updateReviewService,
  deleteReviewService,
  reviewRequestBody,
  editedReviewRequestBody,
  getCurrentUserReviewsService,
} from "../services/reviewsServices";

export const createReviewController = async (req: Request, res: Response) => {
  const reqBody = req.body as reviewRequestBody;
  const teacherId = parseInt(req.params.teacherId as string);
  const userId = parseInt(res.locals.user.id as string);

  if (!teacherId) {
    throw new HttpError(400, "Id del tutor faltante.");
  }

  if (!reqBody.rating) {
    throw new HttpError(400, "Se debe ingresar una puntuación");
  }

  if (isNaN(reqBody.rating)) {
    throw new HttpError(400, "La puntuación debe ser un número");
  }

  const newReview = await createReviewService(reqBody, teacherId, userId);

  res.status(200).json({
    message: "Review creada con éxito",
    review: newReview,
  });
};

export const getTeacherReviewsController = async (
  req: Request,
  res: Response,
) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const normPage = page > 0 ? page : 1;
  const normLimit = limit > 0 ? limit : 10;
  const teacherId = parseInt(req.params.teacherId as string);

  if (!teacherId) {
    throw new HttpError(400, "Id del tutor faltante.");
  }

  const reviews = await getTeacherReviewsService(
    teacherId,
    normPage,
    normLimit,
  );
  res.status(200).json({
    message: "Operación exitosa",
    reviews: reviews,
  });
};

export const updateReviewController = async (req: Request, res: Response) => {
  const editBody = req.body as editedReviewRequestBody;
  const reviewId = parseInt(req.params.reviewId as string);
  const userId = parseInt(res.locals.user.id as string);

  if (!reviewId) {
    throw new HttpError(400, "Id de la review faltante.");
  }

  if (!editBody.content && !editBody.rating) {
    throw new HttpError(
      400,
      "No se proporcionaron datos para actualizar la review.",
    );
  }

  if (editBody.rating && isNaN(editBody.rating)) {
    throw new HttpError(400, "La puntuación debe ser un número");
  }

  const editedReview = await updateReviewService(reviewId, userId, editBody);

  res.status(200).json({
    message: "Review editada con éxito.",
    review: editedReview,
  });
};

export const deleteReviewController = async (req: Request, res: Response) => {
  const reviewId = parseInt(req.params.reviewId as string);
  const userId = parseInt(res.locals.user.id as string);

  if (!reviewId) {
    throw new HttpError(400, "Id de la review faltante.");
  }

  await deleteReviewService(reviewId, userId);

  res.status(200).json({
    message: "Review eliminada con éxito.",
  });
};

export const getCurrentUserReviewsController = async (
  req: Request,
  res: Response,
) => {
  const userId = parseInt(res.locals.user.id as string);

  const myReviews = await getCurrentUserReviewsService(userId);

  res.status(200).json({
    message: "Reviews del usuario obtenidas con éxito.",
    reviews: myReviews,
  });
};
