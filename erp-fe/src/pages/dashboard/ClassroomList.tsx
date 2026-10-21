import { useState, useEffect, useMemo, lazy, Suspense } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    School, Search, Plus, RefreshCw,
    Users, BookText, Sparkles,
    Calendar, AlertTriangle, GraduationCap,
    DoorOpen, X, CheckCircle2
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import axios from "axios";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

import api from "@/lib/api";
import { useAuth, usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import { PERMISSIONS } from "@/constants/permissions";
import type { AcademicClass, Classroom } from "@/types/erp";

import {
    fetchAcademicClasses,
    fetchClassSetupStatus,
    deleteAcademicClass
} from "@/features/classrooms/api/classApi";
import { ClassGroupCard } from "@/features/classrooms/components/directory/ClassGroupCard";
import { CreateClassDialog } from "@/features/classrooms/components/directory/CreateClassDialog";
import { CreateSectionDialog } from "@/features/classrooms/components/directory/CreateSectionDialog";
import { EditClassroomDialog } from "@/features/classrooms/components/directory/EditClassroomDialog";
import { CloneStructureDialog } from "@/features/classrooms/components/directory/CloneStructureDialog";
import { StudentClassroomPortalView } from "@/features/classrooms/components/portal/StudentClassroomPortalView";

// Lazy-load heavy modals to optimize bundle size
const FirstTimeClassWizardModal = lazy(() =>
    import("@/features/classrooms/components/wizard/FirstTimeClassWizardModal").then((m) => ({
        default: m.FirstTimeClassWizardModal,
    }))
);
const BulkPromotionWizardDialog = lazy(() =>
    import("@/features/classrooms/components/directory/BulkPromotionWizardDialog").then((m) => ({
        default: m.BulkPromotionWizardDialog,
    }))
);

type TeacherCoverageFilter = "all" | "missing" | "assigned";

export default function ClassroomList() {
    const { can, roles = [] } = usePermissions();
    const { user } = useAuth();
    const navigate = useNavigate();
    const qc = useQueryClient();

    // Search and Filters
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [teacherFilter, setTeacherFilter] = useState<TeacherCoverageFilter>("all");
    const academicYear = "";

    // Modals
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isCreateClassOpen, setIsCreateClassOpen] = useState(false);
    const [isCreateSectionOpen, setIsCreateSectionOpen] = useState(false);
    const [selectedClassForSection, setSelectedClassForSection] = useState<AcademicClass | null>(null);
    const [editingClassroom, setEditingClassroom] = useState<Classroom | null>(null);
    const [classToEdit, setClassToEdit] = useState<AcademicClass | null>(null);

    // Delete Targets
    const [deleteClassId, setDeleteClassId] = useState<string | null>(null);
    const [deleteSectionId, setDeleteSectionId] = useState<string | null>(null);

    // High Priority Feature Dialogs
    const [cloneSourceSection, setCloneSourceSection] = useState<Classroom | null>(null);
    const [isPromotionWizardOpen, setIsPromotionWizardOpen] = useState(false);

    // 1. Check Setup Status (Triggers First-Time Wizard if empty)
    const { data: setupStatus } = useQuery({
        queryKey: ["classSetupStatus"],
        queryFn: fetchClassSetupStatus,
        enabled: can("classrooms", "read"),
        staleTime: 60_000,
    });

    // Auto-prompt wizard once if school has 0 classes and user has create rights
    useEffect(() => {
        if (setupStatus && !setupStatus.isInitialized && can("classrooms", "create")) {
            setIsWizardOpen(true);
        }
    }, [setupStatus, can]);

    // 2. Fetch Departments for filter
    const { data: departments = [] } = useQuery({
        queryKey: ["departmentsList"],
        queryFn: async () => {
            const { data } = await api.get("/departments");
            return data.data.departments || [];
        },
        enabled: can("classrooms", "read"),
        staleTime: 60_000,
    });

    // 3. Fetch Classes with Sections hierarchy (hits backend API with departmentId filter)
    const {
        data: classes = [],
        isLoading,
        isFetching,
        refetch
    } = useQuery({
        queryKey: ["classes", search, statusFilter, academicYear, departmentFilter],
        queryFn: () => fetchAcademicClasses(search, statusFilter, academicYear, departmentFilter),
        enabled: can("classrooms", "read"),
        staleTime: 30_000,
    });

    // 3. Fallback check for enrolled student (only if not admin/teacher/principal)
    const isSuperAdminOrAdmin = roles.some(r =>
        ["super_admin", "admin", "principal"].includes(String(r).toLowerCase())
    );
    const isTeacher = roles.some(r => String(r).toLowerCase() === "teacher");
    const isStudentOnly = !isSuperAdminOrAdmin && !isTeacher && roles.some(r => String(r).toLowerCase() === "student");

    const { data: studentClassrooms = [] } = useQuery({
        queryKey: ["myStudentClassroom"],
        queryFn: async () => {
            const { data } = await api.get("/classrooms");
            return data.data.classrooms as Classroom[];
        },
        enabled: isStudentOnly,
    });

    // 4. Delete Mutations
    const deleteClassMutation = useMutation({
        mutationFn: (id: string) => deleteAcademicClass(id),
        onSuccess: () => {
            toast.success("Academic Class deleted successfully");
            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["classrooms"] });
            setDeleteClassId(null);
        },
        onError: (err: unknown) => {
            let msg = "Failed to delete class";
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || msg;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            toast.error(msg);
            setDeleteClassId(null);
        }
    });

    const deleteSectionMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/classrooms/${id}`),
        onSuccess: () => {
            toast.success("Section deleted successfully");
            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["classrooms"] });
            setDeleteSectionId(null);
        },
        onError: (err: unknown) => {
            let msg = "Failed to delete section";
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || msg;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            toast.error(msg);
            setDeleteSectionId(null);
        }
    });

    // Extract all operational sections across all classes
    const allSections = useMemo(() => classes.flatMap(c => c.sections || []), [classes]);

    // Top Institutional Health Metrics (NOTE: Total classes & Total sections are intentionally omitted)
    const totalStudentsCount = useMemo(() => classes.reduce((acc, c) => acc + (c.totalStudents || 0), 0), [classes]);
    const totalCapacity = useMemo(() => allSections.reduce((acc, s) => acc + (s.maxCapacity || 40), 0), [allSections]);
    const occupancyPercent = totalCapacity > 0 ? Math.min(100, Math.round((totalStudentsCount / totalCapacity) * 100)) : 0;

    const sectionsWithTeacher = useMemo(() => allSections.filter(s => Boolean(s.classTeacher?.account || s.classTeacherId)), [allSections]);
    const unassignedTeacherSections = allSections.length - sectionsWithTeacher.length;
    const teacherCoveragePercent = allSections.length > 0 ? Math.round((sectionsWithTeacher.length / allSections.length) * 100) : 100;

    // Filter classes dynamically based on search, status, and teacher assignment coverage
    const displayedClasses = useMemo(() => {
        return classes.filter(cls => {
            if (teacherFilter === "missing") {
                const hasMissing = cls.sections?.some(s => !s.classTeacher?.account && !s.classTeacherId);
                if (!hasMissing) return false;
            } else if (teacherFilter === "assigned") {
                const allAssigned = (cls.sections?.length || 0) > 0 && cls.sections!.every(s => Boolean(s.classTeacher?.account || s.classTeacherId));
                if (!allAssigned) return false;
            }
            return true;
        });
    }, [classes, teacherFilter]);

    if (!can("classrooms", "read")) return <AccessDenied />;

    // ── If Student: Render streamlined Student/Parent Classroom Workspace ────────
    if (isStudentOnly && studentClassrooms.length > 0) {
        return <StudentClassroomPortalView classroomId={studentClassrooms[0].id} />;
    }

    const handleOpenAddSection = (cls?: AcademicClass) => {
        setSelectedClassForSection(cls || null);
        setIsCreateSectionOpen(true);
    };

    const hasActiveFilters = Boolean(search || statusFilter || departmentFilter !== "all" || teacherFilter !== "all");

    return (
        <motion.div
            className="mx-auto text-foreground transition-colors duration-200 space-y-6 pb-12"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            {/* ── 1. Executive Top Header Banner ─────────────────────────────────── */}
            <div className="relative rounded-2xl sm:rounded-3xl border border-primary/20 bg-gradient-to-br from-card via-card to-primary/[0.08] dark:from-card dark:via-purple-950/20 dark:to-primary/[0.08] p-4 sm:p-7 shadow-xs overflow-hidden">
                <School className="absolute -right-6 -bottom-6 w-36 sm:w-44 h-36 sm:h-44 text-primary/[0.04] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
                    <div className="space-y-1 sm:space-y-1.5">
                        <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="p-2 sm:p-2.5 rounded-xl sm:rounded-2xl bg-primary text-primary-foreground shadow-md shadow-primary/25 shrink-0">
                                <School className="h-5 w-5 sm:h-6 sm:w-6" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                    <h1 className="text-lg sm:text-2xl md:text-3xl font-black tracking-tight text-foreground">
                                        Class & Section Directory
                                    </h1>
                                    <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] sm:text-xs font-bold py-0.5 px-2 sm:px-2.5 rounded-full">
                                        Academic Architecture
                                    </Badge>
                                </div>
                                <p className="text-muted-foreground text-xs sm:text-sm mt-0.5 font-medium line-clamp-1 sm:line-clamp-none">
                                    Institutional grade hierarchy, operational sections, faculty leadership, and capacity management.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 justify-start sm:justify-end shrink-0">
                        <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8 sm:h-9 sm:w-9 border-border/80 bg-background hover:bg-muted rounded-lg sm:rounded-xl shadow-2xs"
                            onClick={() => refetch()}
                            disabled={isFetching}
                            title="Refresh Directory"
                        >
                            <RefreshCw className={cn("h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground", isFetching && "animate-spin text-primary")} />
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            className="gap-1 sm:gap-1.5 h-8 sm:h-9 text-[11px] sm:text-xs rounded-lg sm:rounded-xl font-bold border-border/80 text-foreground hover:bg-muted shadow-2xs"
                            onClick={() => navigate("/dashboard/subjects")}
                        >
                            <BookText className="h-3.5 w-3.5 text-primary" /> Master Subjects
                        </Button>

                        <PermissionGate permission={PERMISSIONS.CLASSROOMS.MANAGE}>
                            {/* Academic Year Promotion Wizard */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsPromotionWizardOpen(true)}
                                className="gap-1 sm:gap-1.5 h-8 sm:h-9 text-[11px] sm:text-xs rounded-lg sm:rounded-xl font-bold border-purple-500/30 bg-purple-500/10 text-purple-700 dark:text-purple-300 hover:bg-purple-500/20 shadow-2xs"
                            >
                                <GraduationCap className="w-3.5 h-3.5" /> Promotion Wizard
                            </Button>
                        </PermissionGate>

                        <PermissionGate permission={PERMISSIONS.CLASSROOMS.CREATE}>
                            {/* Setup Wizard */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsWizardOpen(true)}
                                className="gap-1 sm:gap-1.5 h-8 sm:h-9 text-[11px] sm:text-xs rounded-lg sm:rounded-xl font-bold border-primary/30 bg-primary/10 text-primary hover:bg-primary/20 shadow-2xs"
                            >
                                <Sparkles className="w-3.5 h-3.5" /> Setup Wizard
                            </Button>

                            {/* Add Single Class */}
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setIsCreateClassOpen(true)}
                                className="gap-1 sm:gap-1.5 h-8 sm:h-9 text-[11px] sm:text-xs rounded-lg sm:rounded-xl font-bold border-border/80 text-foreground hover:bg-muted shadow-2xs"
                            >
                                <Plus className="w-3.5 h-3.5" /> New Class
                            </Button>

                            {/* Add Section */}
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => handleOpenAddSection()}
                                className="gap-1 sm:gap-1.5 h-8 sm:h-9 text-[11px] sm:text-xs rounded-lg sm:rounded-xl font-bold shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 transition-all hover:scale-[1.02] active:scale-[0.98]"
                            >
                                <Plus className="w-3.5 h-3.5" /> New Section
                            </Button>
                        </PermissionGate>
                    </div>
                </div>
            </div>

            {/* ── 2. Executive Institutional Metrics Ribbon (2-Columns on Mobile!) ──── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
                {/* 1. Student Enrollment Health */}
                <Card className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-card flex items-center gap-2.5 sm:gap-3.5 shadow-2xs hover:-translate-y-0.5 hover:shadow-sm transition-all">
                    <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-emerald-600 text-white shadow-xs shadow-emerald-500/30 shrink-0">
                        <Users className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">Enrolled</p>
                        <h4 className="text-lg sm:text-xl font-black text-foreground mt-0.5">{totalStudentsCount}</h4>
                        <p className="text-[10px] sm:text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5 truncate">
                            {occupancyPercent}% Campus
                        </p>
                    </div>
                </Card>

                {/* 2. Faculty Leadership Coverage */}
                <Card
                    onClick={() => setTeacherFilter(teacherFilter === "missing" ? "all" : "missing")}
                    className={cn(
                        "p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer flex items-center gap-2.5 sm:gap-3.5 shadow-2xs hover:-translate-y-0.5 hover:shadow-sm",
                        unassignedTeacherSections > 0
                            ? "border-amber-500/35 bg-gradient-to-br from-amber-500/10 via-amber-500/5 to-card hover:border-amber-500"
                            : "border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-card"
                    )}
                >
                    <div className={cn(
                        "p-2 sm:p-3 rounded-xl sm:rounded-2xl text-white shadow-xs shrink-0",
                        unassignedTeacherSections > 0 ? "bg-amber-600 shadow-amber-500/30" : "bg-primary shadow-primary/30"
                    )}>
                        <GraduationCap className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1">
                            <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">Teachers</p>
                            {unassignedTeacherSections > 0 && (
                                <Badge variant="outline" className="text-[8px] sm:text-[9px] py-0 px-1 border-amber-500/40 text-amber-700 dark:text-amber-400 bg-amber-500/15 font-black animate-pulse">
                                    Action
                                </Badge>
                            )}
                        </div>
                        <h4 className="text-lg sm:text-xl font-black text-foreground mt-0.5">{teacherCoveragePercent}%</h4>
                        <p className={cn(
                            "text-[10px] sm:text-[11px] font-semibold mt-0.5 truncate",
                            unassignedTeacherSections > 0 ? "text-amber-700 dark:text-amber-400 font-bold" : "text-primary"
                        )}>
                            {unassignedTeacherSections > 0 ? `${unassignedTeacherSections} Need Faculty` : "All Assigned"}
                        </p>
                    </div>
                </Card>

                {/* 3. Available Admission Capacity */}
                <Card className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-500/10 via-cyan-500/5 to-card flex items-center gap-2.5 sm:gap-3.5 shadow-2xs hover:-translate-y-0.5 hover:shadow-sm transition-all">
                    <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-cyan-600 text-white shadow-xs shadow-cyan-500/30 shrink-0">
                        <DoorOpen className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">Open Seats</p>
                        <h4 className="text-lg sm:text-xl font-black text-foreground mt-0.5">{Math.max(0, totalCapacity - totalStudentsCount)}</h4>
                        <p className="text-[10px] sm:text-[11px] text-cyan-700 dark:text-cyan-400 font-semibold mt-0.5 truncate">
                            Available Capacity
                        </p>
                    </div>
                </Card>

                {/* 4. Active Academic Session */}
                <Card className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-purple-500/25 bg-gradient-to-br from-purple-500/10 via-purple-500/5 to-card flex items-center gap-2.5 sm:gap-3.5 shadow-2xs hover:-translate-y-0.5 hover:shadow-sm transition-all">
                    <div className="p-2 sm:p-3 rounded-xl sm:rounded-2xl bg-purple-600 text-white shadow-xs shadow-purple-500/30 shrink-0">
                        <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <div className="min-w-0">
                        <p className="text-[10px] sm:text-xs font-bold text-muted-foreground uppercase tracking-wider truncate">Session</p>
                        <h4 className="text-sm sm:text-base font-black text-foreground mt-0.5 truncate">
                            {allSections[0]?.academicYear || "2026-2027"}
                        </h4>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10px] sm:text-[11px] text-emerald-600 dark:text-emerald-400 font-bold truncate">
                            <span className="relative flex h-1.5 w-1.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
                            </span>
                            Active
                        </div>
                    </div>
                </Card>
            </div>

            {/* ── 3. High-Impact Missing Teacher Global Alert Strip ──────────────── */}
            {unassignedTeacherSections > 0 && (
                <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-amber-500/40 bg-gradient-to-r from-amber-500/15 via-amber-500/5 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3 shadow-xs">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-lg sm:rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                            <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                        </div>
                        <div>
                            <p className="text-xs sm:text-sm font-black text-foreground">
                                {unassignedTeacherSections} {unassignedTeacherSections === 1 ? "Section requires" : "Sections require"} a Class Teacher
                            </p>
                            <p className="text-[10px] sm:text-[11px] text-muted-foreground">
                                Appoint faculty mentors to maintain attendance and parent communication.
                            </p>
                        </div>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setTeacherFilter(teacherFilter === "missing" ? "all" : "missing")}
                        className={cn(
                            "h-7 sm:h-8 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl shrink-0 transition-colors w-full sm:w-auto",
                            teacherFilter === "missing"
                                ? "bg-muted text-foreground hover:bg-muted/80"
                                : "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                        )}
                    >
                        {teacherFilter === "missing" ? "Show All Classes" : "View Affected Classes"}
                    </Button>
                </div>
            )}

            {/* ── 4. Interactive Search & Quick Filter Toolbar ──────────────────── */}
            <Card className="p-2.5 sm:p-3.5 border-border/70 shadow-xs bg-card/90 backdrop-blur-md rounded-xl sm:rounded-2xl">
                <div className="flex flex-col lg:flex-row gap-2.5 sm:gap-3 items-stretch lg:items-center justify-between">
                    {/* Left: Live Search */}
                    <div className="relative flex-1 max-w-full lg:max-w-md">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search class by name, code, or section..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 sm:pl-10 pr-8 sm:pr-9 h-9 sm:h-10 border-border/60 bg-muted/30 rounded-lg sm:rounded-xl text-xs font-semibold focus-visible:ring-2 focus-visible:ring-primary"
                        />
                        {search && (
                            <button
                                type="button"
                                onClick={() => setSearch("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Right: Quick Filter Chips & Status */}
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 w-full lg:w-auto">
                        {/* Teacher Coverage Filter Chips */}
                        <div className="flex items-center p-1 rounded-lg sm:rounded-xl bg-muted/40 border border-border/60 gap-1 overflow-x-auto max-w-full scrollbar-none">
                            <button
                                type="button"
                                onClick={() => setTeacherFilter("all")}
                                className={cn(
                                    "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold transition-all shrink-0 whitespace-nowrap",
                                    teacherFilter === "all"
                                        ? "bg-background text-foreground shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                All
                            </button>
                            <button
                                type="button"
                                onClick={() => setTeacherFilter("missing")}
                                className={cn(
                                    "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap",
                                    teacherFilter === "missing"
                                        ? "bg-amber-500/20 text-amber-700 dark:text-amber-300 shadow-2xs border border-amber-500/30"
                                        : "text-muted-foreground hover:text-amber-600"
                                )}
                            >
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                Needs Teacher
                                {unassignedTeacherSections > 0 && (
                                    <span className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-amber-500 text-white text-[8px] sm:text-[9px] font-black flex items-center justify-center">
                                        {unassignedTeacherSections}
                                    </span>
                                )}
                            </button>
                            <button
                                type="button"
                                onClick={() => setTeacherFilter("assigned")}
                                className={cn(
                                    "px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-md sm:rounded-lg text-[11px] sm:text-xs font-bold transition-all flex items-center gap-1 sm:gap-1.5 shrink-0 whitespace-nowrap",
                                    teacherFilter === "assigned"
                                        ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 shadow-2xs border border-emerald-500/30"
                                        : "text-muted-foreground hover:text-emerald-600"
                                )}
                            >
                                <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                Staffed
                            </button>
                        </div>

                        {/* Department & Status Filters (Grid of 2 on mobile, flex on desktop) */}
                        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
                            {/* Department Filter Select */}
                            <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                                <SelectTrigger className="h-9 sm:h-10 w-full sm:w-44 border-border/70 bg-muted/30 rounded-lg sm:rounded-xl text-xs font-semibold">
                                    <SelectValue placeholder="All Departments" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="all">All Departments</SelectItem>
                                    {departments.map((d: any) => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            {/* Status Select */}
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-9 sm:h-10 w-full sm:w-36 border-border/70 bg-muted/30 rounded-lg sm:rounded-xl text-xs font-semibold">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="">All Statuses</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="INACTIVE">Inactive</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Clear Filter Reset Button */}
                        {hasActiveFilters && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                    setSearch("");
                                    setStatusFilter("");
                                    setDepartmentFilter("all");
                                    setTeacherFilter("all");
                                }}
                                className="h-8 sm:h-9 px-2 sm:px-2.5 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors rounded-lg sm:rounded-xl"
                            >
                                <X className="w-3.5 h-3.5 mr-1" /> Reset
                            </Button>
                        )}
                    </div>
                </div>
            </Card>

            {/* ── 5. Class Group Cards List ────────────────────────────────────── */}
            {isLoading ? (
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <Card key={i} className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl border-border/60 space-y-3 sm:space-y-4">
                            <div className="flex items-center gap-2.5 sm:gap-3">
                                <Skeleton className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl" />
                                <div className="space-y-1.5">
                                    <Skeleton className="h-4 sm:h-5 w-36 sm:w-48" />
                                    <Skeleton className="h-3 w-24 sm:w-28" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3.5">
                                <Skeleton className="h-28 sm:h-32 rounded-xl sm:rounded-2xl" />
                                <Skeleton className="h-28 sm:h-32 rounded-xl sm:rounded-2xl" />
                                <Skeleton className="h-28 sm:h-32 rounded-xl sm:rounded-2xl" />
                            </div>
                        </Card>
                    ))}
                </div>
            ) : classes.length === 0 ? (
                /* Initial Empty State with Setup Wizard Trigger */
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-4 border-2 border-dashed border-border/70 rounded-3xl bg-muted/10 p-8 text-center shadow-xs">
                    <div className="h-16 w-16 rounded-2xl bg-primary/15 border-2 border-primary/25 flex items-center justify-center shadow-sm">
                        <School className="h-8 w-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-lg font-black text-foreground">No Academic Classes Configured</h3>
                        <p className="text-xs text-muted-foreground max-w-md mt-1">
                            Use the Setup Wizard to quickly provision standard grades (Nursery to Class 12) with operational sections in a few clicks.
                        </p>
                    </div>
                    <PermissionGate resource="classrooms" action="create">
                        <Button
                            onClick={() => setIsWizardOpen(true)}
                            className="mt-2 gap-2 rounded-xl text-xs font-bold shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-5"
                        >
                            <Sparkles className="w-4 h-4" /> Launch Setup Wizard
                        </Button>
                    </PermissionGate>
                </div>
            ) : displayedClasses.length === 0 ? (
                /* Filter returned no results */
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 border border-border/70 rounded-3xl bg-muted/10 p-6 text-center">
                    <Search className="h-8 w-8 text-muted-foreground/40" />
                    <h3 className="text-sm font-bold text-foreground">No Matching Classes Found</h3>
                    <p className="text-xs text-muted-foreground max-w-sm">
                        No academic classes matched your current filter criteria. Try clearing search or changing filters.
                    </p>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                            setSearch("");
                            setStatusFilter("");
                            setDepartmentFilter("all");
                            setTeacherFilter("all");
                        }}
                        className="rounded-xl text-xs font-bold mt-1"
                    >
                        Clear All Filters
                    </Button>
                </div>
            ) : (
                <div className="space-y-4">
                    {displayedClasses.map(cls => {
                        const isDeptIncharge = Boolean(
                            user?.teacherId &&
                            (cls.department?.headId === user.teacherId || (cls.department as any)?.inchargeId === user.teacherId)
                        );
                        return (
                            <ClassGroupCard
                                key={cls.id}
                                academicClass={cls}
                                canCreate={can("classrooms", "create")}
                                canEdit={can("classrooms", "update") || isDeptIncharge}
                                canDelete={can("classrooms", "delete")}
                                onAddSection={handleOpenAddSection}
                                onEditClass={(cls) => {
                                    setClassToEdit(cls);
                                    setIsCreateClassOpen(true);
                                }}
                                onEditSection={(section) => setEditingClassroom(section)}
                                onCloneSection={(section) => setCloneSourceSection(section)}
                                onDeleteClass={(id) => setDeleteClassId(id)}
                                onDeleteSection={(id) => setDeleteSectionId(id)}
                            />
                        );
                    })}
                </div>
            )}

            {/* ── Dialogs ──────────────────────────────────────────────────────── */}

            {/* 1. First-Time Setup Wizard Modal */}
            {isWizardOpen && (
                <Suspense fallback={null}>
                    <FirstTimeClassWizardModal
                        open={isWizardOpen}
                        onOpenChange={setIsWizardOpen}
                        onSuccess={() => refetch()}
                    />
                </Suspense>
            )}

            {/* 2. Create / Edit Academic Class Modal */}
            <CreateClassDialog
                open={isCreateClassOpen}
                onOpenChange={(open) => {
                    setIsCreateClassOpen(open);
                    if (!open) setClassToEdit(null);
                }}
                classToEdit={classToEdit}
                nextOrderIndex={classes.length + 1}
                onSuccess={() => {
                    refetch();
                    setClassToEdit(null);
                }}
            />

            {/* 3. Edit Classroom Section Modal */}
            {editingClassroom && (
                <EditClassroomDialog
                    open={!!editingClassroom}
                    onOpenChange={(open) => !open && setEditingClassroom(null)}
                    classroom={editingClassroom}
                    onSuccess={() => refetch()}
                />
            )}

            {/* 3. Create Section Modal */}
            <CreateSectionDialog
                open={isCreateSectionOpen}
                onOpenChange={setIsCreateSectionOpen}
                preSelectedClass={selectedClassForSection}
                classes={classes}
                onSuccess={() => refetch()}
            />

            {/* 4. Confirm Delete Class Alert */}
            <AlertDialog open={!!deleteClassId} onOpenChange={(open) => !open && setDeleteClassId(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Academic Class?</AlertDialogTitle>
                        <AlertDialogDescription>
                            This will delete the class and any empty sections under it. If any students are enrolled, the action will be blocked.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl text-xs font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteClassId && deleteClassMutation.mutate(deleteClassId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
                        >
                            {deleteClassMutation.isPending ? "Deleting..." : "Delete Class"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 5. Confirm Delete Section Alert */}
            <AlertDialog open={!!deleteSectionId} onOpenChange={(open) => !open && setDeleteSectionId(null)}>
                <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Section?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete this section? Its student enrollments and timetable will be removed.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl text-xs font-bold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteSectionId && deleteSectionMutation.mutate(deleteSectionId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl text-xs font-bold"
                        >
                            {deleteSectionMutation.isPending ? "Deleting..." : "Delete Section"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* 6. Clone / Duplicate Structure Dialog */}
            {cloneSourceSection && (
                <CloneStructureDialog
                    open={!!cloneSourceSection}
                    onOpenChange={(open) => !open && setCloneSourceSection(null)}
                    sourceClassroomId={cloneSourceSection.id}
                    sourceClassroomName={`Section ${cloneSourceSection.section}`}
                    onSuccess={() => refetch()}
                />
            )}

            {/* 7. Bulk Student Promotion Wizard */}
            {isPromotionWizardOpen && (
                <Suspense fallback={null}>
                    <BulkPromotionWizardDialog
                        open={isPromotionWizardOpen}
                        onOpenChange={setIsPromotionWizardOpen}
                        sourceClassroom={null}
                        enrollments={[]}
                        onSuccess={() => refetch()}
                    />
                </Suspense>
            )}
        </motion.div>
    );
}
