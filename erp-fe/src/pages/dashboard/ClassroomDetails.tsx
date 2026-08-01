import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    School, ArrowLeft, Users, LayoutGrid, Search, Plus, Trash2,
    Loader2, UserCheck, X, BookOpen, Clock, CheckCircle2,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";

import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import AccessDenied from "@/components/auth/AccessDenied";
import CreateSubjectDialog from "@/components/shared/CreateSubjectDialog";
import type {

    Classroom, ClassroomEnrollment, ClassroomSubject, ClassroomPeriod,
    TimetableSlot, DayOfWeek, Teacher, Subject,
} from "@/types/erp";

// ─── Constants ────────────────────────────────────────────────────────────────
const WEEKDAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const SUBJECT_COLORS = [
    "bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-200/60 dark:border-violet-500/20",
    "bg-sky-500/10 text-sky-700 dark:text-sky-300 border-sky-200/60 dark:border-sky-500/20",
    "bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-200/60 dark:border-amber-500/20",
    "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-200/60 dark:border-emerald-500/20",
    "bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-200/60 dark:border-rose-500/20",
    "bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-200/60 dark:border-indigo-500/20",
];

// ─── Schemas ──────────────────────────────────────────────────────────────────
const subjectSchema = z.object({
    subjectId: z.string().min(1, "Subject is required"),
    teacherId: z.string().optional(),
});
type SubjectFormValues = z.infer<typeof subjectSchema>;

// ─── API fetchers ─────────────────────────────────────────────────────────────
const fetchClassroom = async (id: string): Promise<Classroom> => {
    const { data } = await api.get(`/classrooms/${id}`);
    return data.data.classroom as Classroom;
};

const fetchAllStudents = async (search: string) => {
    const params = new URLSearchParams({ limit: "50" });
    if (search) params.set("search", search);
    const { data } = await api.get(`/students?${params}`);
    return data.data.students as Array<{
        id: string; studentId: string; grade: string | null; section: string | null;
        account: { firstName: string; lastName: string; email: string };
    }>;
};

const fetchAllTeachers = async (): Promise<Teacher[]> => {
    const { data } = await api.get("/teachers?limit=100");
    return data.data.teachers as Teacher[];
};

const fetchAllSubjects = async (): Promise<Subject[]> => {
    const { data } = await api.get("/subjects");
    return data.data.subjects as Subject[];
};

// ─── TAB A: Roster ────────────────────────────────────────────────────────────

interface RosterTabProps {
    classroomId: string;
    enrollments: ClassroomEnrollment[];
    canEdit: boolean;
    onRefresh: () => void;
}

