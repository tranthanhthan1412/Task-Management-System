import { useRef, useState } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/context/auth-context";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function AuthPage({ mode }) {
  const registration = mode === "register";
  const { user, loading, authenticate } = useAuth();
  const [values, setValues] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const navigate = useNavigate();
  const change = (event) => setValues({ ...values, [event.target.name]: event.target.value });

  const submit = async (event) => {
    event.preventDefault();
    if (submitting.current) return;
    if (new TextEncoder().encode(values.password).length > 72) {
      setError("Mật khẩu tối đa 72 byte."); return;
    }
    submitting.current = true;
    setPending(true);
    setError("");
    try {
      await authenticate(mode, registration ? values : { email: values.email, password: values.password });
      toast.success(registration ? "Đăng ký thành công" : "Đăng nhập thành công");
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || "Không thể kết nối server. Vui lòng thử lại.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  };

  if (loading) return <p role="status" className="p-8 text-center">Đang kiểm tra phiên đăng nhập...</p>;
  if (user) return <Navigate to="/" replace />;

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-b from-violet-50 to-white px-4 py-8">
      <Card className="w-full max-w-md space-y-6 p-6 shadow-custom-lg sm:p-8">
        <div className="space-y-2 text-center">
          <h1 className="text-3xl font-bold text-primary">TaskPilot</h1>
          <h2 className="text-xl font-semibold">{registration ? "Tạo tài khoản" : "Đăng nhập"}</h2>
          <p className="text-sm text-muted-foreground">Quản lý công việc cá nhân của bạn.</p>
        </div>
        <form onSubmit={submit} className="space-y-4">
          {registration && <div className="space-y-2">
            <label htmlFor="name">Họ tên</label>
            <Input id="name" name="name" autoComplete="name" required maxLength={100} value={values.name} onChange={change} disabled={pending} />
          </div>}
          <div className="space-y-2">
            <label htmlFor="email">Email</label>
            <Input id="email" name="email" type="email" autoComplete="email" required maxLength={254} value={values.email} onChange={change} disabled={pending} />
          </div>
          <div className="space-y-2">
            <label htmlFor="password">Mật khẩu</label>
            <Input id="password" name="password" type="password" autoComplete={registration ? "new-password" : "current-password"} required minLength={8} maxLength={72} value={values.password} onChange={change} disabled={pending} aria-describedby="password-hint" />
            <p id="password-hint" className="text-xs text-muted-foreground">Ít nhất 8 ký tự, tối đa 72 byte.</p>
          </div>
          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          <Button type="submit" variant="gradient" className="w-full" disabled={pending}>
            {pending ? "Đang xử lý..." : registration ? "Đăng ký" : "Đăng nhập"}
          </Button>
        </form>
        <p className="text-center text-sm">
          {registration ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
          <Link className="font-medium text-primary underline" to={registration ? "/login" : "/register"}>
            {registration ? "Đăng nhập" : "Đăng ký"}
          </Link>
        </p>
      </Card>
    </main>
  );
}
