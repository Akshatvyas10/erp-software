import { Navigate, Outlet, useSearchParams } from "react-router-dom";
import { useAppSelector } from "@/store/hooks";
import { Loader2 } from "lucide-react";
import { resolvePostLoginDestination } from "@/lib/authRedirect";

export default function PublicRoute() {
  const { token, user, isInitializing } = useAppSelector((state) => state.auth);
  const [searchParams] = useSearchParams();

  if (isInitializing) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // If user is already logged in, redirect them to their intended previous page or default dashboard
  if (token) {
    const destination = resolvePostLoginDestination(user, searchParams);
    return <Navigate to={destination} replace />;
  }

  // Otherwise, render the public route
  return <Outlet />;
}
