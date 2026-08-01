import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAppDispatch } from "@/store/hooks";
import {
    setPermissions,
    setPermissionsLoading,
    clearPermissions,
} from "@/store/slices/permissionSlice";
import api from "@/lib/api";
import { decryptPayload } from "@/lib/payloadCrypto";
import { useAuth } from "@/store/hooks";

interface DecryptedPermissionPayload {
    sub: string;
    roles: string[];
    permissions: string[];
    permissionMap: Record<string, string[]>;
    cachedAt: string;
}

/**
 * Fetches GET /api/permissions/my → receives AES-encrypted blob
 * → decrypts client-side → stores in Redux permissionSlice.
 *
 * Flow:
 *   1. Server builds { roles, permissions, permissionMap, cachedAt, sub }
 *   2. Server AES-encrypts with PERMISSION_ENCRYPT_KEY
 *   3. Frontend receives { encrypted: "<base64>" }
 *   4. Frontend decrypts with VITE_PERMISSION_ENCRYPT_KEY
 *   5. Stores decrypted data in Redux (never persisted to localStorage)
 */
export const useMyPermissions = () => {
    const dispatch = useAppDispatch();
    const { isAuthenticated } = useAuth();

    const query = useQuery<DecryptedPermissionPayload>({
        queryKey: ["permissions", "my"],
        queryFn: async () => {
            const { data } = await api.get("/permissions/my");
            // data.data.encrypted is the AES ciphertext from the backend
            const decrypted = decryptPayload<DecryptedPermissionPayload>(
                data.data.encrypted
            );
            return decrypted;
        },
        enabled: isAuthenticated,
        staleTime: 14 * 60 * 1000,
        gcTime: 15 * 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (query.isLoading && isAuthenticated) {
            dispatch(setPermissionsLoading());
        }
    }, [query.isLoading, isAuthenticated, dispatch]);

    useEffect(() => {
        if (query.data) {
            dispatch(
                setPermissions({
                    roles: query.data.roles,
                    permissions: query.data.permissions,
                    permissionMap: query.data.permissionMap,
                    cachedAt: query.data.cachedAt ?? new Date().toISOString(),
                })
            );
        }
    }, [query.data, dispatch]);

    useEffect(() => {
        if (!isAuthenticated) {
            dispatch(clearPermissions());
        }
    }, [isAuthenticated, dispatch]);

    return query;
};
