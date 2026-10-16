import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    GraduationCap, Plus, Search, RefreshCw, Loader2,
    MoreHorizontal, Pencil, Trash2, Filter,
    Phone, ExternalLink,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import type { Student, StudentStatus, Classroom } from "@/types/erp";
import AdmissionFormDialog from "./AdmissionFormDialog";
import { useDebounce } from "@/hooks/use-debounce";

// Reusable Components
import { DataTable, type Column } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";

// ─── Status styling map ───────────────────────────────────────────────────────
const STATUS_STYLES: Record<StudentStatus, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    SUSPENDED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    GRADUATED: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20",
    TRANSFERRED: "bg-muted text-muted-foreground border-border/60",
};

const STATUS_LABEL: Record<StudentStatus, string> = {
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    GRADUATED: "Graduated",
    TRANSFERRED: "Transferred",
};

interface StudentsResponse {
    students: Student[];
    pagination: { total: number; page: number; limit: number; pages: number };
}

const fetchStudents = async (
    search: string,
    status: string,
    classroomId: string,
    page: number
): Promise<StudentsResponse> => {
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (classroomId) params.set("classroomId", classroomId);

    const { data } = await api.get(`/students?${params}`);
    return data.data;
};

const fetchClassrooms = async (): Promise<Classroom[]> => {
    const { data } = await api.get("/classrooms?limit=100");
    return data.data.classrooms ?? [];
};

