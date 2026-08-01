import axios from "axios";
import { store } from "@/store";
import { updateToken, logout } from "@/store/slices/authSlice";
import { clearPermissions } from "@/store/slices/permissionSlice";

const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000/api";

const api = axios.create({
    baseURL: BASE_URL,
    withCredentials: true,   // send httpOnly refresh-token cookie
    headers: { "Content-Type": "application/json" },
});

// ── Attach access token to every request ──────────────────────────────────────
api.interceptors.request.use((config) => {
    const token = store.getState().auth?.token;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ── Silent token refresh on 401 ───────────────────────────────────────────────
let isRefreshing = false;
let failedQueue: Array<{
    resolve: (value: unknown) => void;
    reject: (reason?: unknown) => void;
}> = [];

const flushQueue = (error: unknown, token: string | null = null) => {
    failedQueue.forEach(({ resolve, reject }) =>
        error ? reject(error) : resolve(token)
    );
    failedQueue = [];
};

api.interceptors.response.use(
    (res) => res,
    async (error) => {
        const orig = error.config;

        if (
            error.response?.status === 401 &&
            !orig._retry &&
            !orig.url?.includes("/auth/login") &&
            !orig.url?.includes("/auth/refresh")
        ) {
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then((token) => {
                    orig.headers.Authorization = `Bearer ${token}`;
                    return api(orig);
                });
            }

            orig._retry = true;
            isRefreshing = true;

            try {
                const { data } = await api.post("/auth/refresh");
                const newToken: string = data.data.accessToken;

                // Update only the token in the auth slice
                store.dispatch(updateToken(newToken));

                flushQueue(null, newToken);
                orig.headers.Authorization = `Bearer ${newToken}`;
                return api(orig);
            } catch (refreshError) {
                flushQueue(refreshError, null);
                store.dispatch(logout());
                store.dispatch(clearPermissions());
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }

        return Promise.reject(error);
    }
);

export default api;
