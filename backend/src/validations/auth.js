import { HttpError } from "../utils/http.js";
export function validateCredentials(body, registration = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Dữ liệu không hợp lệ");
  const { name, email, password } = body;
  if (typeof email !== "string" || email.trim().length > 254 ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) throw new HttpError(400, "Email không hợp lệ");
  if (typeof password !== "string" || password.length < 8 ||
      Buffer.byteLength(password, "utf8") > 72) throw new HttpError(400, "Mật khẩu phải có ít nhất 8 ký tự và tối đa 72 byte");
  if (registration && (typeof name !== "string" || !name.trim() || name.trim().length > 100)) {
    throw new HttpError(400, "Tên phải có từ 1 đến 100 ký tự");
  }
  return { email: email.trim().toLowerCase(), password, ...(registration ? { name: name.trim() } : {}) };
}
