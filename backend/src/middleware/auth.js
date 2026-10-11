import User from "../models/User.js";
import Session from "../models/Session.js";
import { cookieName, verifyToken } from "../services/authService.js";
import { asyncHandler, HttpError } from "../utils/http.js";
export const requireAuth = asyncHandler(async (req, _res, next) => {
  const token = req.cookies[cookieName];
  if (!token) throw new HttpError(401, "Vui lòng đăng nhập");
  let payload;
  try { payload = verifyToken(token); }
  catch { throw new HttpError(401, "Phiên đăng nhập đã hết hạn hoặc không hợp lệ"); }
  const session = await Session.findOne({ _id: payload.jti, userId: payload.sub, expiresAt: { $gt: new Date() } });
  if (!session) throw new HttpError(401, "Phiên đăng nhập đã hết hạn hoặc không hợp lệ");
  const user = await User.findById(payload.sub);
  if (!user) throw new HttpError(401, "Phiên đăng nhập không hợp lệ");
  req.user = user;
  req.sessionId = session.id;
  next();
});
