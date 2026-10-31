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
import { Badge } from "@/components/ui/badge";
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
import { ManageLecturesDialog } from "@/features/classrooms/components/directory/ManageLecturesDialog";
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

function ManagePeriodsDialog(props: ManagePeriodsDialogProps) {
    return <ManageLecturesDialog {...props} />;
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
        initialDate?: string | null;
    }>({
        open: false,
        slot: null,
        subject: null,
        initialDate: null,
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

    // Current Week Anchor (defaults to Monday of the current week)
    const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
        const now = new Date();
        const day = now.getDay(); // 0 is Sunday, 1 is Monday...
        const diffToMonday = (day === 0 ? -6 : 1) - day;
        const monday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diffToMonday, 12, 0, 0);
        return monday;
    });

    // Helper: calculate exact calendar date string (YYYY-MM-DD) for each weekday in current week
    const weekDates = useMemo(() => {
        const dates: Record<string, { date: Date; dateStr: string; label: string }> = {};
        const dayOffsets: Record<DayOfWeek, number> = {
            Monday: 0,
            Tuesday: 1,
            Wednesday: 2,
            Thursday: 3,
            Friday: 4,
            Saturday: 5,
            Sunday: 6,
        };

        for (const day of WEEKDAYS) {
            const offset = dayOffsets[day] ?? 0;
            const d = new Date(currentWeekStart);
            d.setDate(currentWeekStart.getDate() + offset);
            const dateStr = format(d, 'yyyy-MM-dd');
            const label = format(d, 'dd MMM');
            dates[day] = { date: d, dateStr, label };
        }
        return dates;
    }, [currentWeekStart]);

    const weekRangeLabel = useMemo(() => {
        const saturday = new Date(currentWeekStart);
        saturday.setDate(currentWeekStart.getDate() + 5);
        return `${format(currentWeekStart, 'dd MMM yyyy')} - ${format(saturday, 'dd MMM yyyy')}`;
    }, [currentWeekStart]);

    const isCurrentCalendarWeek = useMemo(() => {
        const now = new Date();
        const day = now.getDay();
        const diff = (day === 0 ? -6 : 1) - day;
        const thisMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 12, 0, 0);
        return format(thisMonday, 'yyyy-MM-dd') === format(currentWeekStart, 'yyyy-MM-dd');
    }, [currentWeekStart]);

    const handlePrevWeek = () => {
        setCurrentWeekStart(prev => {
            const d = new Date(prev);
            d.setDate(prev.getDate() - 7);
            return d;
        });
    };

    const handleNextWeek = () => {
        setCurrentWeekStart(prev => {
            const d = new Date(prev);
            d.setDate(prev.getDate() + 7);
            return d;
        });
    };

    const handleCurrentWeek = () => {
        const now = new Date();
        const day = now.getDay();
        const diff = (day === 0 ? -6 : 1) - day;
        setCurrentWeekStart(new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff, 12, 0, 0));
    };

    // Map substitutes by "timetableId::date" for instant exact-date matching
    const substitutesBySlotAndDate = useMemo(() => {
        const map: Record<string, TimetableSubstitute[]> = {};
        for (const sub of substitutes) {
            const key = `${sub.timetableId}::${sub.date}`;
            if (!map[key]) map[key] = [];
            map[key].push(sub);
        }
        return map;
    }, [substitutes]);

    // Map all substitutes by timetableId for the modal list view
    const substitutesBySlotId = useMemo(() => {
        const todayStr = format(new Date(), 'yyyy-MM-dd');
        const map: Record<string, TimetableSubstitute[]> = {};
        for (const sub of substitutes) {
            if (!map[sub.timetableId]) map[sub.timetableId] = [];
            map[sub.timetableId].push(sub);
        }
        for (const slotId in map) {
            map[slotId].sort((a, b) => {
                const aFuture = a.date >= todayStr;
                const bFuture = b.date >= todayStr;
                if (aFuture && !bFuture) return -1;
                if (!aFuture && bFuture) return 1;
                return a.date.localeCompare(b.date);
            });
        }
        return map;
    }, [substitutes]);

    // Mobile Selected Day State (defaults to current weekday if Mon-Sat, else Monday)
    const [selectedMobileDay, setSelectedMobileDay] = useState<DayOfWeek>(() => {
        const todayName = format(new Date(), "EEEE") as DayOfWeek;
        return (WEEKDAYS as readonly string[]).includes(todayName) ? todayName : "Monday";
    });

    const handleCellClick = (day: DayOfWeek, period: ClassroomPeriod, existing?: { slot: TimetableSlot, subject: ClassroomSubject }) => {
        if (existing) {
            setSelectedSlotManage({ slot: existing.slot, subject: existing.subject, day, period });
        } else if (canEdit) {
            setBookSlotData({ open: true, dayOfWeek: day, period });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-xs font-bold uppercase tracking-wider text-purple-900/50 dark:text-zinc-500">
                        {periods.length} Lecture{periods.length !== 1 ? "s" : ""} configured
                    </p>

                    {/* Week Selector / Date-Scope Controls */}
                    <div className="flex items-center bg-muted/60 dark:bg-zinc-900/70 p-1 rounded-xl border border-border/80 text-xs shadow-2xs gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            onClick={handlePrevWeek}
                            title="Previous Week"
                        >
                            &larr;
                        </Button>
                        <span className="px-2 font-bold font-mono text-[10px] sm:text-[11px] text-foreground tracking-tight select-none">
                            Week: {weekRangeLabel}
                        </span>
                        <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 rounded-lg text-muted-foreground hover:text-foreground"
                            onClick={handleNextWeek}
                            title="Next Week"
                        >
                            &rarr;
                        </Button>
                        {!isCurrentCalendarWeek && (
                            <Button
                                variant="outline"
                                size="sm"
                                className="h-6 px-1.5 sm:px-2 text-[9px] sm:text-[10px] font-bold rounded-lg border-primary/30 text-primary hover:bg-primary/10 ml-0.5 sm:ml-1"
                                onClick={handleCurrentWeek}
                            >
                                This Week
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap w-full sm:w-auto">
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPrintModalOpen(true)}
                        className="gap-1.5 h-8 sm:h-9 px-2.5 sm:px-3 rounded-lg sm:rounded-xl font-bold border-border/80 hover:bg-muted text-[11px] sm:text-xs shadow-2xs flex-1 sm:flex-none justify-center"
                    >
                        <Printer className="h-3.5 w-3.5 text-primary" /> Print / PDF
                    </Button>
                    {canEdit && (
                        <>
                            <Button size="sm" onClick={() => setAddSubjectOpen(true)}
                                className="gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-4 bg-primary/10 hover:bg-primary/20 text-primary rounded-lg sm:rounded-xl font-semibold shadow-xs border border-primary/20 transition-colors text-[11px] sm:text-xs flex-1 sm:flex-none justify-center">
                                <BookOpen className="h-3.5 w-3.5" /> Add Subject
                            </Button>
                            <Button size="sm" onClick={() => setManagePeriodsOpen(true)}
                                className="gap-1.5 sm:gap-2 h-8 sm:h-9 px-2.5 sm:px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-lg sm:rounded-xl font-semibold shadow-xs transition-colors text-[11px] sm:text-xs flex-1 sm:flex-none justify-center">
                                <Clock className="h-3.5 w-3.5" /> Lectures
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
                <>
                    {/* ── MOBILE VIEW: Compact Day Selector Chips + Stacked Period Cards (< 768px) ── */}
                    <div className="block md:hidden space-y-3">
                        {/* Day Selector Chips Strip */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            {WEEKDAYS.map((day) => {
                                const isSelected = selectedMobileDay === day;
                                const dayInfo = weekDates[day];
                                const hasPeriods = sortedPeriods.some(p => slotMatrix[day]?.[p.id]);

                                return (
                                    <button
                                        key={day}
                                        type="button"
                                        onClick={() => setSelectedMobileDay(day)}
                                        className={cn(
                                            "flex flex-col items-center px-3 py-1.5 rounded-xl border text-xs font-bold transition-all shrink-0",
                                            isSelected
                                                ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                                : "bg-card text-muted-foreground border-border/70 hover:bg-muted/60"
                                        )}
                                    >
                                        <span className="text-[11px] uppercase tracking-wider">{day.slice(0, 3)}</span>
                                        <span className={cn("text-[9px] font-mono", isSelected ? "text-primary-foreground/90 font-bold" : "text-muted-foreground/70")}>
                                            {dayInfo?.label || ""}
                                        </span>
                                        {hasPeriods && !isSelected && (
                                            <span className="w-1 h-1 rounded-full bg-primary mt-0.5" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>

                        {/* Selected Day Header Label */}
                        <div className="flex items-center justify-between px-1">
                            <span className="text-xs font-bold text-foreground">
                                {selectedMobileDay} Schedule
                            </span>
                            <span className="text-[10px] font-mono text-muted-foreground">
                                {weekDates[selectedMobileDay]?.label}
                            </span>
                        </div>

                        {/* Mobile Period Cards List for Selected Day */}
                        <div className="space-y-2">
                            {sortedPeriods.map((p, idx) => {
                                const existing = slotMatrix[selectedMobileDay]?.[p.id];
                                const isBreak = p.name.toLowerCase().includes('lunch') || p.name.toLowerCase().includes('break');
                                const cellDateStr = weekDates[selectedMobileDay]?.dateStr;
                                const exactDateKey = existing && cellDateStr ? `${existing.slot.id}::${cellDateStr}` : '';
                                const slotDateSubs = exactDateKey ? (substitutesBySlotAndDate[exactDateKey] || []) : [];
                                const hasProxyOnThisDate = slotDateSubs.length > 0;
                                const activeSubOnDate = slotDateSubs[0];
                                const colorCls = existing ? SUBJECT_COLORS[(subjects.findIndex(s => s.id === existing.subject.id) || 0) % SUBJECT_COLORS.length] : "";

                                if (isBreak) {
                                    return (
                                        <div
                                            key={p.id}
                                            className="p-2.5 rounded-xl border border-dashed border-border bg-muted/30 flex items-center justify-between text-xs"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-muted text-muted-foreground font-mono text-[10px] flex items-center justify-center font-bold">
                                                    {idx + 1}
                                                </div>
                                                <span className="font-bold text-[11px] text-muted-foreground uppercase tracking-wider">
                                                    {p.name}
                                                </span>
                                            </div>
                                            <Badge variant="outline" className="text-[9px] font-mono text-muted-foreground bg-background">
                                                {(p.startTime?.substring(0, 5) || "--:--")} - {(p.endTime?.substring(0, 5) || "--:--")}
                                            </Badge>
                                        </div>
                                    );
                                }

                                return (
                                    <div
                                        key={p.id}
                                        onClick={() => handleCellClick(selectedMobileDay, p, existing)}
                                        className={cn(
                                            "p-3 rounded-xl border transition-all flex flex-col justify-between gap-2",
                                            existing
                                                ? cn(colorCls, "shadow-2xs cursor-pointer active:scale-[0.99]")
                                                : canEdit
                                                    ? "border-dashed border-border bg-card/50 hover:border-primary/40 hover:bg-primary/5 cursor-pointer text-muted-foreground"
                                                    : "border-border/40 bg-muted/10 opacity-60 cursor-default"
                                        )}
                                    >
                                        <div className="flex items-center justify-between gap-2">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <div className="w-6 h-6 rounded-md bg-background/80 text-foreground font-bold text-[10px] flex items-center justify-center shrink-0 border border-border/40">
                                                    {idx + 1}
                                                </div>
                                                <div className="min-w-0">
                                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">
                                                        {p.name}
                                                    </span>
                                                    <h4 className="text-xs font-black text-foreground truncate">
                                                        {existing ? existing.subject.subject?.name : canEdit ? "+ Assign Subject" : "Free Period"}
                                                    </h4>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="text-[9px] font-mono bg-background/90 text-foreground shrink-0 border-border/60">
                                                {(p.startTime?.substring(0, 5) || "--:--")} - {(p.endTime?.substring(0, 5) || "--:--")}
                                            </Badge>
                                        </div>

                                        {existing && (
                                            <div className="flex items-center justify-between pt-1.5 border-t border-border/40 text-[11px]">
                                                <span className="text-muted-foreground truncate">
                                                    Faculty: <strong className="text-foreground font-semibold">
                                                        {existing.subject.teacher?.account
                                                            ? `${existing.subject.teacher.account.firstName} ${existing.subject.teacher.account.lastName}`
                                                            : "Unassigned"}
                                                    </strong>
                                                </span>
                                                {roomNumber && (
                                                    <span className="text-[10px] font-mono text-muted-foreground shrink-0">
                                                        Room {roomNumber}
                                                    </span>
                                                )}
                                            </div>
                                        )}

                                        {hasProxyOnThisDate && (
                                            <div className="pt-1">
                                                {activeSubOnDate.status === 'PENDING' ? (
                                                    <div className="flex items-center gap-1 bg-rose-500/20 text-rose-800 dark:text-rose-200 px-2 py-0.5 rounded text-[9px] font-extrabold border border-rose-500/35">
                                                        <AlertCircle className="w-3 h-3 shrink-0 text-rose-600 dark:text-rose-400" />
                                                        <span>Need Substitute Teacher</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-1 bg-amber-500/20 text-amber-800 dark:text-amber-200 px-2 py-0.5 rounded text-[9px] font-extrabold border border-amber-500/35">
                                                        <UserCheck className="w-3 h-3 shrink-0 text-amber-600 dark:text-amber-400" />
                                                        <span>Proxy: {activeSubOnDate.substituteTeacher?.account?.firstName || 'Assigned'}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* ── DESKTOP VIEW: Full Weekly Matrix Grid (hidden on mobile md:block) ── */}
                    <div className="hidden md:block rounded-2xl border border-border overflow-hidden shadow-sm">
                        <div className="overflow-x-auto custom-scrollbar">
                            <Table className="min-w-[800px] border-collapse">
                                <TableHeader>
                                    <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/60">
                                        <TableHead className="pl-5 py-3.5 text-left min-w-[130px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground sticky left-0 bg-background/95 z-10 backdrop-blur-sm">
                                            Day & Date
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
                                    {WEEKDAYS.map((day) => {
                                        const dayInfo = weekDates[day];
                                        const cellDateStr = dayInfo?.dateStr;

                                        return (
                                            <TableRow key={day} className="border-b border-border/60 last:border-0 hover:bg-muted/30 transition-colors">
                                                <TableCell className="pl-5 py-4 font-bold text-[12px] text-foreground sticky left-0 bg-background/95 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] backdrop-blur-sm">
                                                    <div>{day}</div>
                                                    {dayInfo && (
                                                        <div className="text-[10px] font-normal text-muted-foreground font-mono mt-0.5">
                                                            {dayInfo.label}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                {sortedPeriods.map(p => {
                                                    const existing = slotMatrix[day]?.[p.id];
                                                    const colorCls = existing ? SUBJECT_COLORS[(subjects.findIndex(s => s.id === existing.subject.id) || 0) % SUBJECT_COLORS.length] : "";
                                                    const isBreak = p.name.toLowerCase().includes('lunch') || p.name.toLowerCase().includes('break');
                                                    
                                                    // EXACT DATE MATCH: Only show proxy if it belongs to this exact calendar date in this week!
                                                    const exactDateKey = existing && cellDateStr ? `${existing.slot.id}::${cellDateStr}` : '';
                                                    const slotDateSubs = exactDateKey ? (substitutesBySlotAndDate[exactDateKey] || []) : [];
                                                    const hasProxyOnThisDate = slotDateSubs.length > 0;
                                                    const activeSubOnDate = slotDateSubs[0];

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
                                                                            {hasProxyOnThisDate && (
                                                                                activeSubOnDate.status === 'PENDING' ? (
                                                                                    <div className="mt-1 flex items-center gap-1 bg-rose-500/20 text-rose-800 dark:text-rose-200 px-1.5 py-0.5 rounded text-[8px] font-extrabold border border-rose-500/35 truncate max-w-full animate-pulse" title={`Substitute needed for ${format(new Date(activeSubOnDate.date + 'T12:00:00'), 'dd MMM yyyy')}`}>
                                                                                        <AlertCircle className="w-2.5 h-2.5 shrink-0 text-rose-600 dark:text-rose-400" />
                                                                                        <span className="truncate">Need Sub ({format(new Date(activeSubOnDate.date + 'T12:00:00'), 'dd MMM')})</span>
                                                                                    </div>
                                                                                ) : (
                                                                                    <div className="mt-1 flex items-center gap-1 bg-amber-500/20 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded text-[8px] font-extrabold border border-amber-500/35 truncate max-w-full" title={`Proxy assigned for ${format(new Date(activeSubOnDate.date + 'T12:00:00'), 'dd MMM yyyy')}`}>
                                                                                        <UserCheck className="w-2.5 h-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                                                                                        <span className="truncate">Proxy: {activeSubOnDate.substituteTeacher?.account?.firstName || 'Assigned'} ({format(new Date(activeSubOnDate.date + 'T12:00:00'), 'dd MMM')})</span>
                                                                                    </div>
                                                                                )
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
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </>
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
                        const activeWeekDateForDay = weekDates[day]?.dateStr;

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
                                            <div className="space-y-2 max-h-48 overflow-y-auto">
                                                {slotSubs.map(sub => {
                                                    const isPending = sub.status === 'PENDING';
                                                    return (
                                                        <div key={sub.id} className={cn(
                                                            "p-2.5 rounded-xl border flex items-center justify-between text-xs",
                                                            isPending ? "border-rose-500/40 bg-rose-500/5" : "border-amber-500/30 bg-amber-500/5"
                                                        )}>
                                                            <div>
                                                                <div className="flex items-center gap-1.5">
                                                                    {isPending ? (
                                                                        <span className="font-bold text-rose-600 dark:text-rose-400 flex items-center gap-1">
                                                                            <AlertCircle className="w-3 h-3" /> Substitute Required (On Leave)
                                                                        </span>
                                                                    ) : (
                                                                        <>
                                                                            <span className="font-bold text-foreground">
                                                                                {sub.substituteTeacher?.account?.firstName} {sub.substituteTeacher?.account?.lastName}
                                                                            </span>
                                                                            <span className="text-[10px] text-muted-foreground">
                                                                                ({sub.substituteTeacher?.teacherId})
                                                                            </span>
                                                                        </>
                                                                    )}
                                                                </div>
                                                                <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                                                                    <span>Date: <strong className="text-foreground">{format(new Date(sub.date + 'T12:00:00'), 'EEEE, dd MMM yyyy')}</strong></span>
                                                                    {sub.reason && <span>• {sub.reason}</span>}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                {isPending && canEdit && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        className="h-7 px-2 rounded-lg text-[10px] font-bold border-rose-500/40 text-rose-700 dark:text-rose-300 hover:bg-rose-500/10 gap-1"
                                                                        onClick={() => {
                                                                            setSelectedSlotManage(null);
                                                                            setSubstituteModalData({
                                                                                open: true,
                                                                                slot,
                                                                                subject,
                                                                                initialDate: sub.date,
                                                                            });
                                                                        }}
                                                                    >
                                                                        <UserCheck className="w-3 h-3" /> Assign
                                                                    </Button>
                                                                )}
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
                                                        </div>
                                                    );
                                                })}
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
                                                    const subInitialDate = activeWeekDateForDay || (slotSubs[0]?.date) || null;
                                                    setSelectedSlotManage(null);
                                                    setSubstituteModalData({
                                                        open: true,
                                                        slot,
                                                        subject,
                                                        initialDate: subInitialDate,
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
                initialDate={substituteModalData.initialDate}
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

