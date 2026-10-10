import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { fileURLToPath } from "node:url";
import mongoose from "mongoose";
import request from "supertest";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import SwaggerParser from "@apidevtools/swagger-parser";
import { MongoMemoryServer } from "mongodb-memory-server";
import { openapi } from "../src/docs/openapi.js";

Object.assign(process.env, { NODE_ENV: "test", JWT_SECRET: randomBytes(48).toString("hex"),
  PORT: "5001", JWT_EXPIRES_IN: "7d", CLIENT_URL: "http://localhost:5173", API_PUBLIC_URL: "http://localhost:5001", COOKIE_SECURE: "false", TRUST_PROXY_HOPS: "0" });
const { app } = await import("../src/app.js");
const { default: Task } = await import("../src/models/Task.js");
const { default: User } = await import("../src/models/User.js");
const { default: Session } = await import("../src/models/Session.js");
let mongo, owner, other, ownerId, otherId;
const password = randomBytes(16).toString("hex");
const write = (agent, method, path) => agent[method](path).set("X-Requested-With", "XMLHttpRequest");
before(async () => {
  mongo = await MongoMemoryServer.create({ binary: { downloadDir: fileURLToPath(new URL("../node_modules/.cache/mongodb-memory-server", import.meta.url)) } });
  await mongoose.connect(mongo.getUri(), { dbName: "taskpilot_integration" });
  await Promise.all([Task.init(), User.init(), Session.init()]);
  owner = request.agent(app); other = request.agent(app);
  ownerId = (await write(owner, "post", "/api/auth/register").send({ name: "Owner", email: "owner@example.com", password }).expect(201)).body.user._id;
  otherId = (await write(other, "post", "/api/auth/register").send({ name: "Other", email: "other@example.com", password }).expect(201)).body.user._id;
});
beforeEach(async () => { await Task.deleteMany({}); });
after(async () => { await mongoose.disconnect(); await mongo?.stop(); });

test("OpenAPI is valid and documents every mounted business operation", async () => {
  await SwaggerParser.validate(structuredClone(openapi));
  const spec = (await request(app).get("/api/openapi.json").expect(200)).body;
  for (const [path, methods] of Object.entries({ "/health": ["get"], "/auth/register": ["post"], "/auth/login": ["post"],
    "/auth/logout": ["post"], "/auth/me": ["get"], "/tasks": ["get", "post"], "/tasks/summary": ["get"], "/tasks/{id}": ["get", "put", "patch", "delete"] })) {
    for (const method of methods) assert.ok(spec.paths[path][method]);
  }
  assert.equal(spec.components.securitySchemes.sessionCookie.in, "cookie");
  assert.ok(!JSON.stringify(spec).includes(process.env.JWT_SECRET));
  await request(app).get("/api/docs/").expect(200).expect(/swagger-ui/);
  await request(app).get("/api/docs/swagger-ui-init.js").expect(200).expect(/X-Requested-With/);
});

test("registration hashes passwords, hides hashes and validates duplicate/invalid accounts", async () => {
  const stored = await User.findById(ownerId).select("+passwordHash");
  assert.equal(await bcrypt.compare(password, stored.passwordHash), true);
  assert.equal(bcrypt.getRounds(stored.passwordHash), 12);
  const me = (await owner.get("/api/auth/me").expect(200)).body;
  assert.equal(me.user.passwordHash, undefined);
  await write(request(app), "post", "/api/auth/register").send({ name: "Duplicate", email: "OWNER@example.com", password }).expect(409);
  await write(request(app), "post", "/api/auth/register").send({ name: "X", email: "invalid", password: "short" }).expect(400);
  await write(request(app), "post", "/api/auth/login").send({ email: "owner@example.com", password: "wrong-password" }).expect(401);
});

test("login sets HttpOnly cookie and logout revokes a copied session", async () => {
  const login = await write(request(app), "post", "/api/auth/login").send({ email: "owner@example.com", password }).expect(200);
  assert.match(login.headers["set-cookie"][0], /HttpOnly/);
  const cookie = login.headers["set-cookie"][0].split(";")[0];
  await request(app).get("/api/auth/me").set("Cookie", cookie).expect(200);
  await write(request(app), "post", "/api/auth/logout").set("Cookie", cookie).expect(200);
  await request(app).get("/api/auth/me").set("Cookie", cookie).expect(401);
});

test("unauthenticated requests and cross-user task access are rejected", async () => {
  const task = (await write(owner, "post", "/api/tasks").send({ title: "Private", userId: otherId }).expect(201)).body;
  assert.equal(task.userId, ownerId);
  await request(app).get("/api/tasks").expect(401);
  await request(app).get("/api/tasks/summary").expect(401);
  await request(app).get("/api/tasks/" + task._id).expect(401);
  await other.get("/api/tasks/" + task._id).expect(404);
  await write(other, "patch", "/api/tasks/" + task._id).send({ title: "Stolen" }).expect(404);
  await write(other, "delete", "/api/tasks/" + task._id).expect(404);
  assert.equal((await other.get("/api/tasks").expect(200)).body.counts.total, 0);
  assert.equal((await other.get("/api/tasks/summary").expect(200)).body.counts.total, 0);
});

