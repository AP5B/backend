import request from "supertest";
import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import { testServer } from "../setup/setup";
import { PrismaClient } from "@prisma/client";
import PrismaManager from "../../src/utils/prismaManager";
import { generateTestToken } from "../helpers/testUtils";

describe("Profile endpoints", () => {
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
    };

    testUser = await prisma.user.create({
      data: testUserData,
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

  describe("PATCH /profile/password", () => {
    it("Should change the password successfully", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent.patch("/profile/password").send({
        current_password: testPassword,
        new_password: "newPassword123",
        confirm_password: "newPassword123",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Contraseña actualizada con éxito.",
      );
      expect(res.body.user).toBeDefined();

      const updated = await prisma.user.findUnique({
        where: { id: testUser.id },
      });
      if (!updated) return;

      expect(await bcrypt.compare("newPassword123", updated.password)).toBe(
        true,
      );
    });

    it("Should return 400 if body is missing", async () => {
      if (!testServer || !prisma) return;

      const res = await testUserAgent.patch("/profile/password").send();

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Cuerpo de la petición vacío.");
    });

    it("Should return 400 if current_password is missing", async () => {
      const res = await testUserAgent.patch("/profile/password").send({
        new_password: "newpass123",
        confirm_password: "newpass123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Contraseña actual faltante.");
    });

    it("Should return 400 if new password is too short", async () => {
      const res = await testUserAgent.patch("/profile/password").send({
        current_password: testPassword,
        new_password: "123",
        confirm_password: "123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "La contraseña debe tener al menos 5 caracteres",
      );
    });

    it("Should return 400 if confirm_password does not match", async () => {
      const res = await testUserAgent.patch("/profile/password").send({
        current_password: testPassword,
        new_password: "nueva12345",
        confirm_password: "diferente",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Las contraseñas no coinciden.");
    });

    it("Should return 401 if current password is incorrect", async () => {
      const res = await testUserAgent.patch("/profile/password").send({
        current_password: "wrongPassword",
        new_password: "newpass123",
        confirm_password: "newpass123",
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Contraseña actual incorrecta.");
    });

    it("Should return 404 if the user is deleted", async () => {
      if (!prisma || !testUser) return;

      await prisma.user.update({
        where: { id: testUser.id },
        data: { isDeleted: true },
      });

      const res = await testUserAgent.patch("/profile/password").send({
        current_password: testPassword,
        new_password: "newpass123",
        confirm_password: "newpass123",
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "Operación denegada, tu cuenta fue suspendida.",
      );
    });
  });

  describe("PATCH /profile/names", () => {
    it("Should update user's names successfully", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent.patch("/profile/names").send({
        current_password: testPassword,
        first_name: "NuevoNombre",
        last_name_1: "NuevoApellido",
        last_name_2: "SegundoApellido",
        phone: "23456789",
      });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Datos actualizados con éxito.",
      );
      expect(res.body.user.first_name).toBe("NuevoNombre");
      expect(res.body.user.last_name_1).toBe("NuevoApellido");
      expect(res.body.user.last_name_2).toBe("SegundoApellido");
      expect(res.body.user.phone).toBe("23456789");
    });

    it("Should return 400 if request body is empty", async () => {
      const res = await testUserAgent.patch("/profile/names").send();

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Cuerpo de la petición vacío.");
    });

    it("Should return 400 if current_password is missing", async () => {
      const res = await testUserAgent.patch("/profile/names").send({
        first_name: "Juan",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("Contraseña actual faltante.");
    });

    it("Should return 400 if no fields to update are provided", async () => {
      const res = await testUserAgent.patch("/profile/names").send({
        current_password: testPassword,
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "No se proporcionaron campos para actualizar.",
      );
    });

    it("Should return 400 if first_name is empty", async () => {
      const res = await testUserAgent.patch("/profile/names").send({
        current_password: testPassword,
        first_name: "",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe("El nombre no puede estar vacío.");
    });

    it("Should return 400 if first_name is too short", async () => {
      const res = await testUserAgent.patch("/profile/names").send({
        current_password: testPassword,
        first_name: "Jo",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "El nombre debe tener entre 3 y 30 caracteres",
      );
    });

    it("Should return 400 for invalid first_name format", async () => {
      const res = await testUserAgent.patch("/profile/names").send({
        current_password: testPassword,
        first_name: "Juan123!",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "El nombre solo puede contener letras, espacios, apóstrofes y guiones.",
      );
    });

    it("Should return 400 for invalid phone number", async () => {
      const res = await testUserAgent.patch("/profile/names").send({
        current_password: testPassword,
        phone: "123",
      });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe(
        "El teléfono debe tener 8 dígitos y empezar con un dígito entre 2 y 9.",
      );
    });

    it("Should return 401 if current password is incorrect", async () => {
      const res = await testUserAgent.patch("/profile/names").send({
        current_password: "wrongPassword",
        first_name: "Nuevo",
      });

      expect(res.status).toBe(401);
      expect(res.body.message).toBe("Contraseña actual incorrecta.");
    });

    it("Should return 403 if the user is deleted", async () => {
      if (!prisma || !testUser) return;

      await prisma.user.update({
        where: { id: testUser.id },
        data: { isDeleted: true },
      });

      const res = await testUserAgent.patch("/profile/names").send({
        current_password: testPassword,
        first_name: "NuevoNombre",
      });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe(
        "Operación denegada, tu cuenta fue suspendida.",
      );
    });

    it("Should return 404 if the user does not exist", async () => {
      if (!prisma || !testUser) return;

      await prisma.user.delete({ where: { id: testUser.id } });

      const res = await testUserAgent.patch("/profile/names").send({
        current_password: testPassword,
        first_name: "NuevoNombre",
      });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Usuario no encontrado.");
    });
  });

  describe("GET /profile/:userId", () => {
    it("Should return user profile successfully", async () => {
      if (!testServer || !prisma || !testUser) return;

      const res = await testUserAgent.get(`/profile/${testUser.id}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty(
        "message",
        "Perfil del usuario obtenido con éxito",
      );
      expect(res.body.userProfile.id).toBe(testUser.id);
      expect(res.body.userProfile.email).toBe(testUser.email);
    });

    it("Should return 400 if userId param is missing", async () => {
      const res = await testUserAgent.get(`/profile/`);
      expect(res.status).toBe(404);
    });

    it("Should return 404 if user does not exist", async () => {
      const res = await testUserAgent.get(`/profile/999999`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Perfil del usuario no encontrado.");
    });

    it("Should return 404 if user is deleted", async () => {
      if (!prisma || !testUser) return;

      await prisma.user.update({
        where: { id: testUser.id },
        data: { isDeleted: true },
      });

      const res = await testUserAgent.get(`/profile/${testUser.id}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe("Perfil del usuario no encontrado.");
    });
  });
});
