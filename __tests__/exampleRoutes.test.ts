import request from "supertest";
import express from "express";
import exampleRoutes from "../src/routes/exampleRoutes";

const app = express();
app.use("/", exampleRoutes);

describe("GET /example", () => {
  it("should return 'Hola papitos y mamitas'", async () => {
    const res = await request(app).get("/example");
    expect(res.status).toBe(200);
    expect(res.text).toBe("Hola papitos y mamitas");
  });
});
