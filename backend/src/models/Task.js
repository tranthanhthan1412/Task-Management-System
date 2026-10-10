import mongoose from "mongoose";
export const TASK_STATUSES = ["TODO", "IN_PROGRESS", "DONE"];
export const TASK_PRIORITIES = ["LOW", "MEDIUM", "HIGH"];

const taskSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 200 },
  description: { type: String, default: "", maxlength: 5000 },
  status: { type: String, enum: TASK_STATUSES, default: "TODO", required: true },
  priority: { type: String, enum: TASK_PRIORITIES, default: "MEDIUM", required: true },
  dueDate: { type: Date, default: null },
  completedAt: { type: Date, default: null },
}, { timestamps: true });

taskSchema.index({ userId: 1, createdAt: -1, _id: -1 });
taskSchema.index({ userId: 1, status: 1, createdAt: -1, _id: -1 });
taskSchema.index({ userId: 1, status: 1, dueDate: 1, _id: 1 });

export const Task = mongoose.model("Task", taskSchema);
export default Task;
