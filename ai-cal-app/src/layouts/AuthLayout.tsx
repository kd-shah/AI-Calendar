import type { DecodedToken } from "@/lib/types";
import { jwtDecode } from "jwt-decode";
import { authStore } from "@/store/AuthStore";
import { Outlet } from "react-router-dom";
import { Toaster } from "sonner";

export const AuthLayout = () => {
  const { setUser, user } = authStore();

  if (!user) {
    const token = localStorage.getItem("session");
    if (token) {
      const decodedToken: DecodedToken = jwtDecode(token);
      setUser({
        id: decodedToken.id,
        name: decodedToken.name,
        email: decodedToken.email,
        accessToken: token,
      });
    }
  }
  return (
    <div className="flex flex-col min-h-screen">
      <Toaster
        richColors
        theme="dark"
      />
      <Outlet />
    </div>
  );
};
