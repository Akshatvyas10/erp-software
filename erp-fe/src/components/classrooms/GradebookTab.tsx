import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, BookOpen, Save, Plus, ArrowLeft, Calendar as CalendarIcon, ShieldAlert, Search, Filter } from "lucide-react";
import { toast } from "sonner";
import { format, parseISO, isWithinInterval, startOfDay, endOfDay } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { MoreVertical, Edit, Trash2, Eye } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";
import { useAuth, usePermissions } from "@/store/hooks";
import { useEvents } from "@/hooks/useEvents";
import { useDebounce } from "@/hooks/use-debounce";
import { Skeleton } from "@/components/ui/skeleton";
import type { ClassroomEnrollment, ClassroomSubject } from "@/types/erp";

interface ExamSchedule {
    id: string;
    name: string;
    type: 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'HALF_YEARLY' | 'ANNUAL';
    exams?: Exam[];
}

interface Exam {
    id: string;
    examScheduleId: string;
    date: string;
    maxMarks: string;
    status: string;
    subject: { id: string; name: string; code: string; };
}

interface ExamResult {
    id: string;
    examId: string;
    studentId: string;
    marksObtained: string | null;
    isAbsent: boolean;
    percentage: string | null;
    grade: string | null;
    status: 'PASSED' | 'FAILED' | 'COMPARTMENT' | null;
    remarks: string | null;
}

