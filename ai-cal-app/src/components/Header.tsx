import { authStore } from "@/store/AuthStore";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Header() {
  const logout = authStore.getState().logout;
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    toast.success("Logged out successfully");
    navigate("/login");
  };

  return (
    <header className="w-full bg-gradient-to-r from-blue-600 to-purple-600 shadow-lg">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Left side - Branding */}
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white tracking-tight">
              AI Calendar
            </h1>
          </div>

          {/* Right side - User info and Logout */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleLogout}
              className="bg-white text-blue-600 px-4 py-2 rounded-sm font-medium 
                hover:bg-gray-100 transition-colors duration-200 shadow-md
                active:scale-95 transform"
            >
              Logout
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
