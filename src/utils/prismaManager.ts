import { PrismaClient } from "@prisma/client";
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export default class PrismaManager {
  private static prisma: PrismaClient | null = null;

  public static GetClient(): PrismaClient {
    if (!this.prisma) {
      this.prisma = new PrismaClient({
        datasources: {
          db: { url: process.env.DATABASE_URL ?? "" },
        },
      });
    }
    return this.prisma;
  }

  public static async Connect(): Promise<void> {
    await this.GetClient().$connect();
  }

  public static async Disconnect(): Promise<void> {
    if (this.prisma) {
      await this.prisma.$disconnect();
      this.prisma = null;
    }
  }
}
