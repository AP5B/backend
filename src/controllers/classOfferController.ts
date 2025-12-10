import { Request, Response } from "express";
import {
  getClassOffersService,
  getClassOfferByIdService,
  createClassOfferService,
  editClassOfferService,
  destroyClassOfferService,
  getMyClassOffersService,
  classOfferQuery,
  Category,
} from "../services/classOfferServices";
import { HttpError } from "../middlewares/errorHandler";
import {
  classOfferRequestBody,
  editClassOfferRequestBody,
  categories,
} from "../services/classOfferServices";
import { checkOAuthService } from "../services/transactionService";

const validateClassOfferBody = (body: classOfferRequestBody) => {
  const regex = /\D/;
  if (!body.title?.trim())
    throw new HttpError(400, "El titulo no puede estar vacío");
  if (body.title.trim()) {
    if (!regex.test(body.title.trim())) {
      throw new HttpError(
        400,
        "El titulo no puede estar constituido solo por números.",
      );
    }
    if (body.title.trim().length > 50 || body.title.trim().length < 3) {
      throw new HttpError(400, "El titulo debe tener entre 3 y 50 caracteres.");
    }
  }
  if (!body.description?.trim())
    throw new HttpError(400, "La descripción no puede estar vacía");
  if (body.description.trim()) {
    if (!regex.test(body.description.trim())) {
      throw new HttpError(
        400,
        "La descripción no puede estar constituida solo por números.",
      );
    }
    if (
      body.description.trim().length > 1200 ||
      body.description.trim().length < 1
    ) {
      throw new HttpError(
        400,
        "La descripción debe tener entre 1 y 1200 caracteres.",
      );
    }
  }
  if (!body.price) throw new HttpError(400, "El precio no puede estar vacío");
  if (typeof body.price != "number")
    throw new HttpError(400, "El precio debe ser un numero");
  if (body.price < 50 || body.price > 50000) {
    throw new HttpError(400, "Precio fuera de rango (50 - 50000)");
  }
  if (body.category && !categories.includes(body.category))
    throw new HttpError(400, "Categoría invalida");
};

const validateEditClassOfferRequestBody = (body: editClassOfferRequestBody) => {
  const regex = /\D/;
  if (!(body.title || body.description || body.price || body.category))
    throw new HttpError(
      400,
      "La solicitud debe tener al menos un campo a editar.",
    );
  if (body.title !== undefined && !body.title?.trim())
    throw new HttpError(400, "El titulo no puede estar vacío");
  if (body.title !== undefined && !regex.test(body.title.trim()))
    throw new HttpError(
      400,
      "El titulo no puede estar constituido solo por números.",
    );
  if (
    body.title !== undefined &&
    (body.title.trim().length < 3 || body.title.trim().length > 50)
  )
    throw new HttpError(400, "El titulo debe tener entre 3 y 50 caracteres.");
  if (body.description !== undefined && !body.description?.trim())
    throw new HttpError(400, "La descripción no puede estar vacía");
  if (body.description !== undefined && !regex.test(body.description.trim()))
    throw new HttpError(
      400,
      "La descripción no puede estar constituida solo por números.",
    );
  if (
    body.description !== undefined &&
    (body.description.trim().length < 1 ||
      body.description.trim().length > 1200)
  )
    throw new HttpError(
      400,
      "La descripción debe tener entre 1 y 1200 caracteres.",
    );
  if (body.price !== undefined && typeof body.price != "number")
    throw new HttpError(400, "El precio debe ser un numero");
  if (body.price !== undefined && (body.price < 50 || body.price > 50000)) {
    throw new HttpError(400, "Precio fuera de rango (50 - 50000)");
  }
  if (body.category !== undefined && !categories.includes(body.category))
    throw new HttpError(400, "Categoría invalida");
};

