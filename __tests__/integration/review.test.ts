import request from "supertest";
import bcrypt from "bcrypt";
import { testServer } from "../setup/setup";
import { PrismaClient, UserRole, User, Review } from "@prisma/client";
import PrismaManager from "../../src/utils/prismaManager";
import { generateTestToken } from "../helpers/testUtils";

describe("Review endpoints", () => {
  let teacherAgent: any;
  let teacherAgent2: any;
  let studentAgent: any;
  let testTeacherUser: User | null = null;
  let testTeacherUser2: User | null = null;
  let testStudentUser: User | null = null;
  let teacherToken: string;
  let teacherToken2: string;
  let studentToken: string;
  let reviewToEdit: Review | null = null;
  let reviewToDelete: Review | null = null;
  let prisma: PrismaClient | null = null;
  const testPassword = "password123";

  beforeAll(async () => {
    prisma = PrismaManager.GetClient();
    if (!prisma) throw new Error("Prisma client failed to initialize");
  }, 30000);

  beforeEach(async () => {
    if (!testServer || !prisma) return;

    // limpiar solo lo necesario para tests de reviews
    await prisma.review.deleteMany();
    await prisma.user.deleteMany();

    const hashedPassword = await bcrypt.hash(testPassword, 10);

    // crear usuarios
    testTeacherUser = await prisma.user.create({
      data: {
        username: "teacher1",
        email: "teacher1@test.com",
        password: hashedPassword,
        first_name: "Teacher",
        last_name_1: "One",
        role: UserRole.Teacher,
      },
    });

    testTeacherUser2 = await prisma.user.create({
      data: {
        username: "teacher2",
        email: "teacher2@test.com",
        password: hashedPassword,
        first_name: "Teacher",
        last_name_1: "Two",
        role: UserRole.Teacher,
      },
    });

    testStudentUser = await prisma.user.create({
      data: {
        username: "student1",
        email: "student1@test.com",
        password: hashedPassword,
        first_name: "Student",
        last_name_1: "One",
        role: UserRole.Student,
      },
    });

    // tokens
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

    // agents
    teacherAgent = request.agent(testServer.getApp());
    teacherAgent.set("Cookie", [`access_token=${teacherToken}`]);

    teacherAgent2 = request.agent(testServer.getApp());
    teacherAgent2.set("Cookie", [`access_token=${teacherToken2}`]);

    studentAgent = request.agent(testServer.getApp());
    studentAgent.set("Cookie", [`access_token=${studentToken}`]);

    // crear reviews iniciales para editar/borrar
    reviewToEdit = await prisma.review.create({
      data: {
        rating: 3,
        content: "Review para editar",
        teacherId: testTeacherUser2.id,
        reviewerId: testStudentUser.id,
      },
    });

    reviewToDelete = await prisma.review.create({
      data: {
        rating: 5,
        content: "Review para borrar",
        teacherId: testTeacherUser2.id,
        reviewerId: testStudentUser.id,
      },
    });
  }, 30000);

  describe("POST /reviews/:teacherId", () => {
    it("Should create a review successfully", async () => {
      if (!testStudentUser || !testTeacherUser || !prisma) return;

      await prisma.review.deleteMany({
        where: {
          reviewerId: testStudentUser.id,
          teacherId: testTeacherUser.id,
        },
      });

      const payload = { rating: 4, content: "Excelente profesor, 10/10" };
      const response = await studentAgent
        .post(`/reviews/${testTeacherUser.id}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.review).toMatchObject({
        rating: payload.rating,
        content: payload.content,
      });
    });

    it("Should return 400 if no content for the review is provided", async () => {
      if (!testStudentUser || !testTeacherUser || !prisma) return;

      await prisma.review.deleteMany({
        where: {
          reviewerId: testStudentUser.id,
          teacherId: testTeacherUser.id,
        },
      });

      const payload = { rating: 4 };
      const response = await studentAgent
        .post(`/reviews/${testTeacherUser.id}`)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe("No se puede crear una reseña vacía.");
    });

    it("Should not allow creating review for self", async () => {
      if (!testStudentUser) return;

      const payload = { rating: 4, content: "Autoreview" };
      const response = await studentAgent
        .post(`/reviews/${testStudentUser.id}`)
        .send(payload);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe(
        "No puedes dejar una review sobre ti mismo.",
      );
    });

    it("Should return 400 for invalid rating", async () => {
      if (!testTeacherUser) return;

      const payload = { rating: 6 };
      const response = await studentAgent
        .post(`/reviews/${testTeacherUser.id}`)
        .send(payload);

      expect(response.status).toBe(400);
    });

    it("Should return 400 if the content of the review is full of numbers", async () => {
      if (!testStudentUser || !testTeacherUser || !prisma) return;

      await prisma.review.deleteMany({
        where: {
          reviewerId: testStudentUser.id,
          teacherId: testTeacherUser.id,
        },
      });

      const payload = { rating: 4, content: "2324234325435" };
      const response = await studentAgent
        .post(`/reviews/${testTeacherUser.id}`)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Formato del cuerpo de la review inválido.",
      );
    });

    it("Should return 400 if the content of the review is full of blank space", async () => {
      if (!testStudentUser || !testTeacherUser || !prisma) return;

      await prisma.review.deleteMany({
        where: {
          reviewerId: testStudentUser.id,
          teacherId: testTeacherUser.id,
        },
      });

      const payload = { rating: 4, content: "        " };
      const response = await studentAgent
        .post(`/reviews/${testTeacherUser.id}`)
        .send(payload);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe(
        "Cuerpo de la review debe tener entre 1 y 1000 caracteres.",
      );
    });
  });

  describe("GET /reviews/:teacherId", () => {
    it("Should get teacher reviews paginated", async () => {
      if (!testTeacherUser2) return;

      const response = await studentAgent.get(
        `/reviews/${testTeacherUser2.id}?page=1&limit=10`,
      );

      expect(response.status).toBe(200);
      expect(response.body.reviews.length).toBeGreaterThan(0);
    });
  });

  describe("GET /reviews/user", () => {
    it("Should get current user reviews", async () => {
      const response = await studentAgent.get("/reviews/user?page=1&limit=10");

      expect(response.status).toBe(200);
      expect(response.body.reviews.length).toBeGreaterThan(0);
    });
  });

  describe("PATCH /reviews/:reviewId", () => {
    it("Should update review successfully", async () => {
      if (!reviewToEdit) return;

      const payload = { rating: 2, content: "Editado" };
      const response = await studentAgent
        .patch(`/reviews/${reviewToEdit.id}`)
        .send(payload);

      expect(response.status).toBe(200);
      expect(response.body.review).toMatchObject(payload);
    });

    it("Should return 401 if user tries to edit another's review", async () => {
      if (!reviewToEdit) return;
      const payload = { rating: 2 };
      const response = await teacherAgent2
        .patch(`/reviews/${reviewToEdit.id}`)
        .send(payload);

      expect(response.status).toBe(401);
    });
  });

  describe("DELETE /reviews/:reviewId", () => {
    it("Should delete review successfully", async () => {
      if (!reviewToDelete) return;
      const response = await studentAgent.delete(
        `/reviews/${reviewToDelete.id}`,
      );

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Review eliminada con éxito.");
    });

    it("Should return 401 if trying to delete other's review", async () => {
      if (!reviewToEdit) return;
      const response = await teacherAgent2.delete(
        `/reviews/${reviewToEdit.id}`,
      );

      expect(response.status).toBe(401);
    });
  });
});
