/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: "ts-jest",
  //testEnvironment: './__tests__/setup/customEnvironment.ts',
  testEnvironment: "node",
  testMatch: ["**/__tests__/**/*.test.ts"],
  setupFilesAfterEnv: ["<rootDir>/__tests__/setup/setup.ts"],
  testTimeout: 60000,
};
