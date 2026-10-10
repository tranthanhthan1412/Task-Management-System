import { app } from "./app.js";
import { access } from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { backendDir, env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import User from "./models/User.js";
import Session from "./models/Session.js";
import Task from "./models/Task.js";
try {
  if (env.nodeEnv === "production") {
    await access(path.resolve(backendDir, "../frontend/dist/index.html"));
  }
  await connectDB();
  await Promise.all([User.init(), Session.init(), Task.init()]);
  const server = app.listen(env.port, () => console.log("TaskPilot API running on port: " + env.port));
  let stopping = false;
  const shutdown = (exitCode = 0) => {
    if (stopping) return;
    stopping = true;
    const timeout = setTimeout(() => process.exit(1), 10000);
    timeout.unref();
    server.close(async () => {
      try {
        await mongoose.disconnect();
        clearTimeout(timeout);
        process.exitCode = exitCode;
      } catch {
        process.exitCode = 1;
      }
    });
  };
  process.once("SIGTERM", () => shutdown());
  process.once("SIGINT", () => shutdown());
  server.on("error", () => {
    console.error("Không thể mở cổng server. Kiểm tra PORT hoặc tiến trình đang chạy.");
    shutdown(1);
  });
} catch (error) {
  // Driver errors can contain database addresses. Keep secrets out of deployment logs.
  console.error("Không thể khởi động TaskPilot. Kiểm tra cấu hình MongoDB và bản build frontend.", error.name, error.code || "");
  await mongoose.disconnect();
  process.exitCode = 1;
}
