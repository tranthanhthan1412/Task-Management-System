import { Search, X, RotateCcw, Filter } from "lucide-react";
import { statuses, priorities, FilterType, selectClass } from "@/lib/data";
import { cn } from "@/lib/utils";
import { Input } from "./ui/input";
import { Button } from "./ui/button";

export default function TaskFilters({
  searchQuery,
  setSearchQuery,
  priorityFilter,
  setPriorityFilter,
  statusFilter,
  setStatusFilter,
  showStatusFilter,
  totalMatching,
  totalTasks,
  loading,
  disabled,
  onReset,
}) {
  const hasActiveFilters = Boolean(searchQuery.trim() || priorityFilter !== "all" || (showStatusFilter && statusFilter !== "all"));

  return (
    <section className="space-y-2" aria-label="Tìm kiếm và lọc">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        {/* Ô tìm kiếm theo tiêu đề */}
        <div className="relative flex-1 min-w-0">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            aria-label="Tìm kiếm theo tiêu đề công việc"
            placeholder="Tìm kiếm theo tiêu đề công việc..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            disabled={disabled}
            className="h-10 pl-9 pr-8 bg-white text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              aria-label="Xóa từ khóa tìm kiếm"
              onClick={() => setSearchQuery("")}
              disabled={disabled}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <X className="size-3.5" />
            </button>
          )}
        </div>

        {/* Bộ lọc mức ưu tiên và trạng thái */}
        <div className="flex flex-wrap items-center gap-2 md:justify-end">
          {/* Lọc theo mức ưu tiên */}
          <div className="flex min-w-36 flex-1 items-center gap-1.5 md:flex-none">
            <span className="hidden text-xs font-medium text-slate-600 xl:inline">Ưu tiên:</span>
            <select
              aria-label="Lọc theo mức ưu tiên"
              value={priorityFilter}
              onChange={e => setPriorityFilter(e.target.value)}
              disabled={disabled}
              className={cn(selectClass, "h-10 min-w-0 cursor-pointer rounded-lg text-sm md:w-36")}
            >
              <option value="all">Tất cả ưu tiên</option>
              {priorities.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* Lọc theo trạng thái (khi có showStatusFilter hoặc khi cần) */}
          {showStatusFilter && (
            <div className="flex min-w-36 flex-1 items-center gap-1.5 md:flex-none">
              <span className="hidden text-xs font-medium text-slate-600 xl:inline">Trạng thái:</span>
              <select
                aria-label="Lọc theo trạng thái"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value)}
                disabled={disabled}
                className={cn(selectClass, "h-10 min-w-0 cursor-pointer rounded-lg text-sm md:w-40")}
              >
                <option value="all">Tất cả trạng thái</option>
                {statuses.map(s => (
                  <option key={s.value} value={s.value}>{s.label}</option>
                ))}
              </select>
            </div>
          )}

          {/* Nút đặt lại bộ lọc */}
          {hasActiveFilters && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onReset}
              disabled={disabled}
              className="h-10 gap-1 px-2 text-xs text-rose-600 hover:bg-rose-50 hover:text-rose-700"
            >
              <RotateCcw className="size-3.5" /> Đặt lại
            </Button>
          )}
        </div>
      </div>

      {/* Hiển thị tóm tắt kết quả lọc */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <Filter className="size-3.5 text-primary" />
          <span>
            {loading ? "Đang tải kết quả..." : hasActiveFilters ? (
              <>Hiển thị <strong className="text-slate-800">{totalMatching}</strong> / {totalTasks} công việc</>
            ) : (
              <>Tổng cộng <strong className="text-slate-800">{totalTasks}</strong> công việc</>
            )}
          </span>
        </div>

        {/* Chip filter nhanh cho trạng thái khi xem danh sách */}
        {showStatusFilter && (
          <div className="flex flex-wrap gap-1" aria-label="Bộ lọc nhanh trạng thái">
            {Object.entries(FilterType).map(([value, label]) => (
              <Button
                key={value}
                type="button"
                size="xs"
                variant={statusFilter === value ? "gradient" : "outline"}
                aria-pressed={statusFilter === value}
                disabled={disabled}
                onClick={() => setStatusFilter(value)}
                className="h-7 text-xs font-normal"
              >
                {label}
              </Button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