export const getClassOffersController = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const normPage = page > 0 ? page : 1;
  const normLimit = limit > 0 ? limit : 10;

  const query: classOfferQuery = {};

  // sanitizando
  const { title, category, price, minPrice, maxPrice, name } = req.query;

  if (typeof title === "string") query.title = title;
  if (typeof price === "string") {
    const parse = parseInt(price);
    if (!isNaN(parse)) query.price = parse;
  }
  if (typeof minPrice === "string") {
    const parse = parseInt(minPrice);
    if (!isNaN(parse)) query.minPrice = parse;
  }
  if (typeof maxPrice === "string") {
    const parse = parseInt(maxPrice);
    if (!isNaN(parse)) query.maxPrice = parse;
  }
  if (typeof category === "string" && categories.includes(category as Category))
    query.category = category as Category;

  if (
    typeof name === "string" &&
    name.trim().length < 30 &&
    name.trim().length > 0
  ) {
    query.name = name.trim();
  }

  console.log(query);

  const classOffers = await getClassOffersService(normPage, normLimit, query);

  res.status(200).json({
    data: classOffers,
  });
};

export const getClassOfferByIdController = async (
  req: Request,
  res: Response,
) => {
  const classId = parseInt(req.params.classId as string);
  const page = parseInt(req.query.reviewsPage as string) || 1;
  const limit = parseInt(req.query.reviewsLimit as string) || 5;
  const normPage = page > 0 ? page : 1;
  const normLimit = limit > 0 ? limit : 5;

  if (!classId) throw new HttpError(400, "Id de la oferta de clase faltante.");

  const classOffer = await getClassOfferByIdService(
    classId,
    normPage,
    normLimit,
  );

  res.status(200).json(classOffer);
};

export const createClassOfferController = async (
  req: Request,
  res: Response,
) => {
  const userId: number = res.locals.user.id;
  const reqBody = req.body as classOfferRequestBody;

  const response = await checkOAuthService(userId);

  if (response.hasOAuth === false) {
    throw new HttpError(
      response.status || 403,
      response.message ||
        "El usuario no ha completado el proceso de OAuth de Mercado Pago.",
    );
  }

  validateClassOfferBody(reqBody);

  const { title, description, price, category } = reqBody;

  // de todos modos el service igual sanitiza
  const sanitizedBody: classOfferRequestBody = {
    title: title.trim(),
    description: description.trim(),
    price: price,
    authorId: userId,
  };
  // si en la request no hay categoria se ocupa el default que define prisma (Otro)
  if (category) sanitizedBody.category = category;

  const classOffer = await createClassOfferService(sanitizedBody);

  res.status(201).json(classOffer);
};

export const editClassOfferController = async (req: Request, res: Response) => {
  const userId = res.locals.user.id;
  const classId = Number(req.params.classId);
  const reqBody = req.body as editClassOfferRequestBody;

  if (isNaN(classId))
    throw new HttpError(
      400,
      "La id, de la oferta de clase, debe ser un número.",
    );
  validateEditClassOfferRequestBody(reqBody);

  const sanitizedBody: editClassOfferRequestBody = {
    id: classId,
  };
  if (reqBody.title) sanitizedBody.title = reqBody.title.trim();
  if (reqBody.price) sanitizedBody.price = reqBody.price;
  if (reqBody.description)
    sanitizedBody.description = reqBody.description.trim();
  if (reqBody.category) sanitizedBody.category = reqBody.category;

  const classOffer = await editClassOfferService(userId, sanitizedBody);

  res.status(200).json(classOffer);
};

export const deleteClassOfferController = async (
  req: Request,
  res: Response,
) => {
  const userId = res.locals.user.id;
  const classId = Number(req.params.classId);

  if (isNaN(classId))
    throw new HttpError(
      400,
      "La id, de la oferta de clase, debe ser un número.",
    );

  const deleteClass = await destroyClassOfferService(userId, classId);

  res.status(200).send({
    deleted: deleteClass,
    message: "Oferta de clase eliminada con éxito.",
  });
};

export const getMyClassOffersController = async (
  req: Request,
  res: Response,
) => {
  const userId = res.locals.user.id;
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const normPage = page > 0 ? page : 1;
  const normLimit = limit > 0 ? limit : 10;

  const classOffers = await getMyClassOffersService(
    userId,
    normPage,
    normLimit,
  );

  res.status(200).json({
    data: classOffers,
  });
};
