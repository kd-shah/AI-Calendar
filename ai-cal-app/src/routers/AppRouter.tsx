import { GoogleOAuthProvider } from "@react-oauth/google";
import { BrowserRouter as Router, Route, Routes } from "react-router-dom";
import Login from "@/pages/login/Login";
import ProtectedRoute from "@/routes/ProtectedRoute";
import { Home } from "@/pages/home/Home";
import { AuthLayout } from "@/layouts/AuthLayout";

const AppRouter = () => {
  return (
    <Router>
      <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
        <Routes>
        <Route path="/" element={<AuthLayout />}>
            <Route path="/login" element={<Login />} />
            <Route element={<ProtectedRoute />}>
              <Route path="/" element={<Home />} />
            </Route>
        </Route>
        </Routes>
      </GoogleOAuthProvider>
    </Router>
  );
};

export default AppRouter;
