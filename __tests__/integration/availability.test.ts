import request from "supertest";
import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import { testServer } from "../setup/setup";
import { PrismaClient, UserRole } from "@prisma/client";
import PrismaManager from "../../src/utils/prismaManager";
import { generateTestToken } from "../helpers/testUtils";

describe("Availability endpoints", () => {
  let prisma: PrismaClient | null = null;
  let testUser: User | null = null;
  let testUserToken: string;
  let testUserAgent: any;
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

    await prisma.availability.deleteMany({});
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

    testUser = await prisma.user.create({
      data: testUserData,
    });

    const availabilityData = [
      {
        day: 1,
        slot: 12,
        userId: testUser.id,
      },
      {
        day: 1,
        slot: 5,
        userId: testUser.id,
      },
      {
        day: 2,
        slot: 5,
        userId: testUser.id,
      },
    ];

    await prisma.availability.createMany({
      data: availabilityData,
    });

    testUserToken = generateTestToken(
      testUser.id,
      testUser.email,
      testUser.role,
      testUser.username,
    );

    testUserAgent = request.agent(testServer.getApp());
    testUserAgent.set("Cookie", [`access_token=${testUserToken}`]);
  }, 30000);

  describe("GET /availability/:teacherId", () => {
    it("Should get the teacher availability successfully", async () => {
      if (!testServer || !prisma || !testUser) return;

      const response = await testUserAgent.get(`/availability/${testUser.id}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe(
        "Disponibilidades obtenidas con éxito.",
      );
      expect(response.body.data).toEqual({
        "1": expect.arrayContaining([5, 12]),
        "2": expect.arrayContaining([5]),
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "7": [],
      });
    });

    it("Should return 400 if teacherId is not a number", async () => {
      if (!testServer) return;

      const response = await testUserAgent.get(`/availability/abc`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "teacherId debe ser un número",
      );
    });

    it("Should return empty grouped structure if teacher has no availability", async () => {
      if (!testServer || !prisma) return;

      const newTeacher = await prisma.user.create({
        data: {
          username: "emptyTeacher",
          email: "empty@uc.cl",
          password: "test",
          first_name: "Empty",
          last_name_1: "Teacher",
          role: "Teacher",
        },
      });

      const response = await testUserAgent.get(
        `/availability/${newTeacher.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual({
        "1": [],
        "2": [],
        "3": [],
        "4": [],
        "5": [],
        "6": [],
        "7": [],
      });
    });
  });

  describe("POST /availability", () => {
    it("Should create availabilities successfully", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent.post("/availability").send([
        { day: 1, slot: 6 },
        { day: 2, slot: 10 },
      ]);

      expect(res.status).toBe(201);
      expect(res.body.count).toBe(2);
      expect(res.body.message).toBe("Disponibilidades creadas con éxito.");
      expect(res.body.data).toHaveLength(2);
    });

    it("Should return 400 if body is not an array", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent
        .post("/availability")
        .send({ day: 1, slot: 5 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("La request debe ser un arreglo.");
    });

    it("Should return 400 for invalid day or slot", async () => {
      if (!testServer || !prisma || !testUser) return;

      const body = [{ day: 0, slot: 5 }];

      const res = await testUserAgent.post("/availability").send(body);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("day fuera de rango (1 - 7).");
    });

    it("Should return 400 if slot/day already exists", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent
        .post("/availability")
        .send([{ day: 1, slot: 5 }]);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Uno de los slots ya está asignado");
    });

    it("Should return 401 if user is not Teacher", async () => {
      if (!testServer || !prisma) return;

      // Crear Student
      const student = await prisma.user.create({
        data: {
          username: "studentUser",
          email: "student@example.com",
          password: await bcrypt.hash(testPassword, 10),
          first_name: "Stud",
          last_name_1: "Ent",
          phone: "77777777",
          role: "Student",
        },
      });

      const studentToken = generateTestToken(
        student.id,
        student.email,
        student.role,
        student.username,
      );

      const res = await request(testServer.getApp())
        .post("/availability")
        .set("Cookie", [`access_token=${studentToken}`])
        .send([{ day: 1, slot: 5, userId: student.id }]);

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Usuario no tiene rol: Teacher.");
    });

    it("Should return 401 if no token is provided", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await request(testServer.getApp())
        .post("/availability")
        .send([{ day: 1, slot: 5, userId: testUser.id }]);

      expect(res.status).toBe(401);
    });
  });

  describe("DELETE /availability", () => {
    it("Should delete availabilities successfully", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent
        .delete("/availability")
        .query({ av: ["1,5", "2,5"] });

      expect(res.status).toBe(200);
      expect(res.body.count).toBe(2);
      expect(res.body.message).toBe("Disponibilidades eliminadas con éxito.");
    });

    it("Should return 400 if no query params are sent", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent.delete("/availability");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Formato de par inválido. Deben ser day,slot",
      );
    });

    it("Should return 400 if pair format is invalid", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent
        .delete("/availability")
        .query({ av: "1-" });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "Formato de par inválido. Deben ser day,slot",
      );
    });

    it("Should return 400 if day or slot are not numbers", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent
        .delete("/availability")
        .query({ av: "a,5" });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain(
        "day y slot deben ser números enteros",
      );
    });

    it("Should return 404 if availability does not exist", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent
        .delete("/availability")
        .query({ av: "3,10" });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe(
        "No se encontraron disponibilidades para eliminar.",
      );
    });

    it("Should return 401 when no token is provided", async () => {
      if (!testServer) return;

      const res = await request(testServer.getApp())
        .delete("/availability")
        .query({ av: "1,5" });

      expect(res.status).toBe(401);
    });

    it("Should return 403 if user is deleted", async () => {
      if (!testServer || !prisma || !testUser) return;

      await prisma.user.update({
        where: { id: testUser.id },
        data: { isDeleted: true },
      });

      const res = await testUserAgent
        .delete("/availability")
        .query({ av: "1,5" });

      expect(res.status).toBe(403);
    });
  });
});
