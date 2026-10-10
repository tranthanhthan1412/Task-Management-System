import "../src/config/env.js";
import mongoose from "mongoose";
import { migrateOwnership } from "../src/services/migrateOwnership.js";
try {
  await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING, { serverSelectionTimeoutMS: 15000 });
  const result = await migrateOwnership({
    email: process.env.MIGRATION_USER_EMAIL,
    name: process.env.MIGRATION_USER_NAME,
    password: process.env.MIGRATION_USER_PASSWORD,
  });
  console.log("Ownership migration:", JSON.stringify(result));
} catch (error) {
  console.error("Migration failed:", error.name, error.code || "");
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
