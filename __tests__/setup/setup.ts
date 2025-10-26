import {
  connectTestDb,
  createAndSetupDb,
  runMigrations,
  tearDownDb,
} from "../helpers/testDbSetup";
import { TestServer } from "../helpers/testServer";

export let testServer: TestServer;

beforeAll(async () => {
  await createAndSetupDb();
  runMigrations();
  await connectTestDb();
}, 60000); // leave some time to build the containers

afterAll(async () => {
  await tearDownDb();
});
