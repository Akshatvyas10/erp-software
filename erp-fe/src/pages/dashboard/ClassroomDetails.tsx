import { useState, useMemo, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    School, ArrowLeft, Users, LayoutGrid, BookOpen, ClipboardCheck,
    FileText, AlertTriangle, Pencil, Sparkles, Crown, DoorOpen,
    Building2, GraduationCap, ChevronRight, ShieldCheck, Copy
} from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/store/hooks";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ClassroomDetailsSkeleton } from "@/components/common/skeletons/ClassroomDetailsSkeleton";
import AccessDenied from "@/components/auth/AccessDenied";
import PermissionGate from "@/components/auth/PermissionGate";
import { PERMISSIONS } from "@/constants/permissions";
import HomeworkTab from "@/components/classrooms/HomeworkTab";
import GradebookTab from "@/components/classrooms/GradebookTab";

import { fetchClassroom } from "@/features/classrooms/api/classroomApi";
import { useClassroomScope } from "@/features/classrooms/hooks/useClassroomScope";
import {
    ClassroomOverviewTab,
    ClassroomStudentsTab,
    ClassroomTimetableTab,
    ClassroomAttendanceTab,
} from "@/features/classrooms/components/tabs";
import type { ClassroomEnrollment, ClassroomSubject, Subject } from "@/types/erp";
import { lazy, Suspense } from "react";
import { AssignClassTeacherDialog } from "@/features/classrooms/components/directory/AssignClassTeacherDialog";
import { EditClassroomDialog } from "@/features/classrooms/components/directory/EditClassroomDialog";
import { CloneStructureDialog } from "@/features/classrooms/components/directory/CloneStructureDialog";

const BulkPromotionWizardDialog = lazy(() =>
    import("@/features/classrooms/components/directory/BulkPromotionWizardDialog").then((m) => ({
        default: m.BulkPromotionWizardDialog,
    }))
);

type ActiveTab = "overview" | "roster" | "timetable" | "homework" | "gradebook" | "attendance";

