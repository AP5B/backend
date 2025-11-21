import PrismaManager from "../utils/prismaManager";
import { HttpError } from "../middlewares/errorHandler";

const prisma = PrismaManager.GetClient();

export interface reviewRequestBody {
  rating: number;
  content?: string;
}

export interface editedReviewRequestBody {
  rating?: number;
  content?: string;
}

export const createReviewService = async (
  reviewBody: reviewRequestBody,
  teacherId: number,
  reviewerId: number,
) => {
  try {
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId, role: "Teacher" },
      select: { isDeleted: true },
    });

    if (!teacher) {
      throw new HttpError(404, `Tutor no encontrado.`);
    }

    if (teacher.isDeleted === true) {
      throw new HttpError(403, "La cuenta del profesor fue suspendida.");
    }

    const review = await prisma.review.findFirst({
      where: {
        teacherId: teacherId,
        reviewerId: reviewerId,
      },
    });

    if (review) {
      throw new HttpError(400, `Ya dejaste una review a este tutor`);
    }

    const newReview = await prisma.review.create({
      data: {
        ...reviewBody,
        teacherId: teacherId,
        reviewerId: reviewerId,
      },
      include: {
        reviewer: { select: { username: true } },
      },
    });

    const formattedCreatedAt = newReview.createdAt.toISOString().split("T")[0];

    return { ...newReview, createdAt: formattedCreatedAt };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};

export const getTeacherReviewsService = async (
  teacherId: number,
  page: number,
  limit: number,
) => {
  try {
    const offset = (page - 1) * limit;
    const teacher = await prisma.user.findUnique({
      where: { id: teacherId, role: "Teacher" },
      select: { isDeleted: true },
    });

    if (!teacher) {
      throw new HttpError(404, `Tutor no encontrado.`);
    }

    if (teacher.isDeleted === true) {
      throw new HttpError(403, "La cuenta del profesor fue suspendida.");
    }

    const reviews = await prisma.review.findMany({
      where: {
        teacherId: teacherId,
      },
      include: {
        reviewer: { select: { username: true, isDeleted: true } },
      },
      skip: offset,
      take: limit,
    });

    const formatedReviews = reviews.map((rev) => {
      const username =
        rev.reviewer.isDeleted === true ? "Eliminado" : rev.reviewer.username;
      const reviewer = { ...rev.reviewer, username: username };
      return {
        ...rev,
        reviewer: reviewer,
        createdAt: rev.createdAt.toISOString().split("T")[0],
      };
    });

    return formatedReviews;
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};

export const updateReviewService = async (
  reviewId: number,
  userId: number,
  editBody: editedReviewRequestBody,
) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
      select: {
        reviewerId: true,
        reviewer: { select: { isDeleted: true } },
      },
    });

    if (!review) {
      throw new HttpError(404, `Review no encontrada.`);
    }

    if (review.reviewerId !== userId) {
      throw new HttpError(401, `El recurso no le pertenece al usuario actual.`);
    }

    const editedReview = await prisma.review.update({
      where: { id: reviewId },
      data: editBody,
      include: {
        reviewer: { select: { username: true } },
      },
    });

    const formattedCreatedAt = editedReview.createdAt
      .toISOString()
      .split("T")[0];

    return { ...editedReview, createdAt: formattedCreatedAt };
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};

export const deleteReviewService = async (reviewId: number, userId: number) => {
  try {
    const review = await prisma.review.findUnique({
      where: { id: reviewId },
    });

    if (!review) {
      throw new HttpError(404, `Review no encontrada.`);
    }

    if (review.reviewerId !== userId) {
      throw new HttpError(401, `El recurso no le pertenece al usuario actual.`);
    }
    await prisma.review.delete({ where: { id: reviewId } });
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};

export const getCurrentUserReviewsService = async (
  userId: number,
  page: number,
  limit: number,
) => {
  try {
    const offset = (page - 1) * limit;
    const myReviews = await prisma.review.findMany({
      where: { reviewerId: userId },
      skip: offset,
      take: limit,
      include: {
        reviewer: { select: { username: true, isDeleted: true } },
      },
    });

    const formatedReviews = myReviews.map((rev) => {
      const username =
        rev.reviewer.isDeleted === true ? "Eliminado" : rev.reviewer.username;
      const reviewer = { ...rev.reviewer, username: username };
      return {
        ...rev,
        reviewer: reviewer,
        createdAt: rev.createdAt.toISOString().split("T")[0],
      };
    });

    return formatedReviews;
  } catch (error) {
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};
