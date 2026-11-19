import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { Loader2 } from "lucide-react";
import { buildLoginUrlWithReturn } from "@/lib/authRedirect";

export default function ProtectedRoute() {
  const { token, isInitializing } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // If silent refresh / session hydration is in progress, show loader instead of premature redirect
  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-xs font-medium text-muted-foreground animate-pulse">
            Authenticating session…
          </p>
        </div>
      </div>
    );
  }

  // If there's no token after initialization, redirect to login with encrypted return URL in query param
  if (!token) {
    const fullPath = `${location.pathname}${location.search}${location.hash}`;
    const loginUrl = buildLoginUrlWithReturn(fullPath);
    return <Navigate to={loginUrl} state={{ from: location }} replace />;
  }

  // If token exists, render child routes
  return <Outlet />;
}
