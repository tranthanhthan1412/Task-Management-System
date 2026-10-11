import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "@/context/auth-context";
import { Button } from "./ui/button";

export default function ProtectedRoute() {
  const { user, loading, error } = useAuth();
  if (loading) return <p role="status" className="p-8 text-center">Đang kiểm tra phiên đăng nhập...</p>;
  if (error) return (
    <div className="space-y-4 p-8 text-center">
      <p role="alert">{error}</p>
      <Button onClick={() => window.location.reload()}>Thử lại</Button>
    </div>
  );
  return user ? <Outlet /> : <Navigate to="/login" replace />;
}
