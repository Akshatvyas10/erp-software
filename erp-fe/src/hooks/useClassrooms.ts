import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import type { Classroom } from '@/types/erp';

export function useClassrooms() {
    return useQuery({
        queryKey: ['classrooms'],
        queryFn: async (): Promise<Classroom[]> => {
            const { data } = await api.get('/classrooms?status=ACTIVE');
            return data.data.classrooms as Classroom[];
        }
    });
}
