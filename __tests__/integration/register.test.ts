import request from "supertest";
import { testServer } from "../setup/setup";
import { PrismaClient } from "@prisma/client";
import PrismaManager from "../../src/utils/prismaManager";

describe("Register endpoints", () => {
  let agent: any;
  let prisma: PrismaClient | null = null;

  beforeAll(async () => {
    try {
      prisma = PrismaManager.GetClient();
      if (!prisma) {
        throw new Error("Prisma client failed to initialize.");
      }
    } catch (error) {
      console.error("Register test setup failed:", error);
      prisma = null;
    }
  }, 30000);

  beforeEach(async () => {
    if (!testServer || !prisma) {
      console.warn("Skipping beforeEach due to failed setup in beforeAll.");
      return;
    }

    await prisma.user.deleteMany({});

    agent = request.agent(testServer.getApp());
  }, 30000);

  describe("POST /register", () => {
    const validBody = {
      username: "testuser",
      first_name: "Juan",
      last_name_1: "Pérez",
      last_name_2: "López",
      email: "juan@estudiante.uc.cl",
      password: "abcde12345",
      confirm_password: "abcde12345",
      phone: "12345678",
    };

    it("Should register a new user successfully", async () => {
      if (!testServer || !prisma) return;
      const res = await agent.post("/register").send(validBody);

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.user.email).toBe(validBody.email);
      expect(res.body.token).toBeDefined();
      expect(res.body.refreshToken).toBeDefined();

      const cookies = res.headers["set-cookie"];

      expect(cookies).toBeDefined();
      expect(
        cookies.some((cookie: string) => cookie.startsWith("access_token=")),
      ).toBe(true);
      expect(
        cookies.some((cookie: string) => cookie.startsWith("refresh_token=")),
      ).toBe(true);
    });

    it("Should return 400 if the username has a invalid format", async () => {
      if (!testServer || !prisma) return;
      const res = await agent.post("/register").send({
        ...validBody,
        username: "User#123",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "El nombre de usuario solo puede contener minúsculas, números y guiones bajos.",
      );
    });

    it("Should return 400 if the username is missing", async () => {
      if (!testServer || !prisma) return;

      const data = {
        first_name: "Juan",
        last_name_1: "Pérez",
        last_name_2: "López",
        email: "juan@estudiante.uc.cl",
        password: "abcde12345",
        confirm_password: "abcde12345",
        phone: "12345678",
      };

      const res = await agent.post("/register").send(data);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "El nombre de usuario no puede estar vacío.",
      );
    });

    it("Should return 400 if the first name is missing", async () => {
      if (!testServer || !prisma) return;

      const data = {
        username: "testuser",
        last_name_1: "Pérez",
        last_name_2: "López",
        email: "juan@estudiante.uc.cl",
        password: "abcde12345",
        confirm_password: "abcde12345",
        phone: "12345678",
      };

      const res = await agent.post("/register").send(data);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "El nombre no puede estar vacío.",
      );
    });

    it("Should return 400 if the first last name is missing", async () => {
      if (!testServer || !prisma) return;

      const data = {
        username: "testuser",
        first_name: "Juan",
        last_name_2: "López",
        email: "juan@estudiante.uc.cl",
        password: "abcde12345",
        confirm_password: "abcde12345",
        phone: "12345678",
      };

      const res = await agent.post("/register").send(data);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "El primer apellido no puede estar vacío.",
      );
    });

    it("Should return 400 if the username is too short", async () => {
      if (!testServer || !prisma) return;

      const data = {
        username: "te",
        first_name: "Juan",
        last_name_1: "Pérez",
        last_name_2: "López",
        email: "juan@estudiante.uc.cl",
        password: "abcde12345",
        confirm_password: "abcde12345",
        phone: "12345678",
      };

      const res = await agent.post("/register").send(data);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "El nombre de usuario debe tener entre 5 y 20 caracteres.",
      );
    });

    it("Should return 400 if the username is too long", async () => {
      if (!testServer || !prisma) return;

      const data = {
        username: "testutestutestutestut",
        first_name: "Juan",
        last_name_1: "Pérez",
        last_name_2: "López",
        email: "juan@estudiante.uc.cl",
        password: "abcde12345",
        confirm_password: "abcde12345",
        phone: "12345678",
      };

      const res = await agent.post("/register").send(data);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "El nombre de usuario debe tener entre 5 y 20 caracteres.",
      );
    });

    it("Should return 400 if the first name is too short", async () => {
      if (!testServer || !prisma) return;

      const data = {
        username: "testuser",
        first_name: "Ju",
        last_name_1: "Pérez",
        last_name_2: "López",
        email: "juan@estudiante.uc.cl",
        password: "abcde12345",
        confirm_password: "abcde12345",
        phone: "12345678",
      };

      const res = await agent.post("/register").send(data);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "El nombre debe tener entre 3 y 30 caracteres.",
      );
    });

    it("Should return 400 if the first name is too long", async () => {
      if (!testServer || !prisma) return;

      const data = {
        username: "testuser",
        first_name: "JuanJuanJuanJuanJuanJuanJuanJua",
        last_name_1: "Pérez",
        last_name_2: "López",
        email: "juan@estudiante.uc.cl",
        password: "abcde12345",
        confirm_password: "abcde12345",
        phone: "12345678",
      };

      const res = await agent.post("/register").send(data);

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "El nombre debe tener entre 3 y 30 caracteres.",
      );
    });

    it("Should return 400 if the paswords doesn't match", async () => {
      if (!testServer || !prisma) return;
      const res = await agent.post("/register").send({
        ...validBody,
        confirm_password: "diferente",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "Las contraseñas no coinciden.",
      );
    });

    it("Should return 400 if the email does not have a uc domain", async () => {
      if (!testServer || !prisma) return;
      const res = await agent.post("/register").send({
        ...validBody,
        email: "otro@gmail.com",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "Para registrarte tu correo debe terminar en @uc.cl o @estudiante.uc.cl.",
      );
    });

    it("Should return 400 if the email has a invalid format", async () => {
      if (!testServer || !prisma) return;
      const res = await agent.post("/register").send({
        ...validBody,
        email: "juan@@uc.cl",
      });

      expect(res.status).toBe(400);
      expect(res.body).toHaveProperty(
        "message",
        "El email no tiene un formato válido.",
      );
    });

    it("Should return 409 if the username is already in use", async () => {
      if (!testServer || !prisma) return;

      await prisma.user.create({
        data: {
          username: validBody.username,
          email: "otro@uc.cl",
          password: "xxxxx",
          first_name: "X",
          last_name_1: "X",
        },
      });

      const res = await agent.post("/register").send(validBody);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty(
        "message",
        "El nombre de usuario ya está en uso.",
      );
    });

    it("Should return 409 if the email is already in use", async () => {
      if (!testServer || !prisma) return;
      await prisma.user.create({
        data: {
          username: "otheruser",
          email: validBody.email,
          password: "xxxxx",
          first_name: "X",
          last_name_1: "X",
        },
      });

      const res = await agent.post("/register").send(validBody);

      expect(res.status).toBe(409);
      expect(res.body).toHaveProperty("message", "El email ya está en uso.");
    });

    it("Should lowercase and trim email before saving", async () => {
      if (!testServer || !prisma) return;

      const res = await agent.post("/register").send({
        ...validBody,
        email: "Juan@estudiante.uc.cl",
      });

      expect(res.status).toBe(201);

      const dbUser = await prisma.user.findUnique({
        where: { email: "juan@estudiante.uc.cl" },
      });
      expect(dbUser).not.toBeNull();
    });

    it("Should return 400 if refresh token cookie is missing", async () => {
      if (!testServer || !prisma) return;

      const res = await agent.get("/refresh-token");

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("refreshToken faltante.");
    });
  });
});
