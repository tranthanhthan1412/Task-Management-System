import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { AuthContext } from "./auth-context";

export default function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    api.get("/auth/me", { signal: controller.signal })
      .then(({ data }) => { if (!controller.signal.aborted) setUser(data.user); })
      .catch((err) => {
        if (!controller.signal.aborted && err.response?.status !== 401) {
          setError("Không thể kiểm tra phiên đăng nhập. Vui lòng tải lại trang.");
        }
      })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    const clearUser = () => setUser(null);
    window.addEventListener("taskpilot:unauthorized", clearUser);
    return () => {
      controller.abort();
      window.removeEventListener("taskpilot:unauthorized", clearUser);
    };
  }, []);

  const authenticate = async (mode, values) => {
    const { data } = await api.post("/auth/" + mode, values);
    setUser(data.user);
    setError(null);
  };
  const logout = async () => {
    await api.post("/auth/logout");
    setUser(null);
  };

  return <AuthContext.Provider value={{ user, loading, error, authenticate, logout }}>{children}</AuthContext.Provider>;
}
