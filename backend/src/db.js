// src/db.js
import "dotenv/config";
import pkg from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

const { PrismaClient } = pkg;

const adapter = new PrismaBetterSqlite3({
  url: process.env.SQLITE_URL,
});

export const prisma = new PrismaClient({ adapter });
