import api from '@/lib/api';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const admissionService = {
    // ─── Public Endpoints ──────────────────────────────────────────────────
    
    getPublicForm: async (token: string) => {
        const response = await api.get(`/admissions/public/${token}`);
        return response.data;
    },

    submitApplication: async (token: string, data: any) => {
        const response = await api.post(`/admissions/public/${token}`, data);
        return response.data;
    },

    // ─── Protected Endpoints (Admin/Staff) ─────────────────────────────────
    
    generateForm: async (data: { classroomId: string; customFields?: any[]; expiresAt?: string }) => {
        const response = await api.post('/admissions/generate', data);
        return response.data;
    },

    listApplications: async (params?: any) => {
        const response = await api.get('/admissions/', { params });
        return response.data;
    },

    listForms: async () => {
        const response = await api.get('/admissions/forms');
        return response.data;
    },

    updateApplicationStatus: async (
        params: { applicationId: string; status: 'Admitted' | 'Rejected'; rejectionReason?: string; rollNumber?: string; admissionNumber?: string; password?: string }
    ) => {
        const response = await api.patch(`/admissions/${params.applicationId}/status`, params);
        return response.data;
    },

    getPublicApplicationStatus: async (applicationId: string) => {
        const response = await api.get(`/admissions/public/application/${applicationId}/status`);
        return response.data;
    },

    toggleFormStatus: async (formId: string) => {
        const response = await api.patch(`/admissions/forms/${formId}/toggle-status`);
        return response.data;
    },

    bulkToggleFormStatus: async (params: { ids: string[]; isActive: boolean }) => {
        const response = await api.patch(`/admissions/forms/bulk-toggle-status`, params);
        return response.data;
    }
};

// ─── React Query Hooks ──────────────────────────────────────────────────

export const useGetPublicForm = (token: string, enabled = true) => {
    return useQuery({
        queryKey: ['admissionForm', token],
        queryFn: () => admissionService.getPublicForm(token),
        enabled: !!token && enabled,
    });
};

export const useSubmitApplication = () => {
    return useMutation({
        mutationFn: (params: { token: string; data: any }) => 
            admissionService.submitApplication(params.token, params.data),
    });
};

export const useGenerateForm = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: admissionService.generateForm,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admissionForms'] });
        },
    });
};

export const useListApplications = (params?: any) => {
    return useQuery({
        queryKey: ['admissionApplications', params],
        queryFn: () => admissionService.listApplications(params),
    });
};

export const useListForms = () => {
    return useQuery({
        queryKey: ['admissionForms'],
        queryFn: () => admissionService.listForms(),
    });
};

export const useUpdateApplicationStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: admissionService.updateApplicationStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admissionApplications'] });
        },
    });
};

export const useGetPublicApplicationStatus = (applicationId: string | null) => {
    return useQuery({
        queryKey: ['publicApplicationStatus', applicationId],
        queryFn: () => admissionService.getPublicApplicationStatus(applicationId!),
        enabled: !!applicationId,
    });
};

export const useToggleFormStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: admissionService.toggleFormStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admissionForms'] });
        },
    });
};

export const useBulkToggleFormStatus = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: admissionService.bulkToggleFormStatus,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admissionForms'] });
        },
    });
};
