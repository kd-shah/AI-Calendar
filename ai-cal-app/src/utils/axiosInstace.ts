import axiosStatic from "axios";
import { authStore } from "@/store/AuthStore";

export const axiosInstance = axiosStatic.create({
  baseURL: import.meta.env.VITE_API_URL,
});

axiosInstance.interceptors.request.use(
  async (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("session");

      // Check if access token is not present or its expiry is not a number
      if (!token) {
        // If either condition is true, sign out the user
        const { logout } = authStore.getState();
        logout();

        // ✅ navigate safely (no hooks here)
        if (typeof window !== "undefined") {
          window.location.assign("/");
        }
      } else {
        config.headers.Authorization = `Bearer ${token}`;
        return config;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);
