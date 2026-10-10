export const statuses = [
  { value: "TODO", label: "Chưa bắt đầu", color: "border-slate-300 bg-slate-50" },
  { value: "IN_PROGRESS", label: "Đang thực hiện", color: "border-violet-300 bg-violet-50" },
  { value: "DONE", label: "Hoàn thành", color: "border-emerald-300 bg-emerald-50" },
];
export const priorities = [
  { value: "LOW", label: "Thấp", color: "bg-slate-100 text-slate-700" },
  { value: "MEDIUM", label: "Trung bình", color: "bg-amber-50 text-amber-800" },
  { value: "HIGH", label: "Cao", color: "bg-rose-50 text-rose-700" },
];
export const FilterType = { all: "Tất cả", ...Object.fromEntries(statuses.map(item => [item.value, item.label])) };
export const options = [
  { value: "all", label: "Mọi thời điểm" },
  { value: "today", label: "Tạo hôm nay" },
  { value: "week", label: "Tạo tuần này" },
  { value: "month", label: "Tạo tháng này" },
];
export const visibleTaskLimit = 6;
export const selectClass = "h-10 w-full rounded-md border border-input bg-white px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50";
export const taskError = (error) => error.response?.data?.message || "Không thể lưu thay đổi. Vui lòng thử lại.";

export function localDateTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  const part = (n) => String(n).padStart(2, "0");
  return date.getFullYear() + "-" + part(date.getMonth() + 1) + "-" + part(date.getDate()) +
    "T" + part(date.getHours()) + ":" + part(date.getMinutes());
}
