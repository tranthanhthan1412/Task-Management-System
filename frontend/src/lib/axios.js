import axios from "axios";
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || (import.meta.env.DEV ? "http://localhost:5001/api" : "/api"),
  withCredentials: true,
  headers: { "X-Requested-With": "XMLHttpRequest" },
});
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.startsWith("/auth/")) {
      window.dispatchEvent(new Event("taskpilot:unauthorized"));
    }
    return Promise.reject(error);
  },
);
export default api;
