import bcrypt from "bcrypt";
import mongoose from "mongoose";
import User from "../models/User.js";
import Task from "../models/Task.js";
import { validateCredentials } from "../validations/auth.js";

// Resumable: back up each legacy document before assigning it; never reassign owned tasks.
export async function migrateOwnership({ email, name, password }) {
  if (typeof email !== "string" || !email.trim()) throw new Error("Missing migration owner email");
  email = email.trim().toLowerCase();
  await User.init();
  let owner = await User.findOne({ email });
  if (!owner) {
    const values = validateCredentials({ email, name, password }, true);
    owner = await User.create({ name: values.name, email, passwordHash: await bcrypt.hash(values.password, 12) });
  }
  const migrationId = "001-task-ownership";
  const db = mongoose.connection.db;
  const history = db.collection("migrations");
  const previous = await history.findOne({ _id: migrationId });
  if (previous && previous.ownerId.toString() !== owner.id) {
    throw new Error("Ownership migration already belongs to another user");
  }
  let assigned = 0;
  const cursor = Task.collection.find({ userId: null });
  for await (const task of cursor) {
    await db.collection("migration_task_backups").updateOne(
      { _id: task._id },
      { $setOnInsert: { migrationId, original: task, backedUpAt: new Date() } },
      { upsert: true },
    );
    const result = await Task.collection.updateOne(
      { _id: task._id, userId: null }, { $set: { userId: owner._id } },
    );
    assigned += result.modifiedCount;
  }
  await history.updateOne(
    { _id: migrationId },
    { $setOnInsert: { ownerId: owner._id, createdAt: new Date() },
      $set: { lastRunAt: new Date() }, $inc: { assignedCount: assigned } },
    { upsert: true },
  );
  return { assigned, ownerId: owner.id, email };
}
