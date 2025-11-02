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
    };

    // query
    const result = await prisma.classOffer.findMany({
      skip: (page - 1) * limit,
      take: limit,
      where: filter,
    });

    const totalItems = await prisma.classOffer.count({ where: filter });

    const totalPages = Math.ceil(totalItems / limit);

    return [result, totalItems, totalPages];
  } catch (error) {
    console.log(error);
    throw new HttpError(500, "Error interno del servidor");
  }
};

export const getClassOfferByIdService = async (classId: number) => {
  try {
    const classOffer = await prisma.classOffer.findUnique({
      where: {
        id: classId,
      },
    });

    if (!classOffer)
      throw new HttpError(
        404,
        `No existe una oferta de clase con id ${classId}`,
      );

    return classOffer;
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
    });

    if (!classOffer)
      throw new HttpError(404, `No existe una oferta de clase con id ${id}.`);
    if (classOffer?.authorId != userId)
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
      },
    });

    if (!classOffer)
      throw new HttpError(
        404,
        `No existe una oferta de clase con id ${classOfferId}.`,
      );
    if (classOffer.authorId != userId)
      throw new HttpError(401, "El recurso no pertenece al usuario.");

    const deleteClassOffer = await prisma.classOffer.delete({
      where: {
        id: classOfferId,
      },
    });

    return deleteClassOffer;
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
export const getMyClassOffersService = async (authorId: number) => {
  try {
    const classOffers = await prisma.classOffer.findMany({
      where: {
        authorId: authorId,
      },
      orderBy: {
        id: "desc",
      },
    });

    return classOffers;
  } catch (error) {
    console.log(error);
    throw new HttpError(500, "Error interno del servidor.");
  }
};

