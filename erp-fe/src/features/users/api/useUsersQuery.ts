import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User } from '@/types/erp';
import { queryKeys } from '@/lib/queryKeys';

export interface UsersQueryParams {
  page?: number;
  limit?: number;
  role?: string;
  search?: string;
}

export interface UsersResponse {
  users: User[];
  pagination: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

export const fetchUsers = async (params: UsersQueryParams): Promise<UsersResponse> => {
  const query = new URLSearchParams();
  if (params.page) query.set('page', String(params.page));
  if (params.limit) query.set('limit', String(params.limit));
  if (params.role) query.set('role', params.role);
  if (params.search) query.set('search', params.search);

  const { data } = await api.get(`/users?${query.toString()}`);
  return {
    users: data.data.users,
    pagination: data.data.pagination,
  };
};

export const useUsersQuery = (params: UsersQueryParams, enabled = true) => {
  return useQuery({
    queryKey: queryKeys.users.list(params),
    queryFn: () => fetchUsers(params),
    enabled,
    staleTime: 60 * 1000, // 1 minute
  });
};

export default useUsersQuery;
