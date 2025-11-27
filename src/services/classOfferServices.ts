import { Prisma } from "@prisma/client";
import { HttpError } from "../middlewares/errorHandler";
import PrismaManager from "../utils/prismaManager";

const prisma = PrismaManager.GetClient();

export const categories = [
  "Calculo",
  "Dinamica",
  "Economia",
  "Quimica",
  "Computacion",
  "Otro",
] as const;

export type Category = (typeof categories)[number];

export interface classOfferRequestBody {
  title: string;
  description: string;
  price: number;
  category?: Category;
  authorId: number;
}

export interface editClassOfferRequestBody {
  id: number;
  title?: string;
  description?: string;
  category?: Category;
  price?: number;
}

export interface classOfferQuery {
  title?: string;
  category?: Category;
  price?: number;
  minPrice?: number;
  maxPrice?: number;
}

/**
 * busca y pagina una query para classOffer, entrega el total de iteam y paginas.
 * @param page
 * @param limit
 * @param query
 * @returns [result, totalItems, totalPage]
 */
export const getClassOffersService = async (
  page: number,
  limit: number,
  query: classOfferQuery,
) => {
  try {
    // parsing price filter
    let filterPrice: number | { gte?: number; lte?: number } | undefined;
    if (query.price) {
      filterPrice = query.price;
    } else if (query.minPrice || query.maxPrice) {
      filterPrice = {
        ...(query.minPrice ? { gte: query.minPrice } : {}),
        ...(query.maxPrice ? { lte: query.maxPrice } : {}),
      };
    }

    const filter = {
      ...(query.title
        ? {
            title: {
              contains: query.title,
              mode: Prisma.QueryMode.insensitive,
            },
          }
        : {}),
      ...(query.category ? { category: query.category } : {}),
      ...(filterPrice ? { price: filterPrice } : {}),
      isDeleted: false,
    };

    // query
    const result = await prisma.classOffer.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: filter,
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        price: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            first_name: true,
            last_name_1: true,
            username: true,
            receivedReviews: {
              select: { rating: true },
            },
          },
        },
      },
    });

    const final = result.map((offer) => {
      const ratings = offer.author.receivedReviews.map((r) => r.rating);
      const avg =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;
      const avgCeil = avg !== 0 ? Math.ceil(avg) : 0;
      const formattedDate = new Date(offer.createdAt)
        .toISOString()
        .split("T")[0];
      const { receivedReviews: _ignore, ...classOfferAuthor } = offer.author;
      return {
        ...offer,
        createdAt: formattedDate,
        author: {
          avgRating: avgCeil,
          ...classOfferAuthor,
        },
      };
    });

    return final;
  } catch (error) {
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};

