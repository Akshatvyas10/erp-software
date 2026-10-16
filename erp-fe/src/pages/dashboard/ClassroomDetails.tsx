import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    School, ArrowLeft, Users, LayoutGrid, Search, Plus, Trash2,
    Loader2, UserCheck, X, BookOpen, Clock, CheckCircle2, ClipboardCheck, CalendarIcon, FileText
} from "lucide-react";
import { format } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/store/hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { DetailsPageSkeleton } from "@/components/common/skeletons/DetailsPageSkeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import AccessDenied from "@/components/auth/AccessDenied";
import CreateSubjectDialog from "@/components/shared/CreateSubjectDialog";
import { AttendanceGrid } from "@/features/attendance/components/AttendanceGrid";
import { AttendanceChart } from "@/features/attendance/components/AttendanceChart";
import { useClassroomAttendance } from "@/features/attendance/api/useAttendance";
import HomeworkTab from "@/components/classrooms/HomeworkTab";
import GradebookTab from "@/components/classrooms/GradebookTab";
import type {

    Classroom, ClassroomEnrollment, ClassroomSubject, ClassroomPeriod,
    TimetableSlot, DayOfWeek, Teacher, Subject,
} from "@/types/erp";

// ─── Constants ────────────────────────────────────────────────────────────────
const WEEKDAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

const SUBJECT_COLORS = [
    "bg-primary/10 text-primary border-primary/20",
    "bg-accent/40 text-accent-foreground border-accent/50",
    "bg-muted/80 text-foreground border-border/80",
    "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    "bg-destructive/10 text-destructive border-destructive/20",
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
    monitorMaleId?: string;
    monitorFemaleId?: string;
}

