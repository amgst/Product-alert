import { PrismaClient } from "@prisma/client";

declare global {
  var prisma: PrismaClient | undefined;
}

function createPrismaClient() {
  try {
    return new PrismaClient();
  } catch (e) {
    console.error("PrismaClient creation error:", e);
    return new PrismaClient();
  }
}

const prisma = global.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

export default prisma;