export default function GradebookTab({ classroomId, enrollments, subjects, canEdit, classTeacherId }: { classroomId: string, enrollments: ClassroomEnrollment[], subjects: ClassroomSubject[], canEdit: boolean, classTeacherId?: string }) {
    const { user } = useAuth();
    const { hasRole } = usePermissions();
    const qc = useQueryClient();
    const [createScheduleOpen, setCreateScheduleOpen] = useState(false);
    const [setSubjectOpen, setSetSubjectOpen] = useState(false);
    const [activeScheduleId, setActiveScheduleId] = useState<string | null>(null);

    const [newSchedule, setNewSchedule] = useState<{ name: string, type: string }>({ name: "", type: "MONTHLY" });
    const [editScheduleId, setEditScheduleId] = useState<string | null>(null);
    const [editScheduleName, setEditScheduleName] = useState("");
    const [editScheduleType, setEditScheduleType] = useState("MONTHLY");
    const [deleteScheduleId, setDeleteScheduleId] = useState<string | null>(null);

    const [newExam, setNewExam] = useState<{ date: Date | undefined, maxMarks: string, subjectId: string }>({ date: undefined, maxMarks: "100", subjectId: "" });
    const [editExamId, setEditExamId] = useState<string | null>(null);
    const [editExamDate, setEditExamDate] = useState<Date | undefined>(undefined);
    const [editExamMaxMarks, setEditExamMaxMarks] = useState("100");
    const [deleteExamId, setDeleteExamId] = useState<string | null>(null);

    const [marksDraft, setMarksDraft] = useState<Record<string, Record<string, { marksObtained?: string, isAbsent?: boolean, remarks?: string }>>>({});
    const [overallRemarksDraft, setOverallRemarksDraft] = useState<Record<string, string>>({});
    const [viewStudentId, setViewStudentId] = useState<string | null>(null);

    const [searchInput, setSearchInput] = useState("");
    const debouncedSearchTerm = useDebounce(searchInput, 300);
    const [statusFilter, setStatusFilter] = useState<"ALL" | "PASSED" | "FAILED">("ALL");

    const isClassTeacher = user?.teacherId === classTeacherId;
    const canManageSchedule = canEdit || hasRole('super_admin', 'admin') || isClassTeacher;

    const { data: events = [] } = useEvents();

    const isDateDisabled = (date: Date) => {
        return events.some(event => {
            if (event.type === 'EVENT' || event.type === 'HOLIDAY' || event.day_type === 'HOLIDAY') {
                const start = startOfDay(parseISO(event.start_date));
                const end = endOfDay(parseISO(event.end_date));
                return isWithinInterval(date, { start, end });
            }
            return false;
        });
    };

    const { data: schedules = [], isLoading: schedulesLoading } = useQuery({
        queryKey: ["exam-schedules", classroomId],
        queryFn: () => api.get(`/exams/schedules?classroomId=${classroomId}`).then(res => res.data.data.schedules as ExamSchedule[]),
        enabled: !!classroomId
    });

    const activeSchedule = schedules.find(s => s.id === activeScheduleId);
    const exams = activeSchedule?.exams ?? [];

    const { data: resultsMatrix = {}, isLoading: resultsLoading } = useQuery({
        queryKey: ["exam-results", classroomId, exams.map(e => e.id)],
        queryFn: async () => {
            const matrix: Record<string, Record<string, ExamResult>> = {}; // studentId -> examId -> Result
            await Promise.all(exams.map(async (exam) => {
                const res = await api.get(`/exams/${exam.id}/results`);
                const results = res.data.data.results as ExamResult[];
                results.forEach(r => {
                    if (!matrix[r.studentId]) matrix[r.studentId] = {};
                    matrix[r.studentId][exam.id] = r;
                });
            }));
            return matrix;
        },
        enabled: exams.length > 0,
    });

    const filteredEnrollments = useMemo(() => {
        return enrollments.filter(enr => {
            const nameMatch = `${enr.student.account?.firstName || ""} ${enr.student.account?.lastName || ""}`.toLowerCase().includes(debouncedSearchTerm.toLowerCase());
            if (!nameMatch) return false;

            if (statusFilter !== "ALL") {
                let anyFailed = false;
                let hasMarks = false;
                exams.forEach(ex => {
                    const res = resultsMatrix[enr.student.id]?.[ex.id];
                    if (res) {
                        hasMarks = true;
                        if (res.status === 'FAILED') anyFailed = true;
                    }
                });

                const overallStatus = anyFailed ? 'FAILED' : (hasMarks ? 'PASSED' : 'ALL');
                if (statusFilter === "PASSED" && overallStatus !== "PASSED") return false;
                if (statusFilter === "FAILED" && overallStatus !== "FAILED") return false;
            }

            return true;
        });
    }, [enrollments, debouncedSearchTerm, statusFilter, exams, resultsMatrix]);

    const createScheduleMutation = useMutation({
        mutationFn: () => api.post('/exams/schedules', { ...newSchedule, classroomId }),
        onSuccess: () => {
            toast.success("Schedule created");
            qc.invalidateQueries({ queryKey: ["exam-schedules", classroomId] });
            setCreateScheduleOpen(false);
            setNewSchedule({ name: "", type: "MONTHLY" });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to create schedule");
        }
    });

    const updateScheduleMutation = useMutation({
        mutationFn: () => api.put(`/exams/schedules/${editScheduleId}`, { name: editScheduleName, type: editScheduleType }),
        onSuccess: () => {
            toast.success("Schedule updated");
            qc.invalidateQueries({ queryKey: ["exam-schedules", classroomId] });
            setEditScheduleId(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to update schedule");
        }
    });

    const deleteScheduleMutation = useMutation({
        mutationFn: () => api.delete(`/exams/schedules/${deleteScheduleId}`),
        onSuccess: () => {
            toast.success("Schedule deleted");
            qc.invalidateQueries({ queryKey: ["exam-schedules", classroomId] });
            setDeleteScheduleId(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete schedule");
        }
    });

    const createExamMutation = useMutation({
        mutationFn: () => {
            if (!activeScheduleId || !newExam.date) throw new Error("Missing schedule or date");
            return api.post('/exams', {
                examScheduleId: activeScheduleId,
                date: format(newExam.date, 'yyyy-MM-dd'),
                maxMarks: parseFloat(newExam.maxMarks),
                subjectId: newExam.subjectId,
                classroomId,
                status: 'SCHEDULED'
            });
        },
        onSuccess: () => {
            toast.success("Subject exam scheduled");
            qc.invalidateQueries({ queryKey: ["exam-schedules", classroomId] });
            setSetSubjectOpen(false);
            setNewExam({ date: undefined, maxMarks: "100", subjectId: "" });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to schedule exam");
        }
    });

    const updateExamMutation = useMutation({
        mutationFn: () => api.put(`/exams/${editExamId}`, { date: editExamDate ? format(editExamDate, 'yyyy-MM-dd') : null, maxMarks: parseFloat(editExamMaxMarks) }),
        onSuccess: () => {
            toast.success("Exam updated");
            qc.invalidateQueries({ queryKey: ["exam-schedules", classroomId] });
            setEditExamId(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to update exam");
        }
    });

    const deleteExamMutation = useMutation({
        mutationFn: () => api.delete(`/exams/${deleteExamId}`),
        onSuccess: () => {
            toast.success("Exam deleted");
            qc.invalidateQueries({ queryKey: ["exam-schedules", classroomId] });
            setDeleteExamId(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete exam");
        }
    });


    const saveAllResultsMutation = useMutation({
        mutationFn: async () => {
            const promises = exams.map(async (exam) => {
                const examId = exam.id;
                const examResults = [];
                const allStudentIds = new Set([...Object.keys(marksDraft), ...Object.keys(overallRemarksDraft)]);
                for (const studentId of allStudentIds) {
                    if (marksDraft[studentId]?.[examId] !== undefined || overallRemarksDraft[studentId] !== undefined) {
                        let draft = marksDraft[studentId]?.[examId] || {};
                        let existingResult = resultsMatrix[studentId]?.[examId];

                        let val = draft.marksObtained;
                        let isAbsent = draft.isAbsent;

                        if (val === undefined && existingResult) {
                            val = existingResult.marksObtained || "";
                            isAbsent = existingResult.isAbsent;
                        }

                        if (val !== undefined && val !== null) {
                            if (val.toUpperCase() === 'A' || val.toUpperCase() === 'AB' || val.toUpperCase() === 'ABS') {
                                isAbsent = true;
                                val = "";
                            } else if (val.trim() === "") {
                                val = "0";
                            }
                        }

                        examResults.push({
                            studentId,
                            marksObtained: val || (isAbsent ? null : "0"),
                            isAbsent: isAbsent || false,
                            remarks: overallRemarksDraft[studentId] !== undefined ? overallRemarksDraft[studentId] : (existingResult?.remarks || null)
                        });
                    }
                }
                if (examResults.length > 0) {
                    await api.post(`/exams/${examId}/results`, { results: examResults });
                }
            });
            await Promise.all(promises);
        },
        onSuccess: () => {
            toast.success("Marks saved successfully");
            qc.invalidateQueries({ queryKey: ["exam-results", classroomId] });
            setMarksDraft({});
            setOverallRemarksDraft({});
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to save marks");
        }
    });

    const publishAllResultsMutation = useMutation({
        mutationFn: async () => {
            const promises = exams
                .filter(e => e.status !== 'PUBLISHED')
                .map(exam => api.post(`/exams/${exam.id}/publish`, { notifyUsers: true }));
            await Promise.all(promises);
        },
        onSuccess: () => {
            toast.success("Results published successfully!");
            qc.invalidateQueries({ queryKey: ["exam-results", classroomId] });
            qc.invalidateQueries({ queryKey: ["exam-schedules", classroomId] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to publish results");
        }
    });

    const handleMarkChange = (studentId: string, examId: string, val: string, maxMarks: string) => {
        if (val !== "") {
            const upper = val.toUpperCase();
            if (upper !== 'A' && upper !== 'AB' && upper !== 'ABS') {
                if (isNaN(Number(val))) return;
                if (Number(val) > Number(maxMarks)) {
                    toast.error(`Marks cannot exceed ${maxMarks}`);
                    return;
                }
                if (Number(val) < 0) return;
            }
        }

        setMarksDraft(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [examId]: {
                    ...(prev[studentId]?.[examId] || {}),
                    marksObtained: val
                }
            }
        }));
    };

    const handleAbsentChange = (studentId: string, examId: string, isAbsent: boolean) => {
        setMarksDraft(prev => ({
            ...prev,
            [studentId]: {
                ...(prev[studentId] || {}),
                [examId]: {
                    ...(prev[studentId]?.[examId] || {}),
                    isAbsent
                }
            }
        }));
    };

    const canEditSubjectColumn = (subjectId: string, examStatus: string) => {
        if (examStatus === 'PUBLISHED') return false;
        if (hasRole('super_admin', 'admin')) return true;
        if (isClassTeacher) return true;
        const sub = subjects.find(s => s.subjectId === subjectId);
        if (sub && sub.teacherId === user?.teacherId) return true;
        return false;
    };

    const canPublishExam = () => {
        if (hasRole('super_admin', 'admin')) return true;
        if (isClassTeacher) return true;
        return false;
    };

    if (schedulesLoading) {
        return (
            <div className="space-y-4">
                <Skeleton className="h-16 w-full rounded-xl" />
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                    <Skeleton className="h-24 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!activeScheduleId) {
        return (
            <div className="space-y-4">
                <div className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
                    <div>
                        <h3 className="font-bold">Exam Schedules</h3>
                        <p className="text-xs text-muted-foreground">Select a schedule to view or edit the gradebook.</p>
                    </div>
                    <div className="flex gap-2">

                        {canManageSchedule && (
                            <Button size="sm" onClick={() => setCreateScheduleOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl text-xs h-9 font-semibold">
                                <Plus className="h-3 w-3" /> Create Schedule
                            </Button>
                        )}
                    </div>
                </div>

                {schedules.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 border rounded-2xl">
                        <BookOpen className="h-10 w-10 text-primary/40" />
                        <p className="font-bold text-sm">No exam schedules created yet.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                        {schedules.map(sch => (
                            <div key={sch.id} className="relative bg-card border rounded-2xl p-5 hover:border-primary/50 hover:shadow-md transition-all group">
                                <div className="flex justify-between items-start mb-4" onClick={() => setActiveScheduleId(sch.id)}>
                                    <div className="cursor-pointer flex-1">
                                        <Badge variant="outline" className="text-[10px] uppercase mb-2">{sch.type}</Badge>
                                        <h4 className="font-bold text-foreground group-hover:text-primary transition-colors">{sch.name}</h4>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="bg-primary/5 text-primary text-xs font-bold px-2 py-1 rounded-lg">
                                            {sch.exams?.length || 0} Subjects
                                        </div>
                                        {canManageSchedule && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl shrink-0 opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity">
                                                        <MoreVertical className="h-4 w-4" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                    <DropdownMenuItem className="cursor-pointer rounded-lg text-xs" onClick={(e) => { e.stopPropagation(); setEditScheduleId(sch.id); setEditScheduleName(sch.name); setEditScheduleType(sch.type); }}>
                                                        <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="cursor-pointer rounded-lg text-xs text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={(e) => { e.stopPropagation(); setDeleteScheduleId(sch.id); }}>
                                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                <Dialog open={createScheduleOpen} onOpenChange={setCreateScheduleOpen}>
                    <DialogContent className="rounded-3xl p-6 border-border shadow-2xl bg-background max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Create Exam Schedule</DialogTitle>
                            <DialogDescription>Define a new term or exam schedule block.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div>
                                <Label>Schedule Name</Label>
                                <Input value={newSchedule.name} onChange={e => setNewSchedule(prev => ({ ...prev, name: e.target.value }))} placeholder="e.g. Midterm, June" className="mt-1" />
                            </div>
                            <div>
                                <Label>Schedule Type</Label>
                                <Select value={newSchedule.type} onValueChange={v => setNewSchedule(prev => ({ ...prev, type: v }))}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select Type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="WEEKLY">Weekly Test</SelectItem>
                                        <SelectItem value="MONTHLY">Monthly Test</SelectItem>
                                        <SelectItem value="QUARTERLY">Quarterly Exam</SelectItem>
                                        <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                                        <SelectItem value="ANNUAL">Annual Exam</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setCreateScheduleOpen(false)} className="rounded-xl">Cancel</Button>
                            <Button onClick={() => createScheduleMutation.mutate()} disabled={createScheduleMutation.isPending || !newSchedule.name} className="rounded-xl bg-primary">
                                {createScheduleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Schedule"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <Dialog open={!!editScheduleId} onOpenChange={(v) => !v && setEditScheduleId(null)}>
                    <DialogContent className="rounded-3xl p-6 border-border shadow-2xl bg-background max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Edit Exam Schedule</DialogTitle>
                            <DialogDescription>Update schedule details.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div>
                                <Label>Schedule Name</Label>
                                <Input value={editScheduleName} onChange={e => setEditScheduleName(e.target.value)} placeholder="e.g. Midterm, June" className="mt-1" />
                            </div>
                            <div>
                                <Label>Schedule Type</Label>
                                <Select value={editScheduleType} onValueChange={v => setEditScheduleType(v)}>
                                    <SelectTrigger className="mt-1"><SelectValue placeholder="Select Type" /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="WEEKLY">Weekly Test</SelectItem>
                                        <SelectItem value="MONTHLY">Monthly Test</SelectItem>
                                        <SelectItem value="QUARTERLY">Quarterly Exam</SelectItem>
                                        <SelectItem value="HALF_YEARLY">Half Yearly</SelectItem>
                                        <SelectItem value="ANNUAL">Annual Exam</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditScheduleId(null)} className="rounded-xl">Cancel</Button>
                            <Button onClick={() => updateScheduleMutation.mutate()} disabled={updateScheduleMutation.isPending || !editScheduleName} className="rounded-xl bg-primary">
                                {updateScheduleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save Changes"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={!!deleteScheduleId} onOpenChange={(v) => !v && setDeleteScheduleId(null)}>
                    <AlertDialogContent className="rounded-3xl p-6">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Schedule</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure you want to delete this schedule and all its exams?</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteScheduleMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {deleteScheduleMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border shadow-sm">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => setActiveScheduleId(null)} className="h-8 w-8 rounded-full border shadow-sm">
                        <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div>
                        <h3 className="font-bold flex items-center gap-2">
                            {activeSchedule?.name}
                            <Badge variant="outline" className="text-[10px]">{activeSchedule?.type}</Badge>
                        </h3>
                        <p className="text-xs text-muted-foreground">Manage grades for this schedule.</p>
                    </div>
                </div>
                {canManageSchedule && (
                    <Dialog open={setSubjectOpen} onOpenChange={setSetSubjectOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl text-xs h-9 font-semibold shadow-md">
                                <Plus className="h-3 w-3" /> Set Subject
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl p-6 border-border shadow-2xl bg-background max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">Set Subject Exam</DialogTitle>
                                <DialogDescription>Schedule a subject test for this block.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div>
                                    <Label>Subject</Label>
                                    <Select value={newExam.subjectId} onValueChange={v => setNewExam(prev => ({ ...prev, subjectId: v }))}>
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                        <SelectContent>
                                            {subjects.filter(s => !exams.some(e => e.subject.id === s.subjectId)).map(s => (
                                                <SelectItem key={s.subjectId} value={s.subjectId}>{s.subject?.name}</SelectItem>
                                            ))}
                                            {subjects.filter(s => !exams.some(e => e.subject.id === s.subjectId)).length === 0 && (
                                                <div className="p-2 text-sm text-muted-foreground text-center">All subjects assigned</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Date (Excludes Holidays)</Label>
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !newExam.date && "text-muted-foreground")}>
                                                <CalendarIcon className="mr-2 h-4 w-4" />
                                                {newExam.date ? format(newExam.date, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-[100] pointer-events-auto">
                                            <Calendar
                                                mode="single"
                                                selected={newExam.date}
                                                onSelect={d => setNewExam(prev => ({ ...prev, date: d }))}
                                                disabled={isDateDisabled}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div>
                                    <Label>Max Marks</Label>
                                    <Input type="number" value={newExam.maxMarks} onChange={e => setNewExam(prev => ({ ...prev, maxMarks: e.target.value }))} className="mt-1" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setSetSubjectOpen(false)} className="rounded-xl font-medium transition-colors">Cancel</Button>
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors" disabled={createExamMutation.isPending || !newExam.subjectId || !newExam.date} onClick={() => createExamMutation.mutate()}>
                                    {createExamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}

                <Dialog open={!!editExamId} onOpenChange={(v) => !v && setEditExamId(null)}>
                    <DialogContent className="rounded-3xl p-6 border-border shadow-2xl bg-background max-w-md">
                        <DialogHeader>
                            <DialogTitle className="text-xl font-bold">Edit Exam</DialogTitle>
                            <DialogDescription>Update the date and max marks for this exam.</DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                            <div>
                                <Label>Date (Excludes Holidays)</Label>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !editExamDate && "text-muted-foreground")}>
                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                            {editExamDate ? format(editExamDate, "PPP") : <span>Pick a date</span>}
                                        </Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 z-[100] pointer-events-auto">
                                        <Calendar
                                            mode="single"
                                            selected={editExamDate}
                                            onSelect={d => setEditExamDate(d)}
                                            disabled={isDateDisabled}
                                        />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <div>
                                <Label>Max Marks</Label>
                                <Input type="number" value={editExamMaxMarks} onChange={e => setEditExamMaxMarks(e.target.value)} className="mt-1" />
                            </div>
                        </div>
                        <div className="pt-4 flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setEditExamId(null)} className="rounded-xl font-medium transition-colors">Cancel</Button>
                            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors" disabled={updateExamMutation.isPending || !editExamDate} onClick={() => updateExamMutation.mutate()}>
                                {updateExamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>

                <AlertDialog open={!!deleteExamId} onOpenChange={(v) => !v && setDeleteExamId(null)}>
                    <AlertDialogContent className="rounded-3xl p-6">
                        <AlertDialogHeader>
                            <AlertDialogTitle>Delete Exam</AlertDialogTitle>
                            <AlertDialogDescription>Are you sure you want to delete this exam? All associated marks will be lost.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction onClick={() => deleteExamMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                {deleteExamMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                            </AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>

            {exams.length > 0 && (
                <div className="flex flex-col sm:flex-row gap-3 py-2">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search students..."
                            value={searchInput}
                            onChange={e => setSearchInput(e.target.value)}
                            className="pl-9 rounded-xl"
                        />
                    </div>
                    <div className="w-full sm:w-48">
                        <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                            <SelectTrigger className="rounded-xl">
                                <div className="flex items-center gap-2">
                                    <Filter className="h-4 w-4 text-muted-foreground" />
                                    <SelectValue placeholder="Filter Status" />
                                </div>
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Students</SelectItem>
                                <SelectItem value="PASSED">Passed</SelectItem>
                                <SelectItem value="FAILED">Failed</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            )}

            {resultsLoading ? (
                <div className="space-y-4 pt-4">
                    <Skeleton className="h-12 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                    <Skeleton className="h-16 w-full rounded-xl" />
                </div>
            ) : exams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 border rounded-2xl">
                    <BookOpen className="h-10 w-10 text-primary/40" />
                    <p className="font-bold text-sm">No subjects recorded yet for this schedule</p>
                </div>
            ) : (
                <div className="space-y-4">
                    <div className="hidden md:block rounded-2xl border border-border overflow-hidden shadow-sm overflow-x-auto custom-scrollbar">
                        <table className="w-full text-sm border-collapse min-w-max">
                            <thead>
                                <tr className="bg-muted/20 border-b border-border">
                                    <th className="px-4 py-3 text-left font-bold text-muted-foreground sticky left-0 bg-muted/95 backdrop-blur z-10 w-48 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
                                        Student
                                    </th>
                                    {exams.map(exam => {
                                        const userCanEdit = canEditSubjectColumn(exam.subject?.id, exam.status);
                                        return (
                                            <th key={exam.id} className="px-3 py-3 text-center border-l border-border min-w-[120px] relative group">
                                                <div className="font-bold text-primary flex items-center justify-center gap-1">
                                                    {exam.subject?.name}
                                                    {userCanEdit && (
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" size="icon" className="h-4 w-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                    <MoreVertical className="h-3 w-3 text-muted-foreground" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-40 rounded-xl">
                                                                <DropdownMenuItem className="cursor-pointer rounded-lg text-xs" onClick={() => { setEditExamId(exam.id); setEditExamDate(exam.date ? parseISO(exam.date) : undefined); setEditExamMaxMarks(exam.maxMarks); }}>
                                                                    <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="cursor-pointer rounded-lg text-xs text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteExamId(exam.id)}>
                                                                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                                                </DropdownMenuItem>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground mt-1">Date: {exam.date ? format(parseISO(exam.date), 'MMM d, yyyy') : '-'}</div>
                                                <div className="text-[10px] text-muted-foreground">Max: {exam.maxMarks}</div>
                                                {exam.status === 'PUBLISHED' && (
                                                    <Badge variant="outline" className="mt-1 text-[8px] h-4 px-1 bg-green-500/10 text-green-600 border-green-500/20">PUBLISHED</Badge>
                                                )}
                                                {userCanEdit ? (
                                                    <div className="mt-1 flex flex-col gap-1 w-full px-2 text-[10px] text-muted-foreground/60 italic text-center">
                                                        Editable
                                                    </div>
                                                ) : (
                                                    exam.status !== 'PUBLISHED' && (
                                                        <div className="h-6 mt-1 flex items-center justify-center" title="Only the subject teacher or class teacher can edit this column.">
                                                            <ShieldAlert className="h-3 w-3 text-muted-foreground/40" />
                                                        </div>
                                                    )
                                                )}
                                            </th>
                                        );
                                    })}
                                    <th className="px-3 py-3 text-center border-l border-border min-w-[200px]">Overall Remark</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredEnrollments.map(enr => (
                                    <tr key={enr.student.id} className="border-b border-border last:border-0 hover:bg-muted/20">
                                        <td className="px-4 py-2 font-medium sticky left-0 bg-background z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] truncate max-w-[200px]">
                                            <div className="flex items-center justify-between">
                                                <span>{enr.student.account?.firstName} {enr.student.account?.lastName}</span>
                                                <Button variant="ghost" size="icon" className="h-6 w-6 ml-2" onClick={() => setViewStudentId(enr.student.id)}>
                                                    <Eye className="h-3 w-3 text-muted-foreground" />
                                                </Button>
                                            </div>
                                        </td>
                                        {exams.map(exam => {
                                            const result = resultsMatrix[enr.student.id]?.[exam.id];
                                            const draft = marksDraft[enr.student.id]?.[exam.id] || {};

                                            const isAbsent = draft.isAbsent !== undefined ? draft.isAbsent : (result?.isAbsent || false);
                                            const savedMark = result?.marksObtained;
                                            const displayVal = isAbsent ? "" : (draft.marksObtained !== undefined ? draft.marksObtained : (savedMark ?? ""));
                                            const isChanged = draft.marksObtained !== undefined && draft.marksObtained !== (savedMark ?? "");

                                            const userCanEdit = canEditSubjectColumn(exam.subject?.id, exam.status);
                                            const isFailed = result?.status === 'FAILED';

                                            return (
                                                <td key={exam.id} className={`px-3 py-2 border-l border-border text-center ${isFailed ? 'bg-destructive/10' : ''}`}>
                                                    {userCanEdit ? (
                                                        <div className="flex flex-col items-center gap-2">
                                                            <div className="flex items-center gap-2">
                                                                <div className="flex items-center space-x-1" title="Mark Absent">
                                                                    <Checkbox
                                                                        id={`absent-${enr.student.id}-${exam.id}`}
                                                                        checked={isAbsent}
                                                                        onCheckedChange={(c) => handleAbsentChange(enr.student.id, exam.id, c === true)}
                                                                    />
                                                                    <label htmlFor={`absent-${enr.student.id}-${exam.id}`} className="text-[10px] font-medium leading-none cursor-pointer">
                                                                        Abs
                                                                    </label>
                                                                </div>
                                                                <Input
                                                                    className={`w-14 mx-auto h-8 text-center text-xs ${isChanged ? 'border-primary ring-1 ring-primary/20' : ''} ${isFailed ? 'border-destructive/50 text-destructive' : ''}`}
                                                                    value={displayVal}
                                                                    onChange={(e) => handleMarkChange(enr.student.id, exam.id, e.target.value, exam.maxMarks)}
                                                                    placeholder="-"
                                                                    disabled={isAbsent}
                                                                />
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-1">
                                                            <span className={`font-semibold ${isFailed ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                                {isAbsent ? "Absent" : (savedMark ?? "-")}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {!isAbsent && result?.percentage !== null && result?.percentage !== undefined && (
                                                        <div className={`text-[10px] mt-1 font-medium ${isFailed ? 'text-destructive' : 'text-muted-foreground'}`}>
                                                            {result.percentage}% ({result.grade})
                                                        </div>
                                                    )}
                                                </td>
                                            );
                                        })}

                                        <td className="px-3 py-2 border-l border-border">
                                            {(() => {
                                                const existingRemark = exams.length > 0 ? resultsMatrix[enr.student.id]?.[exams[0].id]?.remarks : "";
                                                const draftRemark = overallRemarksDraft[enr.student.id];
                                                const displayRemark = draftRemark !== undefined ? draftRemark : (existingRemark || "");
                                                const isRemarkChanged = draftRemark !== undefined && draftRemark !== (existingRemark || "");

                                                const canEditAny = exams.some(ex => canEditSubjectColumn(ex.subject?.id, ex.status));

                                                return canEditAny ? (
                                                    <Input
                                                        className={`w-full h-8 text-xs ${isRemarkChanged ? 'border-primary ring-1 ring-primary/20' : ''}`}
                                                        value={displayRemark}
                                                        onChange={(e) => setOverallRemarksDraft(prev => ({ ...prev, [enr.student.id]: e.target.value }))}
                                                        placeholder="Overall remark..."
                                                    />
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic truncate block max-w-[150px]">{existingRemark || "-"}</span>
                                                );
                                            })()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="grid grid-cols-1 gap-4 md:hidden">
                        {filteredEnrollments.map(enr => (
                            <div key={enr.student.id} className="bg-card border rounded-2xl p-4 shadow-sm space-y-4">
                                <div className="flex items-center justify-between border-b pb-2">
                                    <span className="font-bold text-base">{enr.student.account?.firstName} {enr.student.account?.lastName}</span>
                                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setViewStudentId(enr.student.id)}>
                                        <Eye className="h-4 w-4 text-muted-foreground" />
                                    </Button>
                                </div>
                                <div className="space-y-3">
                                    {exams.map(exam => {
                                        const result = resultsMatrix[enr.student.id]?.[exam.id];
                                        const draft = marksDraft[enr.student.id]?.[exam.id] || {};
                                        const isAbsent = draft.isAbsent !== undefined ? draft.isAbsent : (result?.isAbsent || false);
                                        const savedMark = result?.marksObtained;
                                        const displayVal = isAbsent ? "" : (draft.marksObtained !== undefined ? draft.marksObtained : (savedMark ?? ""));
                                        const isChanged = draft.marksObtained !== undefined && draft.marksObtained !== (savedMark ?? "");
                                        const userCanEdit = canEditSubjectColumn(exam.subject?.id, exam.status);
                                        const isFailed = result?.status === 'FAILED';

                                        return (
                                            <div key={exam.id} className={`flex items-center justify-between p-2 rounded-xl border ${isFailed ? 'bg-destructive/10 border-destructive/20' : 'bg-muted/10'}`}>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-sm">{exam.subject?.name}</span>
                                                    <span className="text-[10px] text-muted-foreground">Max: {exam.maxMarks}</span>
                                                </div>
                                                {userCanEdit ? (
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex items-center space-x-1">
                                                            <Checkbox
                                                                id={`mobile-absent-${enr.student.id}-${exam.id}`}
                                                                checked={isAbsent}
                                                                onCheckedChange={(c) => handleAbsentChange(enr.student.id, exam.id, c === true)}
                                                            />
                                                            <label htmlFor={`mobile-absent-${enr.student.id}-${exam.id}`} className="text-[10px] font-medium leading-none">Abs</label>
                                                        </div>
                                                        <Input
                                                            className={`w-16 h-8 text-center text-sm font-semibold ${isChanged ? 'border-primary ring-1 ring-primary/20' : ''} ${isFailed ? 'border-destructive/50 text-destructive' : ''}`}
                                                            value={displayVal}
                                                            onChange={(e) => handleMarkChange(enr.student.id, exam.id, e.target.value, exam.maxMarks)}
                                                            placeholder="-"
                                                            disabled={isAbsent}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="flex flex-col items-end">
                                                        <span className={`font-bold ${isFailed ? 'text-destructive' : 'text-foreground'}`}>
                                                            {isAbsent ? "Absent" : (savedMark ?? "-")}
                                                        </span>
                                                        {!isAbsent && result?.percentage !== null && result?.percentage !== undefined && (
                                                            <span className="text-[10px] text-muted-foreground">{result.percentage}% ({result.grade})</span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}

                                    <div className="pt-2">
                                        {(() => {
                                            const existingRemark = exams.length > 0 ? resultsMatrix[enr.student.id]?.[exams[0].id]?.remarks : "";
                                            const draftRemark = overallRemarksDraft[enr.student.id];
                                            const displayRemark = draftRemark !== undefined ? draftRemark : (existingRemark || "");
                                            const isRemarkChanged = draftRemark !== undefined && draftRemark !== (existingRemark || "");
                                            const canEditAny = exams.some(ex => canEditSubjectColumn(ex.subject?.id, ex.status));

                                            return canEditAny ? (
                                                <Input
                                                    className={`w-full h-9 text-sm ${isRemarkChanged ? 'border-primary ring-1 ring-primary/20' : ''}`}
                                                    value={displayRemark}
                                                    onChange={(e) => setOverallRemarksDraft(prev => ({ ...prev, [enr.student.id]: e.target.value }))}
                                                    placeholder="Overall remark..."
                                                />
                                            ) : (
                                                <div className="text-sm text-muted-foreground bg-muted/20 p-2 rounded-lg border">
                                                    <span className="font-semibold mr-2">Remark:</span>
                                                    <span className="italic">{existingRemark || "None"}</span>
                                                </div>
                                            );
                                        })()}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {filteredEnrollments.length === 0 && (
                            <div className="text-center p-8 text-muted-foreground bg-card border rounded-2xl">
                                No students match your search or filter.
                            </div>
                        )}
                    </div>
                </div>
            )}

            {exams.length > 0 && (
                <div className="flex flex-col sm:flex-row sm:justify-end items-stretch sm:items-center gap-3 bg-card p-4 rounded-xl border shadow-sm mt-4">
                    {canPublishExam() && (
                        <Button
                            variant="outline"
                            onClick={() => publishAllResultsMutation.mutate()}
                            disabled={publishAllResultsMutation.isPending || exams.every(e => e.status === 'PUBLISHED')}
                            className="w-full sm:w-auto rounded-xl border-green-500/30 text-green-600 hover:bg-green-500/10 hover:text-green-700 font-semibold"
                        >
                            {publishAllResultsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                            Publish All
                        </Button>
                    )}
                    <Button
                        onClick={() => saveAllResultsMutation.mutate()}
                        disabled={saveAllResultsMutation.isPending || (Object.keys(marksDraft).length === 0 && Object.keys(overallRemarksDraft).length === 0)}
                        className="w-full sm:w-auto rounded-xl bg-primary font-semibold"
                    >
                        {saveAllResultsMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Changes
                    </Button>
                </div>
            )}

            <Dialog open={!!viewStudentId} onOpenChange={(v) => !v && setViewStudentId(null)}>
                <DialogContent className="rounded-3xl p-6 border-border shadow-2xl bg-background max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Student Performance</DialogTitle>
                        <DialogDescription>Overall result for the current schedule.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        {(() => {
                            if (!viewStudentId) return null;
                            const stEnr = enrollments.find(e => e.student.id === viewStudentId);
                            if (!stEnr) return null;

                            let totalMax = 0;
                            let totalObtained = 0;
                            let anyFailed = false;

                            exams.forEach(ex => {
                                totalMax += Number(ex.maxMarks);
                                const res = resultsMatrix[viewStudentId]?.[ex.id];
                                if (res) {
                                    totalObtained += Number(res.marksObtained || 0);
                                    if (res.status === 'FAILED') anyFailed = true;
                                }
                            });

                            const overallPercentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : "0.00";
                            const overallStatus = anyFailed ? 'FAILED' : (totalMax > 0 ? 'PASSED' : 'N/A');

                            return (
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center bg-muted/20 p-3 rounded-xl border">
                                        <span className="font-semibold">{stEnr.student.account?.firstName} {stEnr.student.account?.lastName}</span>
                                        <Badge variant={overallStatus === 'PASSED' ? 'default' : overallStatus === 'FAILED' ? 'destructive' : 'secondary'}>{overallStatus}</Badge>
                                    </div>

                                    <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                                        <table className="w-full text-sm">
                                            <thead className="bg-muted/20 border-b">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-muted-foreground">Subject</th>
                                                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Marks</th>
                                                    <th className="px-4 py-2 text-center font-medium text-muted-foreground">Grade</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {exams.map(ex => {
                                                    const res = resultsMatrix[viewStudentId]?.[ex.id];
                                                    return (
                                                        <tr key={ex.id} className="border-b last:border-0 hover:bg-muted/10">
                                                            <td className="px-4 py-2 font-medium">{ex.subject?.name}</td>
                                                            <td className="px-4 py-2 text-center">
                                                                {res?.isAbsent ? <span className="text-destructive font-medium">Absent</span> : `${res?.marksObtained || '0'} / ${ex.maxMarks}`}
                                                            </td>
                                                            <td className="px-4 py-2 text-center font-medium">
                                                                {res?.grade || '-'}
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    {exams.length > 0 && resultsMatrix[viewStudentId]?.[exams[0].id]?.remarks && (
                                        <div className="bg-muted/10 border rounded-xl p-3 text-sm">
                                            <span className="font-semibold text-muted-foreground block mb-1">Overall Remark:</span>
                                            {resultsMatrix[viewStudentId]?.[exams[0].id]?.remarks}
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="bg-card border rounded-xl p-4 text-center shadow-sm">
                                            <div className="text-xs text-muted-foreground mb-1">Total Marks</div>
                                            <div className="text-lg font-bold">{totalObtained} / {totalMax}</div>
                                        </div>
                                        <div className="bg-card border rounded-xl p-4 text-center shadow-sm">
                                            <div className="text-xs text-muted-foreground mb-1">Percentage</div>
                                            <div className="text-lg font-bold text-primary">{overallPercentage}%</div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()}
                    </div>
                    <div className="pt-4 flex justify-end">
                        <Button variant="outline" onClick={() => setViewStudentId(null)} className="rounded-xl font-medium">Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