export default function ClassroomDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { can } = usePermissions();

    const [activeTab, setActiveTab] = useState<ActiveTab>("overview");
    const [isAssignTeacherOpen, setIsAssignTeacherOpen] = useState(false);
    const [isEditClassroomOpen, setIsEditClassroomOpen] = useState(false);
    const [isCloneStructureOpen, setIsCloneStructureOpen] = useState(false);
    const [isPromotionWizardOpen, setIsPromotionWizardOpen] = useState(false);

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

    const subjects = useMemo(
        () => (classroom?.subjects ?? []) as ClassroomSubject[],
        [classroom?.subjects]
    );

    const teacherSubjectsMap = useMemo(() => {
        const map = new Map<string, { teacher: NonNullable<ClassroomSubject["teacher"]>; subjects: Subject[] }>();
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

    const scope = useClassroomScope(classroom);
    const isClassTeacher = scope.isClassTeacher;
    const canEdit = scope.canEditClassroom;
    const enrollments = useMemo(() => (classroom?.enrollments ?? []) as ClassroomEnrollment[], [classroom?.enrollments]);

    // Ensure user doesn't stay on an unauthorized tab if permissions change
    useEffect(() => {
        if (!classroom) return;
        if (activeTab === "gradebook" && !scope.canAccessGradebook) {
            setActiveTab("overview");
        } else if (activeTab === "attendance" && !scope.canAccessAttendance) {
            setActiveTab("overview");
        } else if (activeTab === "homework" && !scope.canAccessHomework) {
            setActiveTab("overview");
        }
    }, [scope, activeTab, classroom]);

    if (!can("classrooms", "read")) return <AccessDenied />;

    if (isLoading) {
        return <ClassroomDetailsSkeleton />;
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

    // Real dynamic summary calculations
    const hasClassTeacher = Boolean(
        classroom.classTeacher &&
        (classroom.classTeacher.account || classroom.classTeacher.teacherId)
    );
    const teacherName = hasClassTeacher && classroom.classTeacher?.account
        ? `${classroom.classTeacher.account.firstName} ${classroom.classTeacher.account.lastName}`
        : null;

    const studentCount = enrollments.length;
    const capacity = classroom.maxCapacity || 40;
    const occupancyPercent = Math.min(100, Math.round((studentCount / capacity) * 100));

    const monitor1 = classroom.enrollments?.find(e => e.student?.id === classroom.monitorMaleId)?.student || classroom.maleMonitor;
    const monitor2 = classroom.enrollments?.find(e => e.student?.id === classroom.monitorFemaleId)?.student || classroom.femaleMonitor;
    const monitorCount = [monitor1, monitor2].filter(Boolean).length;

    const status = classroom.status || "ACTIVE";
    const classNameDisplay = classroom.academicClass?.name || classroom.name;

    // Resolve Department & Incharge
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

    return (
        <div className="space-y-6 text-foreground pb-10">
            {/* ── 1. Executive Hero Header (Vibrant & High-Energy) ────────────────────── */}
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
                                    <span className="truncate">Session: <strong className="text-foreground font-bold">{classroom.academicYear || "2026-2027"}</strong></span>
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

                                {/* Department Name Chip */}
                                <span className="inline-flex items-center gap-1.5 bg-muted/60 dark:bg-muted/40 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-border/70 shadow-2xs truncate">
                                    <School className="w-3 h-3 text-violet-600 dark:text-violet-400 shrink-0" />
                                    <span className="truncate">Dept: <strong className="text-foreground font-bold">{departmentName || "General"}</strong></span>
                                </span>

                                {/* Incharge Name Chip with Fallback */}
                                <span className="inline-flex items-center gap-1.5 bg-muted/60 dark:bg-muted/40 px-2 sm:px-2.5 py-1 rounded-lg sm:rounded-xl border border-border/70 shadow-2xs truncate">
                                    <ShieldCheck className={cn("w-3 h-3 shrink-0", inchargeName ? "text-primary" : "text-amber-500")} />
                                    <span className="truncate">Incharge: <strong className={cn("font-bold", inchargeName ? "text-foreground" : "text-amber-600 dark:text-amber-400 font-semibold italic")}>
                                        {inchargeName || "Unassigned"}
                                    </strong></span>
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Right: Quick Action Buttons */}
                    <div className="flex items-center gap-1.5 sm:gap-2 self-start md:self-center shrink-0 w-full sm:w-auto justify-end mt-1 sm:mt-0">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => navigate("/dashboard/classrooms")}
                            className="h-8 sm:h-9 gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl border-border/80 hover:bg-muted"
                        >
                            <ArrowLeft className="h-3.5 w-3.5 sm:h-4 sm:w-4" /> Directory
                        </Button>

                        {canEdit && (
                            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setIsCloneStructureOpen(true)}
                                    className="h-8 sm:h-9 gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl border-border/80 hover:bg-muted text-foreground transition-colors shadow-2xs"
                                    title="Clone timetable and subjects to another section"
                                >
                                    <Copy className="h-3.5 w-3.5" /> Duplicate Structure
                                </Button>

                                <PermissionGate permission={PERMISSIONS.CLASSROOMS.MANAGE}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsPromotionWizardOpen(true)}
                                        className="h-8 sm:h-9 gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 text-purple-700 dark:text-purple-300 transition-colors shadow-2xs"
                                    >
                                        <GraduationCap className="h-3.5 w-3.5" /> Rollover / Promote
                                    </Button>
                                </PermissionGate>

                                <PermissionGate permission={PERMISSIONS.CLASSROOMS.UPDATE}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setIsEditClassroomOpen(true)}
                                        className="h-8 sm:h-9 gap-1 sm:gap-1.5 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary transition-colors shadow-2xs"
                                    >
                                        <Pencil className="h-3.5 w-3.5" /> Configure Section
                                    </Button>
                                </PermissionGate>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* ── 2. Executive KPI Widgets Ribbon (2-Columns on Mobile!) ─────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2.5 sm:gap-3.5">
                {/* 1. Class Teacher Widget */}
                <div
                    onClick={() => {
                        if (!hasClassTeacher && canEdit) setIsAssignTeacherOpen(true);
                    }}
                    className={cn(
                        "group p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all duration-200 flex flex-col justify-between bg-card hover:-translate-y-0.5 hover:shadow-sm",
                        !hasClassTeacher
                            ? "border-amber-500/50 bg-gradient-to-b from-amber-500/[0.08] to-card cursor-pointer"
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
                            {hasClassTeacher ? `ID: ${classroom.classTeacher?.teacherId || "Teacher"}` : "Tap to assign"}
                        </p>
                    </div>

                    {!hasClassTeacher && canEdit ? (
                        <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-amber-500/20 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-amber-700 dark:text-amber-400">
                            <span>Assign</span>
                            <ChevronRight className="w-3 h-3 sm:w-3.5 sm:h-3.5 transition-transform group-hover:translate-x-0.5" />
                        </div>
                    ) : (
                        <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-border/50 flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground">
                            <span>Mentor</span>
                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                        </div>
                    )}
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

                {/* 3. Class Monitors (Student Council Widget) */}
                <div
                    onClick={() => setActiveTab("roster")}
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
                        <span>Roster</span>
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
                            {classroom.buildingBlock ? classroom.buildingBlock : "Main Wing"}
                        </p>
                    </div>

                    <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-border/60 flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground font-medium">
                        <span>Space</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-500" />
                    </div>
                </div>

                {/* 5. Curriculum & Subjects Widget (Spans 2 columns on mobile for balanced grid!) */}
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
                            {subjects.length} Courses
                        </Badge>
                    </div>

                    <div>
                        <p className="text-xs sm:text-sm font-black text-foreground truncate">
                            {subjects.length > 0 ? `${subjects.length} Scheduled Courses` : "No Subjects Yet"}
                        </p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground mt-0.5 truncate">
                            {teacherSubjectsMap.length} Faculty Members Assigned
                        </p>
                    </div>

                    <div className="mt-2 sm:mt-2.5 pt-1.5 sm:pt-2 border-t border-border/60 flex items-center justify-between text-[10px] sm:text-[11px] font-bold text-violet-600 dark:text-violet-400">
                        <span>Timetable Matrix</span>
                        <ChevronRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" />
                    </div>
                </div>
            </div>

            {/* ── 3. High-Impact Missing Teacher Action Banner ───────────────────────── */}
            {!hasClassTeacher && (
                <div className="p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 shadow-xs">
                    <div className="flex items-start gap-2.5 sm:gap-3.5">
                        <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 shrink-0 mt-0.5">
                            <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h4 className="text-xs sm:text-sm font-black text-foreground">
                                    Classroom Leader Required
                                </h4>
                                <Badge className="bg-amber-600 text-white font-bold text-[9px] sm:text-[10px] py-0 px-1.5 rounded-full">
                                    Action Needed
                                </Badge>
                            </div>
                            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 sm:mt-1 max-w-2xl">
                                This section has no designated Class Teacher. Appoint a teacher to manage daily attendance registers, student performance tracking, and parental communication.
                            </p>
                        </div>
                    </div>

                    {canEdit && (
                        <Button
                            size="sm"
                            onClick={() => setIsAssignTeacherOpen(true)}
                            className="shrink-0 rounded-lg sm:rounded-xl text-[11px] sm:text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white shadow-sm w-full sm:w-auto h-8 sm:h-9"
                        >
                            <GraduationCap className="w-3.5 h-3.5 mr-1.5" />
                            Appoint Class Teacher
                        </Button>
                    )}
                </div>
            )}

            {/* ── 4. Interactive Tabs Navigation (Horizontally Scrollable on Mobile) ─── */}
            <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as ActiveTab)} className="space-y-4">
                <TabsList className="w-full justify-start overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-none bg-muted/40 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl h-auto border border-border/70 gap-1 sm:gap-1.5">
                    {scope.canAccessOverview && (
                        <TabsTrigger value="overview" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-state=active:bg-background data-state=active:shadow-xs">
                            <Sparkles className="h-3.5 w-3.5 text-primary" /> Overview
                        </TabsTrigger>
                    )}

                    {scope.canAccessRoster && (
                        <TabsTrigger value="roster" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-state=active:bg-background data-state=active:shadow-xs">
                            <Users className="h-3.5 w-3.5 text-primary" /> Roster
                            <Badge variant="secondary" className="ml-1 text-[10px] sm:text-[11px] font-black px-1.5 py-0 rounded-full bg-primary/15 text-primary">
                                {studentCount}
                            </Badge>
                        </TabsTrigger>
                    )}

                    {scope.canAccessTimetable && (
                        <TabsTrigger value="timetable" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-state=active:bg-background data-state=active:shadow-xs">
                            <LayoutGrid className="h-3.5 w-3.5 text-primary" /> Timetable
                            <Badge variant="secondary" className="ml-1 text-[10px] sm:text-[11px] font-black px-1.5 py-0 rounded-full bg-primary/15 text-primary">
                                {subjects.length}
                            </Badge>
                        </TabsTrigger>
                    )}

                    {scope.canAccessHomework && (
                        <TabsTrigger value="homework" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-state=active:bg-background data-state=active:shadow-xs">
                            <FileText className="h-3.5 w-3.5 text-primary" /> Homework
                        </TabsTrigger>
                    )}

                    {scope.canAccessGradebook && (
                        <TabsTrigger value="gradebook" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-state=active:bg-background data-state=active:shadow-xs">
                            <BookOpen className="h-3.5 w-3.5 text-primary" /> Gradebook
                        </TabsTrigger>
                    )}

                    {scope.canAccessAttendance && (
                        <TabsTrigger value="attendance" className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-state=active:bg-background data-state=active:shadow-xs">
                            <ClipboardCheck className="h-3.5 w-3.5 text-primary" /> Attendance
                        </TabsTrigger>
                    )}
                </TabsList>

                {/* Tab 1: Overview */}
                <TabsContent value="overview" className="outline-none focus:outline-none">
                    <ClassroomOverviewTab
                        classroom={classroom}
                        teacherSubjectsMap={teacherSubjectsMap}
                        canEdit={canEdit}
                        onAssignTeacher={() => setIsAssignTeacherOpen(true)}
                        onAppointMonitors={() => setActiveTab("roster")}
                        onNavigateToTimetable={() => setActiveTab("timetable")}
                    />
                </TabsContent>

                {/* Tab 2: Roster */}
                <TabsContent value="roster" className="outline-none focus:outline-none">
                    <ClassroomStudentsTab
                        classroomId={classroom.id}
                        classroomName={`${classNameDisplay} - Section ${classroom.section}`}
                        enrollments={enrollments}
                        canEdit={canEdit}
                        onRefresh={refresh}
                        monitorMaleId={classroom.monitorMaleId || undefined}
                        monitorFemaleId={classroom.monitorFemaleId || undefined}
                        maleMonitor={classroom.maleMonitor}
                        femaleMonitor={classroom.femaleMonitor}
                    />
                </TabsContent>

                {/* Tab 3: Timetable */}
                <TabsContent value="timetable" className="outline-none focus:outline-none">
                    <Card className="border-border shadow-xs rounded-2xl overflow-hidden">
                        <CardHeader className="py-4 px-6 border-b border-border/70 bg-muted/20">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                <LayoutGrid className="w-4 h-4 text-primary" /> Weekly Schedule & Period Distribution
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <ClassroomTimetableTab
                                classroomId={classroom.id}
                                classroomName={classNameDisplay}
                                section={classroom.section}
                                academicYear={classroom.academicYear || "2026-2027"}
                                roomNumber={classroom.roomNumber}
                                classTeacherName={teacherName}
                                subjects={subjects}
                                periods={classroom.periods ?? []}
                                canEdit={canEdit}
                                onRefresh={refresh}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 4: Homework */}
                <TabsContent value="homework" className="outline-none focus:outline-none">
                    <Card className="border-border shadow-xs rounded-2xl overflow-hidden">
                        <CardHeader className="py-4 px-6 border-b border-border/70 bg-muted/20">
                            <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                <FileText className="w-4 h-4 text-primary" /> Active Class Assignments & Homework
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-4 sm:p-6">
                            <HomeworkTab
                                classroomId={classroom.id}
                                classTeacherId={classroom.classTeacherId || undefined}
                                subjects={subjects}
                            />
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* Tab 5: Gradebook */}
                {scope.canAccessGradebook && (
                    <TabsContent value="gradebook" className="outline-none focus:outline-none">
                        <Card className="border-border shadow-xs rounded-2xl overflow-hidden">
                            <CardHeader className="py-4 px-6 border-b border-border/70 bg-muted/20">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <BookOpen className="w-4 h-4 text-primary" /> Term Marks & Student Gradebook
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                <GradebookTab
                                    classroomId={classroom.id}
                                    enrollments={enrollments}
                                    subjects={subjects}
                                    canEdit={can("exams", "manage") || isClassTeacher || scope.isDepartmentIncharge || scope.isSuperAdmin}
                                    classTeacherId={classroom.classTeacherId || undefined}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}

                {/* Tab 6: Attendance */}
                {scope.canAccessAttendance && (
                    <TabsContent value="attendance" className="outline-none focus:outline-none">
                        <Card className="border-border shadow-xs rounded-2xl overflow-hidden">
                            <CardHeader className="py-4 px-6 border-b border-border/70 bg-muted/20">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                                    <ClipboardCheck className="w-4 h-4 text-primary" /> Daily Attendance Ledger
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-4 sm:p-6">
                                <ClassroomAttendanceTab
                                    classroomId={classroom.id}
                                    canEdit={can("attendance", "update") || can("attendance", "create") || isClassTeacher || scope.isDepartmentIncharge || scope.isSuperAdmin}
                                />
                            </CardContent>
                        </Card>
                    </TabsContent>
                )}
            </Tabs>

            {/* ── Dialog 1: Assign Class Teacher ────────────────────────────────────── */}
            <AssignClassTeacherDialog
                open={isAssignTeacherOpen}
                onOpenChange={setIsAssignTeacherOpen}
                classroomId={classroom.id}
                currentTeacherId={classroom.classTeacherId}
                classroomName={`${classNameDisplay} - Section ${classroom.section}`}
                onSuccess={refresh}
            />

            {/* ── Dialog 2: Edit Classroom Configuration ────────────────────────────── */}
            <EditClassroomDialog
                open={isEditClassroomOpen}
                onOpenChange={setIsEditClassroomOpen}
                classroom={classroom}
                onSuccess={refresh}
            />

            {/* ── Dialog 3: Clone Structure ─────────────────────────────────────────── */}
            <CloneStructureDialog
                open={isCloneStructureOpen}
                onOpenChange={setIsCloneStructureOpen}
                sourceClassroomId={classroom.id}
                sourceClassroomName={`${classNameDisplay} - Section ${classroom.section}`}
                onSuccess={refresh}
            />

            {/* ── Dialog 4: Bulk Promotion Wizard ───────────────────────────────────── */}
            {isPromotionWizardOpen && (
                <Suspense fallback={null}>
                    <BulkPromotionWizardDialog
                        open={isPromotionWizardOpen}
                        onOpenChange={setIsPromotionWizardOpen}
                        sourceClassroom={classroom}
                        enrollments={enrollments}
                        onSuccess={refresh}
                    />
                </Suspense>
            )}
        </div>
    );
}
