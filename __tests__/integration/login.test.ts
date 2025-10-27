import request from "supertest";
import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import { testServer } from "../setup/setup";
import { PrismaClient, UserRole } from "@prisma/client";
import PrismaManager from "../../src/utils/prismaManager";

describe("Login endpoints", () => {
  let agent: any;
  let testUser: User | null = null;
  let testDeletedUser: User | null = null;
  let prisma: PrismaClient | null = null;
  const testPassword = "password123";

  beforeAll(async () => {
    try {
      prisma = PrismaManager.GetClient();
      console.log(`db url en el before all ${process.env.DATABASE_URL}`);
      if (!prisma) {
        throw new Error("Prisma client failed to initialize.");
      }
    } catch (error) {
      console.error("Login test setup failed:", error);
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
      username: "logintester",
      email: "login@example.com",
      password: hashedPassword,
      first_name: "Login",
      last_name_1: "Tester",
      last_name_2: "Number",
      phone: "88888888",
      isDeleted: false,
      role: UserRole.Student,
    };

    testUser = await prisma.user.create({
      data: testUserData,
    });

    testDeletedUser = await prisma.user.create({
      data: {
        ...testUserData,
        isDeleted: true,
        username: "deletedUser",
        email: "login@deleted.com",
      },
    });

    agent = request.agent(testServer.getApp());
  }, 30000);

  describe("POST /login", () => {
    it("should login successfully with valid credentials", async () => {
      if (!testServer || !prisma || !testUser) return;
      const userData = {
        login: "logintester",
        password: "password123",
      };

      const response = await agent.post("/login").send(userData);

      expect(response.status).toBe(200);
      expect(response.body.user).toBeDefined();
      expect(response.body.user).toEqual({
        id: testUser.id,
        username: testUser.username,
        first_name: testUser.first_name,
        last_name_1: testUser.last_name_1,
        last_name_2: testUser.last_name_2,
        email: testUser.email,
        role: testUser.role,
        phone: testUser.phone,
        isDeleted: testUser.isDeleted,
      });

      expect(response.body.token).toBeDefined();
      expect(response.body.refreshToken).toBeDefined();
      const cookies = response.headers["set-cookie"];
      expect(cookies).toBeDefined();
      expect(
        cookies.some((cookie: string) => cookie.startsWith("access_token=")),
      ).toBe(true);
      expect(
        cookies.some((cookie: string) => cookie.startsWith("refresh_token=")),
      ).toBe(true);
    });

    it("should return 403 for deleted user account", async () => {
      if (!testServer || !prisma || !testDeletedUser) return;
      const userData = {
        login: "deletedUser",
        password: "password123",
      };

      const response = await agent.post("/login").send(userData);

      expect(response.status).toBe(403);
      expect(response.body).toHaveProperty(
        "message",
        "Cuenta del usuario inhabilitada.",
      );
    });

    it("should return 400 if username/email is missing in request body", async () => {
      if (!testServer || !prisma || !testUser) return;
      const userData = {
        password: "password123",
      };

      const response = await agent.post("/login").send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "El identificador no puede estar vacío",
      );
    });

    it("should return 400 if password is missing in request body", async () => {
      if (!testServer || !prisma || !testUser) return;
      const userData = {
        login: "logintester",
      };

      const response = await agent.post("/login").send(userData);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty(
        "message",
        "La contraseña no puede estar vacío",
      );
    });

    it("should return 401 if the user account doesn't exist", async () => {
      if (!testServer || !prisma) return;
      const userData = {
        login: "notExisting",
        password: "123456",
      };

      const response = await agent.post("/login").send(userData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty(
        "message",
        "No se encontro usuario con ese nombre o correo",
      );
    });

    it("should return 401 if the password is incorrect.", async () => {
      if (!testServer || !prisma || !testUser) return;
      const userData = {
        login: testUser.username,
        password: "wrongPassword",
      };

      const response = await agent.post("/login").send(userData);

      expect(response.status).toBe(401);
      expect(response.body).toHaveProperty("message", "Contraseña incorrecta");
    });
  });
});