export const getClassOfferByIdService = async (
  classId: number,
  reviewsPage: number,
  reviewsLimit: number,
) => {
  try {
    const offset = (reviewsPage - 1) * reviewsLimit;
    const classOffer = await prisma.classOffer.findUnique({
      where: {
        id: classId,
        isDeleted: false,
      },
      select: {
        id: true,
        title: true,
        description: true,
        price: true,
        createdAt: true,
        category: true,
        author: {
          select: {
            id: true,
            username: true,
            first_name: true,
            last_name_1: true,
            availabilities: { select: { day: true, slot: true } },
            receivedReviews: {
              skip: offset,
              take: reviewsLimit,
              select: {
                id: true,
                rating: true,
                content: true,
                createdAt: true,
                reviewer: { select: { username: true, isDeleted: true } },
              },
            },
          },
        },
      },
    });

    if (!classOffer) {
      throw new HttpError(404, `Oferta de clase no encontrada`);
    }

    const formattedReviews = classOffer.author.receivedReviews.map((review) => {
      const formattedCreatedAt = new Date(review.createdAt)
        .toISOString()
        .split("T")[0];

      const username =
        review.reviewer.isDeleted === true
          ? "Eliminado"
          : review.reviewer.username;
      const reviewer = { ...review.reviewer, username: username };

      return {
        ...review,
        reviewer: reviewer,
        createdAt: formattedCreatedAt,
      };
    });

    const ratings = classOffer.author.receivedReviews.map((r) => r.rating);
    const avg =
      ratings.length > 0
        ? ratings.reduce((a, b) => a + b, 0) / ratings.length
        : 0;
    const avgCeil = avg !== 0 ? Math.ceil(avg) : 0;

    const authorInfo = {
      avgRating: avgCeil,
      ...classOffer.author,
      receivedReviews: formattedReviews,
    };

    const formattedDate = new Date(classOffer.createdAt)
      .toISOString()
      .split("T")[0];

    return {
      ...classOffer,
      createdAt: formattedDate,
      author: authorInfo,
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(500, "Error interno del servidor");
  }
};

export const createClassOfferService = async (
  reqBody: classOfferRequestBody,
) => {
  try {
    return await prisma.classOffer.create({
      data: {
        title: reqBody.title,
        description: reqBody.description,
        price: reqBody.price,
        ...(reqBody.category ? { category: reqBody.category } : {}), // inserta category si es que la reqBody lo contiene
        author: { connect: { id: reqBody.authorId } },
      },
    });
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.log(error);
    throw new HttpError(500, "Error interno en el servidor.");
  }
};

export const editClassOfferService = async (
  userId: number,
  reqBody: editClassOfferRequestBody,
) => {
  try {
    const { id, ...updateData } = reqBody;

    const classOffer = await prisma.classOffer.findFirst({
      where: {
        id: id,
      },
      select: {
        authorId: true,
      },
    });

    if (!classOffer)
      throw new HttpError(404, `No existe una oferta de clase con id ${id}.`);

    if (classOffer.authorId != userId)
      throw new HttpError(401, "El recurso no pertenece al usuario.");

    const updateClassOffer = await prisma.classOffer.update({
      where: {
        id: id,
      },
      data: updateData,
    });

    return updateClassOffer;
  } catch (error: unknown) {
    if (error instanceof HttpError) throw error;
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};

export const destroyClassOfferService = async (
  userId: number,
  classOfferId: number,
) => {
  try {
    const classOffer = await prisma.classOffer.findFirst({
      where: {
        id: classOfferId,
        isDeleted: false,
      },
      select: {
        authorId: true,
      },
    });

    if (!classOffer) {
      throw new HttpError(
        404,
        `No existe una oferta de clase con id ${classOfferId}.`,
      );
    }

    if (classOffer.authorId != userId) {
      throw new HttpError(401, "El recurso no pertenece al usuario.");
    }

    const deletedClassOffer = await prisma.classOffer.update({
      where: { id: classOfferId },
      data: { isDeleted: true },
    });

    return deletedClassOffer;
  } catch (error: unknown) {
    if (error instanceof HttpError) throw error;
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};

/**
 * Devuelve todas las ofertas de clase publicadas por un profesor
 * @param authorId ID del profesor
 * @returns Lista de ofertas del profesor
 */
export const getMyClassOffersService = async (
  authorId: number,
  page: number,
  limit: number,
) => {
  try {
    const offset = (page - 1) * limit;

    const classOffers = await prisma.classOffer.findMany({
      where: {
        authorId: authorId,
        isDeleted: false,
      },
      orderBy: {
        id: "desc",
      },
      skip: offset,
      take: limit,
      select: {
        id: true,
        title: true,
        category: true,
        description: true,
        price: true,
        createdAt: true,
        author: {
          select: {
            id: true,
            first_name: true,
            last_name_1: true,
            username: true,
            receivedReviews: {
              select: { rating: true },
            },
          },
        },
      },
    });

    const final = classOffers.map((offer) => {
      const ratings = offer.author.receivedReviews.map((r) => r.rating);
      const avg =
        ratings.length > 0
          ? ratings.reduce((a, b) => a + b, 0) / ratings.length
          : 0;
      const avgCeil = avg !== 0 ? Math.ceil(avg) : 0;
      const formattedDate = new Date(offer.createdAt)
        .toISOString()
        .split("T")[0];
      const { receivedReviews: _ignore, ...classOfferAuthor } = offer.author;
      return {
        ...offer,
        createdAt: formattedDate,
        author: {
          avgRating: avgCeil,
          ...classOfferAuthor,
        },
      };
    });

    return final;
  } catch (error) {
    if (error instanceof HttpError) throw error;
    console.log(error);
    throw new HttpError(500, "Error interno del servidor.");
  }
};
