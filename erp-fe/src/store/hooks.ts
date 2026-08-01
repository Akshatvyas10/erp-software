import { useDispatch, useSelector } from "react-redux";
import type { TypedUseSelectorHook } from "react-redux";
import type { RootState, AppDispatch } from "./index";
import { useCallback } from "react";
import { logout as logoutAction } from "./slices/authSlice";
import { clearPermissions, permissionInitialState } from "./slices/permissionSlice";
import type { PermissionState, PermissionMap } from "./slices/permissionSlice";
import api from "@/lib/api";

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector;

// ─── Safe helper — guards against undefined slice during rehydration ──────────
const safePermState = (raw: PermissionState | undefined): PermissionState =>
    raw ?? permissionInitialState;

// ─── Auth hook ────────────────────────────────────────────────────────────────
export const useAuth = () => {
    const dispatch = useAppDispatch();
    const token = useAppSelector((s) => s.auth?.token ?? null);
    const user = useAppSelector((s) => s.auth?.user ?? null);
    const isAuthenticated = !!token;

    const logout = useCallback(async () => {
        try {
            if (token) await api.post("/auth/logout");
        } catch { /* still clear */ }
        finally {
            dispatch(logoutAction());
            dispatch(clearPermissions());
        }
    }, [dispatch, token]);

    return { user, token, isAuthenticated, logout };
};

// ─── Permission hook ──────────────────────────────────────────────────────────
export const usePermissions = () => {
    // Always call safePermState so we never crash on undefined
    const raw = useAppSelector((s) => s.permissions as PermissionState | undefined);
    const perm = safePermState(raw);
    const roles = perm.roles;
    const permissions = perm.permissions;
    const permMap = perm.permissionMap;
    const isLoading = perm.isLoading;

    const can = useCallback(
        (resource: string, action: string): boolean => {
            if (!roles || !permMap) return false;
            if (roles.includes("super_admin")) return true;
            if ((permMap["all"] ?? []).includes("manage")) return true;
            if ((permMap[resource] ?? []).includes("manage")) return true;
            return (permMap[resource] ?? []).includes(action);
        },
        [roles, permMap]
    );

    const hasRole = useCallback(
        (...requiredRoles: string[]): boolean => {
            if (!roles) return false;
            if (roles.includes("super_admin")) return true;
            return requiredRoles.some((r) => roles.includes(r));
        },
        [roles]
    );

    return {
        roles: roles as string[],
        permissions: permissions as string[],
        permissionMap: permMap as PermissionMap,
        isLoading,
        can,
        hasRole,
    };
};
