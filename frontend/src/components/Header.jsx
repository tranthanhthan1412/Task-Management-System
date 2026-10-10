import { useState } from "react";
import { CheckCheck, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { Button } from "./ui/button";

export default function Header() {
  const { user, logout } = useAuth();
  const [pending, setPending] = useState(false);
  const handleLogout = async () => {
    setPending(true);
    try { await logout(); toast.success("Đã đăng xuất"); }
    catch { toast.error("Không thể đăng xuất. Vui lòng thử lại."); }
    finally { setPending(false); }
  };
  return (
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-violet-100/80 px-4 py-3 sm:px-5 lg:px-6">
      <div className="flex items-center gap-2.5">
        <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-primary text-white"><CheckCheck className="size-5" /></span>
        <h1 className="text-lg font-bold tracking-tight text-primary">TaskPilot</h1>
      </div>
      <div className="flex min-w-0 max-w-full items-center gap-3">
        <span aria-hidden="true" className="hidden size-8 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-semibold text-primary sm:flex">{user?.name?.trim().slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0 text-left">
          <p className="truncate text-xs font-semibold leading-5">{user?.name}</p>
          <p className="break-all text-[11px] leading-4 text-muted-foreground">{user?.email}</p>
        </div>
        <Button className="h-9 px-2 text-xs" variant="ghost" onClick={handleLogout} disabled={pending}>
          <LogOut className="size-3.5" />
          {pending ? "Đang đăng xuất..." : "Đăng xuất"}
        </Button>
      </div>
    </header>
  );
}
