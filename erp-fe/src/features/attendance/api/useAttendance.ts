import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api'; // Adjust the import path for your axios instance

export interface Classroom {
    id: string;
    name: string;
    section: string;
}

export interface StudentAttendance {
    id: string;
    studentId: string;
    status: 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';
    remarks?: string;
}

export const useMyClassrooms = () => {
    return useQuery({
        queryKey: ['attendance', 'my-classrooms'],
        queryFn: async () => {
            const { data } = await api.get('/student-attendance/my-classrooms');
            return data.classrooms as Classroom[];
        }
    });
};

export const useClassroomAttendance = (classroomId: string | undefined, date: string | undefined) => {
    return useQuery({
        queryKey: ['attendance', 'classroom', classroomId, date],
        queryFn: async () => {
            if (!classroomId || !date) return [];
            const { data } = await api.get(`/student-attendance/classroom/${classroomId}`, {
                params: { date }
            });
            return data.attendance as StudentAttendance[];
        },
        enabled: !!classroomId && !!date
    });
};

export const useSubmitBulkAttendance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (payload: { classroomId: string, academicYearId: string, date: string, records: any[] }) => {
            const { data } = await api.post('/student-attendance', payload);
            return data;
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['attendance', 'classroom', variables.classroomId, variables.date] });
        }
    });
};

export const useUpdateAttendance = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, payload }: { id: string, payload: any }) => {
            const { data } = await api.patch(`/student-attendance/${id}`, payload);
            return data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['attendance', 'classroom'] });
        }
    });
};
