// __tests__/setup/jest.globalSetup.ts
import {
  PostgreSqlContainer,
  StartedPostgreSqlContainer,
} from "@testcontainers/postgresql";
import { execSync } from "child_process";

let dbContainer: StartedPostgreSqlContainer;

declare global {
  var __DB_CONTAINER__: StartedPostgreSqlContainer | undefined;
}

export default async () => {
  dbContainer = await new PostgreSqlContainer("postgres:18").start();

  const dbUrl = dbContainer.getConnectionUri();
  process.env.DATABASE_URL = dbUrl;

  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: dbUrl },
  });

  globalThis.__DB_CONTAINER__ = dbContainer;
};
