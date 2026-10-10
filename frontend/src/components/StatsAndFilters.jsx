import { CheckCircle2, CircleDot, Clock, LayoutList } from "lucide-react";
import { cn } from "@/lib/utils";

const statConfigs = [
  { value: "total", label: "Tổng công việc", icon: LayoutList, color: "text-violet-600 bg-violet-100" },
  { value: "TODO", label: "Chưa bắt đầu", icon: CircleDot, color: "text-slate-600 bg-slate-100" },
  { value: "IN_PROGRESS", label: "Đang thực hiện", icon: Clock, color: "text-amber-600 bg-amber-100" },
  { value: "DONE", label: "Hoàn thành", icon: CheckCircle2, color: "text-emerald-600 bg-emerald-100" },
];

export default function StatsAndFilters({ counts }) {
  const total = counts.total || 0;
  const done = counts.DONE || 0;
  const percentDone = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <section className="space-y-4" aria-label="Thống kê công việc">
      <h3 className="text-xs font-semibold text-muted-foreground">Tổng quan</h3>
      <div className="grid grid-cols-2 gap-1 lg:grid-cols-1">
        {statConfigs.map(item => {
          const Icon = item.icon;
          return (
            <div key={item.value} className="flex items-center gap-2 rounded-lg px-1 py-2">
                <div className={cn("flex size-7 shrink-0 items-center justify-center rounded-lg", item.color)}>
                  <Icon className="size-3.5" />
                </div>
                <p className="min-w-0 flex-1 text-xs text-muted-foreground">{item.label}</p>
              <p className="text-sm font-semibold tabular-nums text-slate-800">{counts[item.value] ?? 0}</p>
            </div>
          );
        })}
      </div>

      {/* Thanh tiến độ hoàn thành công việc */}
      {total > 0 && (
        <div className="rounded-xl border border-violet-100/70 bg-white/60 p-3">
          <div className="mb-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs font-medium">
            <span className="text-slate-600">Tiến độ hoàn thành</span>
            <span className="text-emerald-700 font-semibold">{percentDone}% ({done}/{total} task)</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
            <div
              className="h-full rounded-full bg-gradient-to-r from-violet-500 to-emerald-500 transition-all duration-500"
              style={{ width: `${percentDone}%` }}
              role="progressbar"
              aria-label="Tiến độ hoàn thành"
              aria-valuenow={percentDone}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}
    </section>
  );
}
