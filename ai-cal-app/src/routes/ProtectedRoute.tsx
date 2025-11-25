import { Navigate, Outlet } from 'react-router-dom';
import { authStore } from '@/store/AuthStore';


const ProtectedRoute = () => {
  const { user } = authStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;
