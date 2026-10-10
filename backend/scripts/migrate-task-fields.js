import "../src/config/env.js";
import mongoose from "mongoose";
import { migrateTaskFields } from "../src/services/migrateTaskFields.js";
try {
  await mongoose.connect(process.env.MONGODB_CONNECTIONSTRING, { serverSelectionTimeoutMS: 15000 });
  console.log(JSON.stringify(await migrateTaskFields()));
} catch (error) {
  console.error("Task migration failed:", error.message);
  process.exitCode = 1;
} finally { await mongoose.disconnect(); }
