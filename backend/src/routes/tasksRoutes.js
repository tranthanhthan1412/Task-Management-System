import express from "express";
import { getAllTasks, getTaskSummary, getTask, createTask, updateTask, deleteTask } from "../controllers/tasksControllers.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/http.js";

const router = express.Router();
router.use(requireAuth);
router.get("/", asyncHandler(getAllTasks));
router.get("/summary", asyncHandler(getTaskSummary));
router.get("/:id", asyncHandler(getTask));
router.post("/", asyncHandler(createTask));
router.patch("/:id", asyncHandler(updateTask));
router.put("/:id", asyncHandler(updateTask));
router.delete("/:id", asyncHandler(deleteTask));
export default router;
