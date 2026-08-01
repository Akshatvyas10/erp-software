import { createSlice } from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

export interface PermissionMap {
    [resource: string]: string[];
}

export interface PermissionState {
    roles: string[];
    permissions: string[];
    permissionMap: PermissionMap;
    cachedAt: string | null;
    isLoading: boolean;
}

// Always have a valid initial state — protects against undefined during rehydration
export const permissionInitialState: PermissionState = {
    roles: [],
    permissions: [],
    permissionMap: {},
    cachedAt: null,
    isLoading: false,
};

const permissionSlice = createSlice({
    name: "permissions",
    initialState: permissionInitialState,
    reducers: {
        setPermissions: (state, action: PayloadAction<{
            roles: string[];
            permissions: string[];
            permissionMap: PermissionMap;
            cachedAt: string;
        }>) => {
            state.roles = action.payload.roles ?? [];
            state.permissions = action.payload.permissions ?? [];
            state.permissionMap = action.payload.permissionMap ?? {};
            state.cachedAt = action.payload.cachedAt;
            state.isLoading = false;
        },
        setPermissionsLoading: (state) => {
            state.isLoading = true;
        },
        clearPermissions: (_state) => permissionInitialState,
    },
});

export const { setPermissions, setPermissionsLoading, clearPermissions } =
    permissionSlice.actions;

// ─── Safe selectors — always guard against undefined ─────────────────────────
type PermState = { permissions: PermissionState | undefined };

const safeRoles = (state: PermState): string[] =>
    state.permissions?.roles ?? [];

const safeMap = (state: PermState): PermissionMap =>
    state.permissions?.permissionMap ?? {};

export const selectCan =
    (resource: string, action: string) =>
        (state: PermState): boolean => {
            const roles = safeRoles(state);
            const map = safeMap(state);
            if (roles.includes("super_admin")) return true;
            if (map["all"]?.includes("manage")) return true;
            if (map[resource]?.includes("manage")) return true;
            return map[resource]?.includes(action) ?? false;
        };

export const selectHasRole =
    (...rolesToCheck: string[]) =>
        (state: PermState): boolean => {
            const roles = safeRoles(state);
            if (roles.includes("super_admin")) return true;
            return rolesToCheck.some((r) => roles.includes(r));
        };

export default permissionSlice.reducer;
