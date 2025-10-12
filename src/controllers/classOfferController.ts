import { Request, Response } from "express"
import { 
  getClassOffersService, 
  getClassOfferByIdService, 
  createClassOfferService,
  editClassOfferService,
  destroyClassOfferService,
  classOfferQuery,
  Category, 
  
} from "../services/classOfferServices"
import { HttpError } from "../middlewares/errorHandler"
import { classOfferRequestBody, editClassOfferRequestBody, categories} from "../services/classOfferServices"

const validateClassOfferBody = (body: classOfferRequestBody) => {
  if (!body.title?.trim())
    throw new HttpError(400, "El titulo no puede estar vacío");
  if (!body.description?.trim())
    throw new HttpError(400, "La descripción no puede estar vacía");
  if (!body.price)
    throw new HttpError(400, "El precio no puede estar vacío");
  if (typeof body.price != "number")
    throw new HttpError(400, "El precio debe ser un numero");
  if (body.category && !categories.includes(body.category) )
    throw new HttpError(400, "Categoría invalida")
}

const validateEditClassOfferRequestBody = (body: editClassOfferRequestBody) => {
  if (!(body.title || body.description || body.price))
    throw new HttpError(400, "La solicitud debe tener al menos un campo a editar.")
  if (body.title !== undefined && !body.title?.trim())
    throw new HttpError(400, "El titulo no puede estar vacío");
  if (body.description !== undefined && !body.description?.trim())
    throw new HttpError(400, "La descripción no puede estar vacía");
  if (body.price !== undefined && typeof body.price != "number")
    throw new HttpError(400, "El precio debe ser un numero")
  if (body.category !== undefined && !categories.includes(body.category))
    throw new HttpError(400, "Categoría invalida")
}

export const getClassOffersController = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const normPage = (page > 0) ? page : 1
  const normLimit = (limit > 0) ? limit : 10

  const query: classOfferQuery = {}

  // sanitizando
  const { title, category, price, minPrice, maxPrice } = req.query;


  if (typeof title === "string")    query.title = title;
  if (typeof price === "string")   {
    const parse = parseInt(price)
    if (!isNaN(parse)) query.price = parse
  }
  if (typeof minPrice === "string") {
    const parse = parseInt(minPrice)
    if (!isNaN(parse)) query.minPrice = parse
  }
  if (typeof maxPrice === "string") {
    const parse = parseInt(maxPrice)
    if (!isNaN(parse)) query.maxPrice = parse
  }
  if (typeof category === "string"  && categories.includes(category as Category))
    query.category = category as Category;
  
  console.log(query)

  const [classOffers, totalItems, totalPages] = await getClassOffersService(normPage, normLimit, query);

  res.status(200).json({
    data: classOffers,
    pagination: {
      page: normPage,
      limit: normLimit,
      totalItems: totalItems,
      totalPages: totalPages,
    }
  })
}

export const getClassOfferByIdController = async (req: Request, res: Response) => {
  const classId = Number(req.params.classId)
  if (isNaN(classId))
    throw new HttpError(400, "La id, de la oferta de clase, debe ser un número.");

  const classOffer = await getClassOfferByIdService(classId)

  res.status(200).json(classOffer)
}

export const createClassOfferController = async (req: Request, res: Response) => {
  const userId: number = res.locals.user.id
  const reqBody = req.body as classOfferRequestBody

  validateClassOfferBody(reqBody);

  const {title, description, price, category} = reqBody;

  // de todos modos el service igual sanitiza
  const sanitizedBody: classOfferRequestBody = {
    title, description, price,
    authorId: userId
  }
  // si en la request no hay categoria se ocupa el default que define prisma (Otro)
  if (category) sanitizedBody.category = category;

  const classOffer = await createClassOfferService(sanitizedBody);

  res.status(201).json(classOffer)
}

export const editClassOfferController = async (req: Request, res: Response) => {
  const userId = res.locals.user.id
  const classId = Number(req.params.classId);
  const reqBody = req.body as editClassOfferRequestBody;
  
  if (isNaN(classId))
    throw new HttpError(400, "La id, de la oferta de clase, debe ser un número.");
  validateEditClassOfferRequestBody(reqBody);

  const sanitizedBody: editClassOfferRequestBody = {
    id: classId
  }
  if(reqBody.title)       sanitizedBody.title = reqBody.title;
  if(reqBody.price)       sanitizedBody.price = reqBody.price;
  if(reqBody.description) sanitizedBody.description = reqBody.description;
  if(reqBody.category)    sanitizedBody.category = reqBody.category;

  const classOffer = await editClassOfferService(userId, sanitizedBody)

  res.status(200).json(classOffer)
}

export const deleteClassOfferController = async (req: Request, res: Response) => {
  const userId = res.locals.user.id
  const classId = Number(req.params.classId);

  if (isNaN(classId))
    throw new HttpError(400, "La id, de la oferta de clase, debe ser un número.");

  const deleteClass = await destroyClassOfferService(userId, classId);

  res.status(200).send({
    deleted: deleteClass,
    message: "Oferta de clase eliminada con éxito."
  });
}