test("all task fields support CRUD and completion/reopening", async () => {
  const task = (await write(owner, "post", "/api/tasks").send({ title: "Full task", description: "Details", priority: "HIGH", status: "IN_PROGRESS", dueDate: "2027-02-28T17:30:00+07:00" }).expect(201)).body;
  const path = "/api/tasks/" + task._id;
  assert.equal((await owner.get(path).expect(200)).body.dueDate, "2027-02-28T10:30:00.000Z");
  const done = (await write(owner, "patch", path).send({ status: "DONE", userId: otherId }).expect(200)).body;
  assert.ok(done.completedAt); assert.equal(done.userId, ownerId);
  const repeat = (await write(owner, "patch", path).send({ status: "DONE" }).expect(200)).body;
  assert.equal(repeat.completedAt, done.completedAt);
  const reopened = (await write(owner, "put", path).send({ title: "Edited", status: "TODO", dueDate: null, description: "" }).expect(200)).body;
  assert.equal(reopened.completedAt, null); assert.equal(reopened.dueDate, null);
  await write(owner, "delete", path).expect(200);
  await owner.get(path).expect(404);
});

test("invalid task payloads and query operators are rejected", async () => {
  for (const fields of [{ title: " " }, { status: "active" }, { priority: "URGENT" }, { dueDate: "2027-02-30" }]) {
    await write(owner, "post", "/api/tasks").send({ title: "Invalid", ...fields }).expect(400);
  }
  for (const query of ["page=0", "limit=101", "page=1&page=2", "search[$ne]=x", "priority[$ne]=LOW", "view=other"]) {
    await owner.get("/api/tasks?" + query).expect(400);
  }
});

test("pagination is stable; filters search all tasks; Kanban is unpaginated", async () => {
  await Task.insertMany(Array.from({ length: 14 }, (_, i) => ({ userId: ownerId, title: `Task ${i}`, priority: i === 0 ? "HIGH" : "MEDIUM" })));
  await Task.create({ userId: otherId, title: "Other user's task" });
  const first = (await owner.get("/api/tasks").expect(200)).body;
  const second = (await owner.get("/api/tasks?page=2").expect(200)).body;
  assert.equal(first.tasks.length, 6); assert.equal(first.pagination.totalPages, 3);
  assert.ok(second.tasks.every(task => !first.tasks.some(item => item._id === task._id)));
  const last = (await owner.get("/api/tasks?page=99").expect(200)).body;
  assert.equal(last.pagination.page, 3); assert.equal(last.tasks.length, 2);
  const found = (await owner.get("/api/tasks?search=TASK%200&priority=HIGH&status=TODO").expect(200)).body;
  assert.equal(found.tasks.length, 1); assert.equal(found.tasks[0].title, "Task 0");
  const board = (await owner.get("/api/tasks?view=kanban").expect(200)).body;
  assert.equal(board.tasks.length, 14); assert.equal(board.pagination, null);
});

test("dashboard separates upcoming and overdue without losing totals", async () => {
  const future = new Date(Date.now() + 86400000), past = new Date(Date.now() - 86400000);
  await Task.insertMany([
    ...Array.from({ length: 7 }, () => ({ userId: ownerId, title: "Overdue", dueDate: past })),
    ...Array.from({ length: 6 }, () => ({ userId: ownerId, title: "Upcoming", dueDate: future })),
    { userId: ownerId, title: "Done", status: "DONE", dueDate: past },
    { userId: ownerId, title: "No deadline" }, { userId: otherId, title: "Private", dueDate: future },
  ]);
  const summary = (await owner.get("/api/tasks/summary").expect(200)).body;
  assert.equal(summary.counts.total, 15); assert.equal(summary.counts.DONE, 1);
  assert.equal(summary.overdueCount, 7); assert.equal(summary.upcomingCount, 6);
  assert.equal(summary.upcoming.length, 5); assert.equal(summary.overdue.length, 5);
});

test("Swagger origin can write with CSRF header; untrusted origin still cannot", async () => {
  await write(owner, "post", "/api/tasks").set("Origin", "http://localhost:5001").send({ title: "Swagger task" }).expect(201);
  await owner.post("/api/tasks").set("Origin", "http://localhost:5001").send({ title: "No header" }).expect(403);
  await write(owner, "post", "/api/tasks").set("Origin", "https://untrusted.example").send({ title: "Blocked" }).expect(403);
});

test("healthcheck detects database failures without exposing connection details", async (t) => {
  await request(app).get("/api/health").expect(200).expect("Cache-Control", "no-store");
  const ping = t.mock.method(mongoose.connection.db, "command", async () => { throw new Error("private database details"); });
  const failed = await request(app).get("/api/health").expect(503);
  assert.deepEqual(failed.body, { success: false, message: "Database unavailable" });
  ping.mock.restore();
  await request(app).get("/api/health").expect(200);
});

