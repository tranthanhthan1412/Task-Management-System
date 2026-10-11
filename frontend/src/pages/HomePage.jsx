import { useState } from "react";
import { LayoutGrid, List } from "lucide-react";
import AddTask from "@/components/AddTask";
import DateTimeFilter from "@/components/DateTimeFilter";
import Footer from "@/components/Footer";
import StatsAndFilters from "@/components/StatsAndFilters";
import UpcomingTasks from "@/components/UpcomingTasks";
import TaskFilters from "@/components/TaskFilters";
import TaskListPagination from "@/components/TaskListPagination";
import TaskList from "@/components/TaskList";
import KanbanBoard from "@/components/KanbanBoard";
import TaskForm from "@/components/TaskForm";
import Header from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import useTasks from "@/hooks/useTasks";

export default function HomePage() {
  const [view, setView] = useState("kanban");
  const [filter, setFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("all");
  const [dateQuery, setDateQuery] = useState("all");
  const [page, setPage] = useState(1);
  const [editor, setEditor] = useState(null);
  const [deleting, setDeleting] = useState(null);
  const {
    tasks, counts, summary, totalPages, currentPage, totalMatching,
    isLoading, summaryLoading, disabled, pending, now, error, refresh,
    createTask: saveNewTask, updateTask, deleteTask: removeTask,
  } = useTasks({ view, filter, searchQuery, priorityFilter, dateQuery, page });

  const resetFilters = () => {
    setSearchQuery("");
    setPriorityFilter("all");
    setFilter("all");
    setPage(1);
  };

  const createTask = async (values) => {
    const task = await saveNewTask(values);
    setPage(1);
    return task;
  };
  const deleteTask = async () => {
    await removeTask(deleting);
    setDeleting(null);
  };
  const actions = {
    disabled, now,
    onEdit: task => setEditor({ task }),
    onDelete: task => setDeleting(task),
    onStatusChange: (task, status) => { if (task.status !== status) updateTask(task, { status }).catch(() => { }); },
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-violet-50 via-slate-50 to-violet-100 p-2 text-sm sm:p-4 lg:p-6">
      <div className="workspace-shell mx-auto max-w-[1600px] overflow-hidden rounded-2xl border border-white/80 bg-white/70 shadow-sm">
        <Header />
        <div className="workspace-layout">
          <aside className="workspace-sidebar" aria-label="Tổng quan công việc">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">Không gian cá nhân</p>
            <div className="mb-5 flex items-center gap-2 rounded-lg bg-violet-100/70 px-3 py-2.5 font-medium text-primary">
              <LayoutGrid className="size-4" /> Công việc của tôi
            </div>
            {summaryLoading ? <p role="status" className="text-xs text-muted-foreground">Đang tải tổng quan...</p>
              : summary?.error ? <div className="space-y-2">
                <p role="alert" className="text-xs text-destructive">{summary.error}</p>
                <Button variant="outline" onClick={refresh}>Thử lại tổng quan</Button>
              </div> : <>
                <StatsAndFilters counts={counts} />
                <UpcomingTasks {...summary} onEdit={task => setEditor({ task })} disabled={disabled} now={now} />
              </>}
          </aside>
          <section className="workspace-content min-w-0 space-y-4 bg-white p-4 sm:p-5 lg:p-6" aria-label="Quản lý công việc">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-slate-800">Công việc của tôi</h2>
              <p className="mt-1 text-xs text-muted-foreground">Sắp xếp công việc, theo dõi tiến độ mỗi ngày.</p>
            </div>
            <AddTask onCreate={createTask} onOpenDetails={() => setEditor({ task: null })} disabled={disabled || Boolean(error)} />
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex gap-1" aria-label="Chế độ hiển thị">
                <Button className="h-9 gap-1.5 px-3" variant={view === "kanban" ? "gradient" : "outline"} onClick={() => { setView("kanban"); setPage(1); }} aria-pressed={view === "kanban"} disabled={pending}><LayoutGrid className="size-4" />Kanban</Button>
                <Button className="h-9 gap-1.5 px-3" variant={view === "list" ? "gradient" : "outline"} onClick={() => { setView("list"); setPage(1); }} aria-pressed={view === "list"} disabled={pending}><List className="size-4" />Danh sách</Button>
              </div>
              <DateTimeFilter dateQuery={dateQuery} setDateQuery={value => { setDateQuery(value); setPage(1); }} disabled={pending} />
            </div>
            <TaskFilters
              searchQuery={searchQuery}
              setSearchQuery={val => { setSearchQuery(val); setPage(1); }}
              priorityFilter={priorityFilter}
              setPriorityFilter={val => { setPriorityFilter(val); setPage(1); }}
              statusFilter={filter}
              setStatusFilter={val => { setFilter(val); setPage(1); }}
              showStatusFilter={view === "list"}
              totalMatching={totalMatching}
              totalTasks={counts.total}
              loading={isLoading || summaryLoading}
              disabled={pending}
              onReset={resetFilters}
            />
            {pending && <p role="status" className="text-sm text-primary">Đang lưu thay đổi...</p>}
            {isLoading ? <p role="status" className="py-6 text-center text-muted-foreground">Đang tải công việc...</p>
              : error ? <div className="space-y-3 rounded-xl bg-white p-4 text-center">
                <p role="alert" className="text-destructive">{error}</p>
                <Button variant="outline" onClick={refresh}>Thử lại</Button>
              </div>
                : view === "kanban" ? <KanbanBoard tasks={tasks} {...actions} />
                  : <TaskList tasks={tasks} filter={filter} {...actions} />}
            {view === "list" && !isLoading && !error && <TaskListPagination totalPages={totalPages} page={currentPage}
              disabled={pending} handlePageChange={setPage} handleNext={() => setPage(Math.min(currentPage + 1, totalPages))}
              handlePrev={() => setPage(Math.max(currentPage - 1, 1))} />}
            {!summaryLoading && !summary?.error && <Footer counts={counts} />}
          </section>
        </div>
      </div>

      <Dialog open={Boolean(editor)} onOpenChange={open => { if (!open && !pending) setEditor(null); }}>
        <DialogContent className="max-h-[90dvh] overflow-y-auto" showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>{editor?.task ? "Sửa công việc" : "Tạo công việc mới"}</DialogTitle>
            <DialogDescription>Ghi lại nội dung, mức ưu tiên và thời hạn của công việc.</DialogDescription>
          </DialogHeader>
          {editor && <TaskForm key={editor.task?._id || "new"} task={editor.task} pending={pending}
            onCancel={() => setEditor(null)}
            onSubmit={async values => { if (editor.task) await updateTask(editor.task, values); else await createTask(values); setEditor(null); }} />}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(deleting)} onOpenChange={open => { if (!open && !pending) setDeleting(null); }}>
        <DialogContent showCloseButton={!pending}>
          <DialogHeader>
            <DialogTitle>Xóa công việc?</DialogTitle>
            <DialogDescription className="break-words">Công việc “{deleting?.title}” sẽ bị xóa. Thao tác này không thể hoàn tác.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setDeleting(null)} disabled={pending}>Hủy</Button>
            <Button variant="destructive" onClick={() => deleteTask().catch(() => { })} disabled={pending}>{pending ? "Đang xóa..." : "Xác nhận xóa"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
