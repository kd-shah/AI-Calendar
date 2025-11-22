import { authStore } from "@/store/AuthStore";
import { GoogleLogin } from "@react-oauth/google";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function Login() {
  const navigate = useNavigate();
  const { handleLogin } = authStore();
  const handleSignIn = async (token: string) => {
    try {
      console.log(token);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/api/auth/sign-in`,
        { token: token }
      );
      if (response.status === 200) {
        toast.success("Login successful");
        handleLogin(response.data.jwtToken);
        navigate("/");
      }
    } catch (error) {
      toast.error("Something went wrong. Please try again.");
    }
  };

  const handleFoogleLoginFailure = () => {
    toast.error("Something went wrong. Please try again.");
  };

  return (
    <div className="w-screen h-screen flex items-center justify-center">
      <GoogleLogin
        width="300"
        onSuccess={(res) => {
          if (!res.credential) {
            handleFoogleLoginFailure();
            return;
          }
          handleSignIn(res.credential);
        }}
        onError={handleFoogleLoginFailure}
      />
    </div>
  );
};

