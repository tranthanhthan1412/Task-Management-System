import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import mongoose from "mongoose";
import path from "node:path";
import { backendDir, env } from "./config/env.js";
import taskRoute from "./routes/tasksRoutes.js";
import authRoute from "./routes/authRoutes.js";
import { protectWrites, errorHandler } from "./middleware/security.js";
import { docsRouter } from "./docs/router.js";
export const app = express();
app.disable("x-powered-by");
app.set("trust proxy", env.trustProxy);
app.use(helmet({ contentSecurityPolicy: { directives: { "upgrade-insecure-requests": env.clientUrl.startsWith("https:") ? [] : null } } }));
app.use(cors({ origin: env.allowedOrigins, credentials: true }));
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use("/api", (_req, res, next) => { res.set("Cache-Control", "no-store"); next(); });
app.use("/api", protectWrites);
app.use("/api", docsRouter);
app.get("/api/health", async (_req, res) => {
  try {
    if (mongoose.connection.readyState !== 1) throw new Error("Database unavailable");
    await mongoose.connection.db.command({ ping: 1 }, { timeoutMS: 2000 });
    res.json({ success: true, message: "TaskPilot API is running" });
  } catch {
    res.status(503).json({ success: false, message: "Database unavailable" });
  }
});
app.use("/api/auth", authRoute);
app.use("/api/tasks", taskRoute);
app.use("/api", (_req, res) => res.status(404).json({ success: false, message: "API không tồn tại" }));
if (env.nodeEnv === "production") {
  const frontendDist = path.resolve(backendDir, "../frontend/dist");
  app.use(express.static(frontendDist));
  app.get("*", (_req, res) => res.sendFile(path.join(frontendDist, "index.html")));
}
app.use(errorHandler);
