import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import api from "@/lib/axios";
import { taskError, visibleTaskLimit } from "@/lib/data";

export default function useTasks({ view, filter, searchQuery, priorityFilter, dateQuery, page }) {
  const [revision, setRevision] = useState(0);
  const [result, setResult] = useState(null);
  const [summary, setSummary] = useState(null);
  const [pending, setPending] = useState(false);
  const lock = useRef(false);
  const [now, setNow] = useState(() => Date.now());
  const queryKey = JSON.stringify({ dateQuery, search: searchQuery.trim(), priorityFilter, status: view === "list" ? filter : "all", view, page: view === "list" ? page : 1, revision });
  const isLoading = result?.queryKey !== queryKey;
  const disabled = pending || isLoading;
  const tasks = result?.tasks ?? [];
  const summaryLoading = summary?.dateQuery !== dateQuery || summary?.revision !== revision;
  const counts = summary?.counts ?? { total: 0, TODO: 0, IN_PROGRESS: 0, DONE: 0 };
  const totalPages = result?.pagination?.totalPages ?? 1;
  const currentPage = result?.pagination?.page ?? 1;

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    const query = JSON.parse(queryKey);
    api.get("/tasks", { params: {
      filter: query.dateQuery, search: query.search || undefined,
      priority: query.priorityFilter === "all" ? undefined : query.priorityFilter,
      status: query.status === "all" ? undefined : query.status,
      view: query.view,
      ...(query.view === "list" ? { page: query.page, limit: visibleTaskLimit } : {}),
    }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult({ ...data, queryKey, error: null });
      })
      .catch(error => {
        if (controller.signal.aborted) return;
        setResult({ tasks: [], queryKey, error: taskError(error) });
      });
    return () => controller.abort();
  }, [queryKey]);

  useEffect(() => {
    const controller = new AbortController();
    api.get("/tasks/summary", { params: { filter: dateQuery }, signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setSummary({ ...data, dateQuery, revision, error: null });
      })
      .catch(error => {
        if (!controller.signal.aborted) setSummary({ dateQuery, revision, error: taskError(error) });
      });
    return () => controller.abort();
  }, [dateQuery, revision, now]);

  const changeTasks = (transform) => setResult(previous => previous ? { ...previous, tasks: transform(previous.tasks) } : previous);
  const mutate = async (operation) => {
    if (lock.current) throw new Error("Đang lưu thay đổi");
    lock.current = true;
    setPending(true);
    try {
      const data = await operation();
      setRevision(value => value + 1);
      return data;
    }
    catch (error) { toast.error(taskError(error)); throw error; }
    finally { lock.current = false; setPending(false); }
  };
  const createTask = (values) => mutate(async () => {
    const { data } = await api.post("/tasks", values);
    toast.success("Đã tạo công việc.");
    return data;
  });
  const updateTask = (task, values) => mutate(async () => {
    const optimistic = { ...task, ...values };
    if (values.status !== undefined) {
      optimistic.completedAt = values.status === "DONE" ? task.completedAt || new Date().toISOString() : null;
    }
    changeTasks(items => items.map(item => item._id === task._id ? optimistic : item));
    try {
      const { data } = await api.patch("/tasks/" + task._id, values);
      changeTasks(items => items.map(item => item._id === task._id ? data : item));
      toast.success("Đã cập nhật công việc.");
      return data;
    } catch (error) {
      changeTasks(items => items.map(item => item._id === task._id ? task : item));
      throw error;
    }
  });
  const deleteTask = (task) => mutate(async () => {
    await api.delete("/tasks/" + task._id);
    changeTasks(items => items.filter(item => item._id !== task._id));
    toast.success("Đã xóa công việc.");
  });
  return {
    tasks, counts, summary, totalPages, currentPage,
    isLoading, summaryLoading, disabled, pending, now,
    error: result?.error,
    totalMatching: result?.counts?.total ?? 0,
    createTask, updateTask, deleteTask,
    refresh: () => setRevision(value => value + 1),
  };
}
