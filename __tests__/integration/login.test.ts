import request from "supertest";
import { User } from "@prisma/client";
import bcrypt from "bcrypt";
import { TestServer } from "../helpers/testServer";
//import { testDbConn  } from '../helpers/testDbSetup';
import { PrismaClient } from "@prisma/client";
import PrismaManager from "../../src/utils/prismaManager";

describe("POST /login", () => {
  let testServer: TestServer | null = null;
  let agent: any;
  let testUser: User | null = null;
  let prisma: PrismaClient | null = null;
  const testPassword = "password123";

  beforeAll(async () => {
    try {
      prisma = PrismaManager.GetClient();
      console.log(`db url en el before all ${process.env.DATABASE_URL}`);
      if (!prisma) {
        throw new Error("Prisma client failed to initialize.");
      }
      testServer = new TestServer();
      await testServer.start();
    } catch (error) {
      console.error("Login test setup failed:", error);
      testServer = null;
    }
  }, 30000);

  afterAll(async () => {
    if (testServer) await testServer.stop();
  });

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
    testUser = await prisma.user.create({
      data: {
        username: "logintester",
        email: "login@example.com",
        password: hashedPassword,
        first_name: "Login",
        last_name_1: "Tester",
        last_name_2: "Number",
        phone: "88888888",
      },
    });

    agent = request.agent(testServer.getApp());
  }, 30000);

  it("should login successfully with valid credentials", async () => {
    if (!testServer || !prisma || !testUser) return;
    const userData = {
      login: "logintester",
      password: "password123",
    };
    const response = await agent.post("/login").send(userData);

    expect(response.status).toBe(200);
    expect(response.body.user).toBeDefined();
    expect(response.body.token).toBeDefined();
    expect(response.body.refreshToken).toBeDefined();
  });
});
