import { CalendarClock, Pencil, Trash2 } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { priorities, statuses, selectClass } from "@/lib/data";
import { cn } from "@/lib/utils";

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, disabled, dragHandle, now, className }) {
  const priority = priorities.find(item => item.value === task.priority);
  const overdue = task.status !== "DONE" && task.dueDate && new Date(task.dueDate).getTime() < now;
  return (
    <Card data-testid={"task-" + task._id} className={cn("min-w-0 gap-3 rounded-xl border border-slate-200/70 bg-white p-3.5 shadow-xs", disabled && "opacity-70", className)}>
      <div className="flex items-start justify-between gap-2">
        <span className={cn("rounded-md px-2 py-0.5 text-xs font-medium", priority?.color)}>
          Ưu tiên {priority?.label.toLowerCase()}
        </span>
        {dragHandle}
      </div>
      <h3 className={cn("break-words text-sm font-semibold leading-5", task.status === "DONE" && "text-slate-500")}>{task.title}</h3>
      {task.description && <p className="line-clamp-2 whitespace-pre-wrap break-words text-xs leading-5 text-muted-foreground">{task.description}</p>}
      <p className={cn("flex items-start gap-2 text-xs", overdue ? "font-medium text-rose-700" : "text-muted-foreground")}>
        <CalendarClock className="mt-0.5 size-3.5 shrink-0" />
        {task.dueDate ? <span>{overdue ? "Quá hạn: " : "Hạn: "}<time dateTime={task.dueDate}>{new Date(task.dueDate).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</time></span> : "Chưa có hạn hoàn thành"}
      </p>
      {task.completedAt && <p className="text-xs text-emerald-700">Hoàn thành: {new Date(task.completedAt).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</p>}
      <div className="flex items-center gap-1 border-t border-slate-100 pt-2">
      <select className={cn(selectClass, "h-8 min-w-0 flex-1 cursor-pointer border-0 bg-slate-50 px-1.5 text-[11px] shadow-none")} value={task.status} disabled={disabled}
        aria-label={"Trạng thái của " + task.title} onChange={event => onStatusChange(task, event.target.value)}>
        {statuses.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
        <Button variant="ghost" size="icon-sm" title="Sửa công việc" onClick={() => onEdit(task)} disabled={disabled} aria-label={"Sửa " + task.title}><Pencil className="size-3.5" /></Button>
        <Button variant="ghost" size="icon-sm" title="Xóa công việc" className="text-rose-700" onClick={() => onDelete(task)} disabled={disabled} aria-label={"Xóa " + task.title}><Trash2 className="size-3.5" /></Button>
      </div>
    </Card>
  );
}
