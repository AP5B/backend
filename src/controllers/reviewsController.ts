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
    throw new HttpError(
      400,
      "Id del tutor no fue proporcionado correctamente.",
    );
  }

  if (!reqBody.rating) {
    throw new HttpError(400, "Se debe ingresar una puntuación");
  }

  if (isNaN(reqBody.rating)) {
    throw new HttpError(400, "La puntuación debe ser un número");
  }

  if (reqBody.rating > 5 || reqBody.rating < 1) {
    throw new HttpError(400, "La puntuación debe estar entre 1 y 5");
  }

  if (!reqBody.content) {
    throw new HttpError(400, "No se puede crear una reseña vacía.");
  }

  if (
    reqBody.content.trim().length < 1 ||
    reqBody.content.trim().length > 1000
  ) {
    throw new HttpError(
      400,
      "Cuerpo de la review debe tener entre 1 y 1000 caracteres.",
    );
  }

  const regex = /\D/;
  if (!regex.test(reqBody.content.trim())) {
    throw new HttpError(400, "Formato del cuerpo de la review inválido.");
  }

  const sanitizedBody: reviewRequestBody = {
    rating: reqBody.rating,
    content: reqBody.content.trim(),
  };

  const newReview = await createReviewService(sanitizedBody, teacherId, userId);

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
    throw new HttpError(
      400,
      "Id del tutor no fue proporcionado correctamente.",
    );
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
  const { rating, content } = req.body as editedReviewRequestBody;
  const reviewId = parseInt(req.params.reviewId as string);
  const userId = parseInt(res.locals.user.id as string);
  const sanitizedBody: editedReviewRequestBody = {};

  if (!reviewId) {
    throw new HttpError(
      400,
      "Id de la review no fue proporcionada correctamente.",
    );
  }

  if (!content && !rating) {
    throw new HttpError(
      400,
      "No se proporcionaron datos para actualizar la review.",
    );
  }

  if (rating && isNaN(rating)) {
    throw new HttpError(400, "La puntuación debe ser un número");
  }

  if (rating && (rating > 5 || rating < 1)) {
    throw new HttpError(400, "La puntuación debe estar entre 1 y 5");
  }

  if (rating) sanitizedBody.rating = rating;
  if (content) {
    if (content.trim().length > 1000) {
      throw new HttpError(
        400,
        "Cuerpo de la review no puede superar los 1000 caracteres.",
      );
    }
    const regex = /\D/;
    if (!regex.test(content.trim())) {
      throw new HttpError(400, "Formato del cuerpo de la review inválido.");
    }
    sanitizedBody.content = content.trim();
  }

  const editedReview = await updateReviewService(
    reviewId,
    userId,
    sanitizedBody,
  );

  res.status(200).json({
    message: "Review editada con éxito.",
    review: editedReview,
  });
};

export const deleteReviewController = async (req: Request, res: Response) => {
  const reviewId = parseInt(req.params.reviewId as string);
  const userId = parseInt(res.locals.user.id as string);

  if (!reviewId) {
    throw new HttpError(
      400,
      "Id de la review no fue proporcionada correctamente.",
    );
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
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const normPage = page > 0 ? page : 1;
  const normLimit = limit > 0 ? limit : 10;

  const myReviews = await getCurrentUserReviewsService(
    userId,
    normPage,
    normLimit,
  );

  res.status(200).json({
    message: "Reviews del usuario obtenidas con éxito.",
    reviews: myReviews,
  });
};
