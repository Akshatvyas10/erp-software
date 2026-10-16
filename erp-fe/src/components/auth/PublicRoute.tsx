import { Navigate, Outlet } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { Loader2 } from "lucide-react";

export default function PublicRoute() {
  const { token, isInitializing } = useAppSelector((state) => state.auth);

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already logged in, prevent them from accessing public routes (like login)
  if (token) {
    return <Navigate to="/dashboard" replace />;
  }

  // Otherwise, render the public route
  return <Outlet />;
}
