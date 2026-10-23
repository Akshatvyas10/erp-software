import api from '@/lib/api';

export interface AcademicYear {
    id: string;
    name: string;
    startDate: string;
    endDate: string;
    status: 'UPCOMING' | 'ACTIVE' | 'COMPLETED';
    isCurrent: boolean;
    notes?: string | null;
    createdAt?: string;
    updatedAt?: string;
}

export const fetchAcademicYears = async (): Promise<AcademicYear[]> => {
    const res = await api.get('/academic-years');
    return res.data.data || [];
};

export const fetchCurrentAcademicYear = async (): Promise<AcademicYear | null> => {
    const res = await api.get('/academic-years/current');
    return res.data.data || null;
};

export const syncAcademicYearFromCalendar = async (payload: {
    sessionStartDate: string;
    sessionEndDate: string;
}): Promise<AcademicYear> => {
    const res = await api.post('/academic-years/sync-calendar', payload);
    return res.data.data;
};

export const activateAcademicYear = async (id: string): Promise<AcademicYear> => {
    const res = await api.post(`/academic-years/${id}/activate`);
    return res.data.data;
};

export const updateAcademicYear = async (
    id: string,
    data: { name?: string; notes?: string }
): Promise<AcademicYear> => {
    const res = await api.patch(`/academic-years/${id}`, data);
    return res.data.data;
};

export const deleteAcademicYear = async (id: string): Promise<void> => {
    await api.delete(`/academic-years/${id}`);
};
