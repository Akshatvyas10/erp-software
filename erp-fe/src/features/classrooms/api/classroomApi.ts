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

export const fetchAllStudents = async (search: string) => {
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.set("search", search);
    const { data } = await api.get(`/students?${params}`);
    return data.data.students as Array<{
        id: string;
        studentId: string;
        grade: string | null;
        section: string | null;
        account: { firstName: string; lastName: string; email: string };
    }>;
};

export const fetchAllTeachers = async (): Promise<Teacher[]> => {
    const { data } = await api.get("/teachers?limit=100");
    return data.data.teachers as Teacher[];
};

export const fetchAllSubjects = async (): Promise<Subject[]> => {
    const { data } = await api.get("/subjects");
    return data.data.subjects as Subject[];
};
