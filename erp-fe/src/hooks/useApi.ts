import { useQuery, useMutation } from "@tanstack/react-query";
import type { UseQueryOptions, UseMutationOptions } from "@tanstack/react-query";
import api from "@/lib/api";
import type { AxiosRequestConfig, AxiosError } from "axios";

// ─── Standard Response Type ──────────────────────────────────────────────────
// Adjust this to match your backend's standard JSON response wrapper
export interface ApiResponse<T = any> {
  data: T;
  message?: string;
  status?: string;
}

// ─── GET Hook ─────────────────────────────────────────────────────────────────
export function useGet<TData = any, TError = AxiosError<ApiResponse>>(
  key: string[],
  url: string,
  config?: AxiosRequestConfig,
  options?: Omit<UseQueryOptions<TData, TError, TData, string[]>, "queryKey" | "queryFn">
) {
  return useQuery<TData, TError, TData, string[]>({
    queryKey: key,
    queryFn: async () => {
      const { data } = await api.get<ApiResponse<TData>>(url, config);
      // Depending on backend, might need to return `data` or `data.data`
      return (data.data !== undefined ? data.data : data) as TData;
    },
    ...options,
  });
}

// ─── POST Hook ────────────────────────────────────────────────────────────────
export function usePost<TData = any, TVariables = any, TError = AxiosError<ApiResponse>>(
  url: string,
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      const { data } = await api.post<ApiResponse<TData>>(url, variables);
      return (data.data !== undefined ? data.data : data) as TData;
    },
    ...options,
  });
}

// ─── PUT Hook ─────────────────────────────────────────────────────────────────
export function usePut<TData = any, TVariables = any, TError = AxiosError<ApiResponse>>(
  url: string,
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      // If passing ID in variables is required, you can interpolate here
      // But typically, url includes the ID (e.g. `/users/${id}`)
      const { data } = await api.put<ApiResponse<TData>>(url, variables);
      return (data.data !== undefined ? data.data : data) as TData;
    },
    ...options,
  });
}

// ─── DELETE Hook ──────────────────────────────────────────────────────────────
export function useDelete<TData = any, TVariables = any, TError = AxiosError<ApiResponse>>(
  url: string,
  options?: UseMutationOptions<TData, TError, TVariables>
) {
  return useMutation<TData, TError, TVariables>({
    mutationFn: async (variables) => {
      // url might be dynamic (e.g., passed as a variable or generated beforehand)
      // If deleting by ID dynamically: await api.delete(`${url}/${variables}`)
      const config = { data: variables }; // Axios delete supports body data via config.data
      const { data } = await api.delete<ApiResponse<TData>>(url, config);
      return (data.data !== undefined ? data.data : data) as TData;
    },
    ...options,
  });
}
