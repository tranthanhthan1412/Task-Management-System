import { useState } from "react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { statuses, priorities, selectClass, localDateTime, taskError } from "@/lib/data";

export default function TaskForm({ task, onSubmit, onCancel, pending }) {
  const [values, setValues] = useState(() => ({
    title: task?.title || "", description: task?.description || "",
    status: task?.status || "TODO", priority: task?.priority || "MEDIUM",
    dueDate: localDateTime(task?.dueDate),
  }));
  const [error, setError] = useState("");
  const change = (event) => setValues({ ...values, [event.target.name]: event.target.value });
  const submit = async (event) => {
    event.preventDefault();
    if (pending) return;
    if (!values.title.trim()) { setError("Tiêu đề không được để trống."); return; }
    setError("");
    try {
      const date = values.dueDate ? new Date(values.dueDate) : null;
      if (date && !Number.isFinite(date.getTime())) { setError("Hạn hoàn thành không hợp lệ."); return; }
      // Avoid changing seconds on an existing deadline unless the user edits it.
      const dueDate = values.dueDate === localDateTime(task?.dueDate)
        ? task?.dueDate || null : date?.toISOString() || null;
      await onSubmit({ ...values, title: values.title.trim(), dueDate });
    } catch (err) { setError(taskError(err)); }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2">
        <label htmlFor="task-title" className="text-sm font-medium">Tiêu đề</label>
        <Input id="task-title" name="title" required maxLength={200} value={values.title} onChange={change} disabled={pending} autoFocus />
      </div>
      <div className="space-y-2">
        <label htmlFor="task-description" className="text-sm font-medium">Mô tả</label>
        <textarea id="task-description" name="description" rows={3} maxLength={5000} value={values.description} onChange={change} disabled={pending}
          className="w-full resize-y rounded-md border border-input bg-white p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label htmlFor="task-status" className="text-sm font-medium">Trạng thái</label>
          <select id="task-status" name="status" value={values.status} onChange={change} disabled={pending} className={selectClass}>
            {statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label htmlFor="task-priority" className="text-sm font-medium">Độ ưu tiên</label>
          <select id="task-priority" name="priority" value={values.priority} onChange={change} disabled={pending} className={selectClass}>
            {priorities.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
          </select>
        </div>
      </div>
      <div className="space-y-2">
        <label htmlFor="task-dueDate" className="text-sm font-medium">Hạn hoàn thành</label>
        <Input id="task-dueDate" name="dueDate" type="datetime-local" value={values.dueDate} onChange={change} disabled={pending} aria-describedby="deadline-help" />
        <p id="deadline-help" className="text-xs text-muted-foreground">Theo giờ trên thiết bị của bạn. Để trống nếu chưa có hạn.</p>
      </div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={pending}>Hủy</Button>
        <Button type="submit" variant="gradient" disabled={pending}>{pending ? "Đang lưu..." : task ? "Lưu thay đổi" : "Tạo công việc"}</Button>
      </div>
    </form>
  );
}
