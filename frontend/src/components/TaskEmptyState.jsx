import { Card } from "./ui/card";
export default function TaskEmptyState({ filter }) {
  return (
    <Card className="gap-2 rounded-xl border-dashed p-4 text-center">
      <h3 className="font-medium">Chưa có công việc phù hợp.</h3>
      <p className="text-sm text-muted-foreground">{filter === "all" ? "Tạo công việc đầu tiên để bắt đầu." : "Thử chọn trạng thái hoặc khoảng thời gian khác."}</p>
    </Card>
  );
}
