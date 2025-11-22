// src/server.js
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";
import { app } from "./app";


dotenv.config();

const port = process.env.PORT || 5000;

async function start() {
  try {
    const prisma = new PrismaClient();

    // Ensure DB connection works before starting server
    await prisma.$connect();
    console.log("✅ Database connected");

    app.listen(port, () => {
      console.log(`🚀 Server running on http://localhost:${port}`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();
