// __tests__/setup/jest.globalTeardown.ts
export default async () => {
  if (globalThis.__DB_CONTAINER__) {
    await globalThis.__DB_CONTAINER__.stop();
  }
};