test("tampered, expired JWTs and expired database sessions cannot authenticate", async () => {
  const login = await write(request(app), "post", "/api/auth/login").send({ email: "owner@example.com", password }).expect(200);
  const cookie = login.headers["set-cookie"][0].split(";")[0];
  const token = cookie.slice(cookie.indexOf("=") + 1);
  const payload = jwt.decode(token);
  const expired = jwt.sign({ ...payload, exp: Math.floor(Date.now() / 1000) - 1 }, process.env.JWT_SECRET);
  const forged = jwt.sign(payload, randomBytes(48).toString("hex"));
  for (const invalid of ["invalid", expired, forged]) {
    await request(app).get("/api/tasks").set("Cookie", "taskpilot_session=" + invalid).expect(401);
  }
  await Session.updateOne({ _id: payload.jti }, { $set: { expiresAt: new Date(Date.now() - 1000) } });
  await request(app).get("/api/auth/me").set("Cookie", cookie).expect(401);
});

test("invalid IDs, empty updates and malformed JSON return client errors", async () => {
  for (const method of ["get", "patch", "delete"]) {
    await write(owner, method, "/api/tasks/invalid-id").send({ title: "Invalid" }).expect(400);
  }
  const task = (await write(owner, "post", "/api/tasks").send({ title: "Original" }).expect(201)).body;
  await write(owner, "patch", "/api/tasks/" + task._id).send({ userId: otherId }).expect(400);
  await write(owner, "post", "/api/tasks").set("Content-Type", "application/json").send('{"title":').expect(400);
  await request(app).get("/api/unknown").expect(404).expect("Content-Type", /json/);
});

test("simultaneous task updates report a conflict instead of losing a write", async (t) => {
  const task = (await write(owner, "post", "/api/tasks").send({ title: "Concurrent" }).expect(201)).body;
  const findOne = Task.findOne.bind(Task);
  let reads = 0, release;
  const bothRead = new Promise(resolve => { release = resolve; });
  // Both requests read the same real database version before either writes.
  t.mock.method(Task, "findOne", async (...args) => {
    const current = await findOne(...args);
    if (++reads === 2) release();
    await bothRead;
    return current;
  });
  const responses = await Promise.all([
    write(owner, "patch", "/api/tasks/" + task._id).send({ status: "DONE" }),
    write(owner, "patch", "/api/tasks/" + task._id).send({ status: "IN_PROGRESS" }),
  ]);
  assert.deepEqual(responses.map(res => res.status).sort(), [200, 409]);
  const stored = await Task.findById(task._id);
  assert.equal(stored.status, responses.find(res => res.status === 200).body.status);
  assert.equal(stored.__v, 1);
});

test("ownership migration backs up legacy tasks, preserves owners and is resumable", async () => {
  const { migrateOwnership } = await import("../src/services/migrateOwnership.js");
  const legacy = { _id: new mongoose.Types.ObjectId(), title: "Legacy", status: "active" };
  await Task.collection.insertOne(legacy);
  const owned = await Task.create({ userId: otherId, title: "Already owned" });
  const result = await migrateOwnership({ email: "owner@example.com" });
  assert.equal(result.assigned, 1);
  assert.equal((await Task.findById(legacy._id)).userId.toString(), ownerId);
  assert.equal((await Task.findById(owned._id)).userId.toString(), otherId);
  const backup = await mongoose.connection.db.collection("migration_task_backups").findOne({ _id: legacy._id });
  assert.equal(backup.original.userId, undefined);
  assert.equal((await migrateOwnership({ email: "owner@example.com" })).assigned, 0);
  await assert.rejects(migrateOwnership({ email: "other@example.com" }), /another user/);
});

test("task-field migration validates before writing, keeps backups and is resumable", async () => {
  const { migrateTaskFields } = await import("../src/services/migrateTaskFields.js");
  const legacy = { _id: new mongoose.Types.ObjectId(), userId: new mongoose.Types.ObjectId(ownerId), title: "Legacy done", status: "completed", updatedAt: new Date("2026-01-01T00:00:00Z") };
  const invalid = { _id: new mongoose.Types.ObjectId(), title: "Unsupported", status: "unknown" };
  await Task.collection.insertMany([legacy, invalid]);
  await assert.rejects(migrateTaskFields(), /unsupported data/);
  assert.equal((await Task.collection.findOne({ _id: legacy._id })).status, "completed");
  await Task.collection.deleteOne({ _id: invalid._id });
  assert.equal((await migrateTaskFields()).updated, 1);
  const task = await Task.findById(legacy._id);
  assert.equal(task.status, "DONE");
  assert.equal(task.priority, "MEDIUM");
  assert.equal(task.completedAt.toISOString(), legacy.updatedAt.toISOString());
  const backup = await mongoose.connection.db.collection("migration_task_fields_backups").findOne({ _id: legacy._id });
  assert.equal(backup.original.status, "completed");
  assert.equal((await migrateTaskFields()).updated, 0);
});
