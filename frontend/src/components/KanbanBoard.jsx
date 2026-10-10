import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, KeyboardSensor, useSensor, useSensors,
  useDraggable, useDroppable, pointerWithin, closestCenter,
} from "@dnd-kit/core";
import { GripVertical } from "lucide-react";
import TaskCard from "./TaskCard";
import { statuses } from "@/lib/data";
import { cn } from "@/lib/utils";

class SmartPointerSensor extends PointerSensor {
  static activators = [
    {
      eventName: "onPointerDown",
      handler: ({ nativeEvent: event }) => {
        if (!event.isPrimary || event.button !== 0) {
          return false;
        }
        const target = event.target;
        if (target instanceof Element) {
          if (target.closest('[data-drag-handle="true"]')) {
            return true;
          }
          if (target.closest('button, select, option, input, textarea, a, [role="button"]')) {
            return false;
          }
        }
        return true;
      },
    },
  ];
}

function columnCoordinates(event, { context, currentCoordinates }) {
  const direction = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.code];
  if (!direction) return undefined;
  event.preventDefault();
  const current = context.over?.id || context.active?.data.current?.status;
  const index = statuses.findIndex(item => item.value === current);
  const next = statuses[Math.max(0, Math.min(statuses.length - 1, index + direction))];
  const rect = context.droppableRects.get(next.value);
  return rect ? { x: rect.left + rect.width / 2, y: rect.top + 90 } : currentCoordinates;
}
function collisionDetection(args) {
  return args.pointerCoordinates ? pointerWithin(args) : closestCenter(args);
}
function DraggableTask({ task, ...actions }) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, isDragging } = useDraggable({
    id: task._id, data: { status: task.status, title: task.title }, disabled: actions.disabled,
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      className={cn(
        "touch-none select-none rounded-xl transition-all cursor-grab active:cursor-grabbing",
        isDragging && "opacity-30"
      )}
    >
      <TaskCard
        task={task}
        {...actions}
        className="transition-colors hover:border-slate-300"
        dragHandle={
          <button
            ref={setActivatorNodeRef}
            type="button"
            {...attributes}
            data-drag-handle="true"
            aria-label={"Kéo " + task.title}
            disabled={actions.disabled}
            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-grab active:cursor-grabbing"
          >
            <GripVertical className="size-4" />
          </button>
        }
      />
    </div>
  );
}
function Column({ status, tasks, ...actions }) {
  const { setNodeRef, isOver } = useDroppable({ id: status.value, disabled: actions.disabled });
  return (
    <section ref={setNodeRef} data-testid={"column-" + status.value} aria-label={"Cột " + status.label}
      className={cn("min-h-56 min-w-0 rounded-2xl border-t-2 p-3 transition-colors", status.color, isOver && "ring-2 ring-primary ring-offset-2")}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-slate-700">{status.label}</h2>
        <span title="Tổng công việc trong cột" className="rounded-full bg-white px-2 py-0.5 text-xs font-semibold">{tasks.length}</span>
      </div>
      <div className="space-y-3">
        {tasks.map(task => <DraggableTask key={task._id} task={task} {...actions} />)}
        {!tasks.length && <p className="rounded-lg border border-dashed border-slate-300 px-3 py-6 text-center text-sm text-muted-foreground">Thả công việc vào đây</p>}
      </div>
    </section>
  );
}
export default function KanbanBoard({ tasks, ...actions }) {
  const [activeTask, setActiveTask] = useState(null);
  const sensors = useSensors(
    useSensor(SmartPointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: columnCoordinates }),
  );
  const endDrag = ({ active, over }) => {
    setActiveTask(null);
    const task = tasks.find(item => item._id === active.id);
    if (task && over && statuses.some(item => item.value === over.id) && task.status !== over.id) {
      actions.onStatusChange(task, over.id);
    }
  };
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Kéo thả thẻ bất kỳ để chuyển cột, hoặc chọn trạng thái trên thẻ.</p>
      <DndContext sensors={sensors} collisionDetection={collisionDetection}
        onDragStart={({ active }) => setActiveTask(tasks.find(task => task._id === active.id))}
        onDragEnd={endDrag} onDragCancel={() => setActiveTask(null)}
        accessibility={{
          screenReaderInstructions: { draggable: "Nhấn Space để nhấc công việc. Dùng phím mũi tên để chọn cột, Space để thả, Escape để hủy." },
          announcements: {
            onDragStart: ({ active }) => "Đã nhấc " + active.data.current?.title,
            onDragOver: ({ over }) => over ? "Cột " + statuses.find(item => item.value === over.id)?.label : "Ngoài bảng",
            onDragEnd: ({ over }) => over ? "Đã thả. Đang lưu trạng thái." : "Đã hủy di chuyển.",
            onDragCancel: () => "Đã hủy di chuyển.",
          },
        }}>
        <div className="grid items-start gap-3 md:grid-cols-3">
          {statuses.map(status => <Column key={status.value} status={status} tasks={tasks.filter(task => task.status === status.value)} {...actions} />)}
        </div>
        <DragOverlay dropAnimation={null}>
          {activeTask && (
            <div className="max-w-sm cursor-grabbing rounded-xl border border-violet-200 bg-white p-3 text-sm font-semibold text-slate-700 shadow-sm rotate-1">
              {activeTask.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
}
