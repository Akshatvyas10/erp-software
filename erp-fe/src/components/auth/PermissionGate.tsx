import type { ReactNode } from "react";
import { usePermissions } from "@/store/hooks";

interface PermissionGateProps {
    /** resource:action e.g. "students:read" OR pass resource + action separately */
    permission?: string;
    resource?: string;
    action?: string;
    /** One or more roles — user must have ANY of them */
    role?: string | string[];
    /** Shown when check fails — defaults to null */
    fallback?: ReactNode;
    children: ReactNode;
}

/**
 * Conditionally renders children based on permissions/roles.
 *
 * Usage:
 *   <PermissionGate resource="students" action="create">
 *     <CreateButton />
 *   </PermissionGate>
 *
 *   <PermissionGate permission="roles:manage" fallback={<p>No access</p>}>
 *     <AdminPanel />
 *   </PermissionGate>
 *
 *   <PermissionGate role={["admin","super_admin"]}>
 *     <AdminNav />
 *   </PermissionGate>
 */
export default function PermissionGate({
    permission,
    resource,
    action,
    role,
    fallback = null,
    children,
}: PermissionGateProps) {
    const { can, hasRole } = usePermissions();

    // Role check
    if (role) {
        const roles = Array.isArray(role) ? role : [role];
        if (!hasRole(...roles)) return <>{fallback}</>;
    }

    // Permission check
    if (permission) {
        const [res, act] = permission.split(":");
        if (!can(res, act)) return <>{fallback}</>;
    } else if (resource && action) {
        if (!can(resource, action)) return <>{fallback}</>;
    }

    return <>{children}</>;
}
