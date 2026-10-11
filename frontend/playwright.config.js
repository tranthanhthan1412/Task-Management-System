import { defineConfig } from "@playwright/test";
import process from "node:process";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 30000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: "http://localhost:5174", browserName: "chromium", channel: process.env.PLAYWRIGHT_CHANNEL || (process.platform === "win32" && !process.env.CI ? "msedge" : undefined), headless: true, trace: "retain-on-failure" },
  webServer: [
    { command: "node ../backend/scripts/e2e-server.js", url: "http://127.0.0.1:5002/api/health", timeout: 180000, reuseExistingServer: false },
    { command: "npm run dev -- --host localhost --port 5174 --strictPort", url: "http://localhost:5174", timeout: 30000, reuseExistingServer: false, env: { VITE_API_URL: "http://localhost:5002/api" } },
  ],
});
