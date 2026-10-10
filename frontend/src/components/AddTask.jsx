import { useState } from "react";
import { Card } from "./ui/card";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Plus } from "lucide-react";

export default function AddTask({ onCreate, onOpenDetails, disabled }) {
  const [title, setTitle] = useState("");
  const submit = async (event) => {
    event.preventDefault();
    if (disabled || !title.trim()) return;
    try { await onCreate({ title: title.trim() }); setTitle(""); }
    catch { /* The shared mutation handler displays feedback. */ }
  };
  return (
    <Card className="gap-0 rounded-xl border-0 bg-slate-50/80 p-2 shadow-none">
      <form onSubmit={submit} className="grid grid-cols-2 gap-2 sm:flex sm:items-center">
        <Input aria-label="Nội dung nhiệm vụ mới" placeholder="Bạn cần làm gì tiếp theo?" maxLength={200}
          value={title} onChange={event => setTitle(event.target.value)} disabled={disabled} className="col-span-2 h-10 min-w-0 rounded-lg text-sm sm:flex-1" />
        <Button type="submit" variant="gradient" className="h-10 rounded-lg px-3" disabled={disabled || !title.trim()}><Plus className="size-4" />Thêm</Button>
        <Button type="button" variant="outline" className="h-10 rounded-lg px-3" onClick={onOpenDetails} disabled={disabled}>Tạo chi tiết</Button>
      </form>
    </Card>
  );
}
