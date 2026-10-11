import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import { register, login, logout, me } from "../controllers/authController.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";
const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: "draft-8", legacyHeaders: false,
  message: { success: false, message: "Quá nhiều lần thử. Vui lòng thử lại sau 15 phút." },
});
router.post("/register", authLimiter, asyncHandler(register));
router.post("/login", authLimiter, asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.get("/me", requireAuth, me);
export default router;
