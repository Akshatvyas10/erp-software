import api from "@/lib/api";
import type {
    Classroom,
    DayOfWeek,
    Teacher,
    Subject,
} from "@/types/erp";

// ─── Constants ────────────────────────────────────────────────────────────────
export const WEEKDAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export const SUBJECT_COLORS = [
    "bg-primary/10 text-primary border-primary/20",
    "bg-accent/40 text-accent-foreground border-accent/50",
    "bg-muted/80 text-foreground border-border/80",
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    "bg-destructive/10 text-destructive border-destructive/20",
];

// ─── API fetchers ─────────────────────────────────────────────────────────────
export const fetchClassroom = async (id: string): Promise<Classroom> => {
    const { data } = await api.get(`/classrooms/${id}`);
    return data.data.classroom as Classroom;
};

export const fetchClassrooms = async (filters?: { status?: string }): Promise<Classroom[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.set("status", filters.status);
    const { data } = await api.get(`/classrooms?${params.toString()}`);
    return (data.data.classrooms || []) as Classroom[];
};

export const fetchAllStudents = async (search: string) => {
    const params = new URLSearchParams({ limit: "50", status: "ACTIVE" });
    if (search) params.set("search", search);
    const { data } = await api.get(`/students?${params}`);
    return data.data.students as Array<{
        id: string;
        studentId: string;
        admissionNumber?: string | null;
        grade: string | null;
        section: string | null;
        account: { firstName: string; lastName: string; email: string };
    }>;
};

export interface PromotionRule {
    id: string;
    name: string;
    academicClassId?: string | null;
    academicClass?: { id: string; name: string; code: string } | null;
    minOverallPercentage: number;
    mustPassAllSubjects: boolean;
    minSubjectPercentage: number;
    maxCompartmentSubjects: number;
    minAttendancePercentage?: number | null;
    status: string;
}

export interface PromotionEvaluationCandidate {
    studentId: string;
    admissionNumber: string;
    name: string;
    rollNumber?: number | null;
    overallPercentage: number | null;
    totalExamsEvaluated: number;
    failedSubjects: Array<{
        subjectName: string;
        subjectCode: string;
        marksObtained: number;
        maxMarks: number;
        percentage: number;
    }>;
    failureReasons?: string[];
}

export interface PromotionEvaluationResponse {
    classroom: {
        id: string;
        name: string;
        section: string;
        academicYear: string;
        academicClass?: { id: string; name: string; code: string; orderIndex: number } | null;
    };
    rule: PromotionRule;
    summary: {
        totalStudents: number;
        eligibleCount: number;
        failingCount: number;
    };
    eligibleStudents: PromotionEvaluationCandidate[];
    failingStudents: PromotionEvaluationCandidate[];
}

export const fetchPromotionRules = async (): Promise<PromotionRule[]> => {
    const { data } = await api.get("/classrooms/promotions/rules");
    return (data.data.rules || []) as PromotionRule[];
};

export const createPromotionRule = async (payload: Partial<PromotionRule>): Promise<PromotionRule> => {
    const { data } = await api.post("/classrooms/promotions/rules", payload);
    return data.data.rule as PromotionRule;
};

export const updatePromotionRule = async (id: string, payload: Partial<PromotionRule>): Promise<PromotionRule> => {
    const { data } = await api.put(`/classrooms/promotions/rules/${id}`, payload);
    return data.data.rule as PromotionRule;
};

export const evaluatePromotionCandidates = async (classroomId: string): Promise<PromotionEvaluationResponse> => {
    const { data } = await api.get(`/classrooms/${classroomId}/promotions/evaluate`);
    return data.data as PromotionEvaluationResponse;
};

export const fetchAllTeachers = async (): Promise<Teacher[]> => {
    const { data } = await api.get("/teachers?limit=100");
    return data.data.teachers as Teacher[];
};

export const fetchAllSubjects = async (): Promise<Subject[]> => {
    const { data } = await api.get("/subjects");
    return data.data.subjects as Subject[];
};
