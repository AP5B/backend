import request from "supertest";
import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import { testServer } from "../setup/setup";
import { PrismaClient, UserRole } from "@prisma/client";
import PrismaManager from "../../src/utils/prismaManager";
import { generateTestToken } from "../helpers/testUtils";

describe("Class Offer endpoints", () => {
  let teacherAgent: any;
  let studentAgent: any;
  let testTeacherUser: User | null = null;
  let testStudentUser: User | null = null;
  let teacherToken: string;
  let studentToken: string;
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

    testTeacherUser = await prisma.user.create({
      data: testUserData,
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

    teacherToken = generateTestToken(
      testTeacherUser.id,
      testTeacherUser.email,
      testTeacherUser.role,
      testTeacherUser.username,
    );
    studentToken = generateTestToken(
      testStudentUser.id,
      testStudentUser.email,
      testStudentUser.role,
      testStudentUser.username,
    );

    teacherAgent = request.agent(testServer.getApp());
    teacherAgent.set("Cookie", [`access_token=${teacherToken}`]);

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

    it("Should return 401 if the user is not a teacher", async () => {
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
      const response = await studentAgent.get("/class-offer?page=1&limit=2");

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it("Should filter by category", async () => {
      const CATEGORY = "Economia";
      const response = await studentAgent.get(
        `/class-offer?category=${CATEGORY}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].category).toBe(CATEGORY);
    });

    it("Should filter by price range", async () => {
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
      const TITLE = "cálculo";
      const response = await studentAgent.get(`/class-offer?title=${TITLE}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].title).toContain(TITLE);
    });
  });
});
