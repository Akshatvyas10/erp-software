import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    LayoutGrid, Plus, Trash2, Loader2, BookOpen, Clock,
    Printer, UserCheck, AlertCircle
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
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

import api from "@/lib/api";
import CreateSubjectDialog from "@/components/shared/CreateSubjectDialog";
import { PrintableTimetableModal } from "@/features/classrooms/components/directory/PrintableTimetableModal";
import { AssignSubstituteTeacherDialog } from "@/features/classrooms/components/directory/AssignSubstituteTeacherDialog";
import {
    WEEKDAYS,
    SUBJECT_COLORS,
    fetchAllTeachers,
    fetchAllSubjects
} from "@/features/classrooms/api/classroomApi";
import type {
    ClassroomSubject,
    ClassroomPeriod,
    TimetableSlot,
    TimetableSubstitute,
    DayOfWeek
} from "@/types/erp";

// ─── Schemas ──────────────────────────────────────────────────────────────────
const subjectSchema = z.object({
    subjectId: z.string().min(1, "Subject is required"),
    teacherId: z.string().optional(),
});
type SubjectFormValues = z.infer<typeof subjectSchema>;

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

// ─── Manage Periods Dialog ───────────────────────────────────────────────────
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

// ─── Book Slot Dialog ────────────────────────────────────────────────────────
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
    const [conflictError, setConflictError] = useState<string | null>(null);

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

    const selectedSubject = allSubjects.find(s => s.id === globalSubjectId);
    const filteredTeachers = selectedSubject
        ? allTeachers.filter(t => (t.subjects || []).includes(selectedSubject.name))
        : allTeachers;

    const mutation = useMutation({
        mutationFn: async () => {
            setConflictError(null);
            const subjectRes = await api.post(`/classrooms/${classroomId}/subjects`, {
                subjectId: globalSubjectId,
                teacherId: teacherId === "none" ? undefined : (teacherId || undefined),
            });
            const classroomSubjectId = subjectRes.data.data.subject.id;

            await api.post(`/classrooms/${classroomId}/subjects/${classroomSubjectId}/timetable`, {
                dayOfWeek, startTime: period?.startTime, endTime: period?.endTime
            });
        },
        onSuccess: () => {
            toast.success("Slot booked successfully");
            setGlobalSubjectId("");
            setTeacherId("");
            setConflictError(null);
            onSuccess();
            onOpenChange(false);
        },
        onError: (err: any) => {
            const status = err?.response?.status;
            const errorMsg = err?.response?.data?.message || "Failed to book slot";
            const isConflict = status === 409 || errorMsg.toLowerCase().includes("conflict") || errorMsg.toLowerCase().includes("clash") || errorMsg.toLowerCase().includes("already");

            if (isConflict) {
                // Display conflict error inside the dialog, not in toaster
                setConflictError(errorMsg);
            } else {
                toast.error(errorMsg);
            }
        }
    });

    if (!period) return null;

    const handleClose = (isOpen: boolean) => {
        if (!isOpen) {
            setConflictError(null);
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-md p-0 rounded-2xl border border-border/80 shadow-2xl bg-background">
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
                            setTeacherId("");
                            setConflictError(null);
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
                        <Select value={teacherId} onValueChange={(val) => {
                            setTeacherId(val);
                            setConflictError(null);
                        }} disabled={!globalSubjectId}>
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

                    {/* Teacher / Room Conflict Alert in Dialog */}
                    {conflictError && (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 space-y-1.5 animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 font-bold text-xs">
                                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span>Schedule Conflict Detected</span>
                            </div>
                            <p className="text-xs leading-relaxed pl-6">
                                {conflictError}
                            </p>
                        </div>
                    )}
                </div>
                <div className="px-6 py-4 bg-muted/40 border-t border-border flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl font-medium transition-colors" onClick={() => handleClose(false)}>Cancel</Button>
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" disabled={!globalSubjectId || mutation.isPending} onClick={() => mutation.mutate()}>
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book Slot"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Timetable Tab Component ─────────────────────────────────────────────────
export interface ClassroomTimetableTabProps {
    classroomId: string;
    classroomName?: string;
    section?: string;
    academicYear?: string;
    roomNumber?: string | null;
    classTeacherName?: string | null;
    subjects: ClassroomSubject[];
    periods: ClassroomPeriod[];
    canEdit: boolean;
    onRefresh: () => void;
}

export function ClassroomTimetableTab({
    classroomId,
    classroomName = "Classroom",
    section = "A",
    academicYear = "2026-2027",
    roomNumber,
    classTeacherName,
    subjects,
    periods,
    canEdit,
    onRefresh
}: ClassroomTimetableTabProps) {
    const [managePeriodsOpen, setManagePeriodsOpen] = useState(false);
    const [addSubjectOpen, setAddSubjectOpen] = useState(false);
    const [printModalOpen, setPrintModalOpen] = useState(false);
    const [bookSlotData, setBookSlotData] = useState<{ open: boolean; dayOfWeek: DayOfWeek; period: ClassroomPeriod | null }>({
        open: false,
        dayOfWeek: 'Monday',
        period: null
    });
    const [removeSlotId, setRemoveSlotId] = useState<string | null>(null);

    // Selected Slot Details Modal (Manage Slot / Proxy)
    const [selectedSlotManage, setSelectedSlotManage] = useState<{
        slot: TimetableSlot;
        subject: ClassroomSubject;
        day: DayOfWeek;
        period: ClassroomPeriod;
    } | null>(null);

    // Assign Substitute Modal state
    const [substituteModalData, setSubstituteModalData] = useState<{
        open: boolean;
        slot: TimetableSlot | null;
        subject: ClassroomSubject | null;
    }>({
        open: false,
        slot: null,
        subject: null
    });

    // Fetch active substitutes for this classroom
    const { data: substitutes = [], refetch: refetchSubstitutes } = useQuery<TimetableSubstitute[]>({
        queryKey: ["timetable-substitutes", classroomId],
        queryFn: async () => {
            const res = await api.get(`/classrooms/${classroomId}/substitutes`);
            return res.data?.data?.substitutes || [];
        },
        staleTime: 15_000,
    });

    const cancelSubMutation = useMutation({
        mutationFn: (subId: string) => api.delete(`/classrooms/${classroomId}/substitutes/${subId}`),
        onSuccess: () => {
            toast.success("Substitute teacher cancelled");
            refetchSubstitutes();
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to cancel substitute");
        }
    });

    const sortedPeriods = useMemo(() => [...periods].sort((a, b) => a.order - b.order), [periods]);

    const removeSlotMutation = useMutation({
        mutationFn: ({ subjectId, slotId }: { subjectId: string; slotId: string }) =>
            api.delete(`/classrooms/${classroomId}/subjects/${subjectId}/timetable/${slotId}`),
        onSuccess: () => {
            toast.success("Slot removed");
            setRemoveSlotId(null);
            setSelectedSlotManage(null);
            onRefresh();
        },
        onError: () => toast.error("Failed to remove slot"),
    });

    const slotMatrix = useMemo(() => {
        const map: Record<string, Record<string, { slot: TimetableSlot, subject: ClassroomSubject }>> = {};
        for (const subj of subjects) {
            for (const slot of subj.schedule ?? []) {
                if (!map[slot.dayOfWeek]) map[slot.dayOfWeek] = {};
                const period = periods.find(p => {
                    const pStart = p.startTime ? p.startTime.substring(0, 5) : "";
                    const pEnd = p.endTime ? p.endTime.substring(0, 5) : "";
                    const sStart = slot.startTime ? slot.startTime.substring(0, 5) : "";
                    const sEnd = slot.endTime ? slot.endTime.substring(0, 5) : "";
                    return (pStart && sStart && pStart === sStart && pEnd === sEnd) ||
                        (sStart && pStart && pEnd && sStart >= pStart && sStart < pEnd);
                });
                if (period) {
                    map[slot.dayOfWeek][period.id] = { slot, subject: subj };
                }
            }
        }
        return map;
    }, [subjects, periods]);

    // Map substitutes by timetable slot id
    const substitutesBySlotId = useMemo(() => {
        const map: Record<string, TimetableSubstitute[]> = {};
        for (const sub of substitutes) {
            if (!map[sub.timetableId]) map[sub.timetableId] = [];
            map[sub.timetableId].push(sub);
        }
        return map;
    }, [substitutes]);

    const handleCellClick = (day: DayOfWeek, period: ClassroomPeriod, existing?: { slot: TimetableSlot, subject: ClassroomSubject }) => {
        if (existing) {
            setSelectedSlotManage({ slot: existing.slot, subject: existing.subject, day, period });
        } else if (canEdit) {
            setBookSlotData({ open: true, dayOfWeek: day, period });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-900/50 dark:text-zinc-500">
                    {periods.length} Lecture{periods.length !== 1 ? "s" : ""} configured
                </p>
                <div className="flex items-center gap-2 flex-wrap">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrintModalOpen(true)}
                        className="gap-1.5 h-9 px-3 rounded-xl font-bold border-border/80 hover:bg-muted text-xs shadow-2xs"
                    >
                        <Printer className="h-3.5 w-3.5 text-primary" /> Print / PDF Timetable
                    </Button>
                    {canEdit && (
                        <>
                            <Button size="sm" onClick={() => setAddSubjectOpen(true)}
                                className="gap-2 h-9 px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl font-semibold shadow-sm border border-primary/20 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                <BookOpen className="h-3.5 w-3.5" /> Add Subject
                            </Button>
                            <Button size="sm" onClick={() => setManagePeriodsOpen(true)}
                                className="gap-2 h-9 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                <Clock className="h-3.5 w-3.5" /> Manage Lectures
                            </Button>
                        </>
                    )}
                </div>
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
                                            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{(p.startTime?.substring(0, 5) || "--:--")} - {(p.endTime?.substring(0, 5) || "--:--")}</div>
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
                                            const slotSubs = existing ? (substitutesBySlotId[existing.slot.id] || []) : [];
                                            const hasProxy = slotSubs.length > 0;

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
                                                                "min-h-16 py-1.5 px-2 rounded-xl flex flex-col items-center justify-center text-center transition-all border",
                                                                existing ? "cursor-pointer" : canEdit ? "cursor-pointer" : "cursor-default",
                                                                existing
                                                                    ? `${colorCls} group relative hover:shadow-md`
                                                                    : canEdit
                                                                        ? "border-dashed border-border hover:border-primary/50 hover:bg-primary/5 text-transparent hover:text-primary/70"
                                                                        : "border-border/40 text-transparent"
                                                            )}
                                                        >
                                                            {existing ? (
                                                                <>
                                                                    <div className="text-[11px] font-bold leading-tight line-clamp-1">{existing.subject.subject?.name}</div>
                                                                    <div className="text-[9px] opacity-80 mt-0.5 line-clamp-1 truncate w-full px-1">
                                                                        {existing.subject.teacher?.account ? `${existing.subject.teacher.account.firstName} ${existing.subject.teacher.account.lastName}` : "No Teacher"}
                                                                    </div>
                                                                    {hasProxy && (
                                                                        <div className="mt-1 flex items-center gap-1 bg-amber-500/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded text-[8px] font-extrabold border border-amber-500/35 truncate max-w-full">
                                                                            <UserCheck className="w-2.5 h-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                                                            <span className="truncate">Proxy: {slotSubs[0].substituteTeacher?.account?.firstName}</span>
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : canEdit ? (
                                                                <Plus className="h-4 w-4" />
                                                            ) : (
                                                                <span className="text-[10px] text-muted-foreground/30 font-bold">—</span>
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

            {/* ── Manage Period Slot Details & Proxy Dialog ────────────────────────── */}
            <Dialog open={!!selectedSlotManage} onOpenChange={v => !v && setSelectedSlotManage(null)}>
                <DialogContent className="sm:max-w-md p-0 rounded-2xl border border-border shadow-2xl bg-card">
                    {selectedSlotManage && (() => {
                        const { slot, subject, day, period } = selectedSlotManage;
                        const slotSubs = substitutesBySlotId[slot.id] || [];
                        const teacher = subject.teacher?.account
                            ? `${subject.teacher.account.firstName} ${subject.teacher.account.lastName}`
                            : "No Teacher Assigned";

                        return (
                            <>
                                <DialogHeader className="px-6 py-5 bg-gradient-to-r from-primary/10 via-muted/30 to-card border-b border-border">
                                    <div className="flex items-center gap-2">
                                        <Badge className="bg-primary text-primary-foreground font-black text-xs">
                                            {day} • {period.name}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            {(period.startTime?.substring(0, 5) || "--:--")} - {(period.endTime?.substring(0, 5) || "--:--")}
                                        </span>
                                    </div>
                                    <DialogTitle className="text-lg font-black text-foreground mt-1">
                                        {subject.subject?.name} <span className="text-xs font-normal text-muted-foreground font-mono">({subject.subject?.code})</span>
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="p-6 space-y-4">
                                    {/* Faculty Info Card */}
                                    <div className="p-3.5 rounded-xl border border-border/80 bg-muted/20 flex items-center justify-between">
                                        <div>
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Assigned Faculty</p>
                                            <p className="text-sm font-bold text-foreground mt-0.5">{teacher}</p>
                                            {subject.teacher && (
                                                <p className="text-[10px] text-muted-foreground font-mono">ID: {subject.teacher.teacherId}</p>
                                            )}
                                        </div>
                                        <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center font-bold text-xs">
                                            {teacher[0]}
                                        </div>
                                    </div>

                                    {/* Substitutes / Proxy Section */}
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                                <UserCheck className="w-3 h-3 text-amber-500" /> Proxy / Substitute Teachers
                                            </p>
                                            <Badge variant="outline" className="text-[10px] font-bold">
                                                {slotSubs.length} Active
                                            </Badge>
                                        </div>

                                        {slotSubs.length === 0 ? (
                                            <div className="p-3 rounded-xl border border-dashed border-border text-center text-xs text-muted-foreground">
                                                No substitute assigned for this period slot.
                                            </div>
                                        ) : (
                                            <div className="space-y-2 max-h-40 overflow-y-auto">
                                                {slotSubs.map(sub => (
                                                    <div key={sub.id} className="p-2.5 rounded-xl border border-amber-500/30 bg-amber-500/5 flex items-center justify-between text-xs">
                                                        <div>
                                                            <div className="flex items-center gap-1.5">
                                                                <span className="font-bold text-foreground">
                                                                    {sub.substituteTeacher?.account?.firstName} {sub.substituteTeacher?.account?.lastName}
                                                                </span>
                                                                <span className="text-[10px] text-muted-foreground">
                                                                    ({sub.substituteTeacher?.teacherId})
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                                <span>Date: <strong className="text-foreground">{format(new Date(sub.date), 'dd MMM yyyy')}</strong></span>
                                                                {sub.reason && <span>• {sub.reason}</span>}
                                                            </div>
                                                        </div>
                                                        {canEdit && (
                                                            <Button
                                                                variant="ghost"
                                                                size="icon"
                                                                className="h-7 w-7 text-destructive hover:bg-destructive/10 rounded-lg"
                                                                title="Cancel Substitute"
                                                                onClick={() => cancelSubMutation.mutate(sub.id)}
                                                                disabled={cancelSubMutation.isPending}
                                                            >
                                                                <Trash2 className="w-3.5 h-3.5" />
                                                            </Button>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="px-6 py-4 bg-muted/40 border-t border-border flex items-center justify-between gap-2">
                                    {canEdit ? (
                                        <Button
                                            variant="destructive"
                                            size="sm"
                                            className="gap-1.5 rounded-xl text-xs font-bold"
                                            onClick={() => {
                                                setRemoveSlotId(`${subject.id}::${slot.id}`);
                                            }}
                                        >
                                            <Trash2 className="w-3.5 h-3.5" /> Remove Slot
                                        </Button>
                                    ) : <div />}

                                    <div className="flex items-center gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="rounded-xl text-xs font-bold"
                                            onClick={() => setSelectedSlotManage(null)}
                                        >
                                            Close
                                        </Button>
                                        {canEdit && (
                                            <Button
                                                size="sm"
                                                className="gap-1.5 rounded-xl text-xs font-bold bg-primary text-primary-foreground shadow-xs"
                                                onClick={() => {
                                                    setSubstituteModalData({
                                                        open: true,
                                                        slot,
                                                        subject,
                                                    });
                                                }}
                                            >
                                                <UserCheck className="w-3.5 h-3.5" /> Assign Proxy
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

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

            {/* ── Printable Timetable Modal ────────────────────────────────────── */}
            <PrintableTimetableModal
                open={printModalOpen}
                onOpenChange={setPrintModalOpen}
                classroomName={classroomName}
                section={section}
                academicYear={academicYear}
                roomNumber={roomNumber}
                classTeacherName={classTeacherName}
                periods={periods}
                subjects={subjects}
            />

            {/* ── Assign Substitute Dialog ─────────────────────────────────────── */}
            <AssignSubstituteTeacherDialog
                open={substituteModalData.open}
                onOpenChange={v => setSubstituteModalData(prev => ({ ...prev, open: v }))}
                classroomId={classroomId}
                slot={substituteModalData.slot}
                subject={substituteModalData.subject}
                onSuccess={() => {
                    refetchSubstitutes();
                    onRefresh();
                }}
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

export default ClassroomTimetableTab;

