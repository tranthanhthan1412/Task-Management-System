import mongoose from "mongoose";
import Task, { TASK_PRIORITIES, TASK_STATUSES } from "../models/Task.js";

const migrationId = "002-task-fields";
function missingFields(task) {
  const patch = {};
  if (task.status === "active") patch.status = "TODO";
  if (task.status === "completed") patch.status = "DONE";
  if (task.description === undefined) patch.description = "";
  if (task.priority === undefined) patch.priority = "MEDIUM";
  if (task.dueDate === undefined) patch.dueDate = null;
  const status = patch.status || task.status;
  if (status === "DONE" && !task.completedAt) {
    patch.completedAt = task.updatedAt || task.createdAt || new Date();
  } else if (status !== "DONE" && task.completedAt !== null) {
    patch.completedAt = null;
  }
  if (task.__v === undefined) patch.__v = 0;
  return patch;
}

export async function migrateTaskFields() {
  const db = mongoose.connection.db;
  // Preflight all data before any mutation. Unknown data is not silently overwritten.
  for await (const task of Task.collection.find({})) {
    if (![...TASK_STATUSES, "active", "completed"].includes(task.status) ||
        (task.priority !== undefined && !TASK_PRIORITIES.includes(task.priority)) ||
        typeof task.title !== "string" || !task.title.trim() || task.title.trim().length > 200 ||
        (task.description !== undefined && (typeof task.description !== "string" || task.description.length > 5000)) ||
        (task.dueDate != null && (!(task.dueDate instanceof Date) || !Number.isFinite(task.dueDate.getTime())))) {
      throw new Error("Task " + task._id + " has unsupported data. Review it before migration.");
    }
  }
  let updated = 0;
  for await (const task of Task.collection.find({})) {
    const patch = missingFields(task);
    if (!Object.keys(patch).length) continue;
    await db.collection("migration_task_fields_backups").updateOne(
      { _id: task._id },
      { $setOnInsert: { migrationId, original: task, backedUpAt: new Date() } },
      { upsert: true },
    );
    // Run while API writes are paused; additionally reject a document changed since the read.
    const filter = { _id: task._id };
    for (const key of ["status", "updatedAt", "__v"]) {
      filter[key] = task[key] === undefined ? { $exists: false } : task[key];
    }
    const result = await Task.collection.updateOne(filter, { $set: patch });
    if (result.matchedCount !== 1) throw new Error("Task changed during migration; pause writes and rerun.");
    updated += result.modifiedCount;
  }
  await db.collection("migrations").updateOne(
    { _id: migrationId },
    { $setOnInsert: { createdAt: new Date() }, $set: { lastRunAt: new Date() }, $inc: { updatedCount: updated } },
    { upsert: true },
  );
  return { migrationId, updated };
}
