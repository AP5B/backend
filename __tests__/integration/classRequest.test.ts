import request from "supertest";
import bcrypt from "bcrypt";
import { testServer } from "../setup/setup";
import { PrismaClient, UserRole, User, ClassOffer } from "@prisma/client";
import PrismaManager from "../../src/utils/prismaManager";
import { generateTestToken } from "../helpers/testUtils";

describe("Class Offer endpoints", () => {
  let teacherAgent: any;
  let studentAgent: any;
  let testTeacherUser: User | null = null;
  let testStudentUser: User | null = null;
  let testStudentUser2: User | null = null;
  let teacherToken: string;
  let studentToken: string;
  let prisma: PrismaClient | null = null;
  let classOffer1: ClassOffer | null = null;
  let classOffer2: ClassOffer | null = null;
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

    //await prisma.transaction.deleteMany({});
    await prisma.classRequest.deleteMany({});
    await prisma.classOffer.deleteMany({});
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

    testStudentUser = await prisma.user.create({
      data: {
        ...testUserData,
        username: "studentUser",
        email: "login@student.com",
        role: UserRole.Student,
      },
    });

    testStudentUser2 = await prisma.user.create({
      data: {
        ...testUserData,
        username: "studentUser2",
        email: "login2@student.com",
        role: UserRole.Student,
      },
    });

    classOffer1 = await prisma.classOffer.create({
      data: {
        title: "Cálculo I",
        description: "Clases básicas de derivadas",
        price: 10000,
        category: "Calculo",
        authorId: testTeacherUser.id,
      },
    });

    classOffer2 = await prisma.classOffer.create({
      data: {
        title: "Economía avanzada",
        description: "Micro y macroeconomía",
        price: 20000,
        category: "Economia",
        authorId: testTeacherUser.id,
      },
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

  describe("POST /class-requests", () => {
    it("should create a reservation successfully", async () => {
      if (!testServer || !prisma || !testStudentUser || !classOffer1) return;

      const body = {
        classOfferId: classOffer1.id,
        day: 3,
        slot: 10,
      };

      const response = await studentAgent.post("/class-requests").send(body);

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty(
        "message",
        "Reserva creada exitosamente",
      );
      expect(response.body.reservation).toBeDefined();
      expect(response.body.reservation.day).toBe(3);
      expect(response.body.reservation.slot).toBe(10);
      expect(response.body.reservation.classOffer.title).toBe("Cálculo I");
    });

    it("should return 400 if classOfferId is missing", async () => {
      if (!testServer || !prisma) return;

      const body = {
        day: 3,
        slot: 10,
      };

      const response = await studentAgent.post("/class-requests").send(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "El campo 'classOfferId' es obligatorio",
      );
    });

    it("should return 400 if slot is not a number", async () => {
      if (!testServer || !prisma || !testStudentUser || !classOffer1) return;

      const body = {
        classOfferId: classOffer1.id,
        day: 2,
        slot: "abc",
      };

      const response = await studentAgent.post("/class-requests").send(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("slot debe ser un número.");
    });

    it("should return 400 if slot is out of range", async () => {
      if (!testServer || !prisma || !classOffer1) return;

      const body = {
        classOfferId: classOffer1.id,
        day: 2,
        slot: 30,
      };

      const response = await studentAgent.post("/class-requests").send(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("slot fuera de rango (0 - 24).");
    });

    it("should return 400 if day is out of range", async () => {
      if (!testServer || !prisma || !classOffer1) return;

      const body = {
        classOfferId: classOffer1.id,
        day: 10,
        slot: 5,
      };

      const response = await studentAgent.post("/class-requests").send(body);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("day fuera de rango (1 - 7).");
    });

    it("should return 404 if classOffer does not exist", async () => {
      if (!testServer || !prisma) return;

      const body = {
        classOfferId: 999999,
        day: 3,
        slot: 5,
      };

      const response = await studentAgent.post("/class-requests").send(body);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("La clase especificada no existe");
    });

    it("should return 409 if a reservation already exists for that time", async () => {
      if (!testServer || !prisma || !testStudentUser || !classOffer1) return;

      const offer = classOffer1;

      await prisma.classRequest.create({
        data: {
          classOfferId: offer.id,
          userId: testStudentUser.id,
          day: 2,
          slot: 8,
        },
      });

      const body = {
        classOfferId: offer.id,
        day: 2,
        slot: 8,
      };

      const response = await studentAgent.post("/class-requests").send(body);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe(
        "Ya existe una reserva para esta clase en ese horario",
      );
    });

    it("should return 401 if a teacher tries to reserve a class", async () => {
      if (!testServer || !prisma || !classOffer1) return;

      const offer = classOffer1;

      const body = {
        classOfferId: offer.id,
        day: 3,
        slot: 10,
      };

      const response = await teacherAgent.post("/class-requests").send(body);

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("Usuario no tiene rol: Student.");
    });
  });

  describe("GET /class-requests/me", () => {
    it("should return an empty array if the student has no reservations", async () => {
      if (!testServer || !prisma || !testStudentUser) return;

      const response = await studentAgent.get("/class-requests/me");

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it("should return the user's reservations successfully", async () => {
      if (
        !testServer ||
        !prisma ||
        !testStudentUser ||
        !classOffer1 ||
        !classOffer2
      )
        return;

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser.id,
          classOfferId: classOffer1.id,
          day: 2,
          slot: 8,
        },
      });

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser.id,
          classOfferId: classOffer2.id,
          day: 4,
          slot: 12,
        },
      });

      const response = await studentAgent.get("/class-requests/me");

      expect(response.status).toBe(200);
      expect(Array.isArray(response.body.data)).toBe(true);
      expect(response.body.data.length).toBe(2);

      const item = response.body.data[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("day");
      expect(item).toHaveProperty("slot");
      expect(item).toHaveProperty("classOffer");
      expect(item.classOffer).toHaveProperty("title");
    });

    it("should return paginated results", async () => {
      if (!testServer || !prisma || !testStudentUser || !classOffer1) return;

      await prisma.classRequest.createMany({
        data: [
          {
            userId: testStudentUser.id,
            classOfferId: classOffer1.id,
            day: 1,
            slot: 8,
          },
          {
            userId: testStudentUser.id,
            classOfferId: classOffer1.id,
            day: 2,
            slot: 9,
          },
          {
            userId: testStudentUser.id,
            classOfferId: classOffer1.id,
            day: 3,
            slot: 10,
          },
        ],
      });

      const response = await studentAgent.get(
        "/class-requests/me?page=1&limit=2",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    it("should not return reservations from other users", async () => {
      if (
        !testServer ||
        !prisma ||
        !testStudentUser ||
        !testStudentUser2 ||
        !classOffer1
      )
        return;

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser.id,
          classOfferId: classOffer1.id,
          day: 2,
          slot: 8,
        },
      });

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser2.id,
          classOfferId: classOffer1.id,
          day: 3,
          slot: 9,
        },
      });

      const response = await studentAgent.get("/class-requests/me");

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);
    });

    it("should format createdAt to YYYY-MM-DD", async () => {
      if (!testServer || !prisma || !testStudentUser || !classOffer1) return;

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser.id,
          classOfferId: classOffer1.id,
          day: 2,
          slot: 8,
        },
      });

      const response = await studentAgent.get("/class-requests/me");

      expect(response.status).toBe(200);

      const createdAt = response.body.data[0].createdAt;
      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return 401 if a teacher tries to access", async () => {
      if (!testServer || !prisma) return;

      const response = await teacherAgent.get("/class-requests/me");

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("Usuario no tiene rol: Student.");
    });
  });

  describe("GET /class-requests/tutor", () => {
    it("should return an empty array if the tutor has no class requests", async () => {
      if (!testServer || !prisma || !testTeacherUser) return;

      const response = await teacherAgent.get("/class-requests/tutor");

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it("should return class requests for classes owned by the tutor", async () => {
      if (
        !testServer ||
        !prisma ||
        !testTeacherUser ||
        !testStudentUser ||
        !classOffer1
      )
        return;

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser.id,
          classOfferId: classOffer1.id,
          day: 2,
          slot: 8,
        },
      });

      const response = await teacherAgent.get("/class-requests/tutor");

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);

      const item = response.body.data[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("day");
      expect(item).toHaveProperty("slot");
      expect(item).toHaveProperty("classOffer");
      expect(item.classOffer.title).toBe("Cálculo I");

      expect(item.user.username).toBe(testStudentUser.username);
      expect(item.user.email).toBe(testStudentUser.email);
    });

    it("should not return class requests for classes belonging to another tutor", async () => {
      if (!testServer || !prisma || !testStudentUser || !classOffer1) return;

      const hashedPassword = await bcrypt.hash("pass", 10);
      const otherTutor = await prisma.user.create({
        data: {
          username: "otherTutor",
          email: "other@tutor.com",
          password: hashedPassword,
          first_name: "Other",
          last_name_1: "Tutor",
          role: UserRole.Teacher,
        },
      });

      const otherOffer = await prisma.classOffer.create({
        data: {
          title: "Otra clase",
          description: "Contenido",
          price: 30000,
          category: "Calculo",
          authorId: otherTutor.id,
        },
      });

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser.id,
          classOfferId: otherOffer.id,
          day: 3,
          slot: 10,
        },
      });

      const response = await teacherAgent.get("/class-requests/tutor");

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(0);
    });

    it("should return paginated results", async () => {
      if (
        !testServer ||
        !prisma ||
        !testTeacherUser ||
        !testStudentUser ||
        !classOffer1
      )
        return;

      await prisma.classRequest.createMany({
        data: [
          {
            userId: testStudentUser.id,
            classOfferId: classOffer1.id,
            day: 1,
            slot: 8,
          },
          {
            userId: testStudentUser.id,
            classOfferId: classOffer1.id,
            day: 2,
            slot: 9,
          },
          {
            userId: testStudentUser.id,
            classOfferId: classOffer1.id,
            day: 3,
            slot: 10,
          },
        ],
      });

      const response = await teacherAgent.get(
        "/class-requests/tutor?page=1&limit=2",
      );

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    it("should format createdAt to YYYY-MM-DD", async () => {
      if (
        !testServer ||
        !prisma ||
        !testTeacherUser ||
        !testStudentUser ||
        !classOffer1
      )
        return;

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser.id,
          classOfferId: classOffer1.id,
          day: 2,
          slot: 8,
        },
      });

      const response = await teacherAgent.get("/class-requests/tutor");

      expect(response.status).toBe(200);

      const createdAt = response.body.data[0].createdAt;
      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return 401 if a student tries to access tutor requests", async () => {
      if (!testServer || !prisma) return;

      const response = await studentAgent.get("/class-requests/tutor");

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("Usuario no tiene rol: Teacher.");
    });
  });

  describe("GET /class-requests/:classOfferId", () => {
    it("should return 400 if classOfferId is missing or invalid", async () => {
      if (!testServer || !prisma) return;

      const response = await teacherAgent.get("/class-requests/abc");

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("ID de la clase faltante.");
    });

    it("should return 404 if the classOffer does not exist", async () => {
      if (!testServer || !prisma) return;

      const response = await teacherAgent.get("/class-requests/999999");

      expect(response.status).toBe(404);
      expect(response.body.message).toBe("La clase especificada no existe");
    });

    it("should return 403 if the classOffer does not belong to the tutor", async () => {
      if (!testServer || !prisma || !testStudentUser) return;

      const hashedPassword = await bcrypt.hash("pass", 10);
      const otherTutor = await prisma.user.create({
        data: {
          username: "otherTutor",
          email: "othertutor@test.com",
          password: hashedPassword,
          role: UserRole.Teacher,
          first_name: "nombre generico",
          last_name_1: "apellido generico",
        },
      });

      const otherClass = await prisma.classOffer.create({
        data: {
          title: "Otra clase",
          description: "Contenido",
          price: 15000,
          category: "Calculo",
          authorId: otherTutor.id,
        },
      });

      const response = await teacherAgent.get(
        `/class-requests/${otherClass.id}`,
      );

      expect(response.status).toBe(403);
      expect(response.body.message).toBe("No eres el tutor de esta clase");
    });

    it("should return an empty array if the class has no reservations", async () => {
      if (!testServer || !prisma || !classOffer1) return;

      const response = await teacherAgent.get(
        `/class-requests/${classOffer1.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it("should return reservations for the tutor's class", async () => {
      if (!testServer || !prisma || !classOffer1 || !testStudentUser) return;

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser.id,
          classOfferId: classOffer1.id,
          day: 3,
          slot: 10,
        },
      });

      const response = await teacherAgent.get(
        `/class-requests/${classOffer1.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(1);

      const item = response.body.data[0];
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("day");
      expect(item).toHaveProperty("slot");
      expect(item.classOffer.title).toBe("Cálculo I");

      expect(item.user.username).toBe(testStudentUser.username);
    });

    it("should not return reservations from another class", async () => {
      if (
        !testServer ||
        !prisma ||
        !classOffer1 ||
        !classOffer2 ||
        !testStudentUser
      )
        return;

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser.id,
          classOfferId: classOffer2.id,
          day: 4,
          slot: 12,
        },
      });

      const response = await teacherAgent.get(
        `/class-requests/${classOffer1.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(0);
    });

    it("should return paginated reservations", async () => {
      if (!testServer || !prisma || !classOffer1 || !testStudentUser) return;

      await prisma.classRequest.createMany({
        data: [
          {
            userId: testStudentUser.id,
            classOfferId: classOffer1.id,
            day: 1,
            slot: 8,
          },
          {
            userId: testStudentUser.id,
            classOfferId: classOffer1.id,
            day: 2,
            slot: 9,
          },
          {
            userId: testStudentUser.id,
            classOfferId: classOffer1.id,
            day: 3,
            slot: 10,
          },
        ],
      });

      const response = await teacherAgent.get(
        `/class-requests/${classOffer1.id}?page=1&limit=2`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data.length).toBe(2);
    });

    it("should format createdAt to YYYY-MM-DD", async () => {
      if (!testServer || !prisma || !classOffer1 || !testStudentUser) return;

      await prisma.classRequest.create({
        data: {
          userId: testStudentUser.id,
          classOfferId: classOffer1.id,
          day: 2,
          slot: 8,
        },
      });

      const response = await teacherAgent.get(
        `/class-requests/${classOffer1.id}`,
      );

      expect(response.status).toBe(200);

      const createdAt = response.body.data[0].createdAt;
      expect(createdAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it("should return 401 if a student tries to access it", async () => {
      if (!testServer || !prisma || !classOffer1) return;

      const response = await studentAgent.get(
        `/class-requests/${classOffer1.id}`,
      );

      expect(response.status).toBe(401);
      expect(response.body.message).toContain("Usuario no tiene rol: Teacher.");
    });
  });
});
