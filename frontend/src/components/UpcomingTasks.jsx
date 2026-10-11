import { CalendarClock, AlertCircle, Clock, ChevronRight, CheckCircle2 } from "lucide-react";
import { priorities, statuses } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Button } from "./ui/button";

function DeadlineGroup({ tasks, count, overdue = false, onEdit, disabled, now }) {
  const title = overdue ? "Công việc quá hạn" : "Công việc sắp đến hạn";

  return (
    <section className="mt-6 border-t border-violet-100/80 pt-4" aria-label={title}>
      <div className="flex flex-wrap items-center justify-between gap-2 pb-2">
        <div className="flex min-w-0 items-center gap-2">
          <div className="text-primary">
            {overdue ? <AlertCircle className="size-4 text-rose-600" /> : <CalendarClock className="size-4" />}
          </div>
          <div>
            <h3 className="text-xs font-semibold text-slate-800">{title}</h3>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
            {count} công việc
          </span>
        </div>
      </div>

      {tasks.length === 0 ? (
        <div className="flex min-h-16 items-center justify-center gap-2 py-2">
          <CheckCircle2 className="size-6 shrink-0 text-emerald-500" />
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-700">{overdue ? "Không có công việc nào quá hạn" : "Không có công việc nào sắp đến hạn"}</p>
          </div>
        </div>
      ) : (
        <div className="mt-1 divide-y divide-slate-100">
          {tasks.map(task => {
            const dueTime = new Date(task.dueDate).getTime();
            const isOverdue = dueTime < now;
            const isWithin24Hours = !isOverdue && dueTime - now <= 24 * 60 * 60 * 1000;
            const priority = priorities.find(p => p.value === task.priority);
            const status = statuses.find(s => s.value === task.status);

            return (
              <div
                key={task._id}
                className="group relative flex items-start justify-between gap-1 rounded-lg py-3 transition-colors"
              >
                <div className="grid min-w-0 flex-1 gap-y-1.5">
                  <div className="flex flex-wrap items-center gap-1">
                    <span className={cn(
                      "inline-flex items-center gap-1 rounded px-2 py-0.5 text-[11px] font-medium",
                      isOverdue
                        ? "bg-rose-100 text-rose-800"
                        : isWithin24Hours
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                    )}>
                      <Clock className="size-3" />
                      {isOverdue ? "Quá hạn" : isWithin24Hours ? "Trong 24 giờ" : "Sắp tới"}
                    </span>
                    <span className={cn("rounded px-2 py-0.5 text-[11px] font-medium", priority?.color)}>
                      {priority?.label}
                    </span>
                    <span className="text-xs text-slate-500">
                      • {status?.label}
                    </span>
                  </div>
                  <h4 title={task.title} className="row-start-1 truncate text-xs font-semibold text-slate-800 group-hover:text-primary">
                    {task.title}
                  </h4>
                  <p className={cn("text-[11px]", isOverdue ? "font-medium text-rose-600" : "text-muted-foreground")}>
                    Hạn: <time dateTime={task.dueDate}>{new Date(task.dueDate).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" })}</time>
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  onClick={() => onEdit(task)}
                  aria-label={"Xem chi tiết " + task.title}
                  title="Xem chi tiết"
                  className="size-7 shrink-0 p-0 text-primary hover:bg-violet-50 hover:text-primary"
                >
                  <ChevronRight className="size-3.5" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
      {count > tasks.length && <p className="mt-1 text-[11px] text-muted-foreground">Hiển thị {tasks.length}/{count} công việc có hạn sớm nhất.</p>}
    </section>
  );
}

export default function UpcomingTasks({ upcoming = [], overdue = [], upcomingCount = 0, overdueCount = 0, ...actions }) {
  return <>
    <DeadlineGroup tasks={upcoming} count={upcomingCount} {...actions} />
    <DeadlineGroup tasks={overdue} count={overdueCount} overdue {...actions} />
  </>;
}
