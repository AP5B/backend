import { execSync } from "child_process";
import PrismaManager from "../../src/utils/prismaManager";

import {
  PostgreSqlContainer,
  type StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";

export let dbContainer: StartedPostgreSqlContainer;
//export let testDbConn: PrismaClient;

export const createAndSetupDb = async () => {
  dbContainer = await new PostgreSqlContainer("postgres:18")
    .withDatabase("test_db")
    .withUsername("postgres")
    .withPassword("postgres")
    .start();

  // Storing variables coming from container
  process.env.TEST_DB_HOST = dbContainer.getHost();
  process.env.TEST_DB_PORT = dbContainer.getPort().toString();
  process.env.TEST_DB_NAME = dbContainer.getDatabase();
  process.env.TEST_DB_USER = dbContainer.getUsername();
  process.env.TEST_DB_PASS = dbContainer.getPassword();
};

export const runMigrations = () => {
  const dbUrl = `postgresql://${process.env.TEST_DB_USER}:${process.env.TEST_DB_PASS}@${process.env.TEST_DB_HOST}:${process.env.TEST_DB_PORT}/${process.env.TEST_DB_NAME}`;

  process.env.DATABASE_URL = dbUrl;

  // Run Prisma migrations against the test DB
  execSync(`npx prisma migrate deploy`, {
    stdio: "inherit",
    env: {
      ...process.env,
      DATABASE_URL: dbUrl,
    },
  });
};

export const connectTestDb = async () => {
  try {
    await PrismaManager.Disconnect();
    //testDbConn = PrismaManager.GetClient();
    //await testDbConn.$connect();
    await PrismaManager.Connect();
    console.log(
      "Test Prisma - Connection to db has been established successfully.",
    );
    //return testDbConn;
  } catch (err) {
    console.error(
      `Connection to db failed => ${(err as Error).message ?? "DB failure"}`,
    );
    throw err;
  }
};

export const tearDownDb = async () => {
  await PrismaManager.Disconnect();
  if (dbContainer) await dbContainer.stop();
};
