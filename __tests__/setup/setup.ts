import { TestServer } from "../helpers/testServer";
import PrismaManager from "../../src/utils/prismaManager";

export let testServer: TestServer;

beforeAll(async () => {
  await PrismaManager.Disconnect();
  await PrismaManager.Connect();

  testServer = new TestServer();
  await testServer.start();
}, 30000);

afterAll(async () => {
  if (testServer) await testServer.stop();
  await PrismaManager.Disconnect();
});
