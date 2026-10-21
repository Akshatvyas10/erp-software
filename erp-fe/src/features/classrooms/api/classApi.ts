import api from "@/lib/api";
import type { AcademicClass, ClassSetupStatus, BulkSetupPayload } from "@/types/erp";

export const fetchClassSetupStatus = async (): Promise<ClassSetupStatus> => {
    const { data } = await api.get("/classes/setup-status");
    return data.data as ClassSetupStatus;
};

export const fetchAcademicClasses = async (search = "", status = "", academicYear = "", departmentId = ""): Promise<AcademicClass[]> => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (academicYear) params.set("academicYear", academicYear);
    if (departmentId && departmentId !== "all") params.set("departmentId", departmentId);

    const { data } = await api.get(`/classes?${params.toString()}`);
    return data.data.classes as AcademicClass[];
};

export const fetchAcademicClass = async (id: string): Promise<AcademicClass> => {
    const { data } = await api.get(`/classes/${id}`);
    return data.data.class as AcademicClass;
};

export const bulkSetupClasses = async (payload: BulkSetupPayload) => {
    const { data } = await api.post("/classes/bulk-setup", payload);
    return data.data;
};

export const createAcademicClass = async (payload: Partial<AcademicClass>): Promise<AcademicClass> => {
    const { data } = await api.post("/classes", payload);
    return data.data.class as AcademicClass;
};

export const updateAcademicClass = async (id: string, payload: Partial<AcademicClass>): Promise<AcademicClass> => {
    const { data } = await api.put(`/classes/${id}`, payload);
    return data.data.class as AcademicClass;
};

export const deleteAcademicClass = async (id: string): Promise<void> => {
    await api.delete(`/classes/${id}`);
};
