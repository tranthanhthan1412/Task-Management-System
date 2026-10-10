import Session from "../models/Session.js";
import { validateCredentials } from "../validations/auth.js";
import { cookieName, cookieOptions, createSession, loginUser, registerUser, verifyToken } from "../services/authService.js";
export async function register(req, res) {
  const user = await registerUser(validateCredentials(req.body, true));
  await createSession(user, res);
  res.status(201).json({ success: true, user: user.toJSON() });
}
export async function login(req, res) {
  const user = await loginUser(validateCredentials(req.body));
  await createSession(user, res);
  res.json({ success: true, user: user.toJSON() });
}
export async function logout(req, res) {
  const token = req.cookies[cookieName];
  let payload;
  if (token) { try { payload = verifyToken(token); } catch { /* Invalid cookies still get cleared. */ } }
  if (payload) await Session.deleteOne({ _id: payload.jti, userId: payload.sub });
  res.clearCookie(cookieName, cookieOptions);
  res.json({ success: true, message: "Đã đăng xuất" });
}
export function me(req, res) { res.json({ success: true, user: req.user.toJSON() }); }
