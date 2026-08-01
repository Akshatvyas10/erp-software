import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";

export default function PublicRoute() {
  const token = useAppSelector((state) => state.auth.token);

  // If user is already logged in, prevent them from accessing public routes (like login)
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise, render the public route
  return <Outlet />;
}
