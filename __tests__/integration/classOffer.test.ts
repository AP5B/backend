import request from "supertest";
import bcrypt from "bcrypt";
import { testServer } from "../setup/setup";
import { PrismaClient, UserRole, User, ClassOffer } from "@prisma/client";
import PrismaManager from "../../src/utils/prismaManager";
import { generateTestToken } from "../helpers/testUtils";

describe("Class Offer endpoints", () => {
  let teacherAgent: any;
  let teacherAgent2: any;
  let studentAgent: any;
  let testTeacherUser: User | null = null;
  let testTeacherUser2: User | null = null;
  let testStudentUser: User | null = null;
  let teacherToken: string;
  let teacherToken2: string;
  let studentToken: string;
  let classOfferToDelete: ClassOffer | null = null;
  let classOfferToEdit: ClassOffer | null = null;
  let prisma: PrismaClient | null = null;
  const testPassword = "password123";

  beforeAll(async () => {
    try {
      prisma = PrismaManager.GetClient();
      if (!prisma) {
        throw new Error("Prisma client failed to initialize");
      }
    } catch (error) {
      console.error("Class Offer test setup failed:", error);
      prisma = null;
    }
  }, 30000);

  beforeEach(async () => {
    if (!testServer || !prisma) {
      console.warn("Skipping beforeEach due to failed setup in beforeAll.");
      return;
    }

    await prisma.transaction.deleteMany({});
    await prisma.classRequest.deleteMany({});
    await prisma.classOffer.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.user.deleteMany({});

    const hashedPassword = await bcrypt.hash(testPassword, 10);
    const testUserData = {
      username: "teacherUser",
      email: "login@teacher.com",
      password: hashedPassword,
      first_name: "Login",
      last_name_1: "Tester",
      last_name_2: "Number",
      phone: "88888888",
      role: UserRole.Teacher,
    };

    const mercadopagoInfo = {
      accessToken: "testAccessToken",
      accessTokenExpiration: new Date(Date.now() + 3600 * 1000).toISOString(),
      refreshToken: "testRefreshToken",
      refreshTokenExpiration: new Date(Date.now() + 7200 * 1000).toISOString(),
    };

    testTeacherUser = await prisma.user.create({
      data: {
        ...testUserData,
        mercadopagoInfo: {
          create: mercadopagoInfo,
        },
      },
    });

    testTeacherUser2 = await prisma.user.create({
      data: {
        ...testUserData,
        username: "teacherUser2",
        email: "login2@teacher.com",
        mercadopagoInfo: {
          create: mercadopagoInfo,
        },
      },
    });

    testStudentUser = await prisma.user.create({
      data: {
        ...testUserData,
        username: "studentUser",
        email: "login@student.com",
        role: UserRole.Student,
      },
    });

    await prisma.classOffer.createMany({
      data: [
        {
          title: "Cálculo I",
          description: "Clases básicas de derivadas",
          price: 10000,
          category: "Calculo",
          authorId: testTeacherUser.id,
        },
        {
          title: "Economía avanzada",
          description: "Micro y macroeconomía",
          price: 20000,
          category: "Economia",
          authorId: testTeacherUser.id,
        },
        {
          title: "Química general",
          description: "Estructura atómica",
          price: 15000,
          category: "Quimica",
          authorId: testTeacherUser.id,
        },
      ],
    });

    classOfferToDelete = await prisma.classOffer.create({
      data: {
        title: "Clase a eliminar",
        description: "Esta clase de va a eliminar",
        price: 5000,
        authorId: testTeacherUser.id,
      },
    });

    classOfferToEdit = await prisma.classOffer.create({
      data: {
        title: "Clase original",
        description: "Descripción original",
        price: 10000,
        authorId: testTeacherUser.id,
      },
    });

    teacherToken = generateTestToken(
      testTeacherUser.id,
      testTeacherUser.email,
      testTeacherUser.role,
      testTeacherUser.username,
    );
    teacherToken2 = generateTestToken(
      testTeacherUser2.id,
      testTeacherUser2.email,
      testTeacherUser2.role,
      testTeacherUser2.username,
    );
    studentToken = generateTestToken(
      testStudentUser.id,
      testStudentUser.email,
      testStudentUser.role,
      testStudentUser.username,
    );

    teacherAgent = request.agent(testServer.getApp());
    teacherAgent.set("Cookie", [`access_token=${teacherToken}`]);

    teacherAgent2 = request.agent(testServer.getApp());
    teacherAgent2.set("Cookie", [`access_token=${teacherToken2}`]);

    studentAgent = request.agent(testServer.getApp());
    studentAgent.set("Cookie", [`access_token=${studentToken}`]);
  }, 30000);

  describe("POST /class-offer", () => {
    const validPayload = {
      title: "Clases de Teoría de Autómatas",
      description: "Soy ayudante de Teoría de Autómatas...",
      price: 25000,
    };

    it("Should create a class-offer successfully", async () => {
      if (!testServer || !prisma || !testTeacherUser) return;

      const response = await teacherAgent
        .post("/class-offer")
        .send(validPayload);

      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        title: validPayload.title,
        description: validPayload.description,
        price: validPayload.price,
        authorId: testTeacherUser.id,
      });
    });

    it("Should return 400 if the title is full of numbers", async () => {
      if (!testServer || !prisma || !testTeacherUser) return;

      const response = await teacherAgent
        .post("/class-offer")
        .send({ ...validPayload, title: "123214234" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "El titulo no puede estar constituido solo por números.",
      );
    });

    it("Should return 400 if the description is full of numbers", async () => {
      if (!testServer || !prisma || !testTeacherUser) return;

      const response = await teacherAgent
        .post("/class-offer")
        .send({ ...validPayload, description: "123214234" });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "La descripción no puede estar constituida solo por números.",
      );
    });

    it("Should return 401 if the user is not a teacher", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent
        .post("/class-offer")
        .send(validPayload);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "Usuario no tiene rol: Teacher.",
      );
    });

    it("Should return 400 if the title is missing.", async () => {
      if (!testServer || !prisma) return;

      const invalidPayload = {
        description: "Sin título ni precio",
        price: 10,
      };

      const response = await teacherAgent
        .post("/class-offer")
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "El titulo no puede estar vacío",
      );
    });

    it("Should return 400 if the description is missing.", async () => {
      if (!testServer || !prisma) return;
      const invalidPayload = {
        title: "titulo",
        price: 10,
      };

      const response = await teacherAgent
        .post("/class-offer")
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "La descripción no puede estar vacía",
      );
    });

    it("Should return 400 if the price is missing.", async () => {
      if (!testServer || !prisma) return;
      const invalidPayload = {
        title: "titulo",
        description: "descripcion",
      };

      const response = await teacherAgent
        .post("/class-offer")
        .send(invalidPayload);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "El precio no puede estar vacío",
      );
    });
  });

  describe("GET /class-offer", () => {
    it("Should return paginated class offers", async () => {
      if (!testServer || !prisma) return;
      const response = await studentAgent.get("/class-offer?page=1&limit=2");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it("Should filter by category", async () => {
      if (!testServer || !prisma) return;

      const CATEGORY = "Economia";

      const response = await studentAgent.get(
        `/class-offer?category=${CATEGORY}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe(CATEGORY);
    });

    it("Should filter by price range", async () => {
      if (!testServer || !prisma) return;

      const MIN_PRICE = 12000;
      const MAX_PRICE = 18000;

      const response = await studentAgent.get(
        `/class-offer?minPrice=${MIN_PRICE}&maxPrice=${MAX_PRICE}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].price).toBeGreaterThan(MIN_PRICE);
      expect(response.body.data[0].price).toBeLessThan(MAX_PRICE);
    });

    it("Should search by title substring (case-insensitive)", async () => {
      if (!testServer || !prisma) return;

      const TITLE = "Cálculo";
      const response = await studentAgent.get(`/class-offer?title=${TITLE}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].title).toContain(TITLE);
    });

    it("Should return default pagination (page=1, limit=10) when no query params are provided", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent.get("/class-offer");

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data.length).toBeLessThanOrEqual(10);
    });

    it("Should return empty data if page exceeds total results", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent.get("/class-offer?page=99&limit=5");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it("Should normalize negative page numbers to page=1", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent.get("/class-offer?page=-5&limit=2");
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    it("Should normalize negative limit to limit=10", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent.get("/class-offer?page=1&limit=-10");
      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("Should correctly paginate (page=2 gives different elements than page=1)", async () => {
      if (!testServer || !prisma) return;

      const page1 = await studentAgent.get("/class-offer?page=1&limit=2");
      const page2 = await studentAgent.get("/class-offer?page=2&limit=2");

      expect(page1.status).toBe(200);
      expect(page2.status).toBe(200);

      expect(page1.body.data.length).toBeGreaterThan(0);
      expect(page2.body.data.length).toBeGreaterThan(0);

      const idsPage1 = page1.body.data.map((o: any) => o.id);
      const idsPage2 = page2.body.data.map((o: any) => o.id);

      expect(idsPage1).not.toEqual(idsPage2);
    });

    it("Should return empty array if filters exclude all class offers", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent.get(
        "/class-offer?title=ZZZ_TITLE_DOES_NOT_EXIST",
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it("Should filter by exact price", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent.get("/class-offer?price=10000");

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].price).toBe(10000);
    });

    it("Should ignore non-numeric price filters gracefully", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent.get("/class-offer?price=notanumber");

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("Should search by teacher name (first_name)", async () => {
      if (!testServer || !prisma) return;

      const NAME = testTeacherUser?.first_name || "Login";
      const response = await studentAgent.get(`/class-offer?name=${NAME}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
      expect(response.body.data[0].author.first_name).toContain(NAME);
    });

    it("Should search by teacher name with multiple words AND logic", async () => {
      if (!testServer || !prisma) return;

      const MULTI = `${testTeacherUser?.first_name} ${testTeacherUser?.last_name_1}`;

      const response = await studentAgent.get(`/class-offer?name=${MULTI}`);

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("Should not accept name longer than 30 characters", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent.get(
        "/class-offer?name=sooooooooooooooooooooooooooooooooolong",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBeGreaterThan(0);
    });

    it("Should respect category + price combined filters", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent.get(
        "/class-offer?category=Calculo&minPrice=9000&maxPrice=20000",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
      expect(response.body.data[0].category).toBe("Calculo");
      expect(response.body.data[0].price).toBeGreaterThanOrEqual(9000);
      expect(response.body.data[0].price).toBeLessThanOrEqual(10000);
    });
  });

  describe("DELETE /class-offer/{classId}", () => {
    it("Should return 400 if 'classId' is not a number", async () => {
      if (!testServer || !prisma) return;

      const CLASS_ID = "not a number";

      const response = await teacherAgent.delete(`/class-offer/${CLASS_ID}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "La id, de la oferta de clase, debe ser un número.",
      );
    });

    it("Should return 404 if the class to delete doesn't exist", async () => {
      if (!testServer || !prisma) return;

      const CLASS_ID = 400;

      const response = await teacherAgent.delete(`/class-offer/${CLASS_ID}`);

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty(
        "message",
        `No existe una oferta de clase con id ${CLASS_ID}.`,
      );
    });

    it("Should return 401 if the user who made the request is not the owner of the class", async () => {
      if (!testServer || !prisma || !classOfferToDelete) return;

      const response = await teacherAgent2.delete(
        `/class-offer/${classOfferToDelete.id}`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        `El recurso no pertenece al usuario.`,
      );
    });

    it("Should return 401 if the user who made the request is not a teacher", async () => {
      if (!testServer || !prisma || !classOfferToDelete) return;

      const response = await studentAgent.delete(
        `/class-offer/${classOfferToDelete.id}`,
      );

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        `Usuario no tiene rol: Teacher.`,
      );
    });

    it("Should delete a class offer successfully", async () => {
      if (!testServer || !prisma || !classOfferToDelete) return;

      const response = await teacherAgent.delete(
        `/class-offer/${classOfferToDelete.id}`,
      );
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty(
        "message",
        `Oferta de clase eliminada con éxito.`,
      );
    });
  });

  describe("PATCH /class-offer/{classId}", () => {
    it("Should return 400 if 'classId' is not a number", async () => {
      const response = await teacherAgent
        .patch("/class-offer/notanumber")
        .send({
          title: "Nuevo título",
        });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "La id, de la oferta de clase, debe ser un número.",
      );
    });

    it("Should return 404 if the class does not exist", async () => {
      const response = await teacherAgent.patch("/class-offer/9999").send({
        title: "Título inexistente",
      });

      expect(response.status).toBe(404);
      expect(response.body).toHaveProperty(
        "message",
        "No existe una oferta de clase con id 9999.",
      );
    });

    it("Should return 401 if the class belongs to another teacher", async () => {
      if (!classOfferToEdit) return;

      const response = await teacherAgent2
        .patch(`/class-offer/${classOfferToEdit.id}`)
        .send({ title: "Intento de edición" });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "El recurso no pertenece al usuario.",
      );
    });

    it("Should return 401 if the user is not a teacher", async () => {
      if (!classOfferToEdit) return;

      const response = await studentAgent
        .patch(`/class-offer/${classOfferToEdit.id}`)
        .send({ title: "Estudiante no autorizado" });

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "Usuario no tiene rol: Teacher.",
      );
    });

    it("Should update class-offer successfully", async () => {
      if (!classOfferToEdit) return;

      const newValues = {
        title: "Nuevo título",
        description: "Nueva descripción",
        price: 50000,
      };

      const response = await teacherAgent
        .patch(`/class-offer/${classOfferToEdit.id}`)
        .send(newValues);

      expect(response.status).toBe(200);
      expect(response.body).toMatchObject({
        id: classOfferToEdit.id,
        title: newValues.title,
        description: newValues.description,
        price: newValues.price,
      });
    });

    it("Should return 400 if the title is full of number", async () => {
      if (!classOfferToEdit) return;

      const newValues = {
        title: "123213214",
        description: "Nueva descripción",
        price: 50000,
      };

      const response = await teacherAgent
        .patch(`/class-offer/${classOfferToEdit.id}`)
        .send(newValues);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "El titulo no puede estar constituido solo por números.",
      );
    });

    it("Should return 400 if the title is full of number", async () => {
      if (!classOfferToEdit) return;

      const newValues = {
        title: "Nuevo título",
        description: "12323434",
        price: 50000,
      };

      const response = await teacherAgent
        .patch(`/class-offer/${classOfferToEdit.id}`)
        .send(newValues);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "La descripción no puede estar constituida solo por números.",
      );
    });
  });
});
