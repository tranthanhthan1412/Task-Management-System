import dotenv from "dotenv";
import path from "node:path";
import { fileURLToPath } from "node:url";
export const backendDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
dotenv.config({ path: path.join(backendDir, ".env"), quiet: true });
const nodeEnv = process.env.NODE_ENV || "development";
const port = Number(process.env.PORT || 5001);
const clientUrl = process.env.CLIENT_URL || process.env.RENDER_EXTERNAL_URL || "http://localhost:5173";
const apiUrl = process.env.API_PUBLIC_URL || (nodeEnv === "production" ? clientUrl : `http://localhost:${port}`);
const trustProxy = Number(process.env.TRUST_PROXY_HOPS || 0);
const jwtSecret = process.env.JWT_SECRET;
const duration = /^(\d+)([smhd])$/.exec(process.env.JWT_EXPIRES_IN || "7d");
if (!["development", "test", "production"].includes(nodeEnv)) throw new Error("NODE_ENV không hợp lệ");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("PORT không hợp lệ");
if (!jwtSecret || jwtSecret.length < 32) throw new Error("JWT_SECRET phải có ít nhất 32 ký tự");
if (!duration) throw new Error("JWT_EXPIRES_IN phải có dạng 30m, 1h hoặc 7d");
const ttlSeconds = Number(duration[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[duration[2]];
if (ttlSeconds < 60 || ttlSeconds > 30 * 86400) throw new Error("JWT_EXPIRES_IN phải từ 60 giây đến 30 ngày");
const origin = new URL(clientUrl);
if (!["http:", "https:"].includes(origin.protocol) || origin.origin !== clientUrl) {
  throw new Error("CLIENT_URL phải là HTTP(S) origin không có dấu / cuối");
}
if (!Number.isInteger(trustProxy) || trustProxy < 0 || trustProxy > 5) throw new Error("TRUST_PROXY_HOPS must be 0-5");
const apiOrigin = new URL(apiUrl);
if (!["http:", "https:"].includes(apiOrigin.protocol) || apiOrigin.origin !== apiUrl) throw new Error("API_PUBLIC_URL must be an HTTP(S) origin");
if (process.env.COOKIE_SECURE && !["true", "false"].includes(process.env.COOKIE_SECURE)) throw new Error("COOKIE_SECURE must be true or false");
const cookieSecure = process.env.COOKIE_SECURE ? process.env.COOKIE_SECURE === "true" : nodeEnv === "production";
if (nodeEnv === "production" && !cookieSecure && !["localhost", "127.0.0.1", "[::1]"].includes(origin.hostname)) {
  throw new Error("Insecure production cookies are only allowed for local Docker on localhost");
}
export const env = { nodeEnv, port, clientUrl, jwtSecret, ttlSeconds, cookieSecure, trustProxy, allowedOrigins: [...new Set([clientUrl, apiUrl])] };
