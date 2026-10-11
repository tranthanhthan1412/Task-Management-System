import { randomUUID } from "node:crypto";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Session from "../models/Session.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";

export const cookieName = "taskpilot_session";
export const cookieOptions = { httpOnly: true, secure: env.cookieSecure, sameSite: "lax", path: "/api" };
const jwtOptions = { algorithms: ["HS256"], issuer: "taskpilot", audience: "taskpilot-client" };
export function verifyToken(token) {
  const payload = jwt.verify(token, env.jwtSecret, jwtOptions);
  if (typeof payload !== "object" || typeof payload.sub !== "string" ||
      !/^[a-f\d]{24}$/i.test(payload.sub) || typeof payload.jti !== "string") throw new HttpError(401, "Phiên đăng nhập không hợp lệ");
  return payload;
}
export async function createSession(user, res) {
  const id = randomUUID();
  const token = jwt.sign({}, env.jwtSecret, {
    algorithm: "HS256", subject: user.id, jwtid: id, issuer: "taskpilot",
    audience: "taskpilot-client", expiresIn: env.ttlSeconds,
  });
  await Session.create({ _id: id, userId: user._id, expiresAt: new Date(Date.now() + env.ttlSeconds * 1000) });
  res.cookie(cookieName, token, { ...cookieOptions, maxAge: env.ttlSeconds * 1000 });
}
export async function registerUser({ name, email, password }) {
  const passwordHash = await bcrypt.hash(password, 12);
  try { return await User.create({ name, email, passwordHash }); }
  catch (error) {
    if (error.code === 11000) throw new HttpError(409, "Email đã được sử dụng");
    throw error;
  }
}
const dummyHash = await bcrypt.hash(randomUUID(), 12);
export async function loginUser({ email, password }) {
  const user = await User.findOne({ email }).select("+passwordHash");
  const valid = await bcrypt.compare(password, user?.passwordHash || dummyHash);
  if (!user || !valid) throw new HttpError(401, "Email hoặc mật khẩu không đúng");
  return user;
}
