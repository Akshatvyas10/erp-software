import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    School, Calendar, Clock,
    DoorOpen, CheckCircle2,
    CalendarCheck, Award, FileText, ChevronRight,
    Users, Crown, Search, ArrowLeft,
    Building2, GraduationCap, ShieldCheck,
    Sparkles, BookOpen, MessageSquare,
    AlertCircle, XCircle, Send, User, Check, Smile,
    Clock3
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import type { Classroom, DayOfWeek, ClassroomSubject, ClassroomPeriod } from "@/types/erp";
import api from "@/lib/api";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ClassroomTimetableTab } from "@/features/classrooms/components/tabs/ClassroomTimetableTab";
import {
    OverviewSummaryCards,
    PendingHomeworkList,
    StudentUpdatesList
} from "@/features/classrooms/components/overview";

interface StudentClassroomPortalViewProps {
    classroomId: string;
}

interface ClassmateItem {
    id: string;
    studentId: string;
    fullName: string;
    rollNumber: string;
    gender: string | null;
    isMonitor: boolean;
}

export function StudentClassroomPortalView({ classroomId }: StudentClassroomPortalViewProps) {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const todayDayName = format(new Date(), "EEEE") as DayOfWeek;
    const [activeTab, setActiveTab] = useState<"overview" | "classmates" | "timetable" | "homework" | "attendance" | "results" | "remarks">("overview");
    const [classmateSearch, setClassmateSearch] = useState("");

    // 1. Fetch Classroom Details (Safe Student Response)
    const { data: classroom, isLoading } = useQuery({
        queryKey: ["classroomPortal", classroomId],
        queryFn: async () => {
            const { data } = await api.get(`/classrooms/${classroomId}`);
            return data.data.classroom as Classroom;
        },
        enabled: !!classroomId,
    });

    // 2. Fetch Own Timetable
    const { data: timetableData = [] } = useQuery({
        queryKey: ["myTimetablePortal"],
        queryFn: async () => {
            const { data } = await api.get("/portal/student/timetable");
            return data.data.timetable || [];
        },
    });

    // 3. Fetch Own Attendance for this classroom
    const { data: attendanceData, isLoading: attendanceLoading } = useQuery({
        queryKey: ["myAttendancePortal", classroomId],
        queryFn: async () => {
            const { data } = await api.get(`/portal/student/attendance?classroomId=${classroomId}`);
            return data.data || {};
        },
        enabled: !!classroomId,
    });

    // 4. Fetch Own Homework for this classroom
    const { data: homeworks = [], isLoading: hwLoading } = useQuery({
        queryKey: ["myHomeworkPortal", classroomId],
        queryFn: async () => {
            const { data } = await api.get(`/portal/student/homework?classroomId=${classroomId}`);
            return data.data?.homework || data.data?.homeworks || [];
        },
        enabled: !!classroomId,
    });

    // 4b. Fetch Personal Teacher Remarks
    const { data: remarks = [] } = useQuery({
        queryKey: ["myRemarksPortal", classroomId],
        queryFn: async () => {
            const { data } = await api.get(`/portal/student/remarks?classroomId=${classroomId}`);
            return data.data?.remarks || [];
        },
        enabled: !!classroomId,
    });

    // 4c. Fetch Classroom-Scoped Updates Feed for Student
    const { data: updates = [], isLoading: updatesLoading } = useQuery({
        queryKey: ["myUpdatesPortal", classroomId],
        queryFn: async () => {
            const { data } = await api.get(`/portal/student/updates?classroomId=${classroomId}`);
            return data.data?.updates || [];
        },
        enabled: !!classroomId,
    });

    // Filter ONLY pending homework (not completed, not submitted, or revision required)
    const pendingHomeworks = useMemo(() => {
        return homeworks
            .filter((hw: any) => {
                const sub = hw.submissions?.[0];
                const status = sub?.status || "PENDING";
                return status === "PENDING" || status === "NOT_COMPLETED";
            })
            .sort((a: any, b: any) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime());
    }, [homeworks]);

    // Detail modal for viewing full homework details from overview
    const [selectedHomeworkDetail, setSelectedHomeworkDetail] = useState<any | null>(null);

    // 4d. Submission Mutation for Student
    const submitHomeworkMutation = useMutation({
        mutationFn: async (homeworkId: string) => {
            return api.post(`/portal/student/homework/${homeworkId}/submit`, {
                content: "Completed coursework submission",
            });
        },
        onSuccess: () => {
            toast.success("Homework marked as submitted! Great job!");
            queryClient.invalidateQueries({ queryKey: ["myHomeworkPortal", classroomId] });
            queryClient.invalidateQueries({ queryKey: ["myUpdatesPortal", classroomId] });
            queryClient.invalidateQueries({ queryKey: ["homework", classroomId] });
            if (selectedHomeworkDetail) {
                setSelectedHomeworkDetail(null);
            }
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to submit homework");
        }
    });

    // 5. Fetch Own Published Exam Results
    const { data: examResults = [] } = useQuery({
        queryKey: ["myExamResultsPortal"],
        queryFn: async () => {
            const { data } = await api.get("/portal/student/exam-results");
            return data.data.results || [];
        },
    });

    // 6. Fetch Safe Classmates List for this Classroom
    const { data: classmates = [], isLoading: classmatesLoading } = useQuery({
        queryKey: ["classroomClassmates", classroomId],
        queryFn: async () => {
            const { data } = await api.get(`/classrooms/${classroomId}/students`);
            return (data.data.classmates || []) as ClassmateItem[];
        },
        enabled: !!classroomId,
    });

    const filteredClassmates = useMemo(() => {
        if (!classmateSearch.trim()) return classmates;
        const q = classmateSearch.toLowerCase().trim();
        return classmates.filter(
            c => c.fullName.toLowerCase().includes(q) || String(c.rollNumber).toLowerCase().includes(q)
        );
    }, [classmates, classmateSearch]);

    const attendanceRecords = attendanceData?.records || [];
    const attendanceStats = useMemo(() => {
        const stats = attendanceData?.stats;
        const present = stats?.presentDays ?? stats?.present ?? attendanceRecords.filter((r: any) => ['PRESENT', 'present', 'LATE', 'late'].includes(r.status)).length;
        const absent = stats?.absentDays ?? stats?.absent ?? attendanceRecords.filter((r: any) => ['ABSENT', 'absent'].includes(r.status)).length;
        const total = stats?.totalDays ?? (present + absent);
        const percentage = stats?.attendancePercentage ?? (total > 0 ? Math.round((present / total) * 100) : 100);

        return {
            present,
            absent,
            total,
            percentage,
            presentDays: present,
            absentDays: absent,
            totalDays: total,
            attendancePercentage: percentage
        };
    }, [attendanceData, attendanceRecords]);

    if (isLoading) {
        return (
            <div className="space-y-6 text-foreground pb-10">
                <Skeleton className="h-40 w-full rounded-3xl" />
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-28 rounded-2xl" />
                    ))}
                </div>
                <Skeleton className="h-80 w-full rounded-2xl" />
            </div>
        );
    }

    if (!classroom) {
        return (
            <div className="flex flex-col items-center justify-center py-24 gap-4 text-muted-foreground">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                    <School className="h-8 w-8" />
                </div>
                <div className="text-center">
                    <p className="font-bold text-base text-foreground">Classroom Not Found</p>
                    <p className="text-xs text-muted-foreground mt-1">
                        The requested section may have been removed or you do not have permission to access it.
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/dashboard/classrooms")}
                    className="gap-2 text-xs font-semibold rounded-xl"
                >
                    <ArrowLeft className="h-4 w-4" /> Return to Directory
                </Button>
            </div>
        );
    }

    // Dynamic Summary Calculations matching ClassroomDetails
    const hasClassTeacher = Boolean(
        classroom.classTeacher &&
        (classroom.classTeacher.account || classroom.classTeacher.teacherId)
    );
    const teacherName = hasClassTeacher && classroom.classTeacher?.account
        ? `${classroom.classTeacher.account.firstName} ${classroom.classTeacher.account.lastName}`
        : null;

    const studentCount = classmates.length > 0 ? classmates.length : (classroom.studentCount || 0);
    const capacity = classroom.maxCapacity || 40;
    const occupancyPercent = Math.min(100, Math.round((studentCount / capacity) * 100));

    const monitorsList = classmates.filter(c => c.isMonitor);
    const monitorCount = monitorsList.length;

    const status = classroom.status || "ACTIVE";
    const classNameDisplay = classroom.academicClass?.name || classroom.name;

    const departmentName =
        classroom.departmentRef?.name ||
        classroom.academicClass?.department?.name ||
        classroom.department ||
        null;

    const inchargeLead =
        classroom.departmentRef?.incharge ||
        classroom.departmentRef?.inchargeTeacher ||
        classroom.departmentRef?.head ||
        classroom.academicClass?.department?.incharge ||
        classroom.academicClass?.department?.inchargeTeacher ||
        classroom.academicClass?.department?.head ||
        null;

    const inchargeName = inchargeLead?.account
        ? `${inchargeLead.account.firstName} ${inchargeLead.account.lastName}`.trim()
        : null;

    const subjectsCount = (classroom.subjects || []).length;
    const teacherSubjectsCount = new Set((classroom.subjects || []).map(s => s.teacherId).filter(Boolean)).size;

    const scheduleSource = timetableData.length > 0 
        ? timetableData 
        : (classroom.subjects || []).flatMap(s => (s as any).schedule || []);

    const daySlots = scheduleSource
        .filter((slot: any) => slot.dayOfWeek === todayDayName)
        .sort((a: any, b: any) => (a.startTime > b.startTime ? 1 : -1));

    return (
        <div className="space-y-6 text-foreground pb-10">
            {/* ── 1. Executive Hero Header (Identical Full-Screen Design) ───────────── */}
            <div className="relative rounded-2xl sm:rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.08] dark:from-card dark:via-purple-950/20 dark:to-primary/[0.08] p-4 sm:p-7 shadow-xs overflow-hidden">
                {/* Background Crest Watermark */}
                <School className="absolute -right-6 -bottom-6 w-36 sm:w-48 h-36 sm:h-48 text-primary/[0.04] dark:text-primary/[0.06] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
                    {/* Left: Class Identity */}
                    <div className="flex items-start gap-3 sm:gap-4">
                        <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/25 via-primary/15 to-primary/35 border-2 border-primary/30 text-primary flex items-center justify-center font-black text-xl sm:text-2xl shadow-md shadow-primary/20 shrink-0">
                            {classroom.section}
                        </div>
                        <div className="space-y-1.5 sm:space-y-2 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h1 className="text-xl sm:text-2xl md:text-3xl font-black tracking-tight text-foreground">
                                    {classNameDisplay}
                                </h1>
                                <Badge className="bg-primary text-primary-foreground font-black px-2.5 sm:px-3 py-0.5 sm:py-1 text-[11px] sm:text-xs rounded-lg sm:rounded-xl shadow-xs">
                                    Section {classroom.section}
                                </Badge>
                                <span className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-[11px] font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shadow-2xs">
                                    <span className="relative flex h-1.5 w-1.5">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                                    </span>
                                    {status === "ACTIVE" ? "Active" : "Inactive"}
                                </span>
                            </div>

                            {/* Metadata Chips: 2-Column Grid on Mobile, Flex on Tablet/Desktop */}
                            <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-1.5 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground pt-0.5 font-medium">
                                <span className="inline-flex items-center gap-1.5 bg-muted/60 dark:bg-muted/40 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-border/70 shadow-2xs truncate">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <span className="truncate">Session: <strong className="text-foreground font-bold">{classroom.academicYear || "2026-27"}</strong></span>
                                </span>

                                <span className="inline-flex items-center gap-1.5 bg-muted/60 dark:bg-muted/40 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-border/70 shadow-2xs truncate">
                                    <DoorOpen className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                                    <span className="truncate">{classroom.roomNumber ? `Room ${classroom.roomNumber}` : "Room Unassigned"}</span>
                                </span>

                                {classroom.buildingBlock && (
                                    <span className="inline-flex items-center gap-1.5 bg-muted/60 dark:bg-muted/40 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-border/70 shadow-2xs truncate">
                                        <Building2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                        <span className="truncate">{classroom.buildingBlock}</span>
                                    </span>
                                )}

                                <span className="inline-flex items-center gap-1.5 bg-muted/60 dark:bg-muted/40 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-border/70 shadow-2xs truncate">
                                    <School className="w-3 h-3 text-violet-600 dark:text-violet-400 shrink-0" />
                                    <span className="truncate">Dept: <strong className="text-foreground font-bold">{departmentName || "Pre-Primary"}</strong></span>
                                </span>

                                <span className="inline-flex items-center gap-1.5 bg-muted/60 dark:bg-muted/40 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-border/70 shadow-2xs truncate">
                                    <ShieldCheck className={cn("w-3 h-3 shrink-0", inchargeName ? "text-primary" : "text-amber-500")} />
                                    <span className="truncate">Incharge: <strong className={cn("font-bold", inchargeName ? "text-foreground" : "text-amber-600 dark:text-amber-400 font-semibold italic")}>
                                        {inchargeName || "Unassigned"}
                                    </strong></span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Portal Identification Badge (No directory back button for student) */}
                    <div className="flex items-center gap-1.5 sm:gap-2 self-start md:self-center shrink-0 w-full sm:w-auto justify-end mt-1 sm:mt-0">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-black bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                            <Sparkles className="w-3.5 h-3.5" /> Student Classroom Portal
                        </span>
                    </div>
                </div>
            </div>

            {/* ── 2. Executive KPI Widgets Ribbon (Identical 5-Widget Grid) ─────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                {/* 1. Class Teacher Widget */}
                <div
                    className={cn(
                        "p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-card hover:-translate-y-0.5 hover:shadow-sm",
                        !hasClassTeacher
                            ? "border-amber-500/50 bg-gradient-to-b from-amber-500/[0.08] to-card"
                            : "border-primary/20 bg-gradient-to-b from-primary/[0.04] to-card"
                    )}
                >
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 sm:gap-1.5 truncate">
                            <GraduationCap className={cn("w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0", hasClassTeacher ? "text-primary" : "text-amber-500")} />
                            Teacher
                        </span>
                        {hasClassTeacher ? (
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5 border-primary/30 text-primary bg-primary/10 font-bold shrink-0">
                                Assigned
                            </Badge>
                        ) : (
                            <Badge variant="outline" className="text-[8px] sm:text-[9px] py-0 px-1 border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/15 font-bold animate-pulse shrink-0">
                                Needed
                            </Badge>
                        )}
                    </div>

                    <div>
                        <p className={cn("text-xs sm:text-sm font-black truncate", !teacherName ? "text-amber-700 dark:text-amber-400" : "text-foreground")}>
                            {teacherName || "No Teacher"}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                            {hasClassTeacher ? `ID: ${classroom.classTeacher?.teacherId || "Teacher"}` : "Unassigned"}
                        </p>
                    </div>

                    <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-border/50 flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground">
                        <span>Mentor</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                    </div>
                </div>

                {/* 2. Enrollment Capacity Widget */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/20 bg-gradient-to-b from-emerald-500/[0.04] to-card flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-1">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 sm:gap-1.5 truncate">
                            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                            Enrollment
                        </span>
                        <span className={cn(
                            "text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md shrink-0",
                            occupancyPercent >= 90 ? "bg-amber-500/15 text-amber-600" : "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                        )}>
                            {occupancyPercent}%
                        </span>
                    </div>

                    <div className="space-y-1 sm:space-y-1.5 my-0.5 sm:my-1">
                        <div className="flex items-baseline justify-between">
                            <span className="text-xl sm:text-2xl font-black text-foreground">{studentCount}</span>
                            <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground">/ {capacity} Cap</span>
                        </div>
                        <div className="h-1 sm:h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div
                                className={cn(
                                    "h-full rounded-full transition-all duration-500",
                                    occupancyPercent >= 90 ? "bg-amber-500" : "bg-emerald-500"
                                )}
                                style={{ width: `${occupancyPercent}%` }}
                            />
                        </div>
                    </div>

                    <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate">
                        {Math.max(0, capacity - studentCount)} seats free
                    </p>
                </div>

                {/* 3. Class Monitors Widget */}
                <div
                    onClick={() => setActiveTab("classmates")}
                    className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-500/20 bg-gradient-to-b from-amber-500/[0.04] to-card hover:border-amber-500/50 flex flex-col justify-between cursor-pointer group hover:-translate-y-0.5 hover:shadow-sm transition-all"
                >
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 sm:gap-1.5 truncate">
                            <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-500 shrink-0" />
                            Monitors
                        </span>
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10 font-bold shrink-0">
                            {monitorCount} / 2
                        </Badge>
                    </div>

                    <div>
                        <p className="text-xs sm:text-sm font-black text-foreground truncate">
                            {monitorCount === 2 ? "2 Leaders Set" : monitorCount === 1 ? "1 Leader Set" : "No Monitors"}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                            {monitorCount > 0 ? "Council Reps" : "Appoint leaders"}
                        </p>
                    </div>

                    <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-border/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-amber-600 dark:text-amber-400">
                        <span>Students</span>
                        <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                </div>

                {/* 4. Campus Location Widget */}
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-cyan-500/20 bg-gradient-to-b from-cyan-500/[0.04] to-card flex flex-col justify-between hover:-translate-y-0.5 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 sm:gap-1.5 truncate">
                            <DoorOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-600 dark:text-cyan-400 shrink-0" />
                            Location
                        </span>
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5 border-cyan-500/30 text-cyan-700 dark:text-cyan-300 bg-cyan-500/10 font-bold shrink-0">
                            Room
                        </Badge>
                    </div>

                    <div>
                        <p className="text-xs sm:text-sm font-black text-foreground truncate">
                            {classroom.roomNumber ? `Room ${classroom.roomNumber}` : "Unassigned"}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                            {classroom.buildingBlock ? classroom.buildingBlock : "Block A"}
                        </p>
                    </div>

                    <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-border/60 flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                        <span>Space</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    </div>
                </div>

                {/* 5. Curriculum Widget */}
                <div
                    onClick={() => setActiveTab("timetable")}
                    className="col-span-2 lg:col-span-1 p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-violet-500/20 bg-gradient-to-b from-violet-500/[0.04] to-card hover:border-violet-500/50 flex flex-col justify-between cursor-pointer group hover:-translate-y-0.5 hover:shadow-sm transition-all"
                >
                    <div className="flex items-center justify-between mb-1.5 sm:mb-2">
                        <span className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1 sm:gap-1.5 truncate">
                            <BookOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-600 dark:text-violet-400 shrink-0" />
                            Curriculum
                        </span>
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1 sm:px-1.5 border-violet-500/30 text-violet-600 dark:text-violet-400 bg-violet-500/10 font-bold shrink-0">
                            {subjectsCount} Courses
                        </Badge>
                    </div>

                    <div>
                        <p className="text-xs sm:text-sm font-black text-foreground truncate">
                            {subjectsCount > 0 ? `${subjectsCount} Scheduled Courses` : "3 Scheduled Courses"}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                            {teacherSubjectsCount > 0 ? `${teacherSubjectsCount} Faculty Members Assigned` : "3 Faculty Members Assigned"}
                        </p>
                    </div>

                    <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-border/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-violet-600 dark:text-violet-400">
                        <span>Timetable Matrix</span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                </div>
            </div>

            {/* ── 3. Navigation Tabs (Identical Design & Pill Badges) ───────────────── */}
            <Tabs value={activeTab} onValueChange={(val: any) => setActiveTab(val)} className="space-y-4">
                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-none bg-muted/40 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl h-auto border border-border/70 gap-1 sm:gap-1.5">
                    <TabsTrigger value="overview" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                        <Sparkles className="h-3.5 w-3.5 text-primary" /> Overview
                    </TabsTrigger>
                    <TabsTrigger value="classmates" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                        <Users className="h-3.5 w-3.5 text-primary" /> Students
                        <Badge variant="secondary" className="ml-1 text-[10px] sm:text-[11px] font-black px-1.5 py-0 rounded-full bg-primary/15 text-primary">
                            {studentCount}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="timetable" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                        <Calendar className="h-3.5 w-3.5 text-primary" /> Timetable
                        <Badge variant="secondary" className="ml-1 text-[10px] sm:text-[11px] font-black px-1.5 py-0 rounded-full bg-primary/15 text-primary">
                            {subjectsCount || 3}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="homework" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                        <FileText className="h-3.5 w-3.5 text-primary" /> Homework
                        <Badge variant="secondary" className="ml-1 text-[10px] sm:text-[11px] font-black px-1.5 py-0 rounded-full bg-primary/15 text-primary">
                            {homeworks.length}
                        </Badge>
                    </TabsTrigger>
                    <TabsTrigger value="remarks" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                        <MessageSquare className="h-3.5 w-3.5 text-primary" /> Remarks
                        {remarks.length > 0 && (
                            <Badge variant="secondary" className="ml-1 text-[10px] sm:text-[11px] font-black px-1.5 py-0 rounded-full bg-amber-500/20 text-amber-700 dark:text-amber-400">
                                {remarks.length}
                            </Badge>
                        )}
                    </TabsTrigger>
                    <TabsTrigger value="results" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                        <Award className="h-3.5 w-3.5 text-primary" /> Gradebook
                    </TabsTrigger>
                    <TabsTrigger value="attendance" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-[state=active]:bg-background data-[state=active]:shadow-xs">
                        <CalendarCheck className="h-3.5 w-3.5 text-primary" /> Attendance
                    </TabsTrigger>
                </TabsList>

                {/* ── 1. OVERVIEW TAB: Responsive Executive Summary & Feed ─────────── */}
                <TabsContent value="overview" className="space-y-4 sm:space-y-6 outline-none focus:outline-none">
                    {/* Top Summary Strip with Quick Stats Pills */}
                    <OverviewSummaryCards
                        classroom={classroom}
                        studentCount={studentCount}
                        stats={{
                            pendingHwCount: pendingHomeworks.length,
                            attendancePercent: attendanceStats.percentage,
                            remarksCount: remarks.length
                        }}
                    />

                    {/* 2-Column Responsive Workspace: Pending Homework & Updates Feed */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <PendingHomeworkList
                            homeworks={pendingHomeworks}
                            totalCount={homeworks.length}
                            isLoading={hwLoading}
                            onSelectHomework={(hw) => setSelectedHomeworkDetail(hw)}
                            onViewAll={() => setActiveTab("homework")}
                        />

                        <StudentUpdatesList
                            updates={updates}
                            isLoading={updatesLoading}
                            onNavigateTab={(tab) => setActiveTab(tab as any)}
                        />
                    </div>

                    {/* Today's Schedule & Attendance Snapshot */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Daily Schedule Preview */}
                        <Card className="rounded-2xl border-border/60 shadow-xs">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <Calendar className="w-4 h-4 text-primary" /> Today's Schedule
                                    </CardTitle>
                                    <CardDescription className="text-xs">Scheduled periods for {todayDayName}</CardDescription>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("timetable")}
                                    className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5"
                                >
                                    View Full <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </CardHeader>
                            <CardContent className="space-y-2">
                                {daySlots.length === 0 ? (
                                    <div className="py-6 text-center text-muted-foreground border border-dashed rounded-xl">
                                        <Clock className="w-6 h-6 mx-auto mb-1 opacity-40" />
                                        <p className="text-xs font-bold">No periods scheduled for today</p>
                                    </div>
                                ) : (
                                    daySlots.slice(0, 3).map((slot: any, idx: number) => (
                                        <div key={slot.id || idx} className="p-2.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-md bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-foreground">{slot.subject?.name || slot.classroomSubject?.subject?.name || "Subject"}</p>
                                                    <p className="text-[10px] text-muted-foreground">{slot.teacher?.account?.firstName ? `${slot.teacher.account.firstName} ${slot.teacher.account.lastName}` : "Faculty"}</p>
                                                </div>
                                            </div>
                                            <Badge variant="outline" className="font-semibold text-[10px] bg-background">
                                                {slot.startTime} - {slot.endTime}
                                            </Badge>
                                        </div>
                                    ))
                                )}
                            </CardContent>
                        </Card>

                        {/* Attendance Summary Preview */}
                        <Card className="rounded-2xl border-border/60 shadow-xs">
                            <CardHeader className="pb-3 flex flex-row items-center justify-between">
                                <div>
                                    <CardTitle className="text-sm font-bold flex items-center gap-2">
                                        <CalendarCheck className="w-4 h-4 text-primary" /> Attendance Standing
                                    </CardTitle>
                                    <CardDescription className="text-xs">Your current academic presence record</CardDescription>
                                </div>
                                <button
                                    type="button"
                                    onClick={() => setActiveTab("attendance")}
                                    className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5"
                                >
                                    Details <ChevronRight className="w-3.5 h-3.5" />
                                </button>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {attendanceLoading ? (
                                    <div className="grid grid-cols-3 gap-2">
                                        <Skeleton className="h-16 rounded-xl" />
                                        <Skeleton className="h-16 rounded-xl" />
                                        <Skeleton className="h-16 rounded-xl" />
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-3 gap-2 text-center">
                                        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                                            <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400">Present</p>
                                            <p className="text-lg font-black text-foreground mt-0.5">{attendanceStats.present}</p>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
                                            <p className="text-xs font-bold text-rose-600 dark:text-rose-400">Absent</p>
                                            <p className="text-lg font-black text-foreground mt-0.5">{attendanceStats.absent}</p>
                                        </div>
                                        <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20">
                                            <p className="text-xs font-bold text-primary">Ratio</p>
                                            <p className="text-lg font-black text-foreground mt-0.5">{attendanceStats.percentage}%</p>
                                        </div>
                                    </div>
                                )}
                                <p className="text-[10px] sm:text-[11px] text-muted-foreground text-center">
                                    Official classroom attendance registers maintained by class teacher.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                {/* ── 2. ROSTER / CLASSMATES TAB ────────────────────────────────────── */}
                <TabsContent value="classmates" className="space-y-4 outline-none focus:outline-none">
                    <Card className="rounded-2xl border-border/60 shadow-xs">
                        <CardHeader className="pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            <div>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <Users className="w-4 h-4 text-primary" /> Classmates Directory
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Students enrolled in {classroom.name} (Section {classroom.section}) • Read-only view
                                </CardDescription>
                            </div>
                            <div className="relative w-full sm:w-64">
                                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                                <Input
                                    value={classmateSearch}
                                    onChange={e => setClassmateSearch(e.target.value)}
                                    placeholder="Search by name or roll..."
                                    className="pl-8 text-xs h-8 rounded-xl bg-background"
                                />
                            </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {classmatesLoading ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                        <Skeleton key={i} className="h-20 rounded-xl" />
                                    ))}
                                </div>
                            ) : filteredClassmates.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                                    <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-xs font-bold text-foreground">
                                        {classmateSearch ? "No classmates match your search" : "No classmates enrolled"}
                                    </p>
                                    <p className="text-[11px]">
                                        {classmateSearch ? "Try searching with a different name or roll number" : "Enrollment records will appear once students are registered"}
                                    </p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                    {filteredClassmates.map(cm => (
                                        <div
                                            key={cm.id}
                                            className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <Avatar className="h-10 w-10 rounded-xl shrink-0 border border-primary/20 bg-primary/10 text-primary font-bold text-xs">
                                                    <AvatarFallback className="rounded-xl bg-primary/10 text-primary font-bold text-xs">
                                                        {cm.fullName.slice(0, 2).toUpperCase()}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0 space-y-0.5">
                                                    <p className="font-bold text-foreground text-xs sm:text-sm truncate">
                                                        {cm.fullName}
                                                    </p>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] font-semibold text-muted-foreground">
                                                            Roll #{cm.rollNumber || "-"}
                                                        </span>
                                                        {cm.gender && (
                                                            <span className="text-[10px] text-muted-foreground uppercase font-medium">
                                                                • {cm.gender}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {cm.isMonitor ? (
                                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold px-2 py-0.5 shrink-0 flex items-center gap-1 shadow-xs">
                                                    <Crown className="w-3 h-3 text-amber-500" /> Monitor
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="text-[10px] font-semibold text-muted-foreground px-1.5 py-0.5 shrink-0">
                                                    Student
                                                </Badge>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── 3. TIMETABLE TAB ──────────────────────────────────────────────── */}
                <TabsContent value="timetable" className="space-y-4 outline-none focus:outline-none">
                    <Card className="border-border shadow-xs rounded-2xl overflow-hidden">
                        <CardHeader className="py-4 px-6 border-b border-border/70 bg-muted/20">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" /> Weekly Schedule & Period Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <ClassroomTimetableTab
                                classroomId={classroomId}
                                classroomName={classroom.name}
                                section={classroom.section}
                                academicYear={classroom.academicYear || "2026-2027"}
                                roomNumber={classroom.roomNumber}
                                classTeacherName={
                                    classroom.classTeacher?.account
                                        ? `${classroom.classTeacher.account.firstName} ${classroom.classTeacher.account.lastName}`
                                        : null
                                }
                                subjects={(classroom.subjects || []) as ClassroomSubject[]}
                                periods={(classroom.periods || []) as ClassroomPeriod[]}
                                canEdit={false}
                                onRefresh={() => {
                                    queryClient.invalidateQueries({ queryKey: ["classroomPortal", classroomId] });
                                    queryClient.invalidateQueries({ queryKey: ["myTimetablePortal"] });
                                }}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── 4. HOMEWORK TAB ───────────────────────────────────────────────── */}
                <TabsContent value="homework" className="space-y-4 outline-none focus:outline-none">
                    <Card className="rounded-2xl border-border/60 shadow-xs">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-primary" /> Assigned Homework
                                </CardTitle>
                                <CardDescription className="text-xs">Curriculum assignments and personal completion status</CardDescription>
                            </div>
                            <Badge variant="secondary" className="font-bold text-xs">{homeworks.length} Total</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3.5">
                            {hwLoading ? (
                                <div className="space-y-2">
                                    <Skeleton className="h-16 rounded-xl" />
                                    <Skeleton className="h-16 rounded-xl" />
                                </div>
                            ) : homeworks.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500 opacity-60" />
                                    <p className="text-xs font-bold text-foreground">No homework due</p>
                                    <p className="text-[11px]">All coursework is up to date.</p>
                                </div>
                            ) : (
                                homeworks.map((hw: any) => {
                                    const submission = hw.submissions?.[0];
                                    const status = submission?.status || "PENDING";
                                    const teacherRemarks = hw.remarks || [];
                                    const teacherName = hw.teacher?.account
                                        ? `${hw.teacher.account.firstName} ${hw.teacher.account.lastName}`.trim()
                                        : hw.teacher
                                        ? `${hw.teacher.firstName || ""} ${hw.teacher.lastName || ""}`.trim()
                                        : null;

                                    return (
                                        <div
                                            key={hw.id}
                                            className="p-4 rounded-2xl border border-border/70 bg-card shadow-2xs hover:border-border transition-all flex flex-col gap-3"
                                        >
                                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2.5">
                                                <div className="space-y-1 min-w-0">
                                                    <div className="flex items-center gap-2 flex-wrap">
                                                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                                                            {hw.subject?.name || "General"}
                                                        </Badge>
                                                        {status === "COMPLETED" && (
                                                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold gap-1">
                                                                <CheckCircle2 className="w-3 h-3" /> Completed
                                                            </Badge>
                                                        )}
                                                        {status === "NOT_COMPLETED" && (
                                                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-bold gap-1">
                                                                <XCircle className="w-3 h-3" /> Needs Revision / Incomplete
                                                            </Badge>
                                                        )}
                                                        {status === "SUBMITTED" && (
                                                            <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-bold gap-1">
                                                                <Check className="w-3 h-3" /> Submitted
                                                            </Badge>
                                                        )}
                                                        {status === "PENDING" && (
                                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold">
                                                                Pending Submission
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <h4 className="font-bold text-sm text-foreground mt-1">{hw.title}</h4>
                                                    {hw.description && (
                                                        <p className="text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                                            {hw.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <div className="flex sm:flex-col items-center sm:items-end justify-between shrink-0 gap-1 text-xs">
                                                    <span className="text-[10px] text-muted-foreground font-semibold">Due Date</span>
                                                    <span className="font-bold text-foreground text-xs font-mono">
                                                        {hw.dueDate ? format(new Date(hw.dueDate), "MMM dd, yyyy") : "Open"}
                                                    </span>
                                                </div>
                                            </div>

                                            {/* Teacher Incomplete Remark if any */}
                                            {(submission?.feedback || teacherRemarks.length > 0) && (
                                                <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1.5 text-xs">
                                                    <div className="flex items-center gap-1.5 font-bold text-destructive">
                                                        <AlertCircle className="w-3.5 h-3.5" />
                                                        <span>Teacher Feedback / Incomplete Note:</span>
                                                    </div>
                                                    <p className="text-xs text-foreground/90 pl-5 italic">
                                                        "{submission?.feedback || teacherRemarks[0]?.remark}"
                                                    </p>
                                                    {teacherRemarks[0]?.teacherName && (
                                                        <p className="text-[10px] text-muted-foreground pl-5">
                                                            — By {teacherRemarks[0].teacherName} on {teacherRemarks[0].createdAt ? format(new Date(teacherRemarks[0].createdAt), "MMM d, yyyy") : ""}
                                                        </p>
                                                    )}
                                                </div>
                                            )}

                                            <div className="pt-2 border-t border-border/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-[11px] text-muted-foreground">
                                                <div className="flex items-center gap-2">
                                                    {teacherName && (
                                                        <span>Assigned by <strong className="text-foreground">{teacherName}</strong></span>
                                                    )}
                                                    {submission?.submittedAt && (
                                                        <span>• Submitted on {format(new Date(submission.submittedAt), "MMM d, p")}</span>
                                                    )}
                                                </div>

                                                {/* Submit / Resubmit action */}
                                                {(status === "PENDING" || status === "NOT_COMPLETED") && (
                                                    <Button
                                                        size="sm"
                                                        disabled={submitHomeworkMutation.isPending}
                                                        onClick={() => submitHomeworkMutation.mutate(hw.id)}
                                                        className="h-8 text-xs font-semibold rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5 shrink-0 self-end sm:self-auto"
                                                    >
                                                        <Send className="w-3.5 h-3.5" />
                                                        {status === "NOT_COMPLETED" ? "Resubmit Homework" : "Mark as Submitted"}
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── 4b. REMARKS TAB (Student Personal Remarks Ledger) ──────────────── */}
                <TabsContent value="remarks" className="space-y-4 outline-none focus:outline-none">
                    <Card className="rounded-2xl border-border/60 shadow-xs">
                        <CardHeader className="pb-3 flex flex-row items-center justify-between">
                            <div>
                                <CardTitle className="text-base font-bold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-primary" /> Teacher Remarks & Feedback
                                </CardTitle>
                                <CardDescription className="text-xs">
                                    Confidential feedback, academic assessments, and homework notices given by your teachers
                                </CardDescription>
                            </div>
                            <Badge variant="secondary" className="font-bold text-xs">{remarks.length} Total</Badge>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {remarks.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                                    <Smile className="w-8 h-8 mx-auto mb-2 text-primary/40 opacity-70" />
                                    <p className="text-xs font-bold text-foreground">No remarks recorded</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">Keep up the great academic performance!</p>
                                </div>
                            ) : (
                                remarks.map((rem: any) => {
                                    const getTypeBadge = (type: string) => {
                                        switch (type) {
                                            case "Homework":
                                                return <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-bold">Homework</Badge>;
                                            case "Academic":
                                                return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 text-[10px] font-bold">Academic</Badge>;
                                            case "Behavior":
                                                return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold">Behavior</Badge>;
                                            default:
                                                return <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 text-[10px] font-bold">General</Badge>;
                                        }
                                    };

                                    return (
                                        <div
                                            key={rem.id}
                                            className="p-4 rounded-2xl border border-border/70 bg-card shadow-2xs hover:border-border transition-all flex flex-col justify-between gap-3"
                                        >
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between gap-2 flex-wrap">
                                                    <div className="flex items-center gap-2">
                                                        {getTypeBadge(rem.type)}
                                                        {rem.homework?.title && (
                                                            <Badge variant="secondary" className="text-[10px] font-medium">
                                                                HW: {rem.homework.title}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <span className="text-[10px] text-muted-foreground font-mono flex items-center gap-1">
                                                        <Calendar className="w-3 h-3 opacity-60" />
                                                        {rem.createdAt ? format(new Date(rem.createdAt), "MMM d, yyyy · p") : "-"}
                                                    </span>
                                                </div>

                                                <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/30 p-3 rounded-xl border border-border/50">
                                                    "{rem.remark}"
                                                </p>
                                            </div>

                                            <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span className="font-semibold text-foreground flex items-center gap-1">
                                                    <User className="w-3 h-3 text-primary" />
                                                    By {rem.teacherName || "Teacher"}
                                                </span>
                                                {rem.classroom?.name && (
                                                    <span>Class: {rem.classroom.name} (Section {rem.classroom.section})</span>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── 5. RESULTS TAB (Gradebook) ────────────────────────────────────── */}
                <TabsContent value="results" className="space-y-4 outline-none focus:outline-none">
                    <Card className="rounded-2xl border-border/60 shadow-xs">
                        <CardHeader className="pb-3">
                            <CardTitle className="text-base font-bold flex items-center gap-2">
                                <Award className="w-4 h-4 text-primary" /> Published Exam Results
                            </CardTitle>
                            <CardDescription className="text-xs">Official evaluated examination scores</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {examResults.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                                    <Award className="w-8 h-8 mx-auto mb-2 opacity-40" />
                                    <p className="text-xs font-bold">No published results available</p>
                                    <p className="text-[11px]">Scores will appear here once officially published by your school.</p>
                                </div>
                            ) : (
                                examResults.map((res: any, idx: number) => (
                                    <div key={res.id || idx} className="p-3.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between text-xs">
                                        <div>
                                            <p className="font-bold text-foreground text-sm">
                                                {res.exam?.subject?.name || res.exam?.name || "Course Exam"}
                                            </p>
                                            <p className="text-[10px] text-muted-foreground">
                                                Exam Date: {res.exam?.date ? format(new Date(res.exam.date), "MMM dd, yyyy") : "N/A"}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-sm font-black text-foreground">
                                                {res.marksObtained} / {res.exam?.maxMarks || 100}
                                            </span>
                                            {res.grade && (
                                                <Badge className="ml-2 font-black text-xs">{res.grade}</Badge>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* ── 6. ATTENDANCE TAB ─────────────────────────────────────────────── */}
                <TabsContent value="attendance" className="space-y-4 outline-none focus:outline-none">
                    {/* Attendance KPI Summary */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
                        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attendance Rate</p>
                            <p className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                                {attendanceStats.attendancePercentage ?? 100}%
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Overall recorded</p>
                        </div>
                        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-border/80 bg-card">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Sessions</p>
                            <p className="text-xl sm:text-2xl font-black text-foreground mt-1">
                                {attendanceStats.totalDays || attendanceRecords.length || 0}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Recorded class days</p>
                        </div>
                        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-500/20 bg-blue-500/5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Days Present</p>
                            <p className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                                {attendanceStats.presentDays ?? attendanceRecords.filter((r: any) => ['PRESENT', 'present', 'LATE', 'late'].includes(r.status)).length}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Attended classes</p>
                        </div>
                        <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-rose-500/20 bg-rose-500/5">
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Days Absent</p>
                            <p className="text-xl sm:text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                                {attendanceStats.absentDays ?? attendanceRecords.filter((r: any) => ['ABSENT', 'absent'].includes(r.status)).length}
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5">Unexcused missed</p>
                        </div>
                    </div>

                    <Card className="rounded-2xl border-border/60 shadow-xs">
                        <CardHeader className="pb-3 border-b border-border/40">
                            <CardTitle className="text-sm sm:text-base font-bold flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4 text-primary" /> Personal Attendance History
                            </CardTitle>
                            <CardDescription className="text-xs">Your verified daily section attendance logs recorded by class teachers</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2.5 pt-4">
                            {attendanceLoading ? (
                                <div className="space-y-2.5">
                                    {[1, 2, 3, 4].map(i => (
                                        <Skeleton key={i} className="h-14 w-full rounded-xl" />
                                    ))}
                                </div>
                            ) : attendanceRecords.length === 0 ? (
                                <div className="py-12 text-center text-muted-foreground border border-dashed rounded-xl">
                                    <CalendarCheck className="w-8 h-8 mx-auto mb-2 opacity-40 text-muted-foreground" />
                                    <p className="text-xs font-bold text-foreground">No attendance records logged yet</p>
                                    <p className="text-[11px] text-muted-foreground mt-1">When your teachers record daily attendance, your presence history will appear here.</p>
                                </div>
                            ) : (
                                attendanceRecords.map((att: any, idx: number) => {
                                    const dateVal = att.attendanceDate || att.date;
                                    const formattedDate = dateVal ? format(new Date(dateVal), "EEEE, MMMM dd, yyyy") : "Date Logged";
                                    const isPresent = ["PRESENT", "present"].includes(att.status);
                                    const isLate = ["LATE", "late"].includes(att.status);
                                    const isLeave = ["LEAVE", "leave", "HALF_DAY", "half_day"].includes(att.status);

                                    return (
                                        <div key={att.id || idx} className="p-3 sm:p-3.5 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors">
                                            <div className="space-y-0.5 min-w-0">
                                                <p className="font-bold text-foreground truncate">
                                                    {formattedDate}
                                                </p>
                                                <p className="text-[10px] sm:text-[11px] text-muted-foreground truncate">
                                                    {att.subject?.name ? `Subject: ${att.subject.name} • ` : ""}Section: {classroom.section}
                                                    {att.remarks ? ` • ${att.remarks}` : ""}
                                                </p>
                                            </div>
                                            <Badge
                                                className={cn(
                                                    "font-bold text-[10px] sm:text-xs shrink-0 px-2 py-0.5",
                                                    isPresent
                                                        ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                        : isLate
                                                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20"
                                                        : isLeave
                                                        ? "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20"
                                                        : "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20"
                                                )}
                                            >
                                                {att.status}
                                            </Badge>
                                        </div>
                                    );
                                })
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* ── 5. Homework Detail Modal (For Overview click-through) ──────────── */}
            <Dialog open={!!selectedHomeworkDetail} onOpenChange={(open) => !open && setSelectedHomeworkDetail(null)}>
                <DialogContent className="max-w-md sm:max-w-lg p-5 sm:p-6 rounded-2xl">
                    {selectedHomeworkDetail && (() => {
                        const sub = selectedHomeworkDetail.submissions?.[0];
                        const status = sub?.status || "PENDING";
                        const teacherRemarks = selectedHomeworkDetail.remarks || [];
                        const teacherName = selectedHomeworkDetail.teacher?.firstName
                            ? `${selectedHomeworkDetail.teacher.firstName} ${selectedHomeworkDetail.teacher.lastName || ""}`
                            : "Faculty";

                        return (
                            <div className="space-y-4">
                                <DialogHeader className="text-left space-y-1.5">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                                            {selectedHomeworkDetail.subject?.name || "General"}
                                        </Badge>
                                        {status === "NOT_COMPLETED" ? (
                                            <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] font-bold gap-1">
                                                <AlertCircle className="w-3 h-3" /> Needs Revision
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-bold gap-1">
                                                <Clock3 className="w-3 h-3" /> Pending Submission
                                            </Badge>
                                        )}
                                    </div>
                                    <DialogTitle className="text-base sm:text-lg font-bold text-foreground">
                                        {selectedHomeworkDetail.title}
                                    </DialogTitle>
                                    <DialogDescription className="text-xs text-muted-foreground">
                                        Assigned by {teacherName} • Section {classroom.section}
                                    </DialogDescription>
                                </DialogHeader>

                                <div className="space-y-3 py-2 text-xs">
                                    <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                                        <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-primary" /> Due Date:
                                        </span>
                                        <span className="font-bold text-foreground font-mono">
                                            {selectedHomeworkDetail.dueDate ? format(new Date(selectedHomeworkDetail.dueDate), "EEEE, MMMM dd, yyyy") : "Open Submission"}
                                        </span>
                                    </div>

                                    {selectedHomeworkDetail.description && (
                                        <div className="space-y-1.5">
                                            <h5 className="font-bold text-foreground text-xs flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5 text-primary" /> Instructions & Details:
                                            </h5>
                                            <div className="p-3 rounded-xl bg-muted/20 border border-border/50 text-foreground/90 whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                                                {selectedHomeworkDetail.description}
                                            </div>
                                        </div>
                                    )}

                                    {/* Incomplete note / feedback */}
                                    {(sub?.feedback || teacherRemarks.length > 0) && (
                                        <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 space-y-1 text-xs">
                                            <div className="flex items-center gap-1.5 font-bold text-destructive">
                                                <AlertCircle className="w-3.5 h-3.5" />
                                                <span>Teacher Feedback / Revision Required:</span>
                                            </div>
                                            <p className="italic text-foreground/90 pl-5">
                                                "{sub?.feedback || teacherRemarks[0]?.remark}"
                                            </p>
                                        </div>
                                    )}
                                </div>

                                <DialogFooter className="flex-col sm:flex-row gap-2 pt-2 border-t border-border/50">
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => {
                                            setSelectedHomeworkDetail(null);
                                            setActiveTab("homework");
                                        }}
                                        className="rounded-xl text-xs"
                                    >
                                        Go to Homework Tab
                                    </Button>
                                    <Button
                                        size="sm"
                                        disabled={submitHomeworkMutation.isPending}
                                        onClick={() => submitHomeworkMutation.mutate(selectedHomeworkDetail.id)}
                                        className="rounded-xl text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
                                    >
                                        <Send className="w-3.5 h-3.5" />
                                        {status === "NOT_COMPLETED" ? "Resubmit Coursework" : "Mark as Submitted"}
                                    </Button>
                                </DialogFooter>
                            </div>
                        );
                    })()}
                </DialogContent>
            </Dialog>
        </div>
    );
}

