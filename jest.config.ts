/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup/setup.ts"],
  testTimeout: 60000,
  globalSetup: "<rootDir>/__tests__/setup/jest.globalSetup.ts",
  globalTeardown: "<rootDir>/__tests__/setup/jest.globalTeardown.ts",
  verbose: true,
  collectCoverage: true,
  collectCoverageFrom: [
    "src/controllers/**/*.ts",
    "src/services/**/*.ts",
    "src/routes/**/*.ts",
    "!src/**/*.d.ts",
    "!src/**/index.ts",
    "!src/**/healthRoutes.ts",
    "!src/**/exampleRoutes.ts",
  ],
};