function RosterTab({ classroomId, enrollments, canEdit, onRefresh, monitorMaleId, monitorFemaleId }: RosterTabProps) {
    const navigate = useNavigate();
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
                        className="gap-2 h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
                    <div className="h-14 w-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary/40" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">No students enrolled</p>
                </div>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="pl-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Student</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Student ID</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Grade</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Email</TableHead>
                                {canEdit && <TableHead className="pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEnrollments.map((enr, i) => {
                                const account = enr.student?.account || { firstName: "Unknown", lastName: "Student", email: "N/A" };
                                const { firstName, lastName, email } = account;
                                const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
                                const isMonitor = enr.student.id === monitorMaleId || enr.student.id === monitorFemaleId;
                                return (
                                    <TableRow key={enr.id}
                                        className={cn(
                                            "border-b border-border/40 last:border-0 hover:bg-muted/50 transition-colors",
                                            i % 2 === 0 ? "" : "bg-muted/20"
                                        )}>
                                        <TableCell className="pl-5 py-3.5">
                                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate(`/dashboard/students/${enr.student.id}`)}>
                                                <Avatar className="h-8 w-8 border border-primary/20 shadow-sm shrink-0 transition-transform group-hover:scale-105">
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground text-[13px] group-hover:text-primary transition-colors flex items-center gap-2">
                                                        {firstName} {lastName}
                                                        {isMonitor && (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20 uppercase font-bold tracking-wider">
                                                                Monitor
                                                            </Badge>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <Badge variant="outline" className="font-mono text-[11px] bg-muted/60 border-border/60 px-2">
                                                {enr.student.studentId}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3.5 text-muted-foreground font-medium hidden md:table-cell">
                                            {enr.student.grade ?? "—"}
                                        </TableCell>
                                        <TableCell className="py-3.5 text-muted-foreground text-[12px] hidden lg:table-cell">
                                            {email}
                                        </TableCell>
                                        {canEdit && (
                                            <TableCell className="pr-5 py-3.5 text-right">
                                                <Button
                                                    variant="ghost" size="icon"
                                                    className="h-8 w-8 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setRemoveId(enr.student.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Assign Students Dialog */}
            <Dialog open={assignOpen} onOpenChange={v => { setAssignOpen(v); if (!v) { setSelected(new Set()); setStudentSearch(""); } }}>
                <DialogContent className="sm:max-w-lg p-0 rounded-2xl border border-border/80 shadow-2xl bg-background">
                    <DialogHeader className="px-6 py-5 bg-muted/40 border-b border-border">
                        <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                            Assign Students
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-5 space-y-3">
                        <Command className="rounded-xl border border-border bg-transparent">
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
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
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
                                                    className="gap-3 cursor-pointer rounded-lg aria-selected:bg-accent"
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                        onCheckedChange={() => toggleStudent(student.id)}
                                                    />
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className="font-semibold text-[13px] text-foreground truncate">{name}</span>
                                                        <span className="text-[11px] text-muted-foreground font-mono">{student.studentId}</span>
                                                    </div>
                                                    {isChecked && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                                                </CommandItem>
                                            );
                                        })}
                                    </ScrollArea>
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        {selected.size > 0 && (
                            <p className="text-xs font-semibold text-primary bg-primary/10 px-3 py-2 rounded-lg">
                                {selected.size} student{selected.size !== 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>
                    <div className="px-6 py-4 bg-muted/40 border-t border-border flex justify-end gap-3">
                        <Button variant="outline" className="rounded-xl font-medium border-border/80 transition-colors"
                            onClick={() => setAssignOpen(false)}>Cancel</Button>
                        <Button
                            disabled={selected.size === 0 || assignMutation.isPending}
                            onClick={() => assignMutation.mutate(Array.from(selected))}
                            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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
                <AlertDialogContent className="w-[95vw] sm:max-w-lg mx-auto rounded-3xl p-6 border-border shadow-2xl bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">Remove Student?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2">
                            The student will be unenrolled from this classroom. Their account will not be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="h-11 rounded-xl font-semibold border-border/50 bg-background hover:bg-accent text-foreground transition-colors">Cancel</AlertDialogCancel>
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

    const inputCls = "h-9 bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50 rounded-lg focus-visible:outline-none";
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
                <div className="px-6 py-4 bg-muted/40 border-t border-border flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl font-medium border-border/80 transition-colors"
                        onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" form="subject-form"
                        className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
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



    const inputCls = "h-9 bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50 rounded-lg focus-visible:outline-none";
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
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 sm:items-end">
                        <div className="sm:col-span-4">
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
                        <div className="sm:col-span-3">
                            <label className={labelCls}>Start</label>
                            <Input
                                type="time"
                                className={inputCls}
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                            />
                        </div>
                        <div className="sm:col-span-3">
                            <label className={labelCls}>End</label>
                            <Input
                                type="time"
                                className={inputCls}
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                            />
                        </div>
                        <div className="sm:col-span-2">
                            <Button className="w-full h-9 bg-primary hover:bg-primary/90 text-primary-foreground transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" disabled={!name || addMutation.isPending}
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
            <DialogContent className="sm:max-w-sm p-0 rounded-2xl border border-border/80 shadow-2xl bg-background">
                <DialogHeader className="px-6 py-5 bg-muted/40 border-b border-border">
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
                            <SelectTrigger className="h-9 w-full bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
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
                            <SelectTrigger className="h-9 w-full bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
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
                <div className="px-6 py-4 bg-muted/40 border-t border-border flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl font-medium transition-colors" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" disabled={!globalSubjectId || mutation.isPending} onClick={() => mutation.mutate()}>
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
                            className="gap-2 h-9 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-semibold shadow-sm border border-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                            <BookOpen className="h-3.5 w-3.5" /> Add Subject
                        </Button>
                        <Button size="sm" onClick={() => setManagePeriodsOpen(true)}
                            className="gap-2 h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                            <Clock className="h-3.5 w-3.5" /> Manage Lectures
                        </Button>
                    </div>
                )}
            </div>

            {periods.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                        <LayoutGrid className="h-6 w-6 text-primary/40" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">No lectures defined</p>
                    <p className="text-xs text-muted-foreground/60">Add lectures to construct the timetable grid.</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-border overflow-hidden shadow-sm">
                    <div className="overflow-x-auto custom-scrollbar">
                        <Table className="min-w-[800px] border-collapse">
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                                    <TableHead className="pl-5 py-3.5 text-left min-w-[120px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground sticky left-0 bg-background/95 z-10 backdrop-blur-sm">
                                        Day
                                    </TableHead>
                                    {sortedPeriods.map(p => (
                                        <TableHead key={p.id} className="py-3.5 px-3 text-center min-w-[140px] border-l border-border/50">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-primary">{p.name}</div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{p.startTime.substring(0, 5)} - {p.endTime.substring(0, 5)}</div>
                                        </TableHead>
                                    ))}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {WEEKDAYS.map((day) => (
                                    <TableRow key={day} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                                        <TableCell className="pl-5 py-4 font-bold text-[12px] text-foreground sticky left-0 bg-background/95 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] backdrop-blur-sm">
                                            {day}
                                        </TableCell>
                                        {sortedPeriods.map(p => {
                                            const existing = slotMatrix[day]?.[p.id];
                                            const colorCls = existing ? SUBJECT_COLORS[(subjects.findIndex(s => s.id === existing.subject.id) || 0) % SUBJECT_COLORS.length] : "";
                                            const isBreak = p.name.toLowerCase().includes('lunch') || p.name.toLowerCase().includes('break');

                                            return (
                                                <TableCell key={p.id} className="py-2 px-2 border-l border-border/50 align-middle">
                                                    {isBreak ? (
                                                        <div className="h-16 rounded-xl flex items-center justify-center bg-muted/40 border border-border/50">
                                                            <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground/70">
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
                                                                    : "border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-transparent hover:text-primary/70"
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
                                                </TableCell>
                                            );
                                        })}
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
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
                <AlertDialogContent className="w-[95vw] sm:max-w-lg mx-auto rounded-3xl p-6 border-border shadow-2xl bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">Remove Subject from Slot?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2">This will empty the period for this day.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="h-11 rounded-xl font-semibold border-border/50 bg-background hover:bg-accent text-foreground transition-colors">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (!removeSlotId) return;
                                const [subjectId, slotId] = removeSlotId.split("::");
                                removeSlotMutation.mutate({ subjectId, slotId });
                            }}
                            className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                        >
                            {removeSlotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

// ─── TAB C: Attendance ────────────────────────────────────────────────────────
interface AttendanceTabProps {
    classroomId: string;
    canEdit: boolean;
}

function AttendanceTab({ classroomId }: AttendanceTabProps) {
    const { can } = usePermissions();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isEditing, setIsEditing] = useState(false);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { data: existingAttendance, isLoading: attendanceLoading, refetch } = useClassroomAttendance(classroomId, dateStr);

    // Auto-switch mode based on whether attendance exists for the selected date
    useMemo(() => {
        if (existingAttendance) {
            setIsEditing(existingAttendance.length === 0);
        }
    }, [dateStr, existingAttendance]);

    const hasAttendance = existingAttendance && existingAttendance.length > 0;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm">
                <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                        Daily Attendance
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage student attendance for the selected date.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {hasAttendance && !isEditing && can("attendance", "update") && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsEditing(true)}
                            className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/10 h-10"
                        >
                            Edit Attendance
                        </Button>
                    )}
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:block">Date</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-[200px] justify-start text-left font-normal rounded-xl h-10 border-border/60",
                                    !selectedDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-border/60 shadow-xl" align="end">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                    if (date) {
                                        setSelectedDate(date);
                                    }
                                }}
                                disabled={(date) => date > new Date()}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            
            {!isEditing && hasAttendance ? (
                <AttendanceChart attendance={existingAttendance} />
            ) : (
                <AttendanceGrid 
                    classroomId={classroomId} 
                    date={dateStr} 
                    canEdit={hasAttendance ? can("attendance", "update") : can("attendance", "create")} 
                    existingAttendance={existingAttendance || []}
                    attendanceLoading={attendanceLoading}
                    onSaveSuccess={() => {
                        refetch();
                        setIsEditing(false);
                    }}
                />
            )}
        </div>
    );
}

// ─── Tab type ─────────────────────────────────────────────────────────────────
type ActiveTab = "roster" | "timetable" | "attendance" | "homework" | "gradebook";

// ─── Main Page Component ──────────────────────────────────────────────────────
export default function ClassroomDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { can } = usePermissions();
    const { user } = useAuth();
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

    const subjects = (classroom?.subjects ?? []) as ClassroomSubject[];

    const teacherSubjectsMap = useMemo(() => {
        const map = new Map<string, { teacher: NonNullable<ClassroomSubject["teacher"]>, subjects: Subject[] }>();
        subjects.forEach(sub => {
            if (!sub.teacher) return;
            if (!map.has(sub.teacher.id)) {
                map.set(sub.teacher.id, { teacher: sub.teacher, subjects: [] });
            }
            if (sub.subject && !map.get(sub.teacher.id)!.subjects.find(s => s.id === sub.subject!.id)) {
                map.get(sub.teacher.id)!.subjects.push(sub.subject);
            }
        });
        return Array.from(map.values());
    }, [subjects]);

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ["classroom", id] });
        refetch();
    };

    if (!can("classrooms", "read")) return <AccessDenied />;

    if (isLoading) {
        return <DetailsPageSkeleton />;
    }

    if (!classroom) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <School className="h-10 w-10 text-primary/40" />
                <p className="font-bold text-sm text-foreground">Classroom not found</p>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/classrooms")}
                    className="gap-2 text-primary hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    <ArrowLeft className="h-4 w-4" /> Back to Classrooms
                </Button>
            </div>
        );
    }

    const isClassTeacher = user?.teacherId === classroom.classTeacherId;
    const canEdit = can("classrooms", "update") || isClassTeacher;
    const enrollments = (classroom.enrollments ?? []) as ClassroomEnrollment[];
    const tabs: { key: ActiveTab; label: string; icon: React.ElementType; count?: number }[] = [
        { key: "roster", label: "Roster", icon: Users, count: enrollments.length },
        { key: "timetable", label: "Timetable Builder", icon: LayoutGrid, count: subjects.length },
        { key: "homework", label: "Homework", icon: FileText },
    ];

    if (can("exams", "read") || isClassTeacher) {
        tabs.push({ key: "gradebook", label: "Gradebook", icon: BookOpen });
    }

    if (can("attendance", "read") || isClassTeacher) {
        tabs.push({ key: "attendance", label: "Attendance", icon: ClipboardCheck });
    }

    return (
        <motion.div
            className="mx-auto text-foreground transition-colors duration-200 space-y-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            {/* Back + Header */}
            <div className="pt-4 pb-2 px-1 -mx-1 border-b border-border/60">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
                            {classroom.name}
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                {classroom.section}
                            </Badge>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1.5 font-medium max-w-xl">
                            Manage classroom details, enrolled students, and schedule.
                        </p>
                    </div>
                </div>

                {/* Teachers Section */}
                <div className="mt-6 p-4 bg-muted/30 border border-border/50 rounded-xl">
                    <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-primary" />
                        Classroom Teachers
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {classroom.classTeacher && (
                            <div className="flex items-start gap-3 p-3 bg-background border border-border/60 rounded-lg shadow-sm">
                                <Avatar className="h-10 w-10 border border-primary/20">
                                    <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                        {classroom.classTeacher.account?.firstName?.[0]}
                                        {classroom.classTeacher.account?.lastName?.[0]}
                                    </AvatarFallback>
                                </Avatar>
                                <div>
                                    <p className="text-sm font-bold text-foreground flex items-center gap-2">
                                        {classroom.classTeacher.account?.firstName} {classroom.classTeacher.account?.lastName}
                                        <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] h-4 px-1.5 border-primary/20">Class Teacher</Badge>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-0.5 font-medium">{classroom.classTeacher.teacherId}</p>
                                </div>
                            </div>
                        )}
                        {teacherSubjectsMap.map(({ teacher, subjects }) => {
                            if (classroom.classTeacher && teacher.id === classroom.classTeacher.id) return null; // Avoid duplicate if they are also class teacher
                            return (
                                <div key={teacher.id} className="flex items-start gap-3 p-3 bg-background border border-border/60 rounded-lg shadow-sm">
                                    <Avatar className="h-10 w-10 border border-border/40">
                                        <AvatarFallback className="bg-muted text-muted-foreground font-bold">
                                            {teacher.account?.firstName?.[0]}
                                            {teacher.account?.lastName?.[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-bold text-foreground truncate">
                                            {teacher.account?.firstName} {teacher.account?.lastName}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                                            <span className="font-medium">{teacher.teacherId}</span>
                                            <span className="text-border/50">•</span>
                                            <span className="truncate">{subjects.map(s => s.name).join(", ")}</span>
                                        </p>
                                    </div>
                                </div>
                            );
                        })}
                        {!classroom.classTeacher && teacherSubjectsMap.length === 0 && (
                            <div className="col-span-full py-4 text-center">
                                <p className="text-sm text-muted-foreground font-medium">No teachers assigned to this classroom yet.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Custom Tabs */}
                <div className="flex items-center gap-2 mt-6 overflow-x-auto custom-scrollbar pb-px">
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
                                    ? "bg-muted border-b-2 border-primary text-primary"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                            )}
                        >
                            <Icon className="h-4 w-4 shrink-0" />
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={cn(
                                    "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                    isActive
                                        ? "bg-primary/10 text-primary"
                                        : "bg-muted text-muted-foreground"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    );
                })}
                </div>
            </div>

            {/* Tab content */}
            <Card className="border border-border shadow-sm rounded-2xl bg-card overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-border/60 bg-muted/20">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        {activeTab === "roster" ? (
                            <><Users className="h-4 w-4 text-primary" /> Student Roster</>
                        ) : activeTab === "timetable" ? (
                            <><LayoutGrid className="h-4 w-4 text-primary" /> Weekly Timetable</>
                        ) : activeTab === "homework" ? (
                            <><FileText className="h-4 w-4 text-primary" /> Homework & Assignments</>
                        ) : activeTab === "gradebook" ? (
                            <><BookOpen className="h-4 w-4 text-primary" /> Examination Gradebook</>
                        ) : (
                            <><ClipboardCheck className="h-4 w-4 text-primary" /> Daily Attendance</>
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
                                    monitorMaleId={classroom.monitorMaleId || undefined}
                                    monitorFemaleId={classroom.monitorFemaleId || undefined}
                                />
                            ) : activeTab === "timetable" ? (
                                <TimetableTab
                                    classroomId={classroom.id}
                                    subjects={subjects}
                                    periods={classroom.periods ?? []}
                                    canEdit={canEdit}
                                    onRefresh={refresh}
                                />
                            ) : activeTab === "homework" ? (
                                <HomeworkTab 
                                    classroomId={classroom.id} 
                                    classTeacherId={classroom.classTeacherId || undefined} 
                                    subjects={subjects} 
                                />
                            ) : activeTab === "gradebook" ? (
                                <GradebookTab 
                                    classroomId={classroom.id} 
                                    enrollments={enrollments} 
                                    subjects={subjects} 
                                    canEdit={can("exams", "manage") || isClassTeacher}
                                    classTeacherId={classroom.classTeacherId || undefined}
                                />
                            ) : (
                                <AttendanceTab 
                                    classroomId={classroom.id} 
                                    canEdit={can("attendance", "update") || can("attendance", "create") || isClassTeacher} 
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
    );
}
