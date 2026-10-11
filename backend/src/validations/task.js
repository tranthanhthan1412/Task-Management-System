import { TASK_PRIORITIES, TASK_STATUSES } from "../models/Task.js";
import { HttpError } from "../utils/http.js";

export function validateTaskQuery(query) {
  const { filter = "all", search, priority, status, view = "list" } = query;
  if (!["today", "week", "month", "all"].includes(filter)) throw new HttpError(400, "Bộ lọc thời gian không hợp lệ");
  if (search !== undefined && typeof search !== "string") throw new HttpError(400, "Từ khóa tìm kiếm không hợp lệ");
  if (priority !== undefined && !TASK_PRIORITIES.includes(priority)) throw new HttpError(400, "Độ ưu tiên không hợp lệ");
  if (status !== undefined && !TASK_STATUSES.includes(status)) throw new HttpError(400, "Trạng thái nhiệm vụ không hợp lệ");
  if (!["list", "kanban"].includes(view)) throw new HttpError(400, "Chế độ hiển thị không hợp lệ");
  const integer = (value, fallback, max, label) => {
    if (value === undefined) return fallback;
    if (typeof value !== "string" || !/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) > max) {
      throw new HttpError(400, label + " không hợp lệ");
    }
    return Number(value);
  };
  const page = integer(query.page, 1, 1000000, "Trang");
  const limit = integer(query.limit, 6, 100, "Kích thước trang");
  return { filter, search: search?.trim(), priority, status, view, page, limit };
}

export function validateTaskId(id) {
  if (typeof id !== "string" || !/^[a-f\d]{24}$/i.test(id)) throw new HttpError(400, "ID nhiệm vụ không hợp lệ");
}

export function parseDueDate(value) {
  if (value === null) return null;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?(?:Z|[+-]\d{2}:\d{2}))?$/.test(value)) {
    throw new HttpError(400, "Hạn hoàn thành phải là ngày ISO hợp lệ hoặc null");
  }
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendar = new Date(0);
  calendar.setUTCFullYear(year, month - 1, day);
  const parsed = new Date(value);
  if (calendar.getUTCFullYear() !== year || calendar.getUTCMonth() !== month - 1 ||
      calendar.getUTCDate() !== day || !Number.isFinite(parsed.getTime()) ||
      (value.length > 10 && Number(value.slice(11, 13)) > 23)) {
    throw new HttpError(400, "Hạn hoàn thành không hợp lệ");
  }
  return parsed;
}

export function validateTask(body, partial = false) {
  if (!body || typeof body !== "object" || Array.isArray(body)) throw new HttpError(400, "Dữ liệu nhiệm vụ không hợp lệ");
  const values = {};
  if (!partial || body.title !== undefined) {
    if (typeof body.title !== "string" || !body.title.trim() || body.title.trim().length > 200) {
      throw new HttpError(400, "Tiêu đề phải có từ 1 đến 200 ký tự");
    }
    values.title = body.title.trim();
  }
  if (body.description !== undefined) {
    if (typeof body.description !== "string" || body.description.length > 5000) throw new HttpError(400, "Mô tả tối đa 5000 ký tự");
    values.description = body.description;
  }
  if (body.status !== undefined) {
    if (!TASK_STATUSES.includes(body.status)) throw new HttpError(400, "Trạng thái nhiệm vụ không hợp lệ");
    values.status = body.status;
  }
  if (body.priority !== undefined) {
    if (!TASK_PRIORITIES.includes(body.priority)) throw new HttpError(400, "Độ ưu tiên không hợp lệ");
    values.priority = body.priority;
  }
  if (body.dueDate !== undefined) values.dueDate = parseDueDate(body.dueDate);
  if (partial && !Object.keys(values).length) throw new HttpError(400, "Không có nội dung cập nhật hợp lệ");
  return values;
}
