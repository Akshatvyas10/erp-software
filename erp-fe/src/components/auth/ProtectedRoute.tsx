import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

export default function ProtectedRoute() {
  const token = useAppSelector((state) => state.auth.token);
  const location = useLocation();

  // If there's no token, redirect to login and preserve the intended destination
  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If token exists, render the child routes
  return <Outlet />;
}
