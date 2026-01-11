// src/db.js
import "dotenv/config";
import { PrismaClient } from "@prisma/client";

export const prisma = new PrismaClient();
