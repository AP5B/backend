import { createApp } from "./app";
import env from "./config/env";
import PrismaManager from "./utils/prismaManager";

const PORT = env.port || 3000;

async function main() {
  try {
    await PrismaManager.Connect();
    const app = createApp();
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log();
    });
  } catch (err) {
    console.error("Failed to connect to database", err);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}
