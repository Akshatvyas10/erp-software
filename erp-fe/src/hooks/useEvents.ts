import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';

export interface CalendarEvent {
    id: string;
    title: string;
    description?: string;
    type: 'ACADEMIC' | 'EXAM' | 'ASSESSMENT' | 'EVENT' | 'HOLIDAY' | 'SPORTS' | 'CULTURAL' | 'FESTIVAL' | 'PARENT_MEETING' | 'STAFF_MEETING' | 'TEACHER_TRAINING' | 'ADMISSION' | 'FEE' | 'DEADLINE' | 'RESULT' | 'MILESTONE' | 'OTHER';
    start_date: string;
    end_date: string;
    day_type: 'FULL_DAY' | 'HALF_DAY' | 'HOLIDAY' | 'SPECIAL';
    location?: string;
    status: 'DRAFT' | 'PUBLISHED' | 'CANCELLED';
    target_audience: 'ALL' | 'STAFF' | 'STUDENTS' | 'CLASS';
    target_class_id?: string;
    creator?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    targetClass?: {
        id: string;
        name: string;
        section: string;
    };
}

export const useEvents = () => {
    return useQuery({
        queryKey: ['events'],
        queryFn: async () => {
            const { data } = await api.get('/events');
            return data.data as CalendarEvent[];
        },
    });
};

export const useCreateEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (eventData: Partial<CalendarEvent>) => {
            const { data } = await api.post('/events', {
                title: eventData.title,
                description: eventData.description,
                type: eventData.type,
                startDate: eventData.start_date,
                endDate: eventData.end_date,
                dayType: eventData.day_type,
                location: eventData.location,
                status: eventData.status,
                targetAudience: eventData.target_audience,
                targetClassId: eventData.target_class_id
            });
            return data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
};

export const useUpdateEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<CalendarEvent> }) => {
            const response = await api.put(/events/ + id, {
                title: data.title,
                description: data.description,
                type: data.type,
                startDate: data.start_date,
                endDate: data.end_date,
                dayType: data.day_type,
                location: data.location,
                status: data.status,
                targetAudience: data.target_audience,
                targetClassId: data.target_class_id
            });
            return response.data.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
};

export const useDeleteEvent = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (id: string) => {
            await api.delete(`/events/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
};

export const useUpdateEventStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async ({ id, status }: { id: string; status: CalendarEvent['status'] }) => {
            await api.patch(`/events/${id}/status`, { status });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
        },
    });
};

export const useBulkGenerateHolidays = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (data: { sessionStartDate: string; sessionEndDate: string; saturdayRule: string; sundayRule: string }) => {
            const response = await api.post('/events/bulk-holidays', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['events'] });
            queryClient.invalidateQueries({ queryKey: ['academicYears'] });
        },
    });
};