export default function StudentDirectory() {
    const { can } = usePermissions();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);
    const [statusFilter, setStatusFilter] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Student | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["students", debouncedSearch, statusFilter, classFilter, page],
        queryFn: () => fetchStudents(debouncedSearch, statusFilter, classFilter, page),
        enabled: can("students", "read"),
        staleTime: 30_000,
    });

    const { data: classrooms = [] } = useQuery({
        queryKey: ["classrooms-dropdown"],
        queryFn: fetchClassrooms,
        enabled: can("students", "read"),
        staleTime: 5 * 60_000,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/students/${id}`),
        onSuccess: () => {
            toast.success("Student removed successfully");
            qc.invalidateQueries({ queryKey: ["students"] });
            setDeleteId(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to remove student");
        },
    });

    if (!can("students", "read")) return <AccessDenied />;

    const students = data?.students ?? [];
    const pagination = data?.pagination ?? { total: 0, page: 1, limit: 15, pages: 1 };
    const canEdit = can("students", "update");
    const canDelete = can("students", "delete");

    const columns: Column<Student>[] = [
        {
            header: "Student Profile",
            cell: (student) => {
                const initials = `${student.account.firstName[0]}${student.account.lastName[0]}`.toUpperCase();
                return (
                    <div
                        className="flex items-center gap-3 cursor-pointer"
                        onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/students/${student.id}`);
                        }}
                    >
                        <Avatar className="h-9 w-9 border border-primary/20 shadow-xs shrink-0">
                            {student.profilePhotoUrl ? (
                                <img
                                    src={student.profilePhotoUrl}
                                    alt={student.account.firstName}
                                    className="h-full w-full object-cover rounded-full"
                                />
                            ) : null}
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col min-w-0">
                            <span className="font-semibold text-[13px] text-foreground truncate hover:text-primary transition-colors">
                                {student.account.firstName} {student.account.lastName}
                            </span>
                            <span className="text-[11px] text-muted-foreground truncate">{student.account.email}</span>
                        </div>
                    </div>
                );
            },
        },
        {
            header: "Admission No.",
            cell: (student) => (
                <Badge variant="outline" className="font-mono text-[11px] bg-muted/60 text-foreground border-border/60 px-2">
                    {student.admissionNumber ?? student.studentId}
                </Badge>
            ),
            mobileHide: true,
        },
        {
            header: "Class & Section",
            cell: (student) => {
                const enrollment = student.classroomEnrollments?.[0];
                const classroom = enrollment?.classroom;
                const classLabel = classroom
                    ? `${classroom.name} - ${classroom.section ?? ""}`
                    : student.grade
                    ? `${student.grade}-${student.section ?? ""}`
                    : "—";
                return <span className="text-xs font-semibold text-muted-foreground">{classLabel}</span>;
            },
        },
        {
            header: "Guardian",
            cell: (student) =>
                student.guardianName ? (
                    <div className="flex flex-col">
                        <span className="text-xs font-semibold text-foreground truncate max-w-[150px]">
                            {student.guardianName}
                        </span>
                        {student.guardianPhone && (
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                {student.guardianPhone}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                ),
            mobileHide: true,
        },
        {
            header: "Status",
            cell: (student) => (
                <span
                    className={`inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                        STATUS_STYLES[student.status]
                    }`}
                >
                    {STATUS_LABEL[student.status]}
                </span>
            ),
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (student) => (
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button
                                variant="ghost"
                                size="icon-xs"
                                className="h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted"
                            >
                                <MoreHorizontal className="h-4 w-4" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44 rounded-xl border border-border bg-background shadow-xl">
                            <DropdownMenuItem
                                className="gap-2 cursor-pointer font-medium"
                                onClick={() => navigate(`/dashboard/students/${student.id}`)}
                            >
                                <ExternalLink className="h-4 w-4 text-primary" /> View Profile
                            </DropdownMenuItem>
                            {canEdit && (
                                <DropdownMenuItem
                                    className="gap-2 cursor-pointer font-medium"
                                    onClick={() => {
                                        setEditTarget(student);
                                        setFormOpen(true);
                                    }}
                                >
                                    <Pencil className="h-4 w-4 text-primary" /> Edit Profile
                                </DropdownMenuItem>
                            )}
                            {canDelete && (
                                <>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                        className="gap-2 cursor-pointer text-destructive focus:bg-destructive/10 font-medium"
                                        onClick={() => setDeleteId(student.id)}
                                    >
                                        <Trash2 className="h-4 w-4" /> Delete Student
                                    </DropdownMenuItem>
                                </>
                            )}
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

    const renderMobileCard = (student: Student) => {
        const initials = `${student.account.firstName[0]}${student.account.lastName[0]}`.toUpperCase();
        const enrollment = student.classroomEnrollments?.[0];
        const classroom = enrollment?.classroom;
        const classLabel = classroom
            ? `${classroom.name} - ${classroom.section ?? ""}`
            : student.grade
            ? `${student.grade}-${student.section ?? ""}`
            : "—";

        return (
            <div className="flex items-center justify-between gap-3">
                <div
                    className="flex items-center gap-3 min-w-0 cursor-pointer"
                    onClick={() => navigate(`/dashboard/students/${student.id}`)}
                >
                    <Avatar className="h-10 w-10 border border-primary/20 shrink-0">
                        {student.profilePhotoUrl ? (
                            <img src={student.profilePhotoUrl} alt={student.account.firstName} className="h-full w-full object-cover rounded-full" />
                        ) : null}
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="font-bold text-sm text-foreground truncate">
                            {student.account.firstName} {student.account.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                            {classLabel} • {student.admissionNumber ?? student.studentId}
                        </p>
                        <div className="mt-1">
                            <span className={`inline-flex items-center text-[9px] font-bold px-2 py-0.2 rounded-full border ${STATUS_STYLES[student.status]}`}>
                                {STATUS_LABEL[student.status]}
                            </span>
                        </div>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="icon-xs"
                    className="h-8 w-8 shrink-0"
                    onClick={() => navigate(`/dashboard/students/${student.id}`)}
                >
                    <ExternalLink className="h-4 w-4 text-muted-foreground" />
                </Button>
            </div>
        );
    };

    return (
        <motion.div
            className="space-y-6 text-foreground"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <PageHeader title="Student Directory" description="Manage student enrollments, profiles, and institutional records.">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={() => refetch()}
                    disabled={isFetching}
                >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
                </Button>
                <PermissionGate resource="students" action="create">
                    <Button
                        className="gap-2 h-10 px-4 rounded-xl font-semibold shadow-sm"
                        onClick={() => {
                            setEditTarget(null);
                            setFormOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" /> Add Student
                    </Button>
                </PermissionGate>
            </PageHeader>

            {/* Filter and Search Bar */}
            <Card className="p-4 border-border/60 bg-card rounded-2xl shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by student name or ID..."
                            className="pl-9 h-10 bg-muted/40 border-border/60 rounded-xl text-sm"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                        <Button
                            variant={showFilters ? "default" : "outline"}
                            size="sm"
                            className="h-10 px-3.5 rounded-xl gap-2 text-xs"
                            onClick={() => setShowFilters(!showFilters)}
                        >
                            <Filter className="h-3.5 w-3.5" />
                            Filters
                            {(statusFilter || classFilter) && (
                                <Badge variant="secondary" className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px] rounded-full">
                                    {(statusFilter ? 1 : 0) + (classFilter ? 1 : 0)}
                                </Badge>
                            )}
                        </Button>
                    </div>
                </div>

                <AnimatePresence>
                    {showFilters && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="pt-3 border-t border-border/60 grid grid-cols-1 sm:grid-cols-2 gap-3"
                        >
                            <Select
                                value={statusFilter}
                                onValueChange={(val) => {
                                    setStatusFilter(val === "ALL" ? "" : val);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/40 border-border/60">
                                    <SelectValue placeholder="All Statuses" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Statuses</SelectItem>
                                    <SelectItem value="ACTIVE">Active</SelectItem>
                                    <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                    <SelectItem value="GRADUATED">Graduated</SelectItem>
                                    <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                                </SelectContent>
                            </Select>

                            <Select
                                value={classFilter}
                                onValueChange={(val) => {
                                    setClassFilter(val === "ALL" ? "" : val);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/40 border-border/60">
                                    <SelectValue placeholder="All Classrooms" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="ALL">All Classrooms</SelectItem>
                                    {classrooms.map((c) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name} - {c.section} ({c.academicYear})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* Centralized DataTable */}
            <DataTable
                columns={columns}
                data={students}
                keyExtractor={(s) => s.id}
                isLoading={isLoading}
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.pages,
                    total: pagination.total,
                    limit: pagination.limit,
                    onPageChange: (newPage) => setPage(newPage),
                }}
                emptyTitle="No students found"
                emptyDescription="No student matches your current filter or search criteria."
                emptyIcon={GraduationCap}
                emptyActionLabel={can("students", "create") ? "Add First Student" : undefined}
                onEmptyAction={() => {
                    setEditTarget(null);
                    setFormOpen(true);
                }}
                renderMobileCard={renderMobileCard}
            />

            {/* Dialog Form */}
            <AdmissionFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                editTarget={editTarget}
                onSuccess={() => qc.invalidateQueries({ queryKey: ["students"] })}
            />

            {/* Delete Modal */}
            <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
                <AlertDialogContent className="w-[95vw] sm:max-w-md mx-auto rounded-3xl p-6 border-border shadow-2xl bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">Remove Student?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2">
                            This will permanently remove the student from active records and unenroll them from their classroom.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="h-11 rounded-xl font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Student"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
