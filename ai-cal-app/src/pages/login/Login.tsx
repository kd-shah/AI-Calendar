import { authStore } from "@/store/AuthStore";
import { useGoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const handleLogin = authStore.getState().handleLogin;

  const loginWithGoogle = useGoogleLogin({
    flow: "auth-code",
    scope: "openid email profile https://www.googleapis.com/auth/calendar.events",
    onSuccess: async (response) => {
      try {
        const res = await axios.post(
          `${import.meta.env.VITE_API_URL}/api/auth/sign-in`,
          { token: response.code }
        );

        toast.success("Login successful");
        handleLogin(res.data.jwtToken);
        navigate("/");
        
      } catch (err) {
        toast.error("Something went wrong. Please try again.");
      }
    },
    onError: () => {
      toast.error("Google Login failed");
    },
  });

  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <button
        className="w-[300px] bg-blue-600 text-white p-3 rounded-lg"
        onClick={() => loginWithGoogle()}
      >
        Sign in with Google
      </button>
    </div>
  );
}
