import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { usePermissions } from "@/store/hooks";

interface PermissionRouteProps {
    resource: string;
    action: string;
    redirectTo?: string;
    children: ReactNode;
}

/**
 * Route guard that validates user holds required resource:action permission.
 * If user lacks permission, redirects to redirectTo (default: /dashboard) or AccessDenied.
 */
export default function PermissionRoute({
    resource,
    action,
    redirectTo = "/dashboard",
    children,
}: PermissionRouteProps) {
    const { can, isLoading } = usePermissions();

    if (isLoading) {
        return null; // Layout suspense or skeleton loader will display
    }

    if (!can(resource, action)) {
        return <Navigate to={redirectTo} replace />;
    }

    return <>{children}</>;
}