function RosterTab({ classroomId, enrollments, canEdit, onRefresh }: RosterTabProps) {
    const [rosterSearch, setRosterSearch] = useState("");
    const [assignOpen, setAssignOpen] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [removeId, setRemoveId] = useState<string | null>(null);

    const enrolledIds = useMemo(() => new Set(enrollments.map(e => e.student.id)), [enrollments]);

    const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
        queryKey: ["students-all", studentSearch],
        queryFn: () => fetchAllStudents(studentSearch),
        enabled: assignOpen,
        staleTime: 30_000,
    });

    const availableStudents = useMemo(
        () => allStudents.filter(s => !enrolledIds.has(s.id)),
        [allStudents, enrolledIds]
    );

    const assignMutation = useMutation({
        mutationFn: (studentIds: string[]) =>
            api.post(`/classrooms/${classroomId}/students`, { studentIds }),
        onSuccess: () => {
            toast.success(`${selected.size} student(s) assigned`);
            setSelected(new Set());
            setAssignOpen(false);
            onRefresh();
        },
        onError: (err: any) => {
            console.log("Assign error:", err, err?.response?.data);
            const msg = err?.response?.data?.message;
            const valMsg = err?.response?.data?.errors?.[0]?.msg;
            toast.error(valMsg || msg || err?.message || "Failed to assign students");
        },
    });

    const removeMutation = useMutation({
        mutationFn: (studentId: string) =>
            api.delete(`/classrooms/${classroomId}/students/${studentId}`),
        onSuccess: () => {
            toast.success("Student removed from classroom");
            setRemoveId(null);
            onRefresh();
        },
        onError: () => toast.error("Failed to remove student"),
    });

    const filteredEnrollments = enrollments.filter(e => {
        if (!rosterSearch) return true;
        const q = rosterSearch.toLowerCase();
        const account = e.student?.account || { firstName: "", lastName: "", email: "" };
        const { firstName, lastName, email } = account;
        return [firstName, lastName, email, e.student?.studentId]
            .some(v => v?.toLowerCase().includes(q));
    });

    const toggleStudent = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className="space-y-4">
            {/* Roster toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search students…"
                        value={rosterSearch}
                        onChange={e => setRosterSearch(e.target.value)}
                        className="pl-9 h-10 border-none bg-muted/60 dark:bg-zinc-950/60 rounded-xl text-sm
                                   focus-visible:ring-1 focus-visible:ring-purple-500"
                    />
                </div>
                {canEdit && (
                    <Button
                        size="sm"
                        onClick={() => setAssignOpen(true)}
                        className="gap-2 h-10 px-4 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600
                                   dark:hover:bg-purple-500 text-white rounded-xl font-semibold shadow-md"
                    >
                        <UserCheck className="h-4 w-4" /> Assign Students
                    </Button>
                )}
            </div>

            {/* Enrollment count */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-900/50 dark:text-zinc-500 uppercase tracking-wider">
                    {filteredEnrollments.length} student{filteredEnrollments.length !== 1 ? "s" : ""}
                </span>
                {rosterSearch && (
                    <button onClick={() => setRosterSearch("")}
                        className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1">
                        <X className="h-3 w-3" /> Clear
                    </button>
                )}
            </div>

            {/* Student table */}
            {filteredEnrollments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-purple-600/5 dark:bg-purple-500/10
                                    border border-purple-100 dark:border-zinc-800 flex items-center justify-center">
                        <Users className="h-6 w-6 text-purple-400/60" />
                    </div>
                    <p className="text-sm font-bold text-purple-950/40 dark:text-zinc-500">No students enrolled</p>
                </div>
            ) : (
                <div className="rounded-xl border border-purple-100 dark:border-zinc-800 overflow-hidden">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="bg-muted/40 dark:bg-zinc-900/60 border-b border-border/60">
                                <th className="pl-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Student</th>
                                <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Student ID</th>
                                <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Grade</th>
                                <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Email</th>
                                {canEdit && <th className="pr-5 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</th>}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredEnrollments.map((enr, i) => {
                                const account = enr.student?.account || { firstName: "Unknown", lastName: "Student", email: "N/A" };
                                const { firstName, lastName, email } = account;
                                const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
                                return (
                                    <tr key={enr.id}
                                        className={cn(
                                            "border-b border-border/40 last:border-0 hover:bg-purple-500/[0.02] dark:hover:bg-purple-500/[0.04] transition-colors",
                                            i % 2 === 0 ? "" : "bg-muted/20 dark:bg-zinc-900/20"
                                        )}>
                                        <td className="pl-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <Avatar className="h-8 w-8 border border-purple-500/20 shadow-sm shrink-0">
                                                    <AvatarFallback className="bg-purple-600/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <span className="font-semibold text-purple-950 dark:text-zinc-200 text-[13px]">
                                                    {firstName} {lastName}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3.5">
                                            <Badge variant="outline" className="font-mono text-[11px] bg-muted/60 dark:bg-zinc-950 border-border/60 px-2">
                                                {enr.student.studentId}
                                            </Badge>
                                        </td>
                                        <td className="py-3.5 text-muted-foreground font-medium hidden md:table-cell">
                                            {enr.student.grade ?? "—"}
                                        </td>
                                        <td className="py-3.5 text-muted-foreground text-[12px] hidden lg:table-cell">
                                            {email}
                                        </td>
                                        {canEdit && (
                                            <td className="pr-5 py-3.5 text-right">
                                                <Button
                                                    variant="ghost" size="icon"
                                                    className="h-8 w-8 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setRemoveId(enr.student.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </td>
                                        )}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Assign Students Dialog */}
            <Dialog open={assignOpen} onOpenChange={v => { setAssignOpen(v); if (!v) { setSelected(new Set()); setStudentSearch(""); } }}>
                <DialogContent className="sm:max-w-lg p-0 rounded-2xl border border-border/80 shadow-2xl bg-white dark:bg-zinc-950">
                    <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                        <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                            Assign Students
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-5 space-y-3">
                        <Command className="rounded-xl border border-purple-100 dark:border-zinc-800 bg-transparent">
                            <CommandInput
                                placeholder="Search by name or student ID…"
                                value={studentSearch}
                                onValueChange={setStudentSearch}
                                className="text-sm"
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {studentsLoading ? (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="h-5 w-5 animate-spin text-purple-500" />
                                        </div>
                                    ) : "No students found"}
                                </CommandEmpty>
                                <CommandGroup>
                                    <ScrollArea className="h-56">
                                        {availableStudents.map(student => {
                                            const isChecked = selected.has(student.id);
                                            const name = `${student.account.firstName} ${student.account.lastName}`;
                                            return (
                                                <CommandItem
                                                    key={student.id}
                                                    value={`${name} ${student.studentId}`}
                                                    onSelect={() => toggleStudent(student.id)}
                                                    className="gap-3 cursor-pointer rounded-lg aria-selected:bg-purple-600/10 dark:aria-selected:bg-purple-500/15"
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        className="data-[state=checked]:bg-purple-700 data-[state=checked]:border-purple-700"
                                                        onCheckedChange={() => toggleStudent(student.id)}
                                                    />
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className="font-semibold text-[13px] text-foreground truncate">{name}</span>
                                                        <span className="text-[11px] text-muted-foreground font-mono">{student.studentId}</span>
                                                    </div>
                                                    {isChecked && <CheckCircle2 className="h-4 w-4 text-purple-600 dark:text-purple-400 shrink-0" />}
                                                </CommandItem>
                                            );
                                        })}
                                    </ScrollArea>
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        {selected.size > 0 && (
                            <p className="text-xs font-semibold text-purple-700 dark:text-purple-400
                                          bg-purple-600/10 dark:bg-purple-500/10 px-3 py-2 rounded-lg">
                                {selected.size} student{selected.size !== 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>
                    <div className="px-6 py-4 bg-muted/40 dark:bg-purple-950/10 border-t border-border flex justify-end gap-3">
                        <Button variant="outline" className="rounded-xl font-medium border-border/80"
                            onClick={() => setAssignOpen(false)}>Cancel</Button>
                        <Button
                            disabled={selected.size === 0 || assignMutation.isPending}
                            onClick={() => assignMutation.mutate(Array.from(selected))}
                            className="gap-2 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600
                                       dark:hover:bg-purple-500 text-white rounded-xl font-semibold"
                        >
                            {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <><UserCheck className="h-4 w-4" /> Assign {selected.size > 0 ? selected.size : ""}</>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Remove confirm */}
            <AlertDialog open={!!removeId} onOpenChange={v => !v && setRemoveId(null)}>
                <AlertDialogContent className="rounded-xl border border-purple-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-purple-950 dark:text-zinc-50 font-bold">Remove Student?</AlertDialogTitle>
                        <AlertDialogDescription className="text-purple-900/70 dark:text-zinc-400">
                            The student will be unenrolled from this classroom. Their account will not be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="bg-purple-100/50 dark:bg-zinc-900 text-purple-950 dark:text-zinc-300 hover:bg-purple-100 dark:hover:bg-zinc-800 border-none h-10 px-4 rounded-lg font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => removeId && removeMutation.mutate(removeId)}
                            className="bg-destructive hover:bg-destructive/90 text-white h-10 px-4 rounded-lg font-semibold"
                        >
                            {removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── Add Subject Dialog ───────────────────────────────────────────────────────

interface AddSubjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    onSuccess: () => void;
}

function AddSubjectDialog({ open, onOpenChange, classroomId, onSuccess }: AddSubjectDialogProps) {
    const [createSubjectOpen, setCreateSubjectOpen] = useState(false);

    const { data: teachers = [] } = useQuery({
        queryKey: ["teachers-all"],
        queryFn: fetchAllTeachers,
        enabled: open,
        staleTime: 60_000,
    });

    const { data: subjects = [] } = useQuery({
        queryKey: ["subjects-all"],
        queryFn: fetchAllSubjects,
        enabled: open,
        staleTime: 60_000,
    });

    const form = useForm<SubjectFormValues>({
        resolver: zodResolver(subjectSchema),
        defaultValues: { subjectId: "", teacherId: "" },
    });

    const selectedSubjectId = form.watch("subjectId");

    const availableTeachers = useMemo(() => {
        if (!selectedSubjectId) return teachers;
        const selectedSubject = subjects.find(s => s.id === selectedSubjectId);
        if (!selectedSubject) return teachers;

        return teachers.filter(t => {
            let tSubjects: any[] = [];
            if (typeof t.subjects === 'string') {
                try {
                    tSubjects = JSON.parse(t.subjects);
                } catch {
                    // if it's a plain string like "Mathematics", array wrap it
                    tSubjects = [t.subjects];
                }
            } else if (Array.isArray(t.subjects)) {
                tSubjects = t.subjects;
            }

            if (!Array.isArray(tSubjects)) return false;

            return tSubjects.some(sub =>
                typeof sub === 'string' && sub.toLowerCase().trim() === selectedSubject.name.toLowerCase().trim()
            );
        });
    }, [teachers, selectedSubjectId, subjects]);

    const onSubmit = async (values: SubjectFormValues) => {
        try {
            await api.post(`/classrooms/${classroomId}/subjects`, {
                subjectId: values.subjectId,
                teacherId: values.teacherId === "none" ? undefined : (values.teacherId || undefined),
            });
            toast.success("Subject added");
            form.reset();
            onSuccess();
            onOpenChange(false);
        } catch (err: unknown) {
            const errorMsg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to add subject";
            toast.error(errorMsg);
        }
    };

    const inputCls = "h-9 bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50";
    const labelCls = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 rounded-2xl border border-border/80 shadow-2xl bg-white dark:bg-zinc-950">
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">Add Subject</DialogTitle>
                </DialogHeader>
                <div className="p-6">
                    <Form {...form}>
                        <form id="subject-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField control={form.control} name="subjectId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className={labelCls}>Subject *</FormLabel>
                                    <div className="flex gap-2">
                                        <Select onValueChange={field.onChange} value={field.value}>
                                            <FormControl>
                                                <SelectTrigger className={`flex-1 ${inputCls}`}>
                                                    <SelectValue placeholder="Select a subject" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {subjects.map(s => (
                                                    <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 shrink-0"
                                            onClick={() => setCreateSubjectOpen(true)}
                                            title="Create New Subject"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="teacherId" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className={labelCls}>Assign Teacher (optional)</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value || "none"}>
                                        <FormControl>
                                            <SelectTrigger className={inputCls}>
                                                <SelectValue placeholder="Select a teacher (optional)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="none" className="text-muted-foreground italic">
                                                — No teacher
                                            </SelectItem>
                                            {availableTeachers.map(t => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.account.firstName} {t.account.lastName} <span className="text-[10px] text-muted-foreground ml-2">({t.teacherId})</span>
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />
                        </form>
                    </Form>
                </div>
                <div className="px-6 py-4 bg-muted/40 dark:bg-purple-950/10 border-t border-border flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl font-medium border-border/80"
                        onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" form="subject-form"
                        className="gap-2 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white rounded-xl font-semibold">
                        {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add Subject"}
                    </Button>
                </div>
            </DialogContent>
            {/* Create Subject Inline Dialog */}
            <CreateSubjectDialog
                open={createSubjectOpen}
                onOpenChange={setCreateSubjectOpen}
                onSuccess={(subjectName) => {
                    setTimeout(() => {
                        const newSub = subjects.find(s => s.name === subjectName);
                        if (newSub) form.setValue("subjectId", newSub.id);
                    }, 500);
                }}
            />
        </Dialog>
    );
}
// ─── Timetable UI Rewrite ───────────────────────────────────────────────────

interface ManagePeriodsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    periods: ClassroomPeriod[];
    onSuccess: () => void;
}

function ManagePeriodsDialog({ open, onOpenChange, classroomId, periods, onSuccess }: ManagePeriodsDialogProps) {
    const [name, setName] = useState("");
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("08:45");

    const addMutation = useMutation({
        mutationFn: (data: { name: string, startTime: string, endTime: string, order: number }) =>
            api.post(`/classrooms/${classroomId}/periods`, data),
        onSuccess: () => {
            toast.success("Period added");
            setName("");
            onSuccess();
        },
        onError: () => toast.error("Failed to add period"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/classrooms/${classroomId}/periods/${id}`),
        onSuccess: () => {
            toast.success("Period deleted");
            onSuccess();
        },
        onError: () => toast.error("Failed to delete period"),
    });



    const inputCls = "h-9 bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50";
    const labelCls = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block";

    const PERIOD_NAMES = [
        "Lecture 1", "Lecture 2", "Lecture 3", "Lecture 4", "Lecture 5",
        "Lecture 6", "Lecture 7", "Lecture 8", "Lecture 9", "Lecture 10",
        "Lunch", "Short Break"
    ];

    const handleAdd = () => {
        const parseTime = (t: string) => {
            const [h, m] = t.split(':').map(Number);
            return h * 60 + m;
        };
        const newStart = parseTime(startTime);
        const newEnd = parseTime(endTime);

        if (newStart >= newEnd) {
            toast.error("End time must be after start time");
            return;
        }

        const isOverlap = periods.some(p => {
            const pStart = parseTime(p.startTime);
            const pEnd = parseTime(p.endTime);
            return Math.max(pStart, newStart) < Math.min(pEnd, newEnd);
        });

        if (isOverlap) {
            toast.error("This period overlaps with an existing one");
            return;
        }

        if (name.startsWith("Lecture") && periods.some(p => p.name === name)) {
            toast.error(`${name} is already added`);
            return;
        }

        addMutation.mutate({ name, startTime, endTime, order: periods.length + 1 });
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 rounded-2xl border border-border/80 shadow-2xl bg-white dark:bg-zinc-950">
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                    <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                        Manage Lectures
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-4">
                            <label className={labelCls}>Name</label>
                            <Select value={name} onValueChange={setName}>
                                <SelectTrigger className={inputCls}>
                                    <SelectValue placeholder="Select Name" />
                                </SelectTrigger>
                                <SelectContent className="max-h-40">
                                    {PERIOD_NAMES.map(n => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-3">
                            <label className={labelCls}>Start</label>
                            <Input
                                type="time"
                                className={inputCls}
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="col-span-3">
                            <label className={labelCls}>End</label>
                            <Input
                                type="time"
                                className={inputCls}
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                        <div className="col-span-2">
                            <Button className="w-full h-9 bg-purple-700 hover:bg-purple-800 text-white" disabled={!name || addMutation.isPending}
                                onClick={handleAdd}>
                                Add
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[200px] w-full rounded-xl border border-border/50 p-2">
                        {periods.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic">No periods defined.</div>
                        ) : (
                            <div className="space-y-1">
                                {periods.map(p => (
                                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 text-sm">
                                        <div className="font-semibold text-foreground">{p.name}</div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground font-mono">{p.startTime.substring(0, 5)} - {p.endTime.substring(0, 5)}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface BookSlotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    dayOfWeek: DayOfWeek;
    period: ClassroomPeriod | null;
    subjects: ClassroomSubject[];
    onSuccess: () => void;
}

function BookSlotDialog({ open, onOpenChange, classroomId, dayOfWeek, period, onSuccess }: BookSlotDialogProps) {
    const [globalSubjectId, setGlobalSubjectId] = useState("");
    const [teacherId, setTeacherId] = useState("");

    const { data: allSubjects = [] } = useQuery({
        queryKey: ["subjects-all"],
        queryFn: fetchAllSubjects,
        enabled: open,
        staleTime: 60_000,
    });

    const { data: allTeachers = [] } = useQuery({
        queryKey: ["teachers-all"],
        queryFn: fetchAllTeachers,
        enabled: open,
        staleTime: 60_000,
    });

    // Filter teachers based on selected subject name
    const selectedSubject = allSubjects.find(s => s.id === globalSubjectId);
    const filteredTeachers = selectedSubject
        ? allTeachers.filter(t => (t.subjects || []).includes(selectedSubject.name))
        : allTeachers;

    const mutation = useMutation({
        mutationFn: async () => {
            // First, map the global Subject and Teacher to this Classroom
            const subjectRes = await api.post(`/classrooms/${classroomId}/subjects`, {
                subjectId: globalSubjectId,
                teacherId: teacherId === "none" ? undefined : (teacherId || undefined),
            });
            const classroomSubjectId = subjectRes.data.data.subject.id;

            // Then, book the timetable slot
            await api.post(`/classrooms/${classroomId}/subjects/${classroomSubjectId}/timetable`, {
                dayOfWeek, startTime: period?.startTime, endTime: period?.endTime
            });
        },
        onSuccess: () => {
            toast.success("Slot booked successfully");
            setGlobalSubjectId("");
            setTeacherId("");
            onSuccess();
            onOpenChange(false);
        },
        onError: () => toast.error("Failed to book slot")
    });

    if (!period) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm p-0 rounded-2xl border border-border/80 shadow-2xl bg-white dark:bg-zinc-950">
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                    <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                        Book Slot - {dayOfWeek} {period.name}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Select Subject</label>
                        <Select value={globalSubjectId} onValueChange={(val) => {
                            setGlobalSubjectId(val);
                            setTeacherId(""); // Reset teacher when subject changes
                        }}>
                            <SelectTrigger className="h-9 w-full bg-zinc-100 dark:bg-zinc-900/50">
                                <SelectValue placeholder="Choose a subject..." />
                            </SelectTrigger>
                            <SelectContent>
                                {allSubjects.map(s => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.name} ({s.code})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Assign Teacher</label>
                        <Select value={teacherId} onValueChange={setTeacherId} disabled={!globalSubjectId}>
                            <SelectTrigger className="h-9 w-full bg-zinc-100 dark:bg-zinc-900/50">
                                <SelectValue placeholder={globalSubjectId ? (filteredTeachers.length > 0 ? "Select Teacher" : "No matching teachers") : "Select subject first"} />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="none" className="text-muted-foreground italic">No Teacher</SelectItem>
                                {filteredTeachers.map(t => (
                                    <SelectItem key={t.id} value={t.id}>
                                        {t.account.firstName} {t.account.lastName} ({t.teacherId})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="px-6 py-4 bg-muted/40 dark:bg-purple-950/10 border-t border-border flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl font-medium" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-semibold" disabled={!globalSubjectId || mutation.isPending} onClick={() => mutation.mutate()}>
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book Slot"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── TAB B: Timetable Builder ─────────────────────────────────────────────────

interface TimetableTabProps {
    classroomId: string;
    subjects: ClassroomSubject[];
    periods: ClassroomPeriod[];
    canEdit: boolean;
    onRefresh: () => void;
}

function TimetableTab({ classroomId, subjects, periods, canEdit, onRefresh }: TimetableTabProps) {
    const [managePeriodsOpen, setManagePeriodsOpen] = useState(false);
    const [addSubjectOpen, setAddSubjectOpen] = useState(false);
    const [bookSlotData, setBookSlotData] = useState<{ open: boolean; dayOfWeek: DayOfWeek; period: ClassroomPeriod | null }>({ open: false, dayOfWeek: 'Monday', period: null });
    const [removeSlotId, setRemoveSlotId] = useState<string | null>(null);

    const sortedPeriods = [...periods].sort((a, b) => a.order - b.order);

    const removeSlotMutation = useMutation({
        mutationFn: ({ subjectId, slotId }: { subjectId: string; slotId: string }) =>
            api.delete(`/classrooms/${classroomId}/subjects/${subjectId}/timetable/${slotId}`),
        onSuccess: () => { toast.success("Slot removed"); setRemoveSlotId(null); onRefresh(); },
        onError: () => toast.error("Failed to remove slot"),
    });

    // Build lookup: dayOfWeek -> periodId -> { slot, subject }
    const slotMatrix = useMemo(() => {
        const map: Record<string, Record<string, { slot: TimetableSlot, subject: ClassroomSubject }>> = {};
        for (const subj of subjects) {
            for (const slot of subj.schedule ?? []) {
                if (!map[slot.dayOfWeek]) map[slot.dayOfWeek] = {};
                // Find a period that matches exactly, or where the slot starts inside the period
                const period = periods.find(p => {
                    const pStart = p.startTime.substring(0, 5);
                    const pEnd = p.endTime.substring(0, 5);
                    const sStart = slot.startTime.substring(0, 5);
                    const sEnd = slot.endTime.substring(0, 5);
                    return (pStart === sStart && pEnd === sEnd) ||
                        (sStart >= pStart && sStart < pEnd);
                });
                if (period) {
                    map[slot.dayOfWeek][period.id] = { slot, subject: subj };
                }
            }
        }
        return map;
    }, [subjects, periods]);

    const handleCellClick = (day: DayOfWeek, period: ClassroomPeriod, existing?: { slot: TimetableSlot, subject: ClassroomSubject }) => {
        if (!canEdit) return;
        if (existing) {
            setRemoveSlotId(`${existing.subject.id}::${existing.slot.id}`);
        } else {
            setBookSlotData({ open: true, dayOfWeek: day, period });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-900/50 dark:text-zinc-500">
                    {periods.length} Lecture{periods.length !== 1 ? "s" : ""} configured
                </p>
                {canEdit && (
                    <div className="flex gap-2">
                        <Button size="sm" onClick={() => setAddSubjectOpen(true)}
                            className="gap-2 h-9 px-4 bg-purple-100 hover:bg-purple-200 text-purple-700 dark:bg-purple-900/30
                                       dark:hover:bg-purple-900/50 dark:text-purple-300 rounded-xl font-semibold shadow-sm border border-purple-200 dark:border-purple-800">
                            <BookOpen className="h-3.5 w-3.5" /> Add Subject
                        </Button>
                        <Button size="sm" onClick={() => setManagePeriodsOpen(true)}
                            className="gap-2 h-9 px-4 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600
                                       dark:hover:bg-purple-500 text-white rounded-xl font-semibold shadow-md">
                            <Clock className="h-3.5 w-3.5" /> Manage Lectures
                        </Button>
                    </div>
                )}
            </div>

            {periods.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-purple-600/5 dark:bg-purple-500/10
                                    border border-purple-100 dark:border-zinc-800 flex items-center justify-center">
                        <LayoutGrid className="h-6 w-6 text-purple-400/60" />
                    </div>
                    <p className="text-sm font-bold text-purple-950/40 dark:text-zinc-500">No lectures defined</p>
                    <p className="text-xs text-muted-foreground/60">Add lectures to construct the timetable grid.</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-purple-100 dark:border-zinc-800 overflow-hidden
                                shadow-[0_6px_24px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.3)]">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[800px] text-sm border-collapse">
                            <thead>
                                <tr className="bg-purple-50/80 dark:bg-zinc-900/60 border-b border-purple-100 dark:border-zinc-800">
                                    <th className="pl-5 py-3.5 text-left min-w-[120px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground sticky left-0 bg-purple-50/80 dark:bg-zinc-900/90 z-10">
                                        Day
                                    </th>
                                    {sortedPeriods.map(p => (
                                        <th key={p.id} className="py-3.5 px-3 text-center min-w-[140px] border-l border-purple-100/50 dark:border-zinc-800/50">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">{p.name}</div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{p.startTime.substring(0, 5)} - {p.endTime.substring(0, 5)}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {WEEKDAYS.map((day) => (
                                    <tr key={day} className="border-b border-purple-100/60 dark:border-zinc-800/60 last:border-0 hover:bg-purple-500/[0.02] dark:hover:bg-purple-500/[0.03] transition-colors">
                                        <td className="pl-5 py-4 font-bold text-[12px] text-foreground sticky left-0 bg-white/95 dark:bg-zinc-950/95 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
                                            {day}
                                        </td>
                                        {sortedPeriods.map(p => {
                                            const existing = slotMatrix[day]?.[p.id];
                                            const colorCls = existing ? SUBJECT_COLORS[(subjects.findIndex(s => s.id === existing.subject.id) || 0) % SUBJECT_COLORS.length] : "";
                                            const isBreak = p.name.toLowerCase().includes('lunch') || p.name.toLowerCase().includes('break');

                                            return (
                                                <td key={p.id} className="py-2 px-2 border-l border-purple-100/50 dark:border-zinc-800/50 align-middle">
                                                    {isBreak ? (
                                                        <div className="h-16 rounded-xl flex items-center justify-center bg-zinc-100/50 dark:bg-zinc-900/30 border border-zinc-200/50 dark:border-zinc-800/50">
                                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-zinc-400 dark:text-zinc-600">
                                                                {p.name}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div
                                                            onClick={() => handleCellClick(day, p, existing)}
                                                            className={cn(
                                                                "h-16 rounded-xl flex flex-col items-center justify-center text-center p-2 transition-all cursor-pointer border",
                                                                existing
                                                                    ? `${colorCls} group relative`
                                                                    : "border-dashed border-purple-200 dark:border-zinc-700 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 text-transparent hover:text-purple-400"
                                                            )}
                                                        >
                                                            {existing ? (
                                                                <>
                                                                    <div className="text-[11px] font-bold leading-tight line-clamp-1">{existing.subject.subject?.name}</div>
                                                                    <div className="text-[9px] opacity-80 mt-1 line-clamp-1 truncate w-full px-1">
                                                                        {existing.subject.teacher?.account ? `${existing.subject.teacher.account.firstName} ${existing.subject.teacher.account.lastName}` : "No Teacher"}
                                                                    </div>
                                                                    {canEdit && (
                                                                        <div className="absolute inset-0 bg-destructive/90 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                                                            <X className="h-3 w-3" /> Remove
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <Plus className="h-4 w-4" />
                                                            )}
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <AddSubjectDialog
                open={addSubjectOpen}
                onOpenChange={setAddSubjectOpen}
                classroomId={classroomId}
                onSuccess={onRefresh}
            />

            <ManagePeriodsDialog
                open={managePeriodsOpen}
                onOpenChange={setManagePeriodsOpen}
                classroomId={classroomId}
                periods={periods}
                onSuccess={onRefresh}
            />

            <BookSlotDialog
                open={bookSlotData.open}
                onOpenChange={v => setBookSlotData(prev => ({ ...prev, open: v }))}
                classroomId={classroomId}
                dayOfWeek={bookSlotData.dayOfWeek}
                period={bookSlotData.period}
                subjects={subjects}
                onSuccess={onRefresh}
            />

            <AlertDialog open={!!removeSlotId} onOpenChange={v => !v && setRemoveSlotId(null)}>
                <AlertDialogContent className="rounded-xl border border-purple-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-purple-950 dark:text-zinc-50 font-bold">Remove Subject from Slot?</AlertDialogTitle>
                        <AlertDialogDescription className="text-purple-900/70 dark:text-zinc-400">This will empty the period for this day.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="bg-purple-100/50 dark:bg-zinc-900 text-purple-950 dark:text-zinc-300 hover:bg-purple-100 dark:hover:bg-zinc-800 border-none h-10 px-4 rounded-lg font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (!removeSlotId) return;
                                const [subjectId, slotId] = removeSlotId.split("::");
                                removeSlotMutation.mutate({ subjectId, slotId });
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-white h-10 px-4 rounded-lg font-semibold"
                        >
                            {removeSlotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────
type ActiveTab = "roster" | "timetable";

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function ClassroomDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { can } = usePermissions();
    const [activeTab, setActiveTab] = useState<ActiveTab>("roster");

    const {
        data: classroom,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ["classroom", id],
        queryFn: () => fetchClassroom(id!),
        enabled: !!id && can("classrooms", "read"),
        staleTime: 30_000,
    });

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ["classroom", id] });
        refetch();
    };

    if (!can("classrooms", "read")) return <AccessDenied />;

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader2 className="h-7 w-7 animate-spin text-[#7f39c2]" />
            </div>
        );
    }

    if (!classroom) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <School className="h-10 w-10 text-purple-400/40" />
                <p className="font-bold text-sm">Classroom not found</p>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/classrooms")}
                    className="gap-2 text-purple-700 dark:text-purple-400">
                    <ArrowLeft className="h-4 w-4" /> Back to Classrooms
                </Button>
            </div>
        );
    }

    const canEdit = can("classrooms", "update");
    const enrollments = (classroom.enrollments ?? []) as ClassroomEnrollment[];
    const subjects = (classroom.subjects ?? []) as ClassroomSubject[];

    const tabs: { key: ActiveTab; label: string; icon: React.ElementType; count?: number }[] = [
        { key: "roster", label: "Roster", icon: Users, count: enrollments.length },
        { key: "timetable", label: "Timetable Builder", icon: LayoutGrid, count: subjects.length },
    ];

    return (
        <motion.div
            className="mx-auto text-foreground transition-colors duration-200 space-y-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            {/* Back + Header */}
            <div>
                <button
                    onClick={() => navigate("/dashboard/classrooms")}
                    className="flex items-center gap-1.5 text-xs font-bold text-purple-700/70 dark:text-purple-400/70
                               hover:text-purple-700 dark:hover:text-purple-300 transition-colors mb-3"
                >
                    <ArrowLeft className="h-3.5 w-3.5" /> Back to Classrooms
                </button>
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
                            {classroom.name}
                            <Badge variant="secondary" className="bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                                {classroom.section}
                            </Badge>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1.5 font-medium max-w-xl">
                            Manage classroom details, enrolled students, and schedule.
                        </p>
                    </div>
                </div>
            </div>

            {/* Custom Tabs */}
            <div className="flex items-center gap-2 border-b border-border/60 pb-px">
                {tabs.map(tab => {
                    const isActive = activeTab === tab.key;
                    const Icon = tab.icon;
                    return (
                        <button
                            key={tab.key}
                            onClick={() => setActiveTab(tab.key)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all relative -mb-px",
                                isActive
                                    ? "bg-white dark:bg-zinc-950 text-purple-800 dark:text-purple-300 shadow-sm border border-purple-100 dark:border-zinc-800"
                                    : "text-purple-900/60 dark:text-zinc-400 hover:text-purple-900 dark:hover:text-zinc-200 hover:bg-purple-600/5 dark:hover:bg-zinc-900"
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={cn(
                                    "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                    isActive
                                        ? "bg-purple-600/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-400"
                                        : "bg-muted text-muted-foreground"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Tab content */}
            <Card className="border border-purple-100 dark:border-zinc-800
                             shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.35)]
                             rounded-2xl bg-white dark:bg-zinc-900/40 overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-border/60 bg-muted/20 dark:bg-zinc-900/50">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        {activeTab === "roster" ? (
                            <><Users className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Student Roster</>
                        ) : (
                            <><LayoutGrid className="h-4 w-4 text-purple-600 dark:text-purple-400" /> Weekly Timetable</>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: activeTab === "roster" ? -10 : 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                        >
                            {activeTab === "roster" ? (
                                <RosterTab
                                    classroomId={classroom.id}
                                    enrollments={enrollments}
                                    canEdit={canEdit}
                                    onRefresh={refresh}
                                />
                            ) : (
                                <TimetableTab
                                    classroomId={classroom.id}
                                    subjects={subjects}
                                    periods={classroom.periods ?? []}
                                    canEdit={canEdit}
                                    onRefresh={refresh}
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
    );
}
