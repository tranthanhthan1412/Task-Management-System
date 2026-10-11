import TaskEmptyState from "./TaskEmptyState";
import TaskCard from "./TaskCard";

export default function TaskList({ tasks, filter, ...actions }) {
  if (!tasks.length) return <TaskEmptyState filter={filter} />;
  return <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{tasks.map(task => <TaskCard key={task._id} task={task} {...actions} />)}</div>;
}
