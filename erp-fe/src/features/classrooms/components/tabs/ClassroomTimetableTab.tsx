import { useState, useMemo } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    LayoutGrid, Plus, Trash2, Loader2, X, BookOpen, Clock
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
                            setTeacherId("");
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

// ─── Timetable Tab Component ─────────────────────────────────────────────────
export interface ClassroomTimetableTabProps {
    classroomId: string;
    subjects: ClassroomSubject[];
    periods: ClassroomPeriod[];
    canEdit: boolean;
    onRefresh: () => void;
}

export function ClassroomTimetableTab({
    classroomId,
    subjects,
    periods,
    canEdit,
    onRefresh
}: ClassroomTimetableTabProps) {
    const [managePeriodsOpen, setManagePeriodsOpen] = useState(false);
    const [addSubjectOpen, setAddSubjectOpen] = useState(false);
    const [bookSlotData, setBookSlotData] = useState<{ open: boolean; dayOfWeek: DayOfWeek; period: ClassroomPeriod | null }>({
        open: false,
        dayOfWeek: 'Monday',
        period: null
    });
    const [removeSlotId, setRemoveSlotId] = useState<string | null>(null);

    const sortedPeriods = [...periods].sort((a, b) => a.order - b.order);

    const removeSlotMutation = useMutation({
        mutationFn: ({ subjectId, slotId }: { subjectId: string; slotId: string }) =>
            api.delete(`/classrooms/${classroomId}/subjects/${subjectId}/timetable/${slotId}`),
        onSuccess: () => {
            toast.success("Slot removed");
            setRemoveSlotId(null);
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

export default ClassroomTimetableTab;
