import { env } from "../config/env.js";
import { HttpError } from "../utils/http.js";
export function protectWrites(req, _res, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return next();
  const origin = req.get("origin");
  if ((origin && !env.allowedOrigins.includes(origin)) || req.get("X-Requested-With") !== "XMLHttpRequest") {
    return next(new HttpError(403, "Nguồn yêu cầu không được phép"));
  }
  next();
}
export function errorHandler(error, _req, res, next) {
  if (res.headersSent) return next(error);
  let status = error.status || 500;
  let message = error.message;
  if (error.code === 11000) { status = 409; message = "Dữ liệu đã tồn tại"; }
  if (error.name === "ValidationError" || error.name === "CastError") { status = 400; message = "Dữ liệu không hợp lệ"; }
  if (error.type === "entity.parse.failed") { status = 400; message = "JSON không hợp lệ"; }
  if (error.type === "entity.too.large") { status = 413; message = "Dữ liệu gửi lên quá lớn"; }
  if (status >= 500) { console.error("Request failed:", error.name); message = "Lỗi hệ thống"; }
  res.status(status).json({ success: false, message });
}
