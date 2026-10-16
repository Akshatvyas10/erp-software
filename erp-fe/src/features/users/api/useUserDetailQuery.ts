import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { User } from '@/types/erp';
import { queryKeys } from '@/lib/queryKeys';

export const fetchUserById = async (id: string): Promise<User> => {
  const { data } = await api.get(`/users/${id}`);
  return data.data.user;
};

export const useUserDetailQuery = (id?: string, enabled = true) => {
  return useQuery({
    queryKey: id ? queryKeys.users.detail(id) : ['users', 'detail', 'null'],
    queryFn: () => fetchUserById(id!),
    enabled: Boolean(id && enabled),
    staleTime: 60 * 1000,
  });
};

export default useUserDetailQuery;
