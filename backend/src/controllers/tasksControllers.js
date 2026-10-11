import Task, { TASK_STATUSES } from "../models/Task.js";
import { HttpError } from "../utils/http.js";
import { validateTask, validateTaskId, validateTaskQuery } from "../validations/task.js";

function ownerQuery(userId, filter, now = new Date()) {
  let startDate, endDate;
  if (filter === "today") {
    startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  } else if (filter === "week") {
    const monday = now.getDate() - ((now.getDay() + 6) % 7);
    startDate = new Date(now.getFullYear(), now.getMonth(), monday);
    endDate = new Date(now.getFullYear(), now.getMonth(), monday + 7);
  } else if (filter === "month") {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }
  return { userId, ...(startDate ? { createdAt: { $gte: startDate, $lt: endDate } } : {}) };
}

async function countStatuses(query) {
  const groups = await Task.aggregate([
    { $match: query }, { $group: { _id: "$status", count: { $sum: 1 } } },
  ]);
  const counts = { total: 0, TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  for (const item of groups) {
    counts.total += item.count;
    if (TASK_STATUSES.includes(item._id)) counts[item._id] = item.count;
  }
  return counts;
}

export async function getAllTasks(req, res) {
  const { filter, search, priority, status, view, page: requestedPage, limit } = validateTaskQuery(req.query);
  const query = ownerQuery(req.user._id, filter);
  if (search && typeof search === "string" && search.trim()) {
    query.title = { $regex: search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i" };
  }
  if (priority) {
    query.priority = priority;
  }
  if (status) {
    query.status = status;
  }
  const counts = await countStatuses(query);
  const taskQuery = Task.find(query).sort({ createdAt: -1, _id: -1 }).lean();
  if (view === "kanban") {
    return res.json({ tasks: await taskQuery, counts, pagination: null });
  }

  const totalPages = Math.max(1, Math.ceil(counts.total / limit));
  const page = Math.min(requestedPage, totalPages);
  const tasks = await taskQuery.skip((page - 1) * limit).limit(limit);
  res.json({ tasks, counts, pagination: { page, limit, total: counts.total, totalPages } });
}

export async function getTaskSummary(req, res) {
  const { filter } = validateTaskQuery(req.query);
  const now = new Date();
  const query = ownerQuery(req.user._id, filter, now);
  const unfinished = { ...query, status: { $in: ["TODO", "IN_PROGRESS"] } };
  const upcomingQuery = { ...unfinished, dueDate: { $gte: now } };
  const overdueQuery = { ...unfinished, dueDate: { $ne: null, $lt: now } };
  const firstFive = match => Task.find(match).sort({ dueDate: 1, _id: 1 }).limit(5).lean();
  const [counts, upcoming, overdue, upcomingCount, overdueCount] = await Promise.all([
    countStatuses(query), firstFive(upcomingQuery), firstFive(overdueQuery),
    Task.countDocuments(upcomingQuery), Task.countDocuments(overdueQuery),
  ]);
  res.json({ counts, upcoming, overdue, upcomingCount, overdueCount });
}

export async function getTask(req, res) {
  validateTaskId(req.params.id);
  const task = await Task.findOne({ _id: req.params.id, userId: req.user._id });
  if (!task) throw new HttpError(404, "Nhiệm vụ không tồn tại");
  res.json(task);
}

export async function createTask(req, res) {
  const values = validateTask(req.body);
  const task = await Task.create({
    ...values, userId: req.user._id,
    completedAt: values.status === "DONE" ? new Date() : null,
  });
  res.status(201).json(task);
}

export async function updateTask(req, res) {
  validateTaskId(req.params.id);
  const values = validateTask(req.body, true);
  const ownerQuery = { _id: req.params.id, userId: req.user._id };
  const task = await Task.findOne(ownerQuery);
  if (!task) throw new HttpError(404, "Nhiệm vụ không tồn tại");
  if (values.status !== undefined) {
    values.completedAt = values.status === "DONE"
      ? task.status === "DONE" && task.completedAt ? task.completedAt : new Date()
      : null;
  }
  // Include ownership and version in the write too; concurrent stale writes return 409.
  const updated = await Task.findOneAndUpdate(
    { ...ownerQuery, __v: task.__v }, { $set: values, $inc: { __v: 1 } },
    { returnDocument: "after", runValidators: true },
  );
  if (!updated) throw new HttpError(409, "Nhiệm vụ vừa thay đổi. Vui lòng tải lại và thử lại.");
  res.json(updated);
}

export async function deleteTask(req, res) {
  validateTaskId(req.params.id);
  const task = await Task.findOneAndDelete({ _id: req.params.id, userId: req.user._id });
  if (!task) throw new HttpError(404, "Nhiệm vụ không tồn tại");
  res.json(task);
}
