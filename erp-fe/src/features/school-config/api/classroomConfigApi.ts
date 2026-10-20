import api from "@/lib/api";

export interface BuildingBlock {
    id: string;
    name: string;
    code: string;
    description?: string;
    status: 'ACTIVE' | 'INACTIVE';
    rooms?: ClassroomRoom[];
    created_at?: string;
    updated_at?: string;
}

export interface ClassroomRoom {
    id: string;
    blockId: string;
    roomNumber: string;
    capacity: number;
    roomType: 'CLASSROOM' | 'LAB' | 'LIBRARY' | 'AUDITORIUM' | 'ACTIVITY_ROOM';
    floor?: string;
    status: 'ACTIVE' | 'INACTIVE';
    block?: {
        id: string;
        name: string;
        code: string;
    };
    created_at?: string;
    updated_at?: string;
}

export interface TestTemplateItem {
    name: string;
    monthOffset?: number;
    durationDays?: number;
}

export interface ExamTemplateItem {
    name: string;
    monthOffset?: number;
    durationDays?: number;
}

export interface TestExamConfig {
    id: string;
    departmentId: string;
    academicYear: string;
    totalTestsPerYear: number;
    totalExamsPerYear: number;
    testFrequency: 'MONTHLY' | 'BI_MONTHLY' | 'QUARTERLY' | 'CUSTOM';
    examFrequency: 'QUARTERLY' | 'TERM_WISE' | 'SEMESTER_WISE' | 'ANNUAL' | 'CUSTOM';
    testTemplates: TestTemplateItem[];
    examTemplates: ExamTemplateItem[];
    rulesDescription?: string;
    isActive: boolean;
    department?: {
        id: string;
        name: string;
    };
    created_at?: string;
    updated_at?: string;
}

export interface ScheduledDateItem {
    title: string;
    startDate: string;
    endDate?: string;
}

export interface ConfigureClassroomPayload {
    name: string;
    section: string;
    academicYear: string;
    departmentId?: string;
    department?: string;
    blockId?: string;
    buildingBlock?: string;
    roomId?: string;
    roomNumber?: string;
    maxCapacity: number;
    classTeacherId?: string | null;
    status: 'ACTIVE' | 'INACTIVE';
    testSchedules?: ScheduledDateItem[];
    examSchedules?: ScheduledDateItem[];
}

// ── Blocks API ──────────────────────────────────────────────────────────
export const getBuildingBlocks = async (): Promise<BuildingBlock[]> => {
    const res = await api.get("/school-config/classroom/blocks");
    return res.data.data.blocks;
};

export const createBuildingBlock = async (data: Partial<BuildingBlock>): Promise<BuildingBlock> => {
    const res = await api.post("/school-config/classroom/blocks", data);
    return res.data.data.block;
};

export const updateBuildingBlock = async (id: string, data: Partial<BuildingBlock>): Promise<BuildingBlock> => {
    const res = await api.put(`/school-config/classroom/blocks/${id}`, data);
    return res.data.data.block;
};

export const deleteBuildingBlock = async (id: string): Promise<void> => {
    await api.delete(`/school-config/classroom/blocks/${id}`);
};

// ── Rooms API ───────────────────────────────────────────────────────────
export const getClassroomRooms = async (blockId?: string): Promise<ClassroomRoom[]> => {
    const params = blockId ? `?blockId=${blockId}` : "";
    const res = await api.get(`/school-config/classroom/rooms${params}`);
    return res.data.data.rooms;
};

export const createClassroomRoom = async (data: Partial<ClassroomRoom>): Promise<ClassroomRoom> => {
    const res = await api.post("/school-config/classroom/rooms", data);
    return res.data.data.room;
};

export const updateClassroomRoom = async (id: string, data: Partial<ClassroomRoom>): Promise<ClassroomRoom> => {
    const res = await api.put(`/school-config/classroom/rooms/${id}`, data);
    return res.data.data.room;
};

export const deleteClassroomRoom = async (id: string): Promise<void> => {
    await api.delete(`/school-config/classroom/rooms/${id}`);
};

// ── Test & Exam Rules API ───────────────────────────────────────────────
export const getTestExamRules = async (departmentId?: string, academicYear?: string): Promise<TestExamConfig[]> => {
    const params = new URLSearchParams();
    if (departmentId) params.append("departmentId", departmentId);
    if (academicYear) params.append("academicYear", academicYear);
    const res = await api.get(`/school-config/classroom/rules?${params.toString()}`);
    return res.data.data.rules;
};

export const upsertTestExamRule = async (data: Partial<TestExamConfig>): Promise<TestExamConfig> => {
    const res = await api.post("/school-config/classroom/rules", data);
    return res.data.data.rule;
};

// ── Classroom Configuration API ─────────────────────────────────────────
export const configureClassroom = async (payload: ConfigureClassroomPayload) => {
    const res = await api.post("/school-config/classroom/classrooms", payload);
    return res.data.data;
};
