import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    GraduationCap, Plus, Search, RefreshCw, Loader2,
    MoreHorizontal, Pencil, Trash2, Filter, X,
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

// ─── Status styling map ───────────────────────────────────────────────────────
const STATUS_STYLES: Record<StudentStatus, string> = {
    ACTIVE: "bg-emerald-50 dark:bg-emerald-900/10 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
    SUSPENDED: "bg-amber-50 dark:bg-amber-900/10 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800",
    GRADUATED: "bg-sky-50 dark:bg-sky-900/10 text-sky-700 dark:text-sky-400 border-sky-200 dark:border-sky-800",
    TRANSFERRED: "bg-zinc-50 dark:bg-zinc-900/20 text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700",
};

const STATUS_LABEL: Record<StudentStatus, string> = {
    ACTIVE: "Active",
    SUSPENDED: "Suspended",
    GRADUATED: "Graduated",
    TRANSFERRED: "Transferred",
};

// ─── API helpers ──────────────────────────────────────────────────────────────
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
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("limit", "20");
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    if (classroomId) params.set("classroomId", classroomId);
    const { data } = await api.get(`/students?${params}`);
    return data.data as StudentsResponse;
};

const fetchClassroomsForFilter = async (): Promise<Classroom[]> => {
    const { data } = await api.get("/classrooms?status=ACTIVE");
    return data.data.classrooms as Classroom[];
};

// ─── Row component ────────────────────────────────────────────────────────────
interface StudentRowProps {
    student: Student;
    classroomMap: Record<string, string>;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: (s: Student) => void;
    onDelete: (id: string) => void;
    onView: (id: string) => void;
}

function StudentRow({ student, classroomMap, canEdit, canDelete, onEdit, onDelete, onView }: StudentRowProps) {
    const { account } = student;
    const initials = `${account.firstName[0]}${account.lastName[0]}`.toUpperCase();
    const classLabel = classroomMap[student.id] ?? (student.grade ? `${student.grade}-${student.section ?? ""}` : "—");

    return (
        <motion.tr
            layout
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="border-b border-border/40 last:border-0 hover:bg-purple-500/[0.025]
                       dark:hover:bg-purple-500/[0.04] transition-colors group cursor-pointer"
            onClick={() => onView(student.id)}
        >
            {/* Name + Avatar */}
            <td className="pl-5 py-3.5">
                <div className="flex items-center gap-3">
                    <Avatar className="h-9 w-9 border border-purple-500/20 shadow-sm shrink-0">
                        {account && student.profilePhotoUrl
                            ? <img src={student.profilePhotoUrl} alt={account.firstName} className="h-full w-full object-cover rounded-full" />
                            : null
                        }
                        <AvatarFallback className="bg-purple-600/10 dark:bg-purple-500/20 text-purple-700 dark:text-purple-300 text-xs font-bold">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                        <span className="font-semibold text-[13px] text-purple-950 dark:text-zinc-100 truncate">
                            {account.firstName} {account.lastName}
                        </span>
                        <span className="text-[11px] text-purple-900/50 dark:text-zinc-500 truncate">
                            {account.email}
                        </span>
                    </div>
                </div>
            </td>

            {/* Admission Number */}
            <td className="py-3.5 hidden md:table-cell">
                <Badge variant="outline" className="font-mono text-[11px] bg-muted/60 dark:bg-zinc-950 border-border/60 px-2">
                    {student.admissionNumber ?? student.studentId}
                </Badge>
            </td>

            {/* Status */}
            <td className="py-3.5">
                <Badge
                    variant="outline"
                    className={`text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-0.5 ${STATUS_STYLES[student.status]}`}
                >
                    {STATUS_LABEL[student.status]}
                </Badge>
            </td>

            {/* Class / Section */}
            <td className="py-3.5 hidden lg:table-cell">
                <span className="text-[12px] font-semibold text-purple-950/70 dark:text-zinc-400">
                    {classLabel}
                </span>
            </td>

            {/* Guardian */}
            <td className="py-3.5 hidden xl:table-cell">
                {student.guardianName ? (
                    <div className="flex flex-col">
                        <span className="text-[12px] font-semibold text-purple-950/80 dark:text-zinc-300 truncate max-w-[160px]">
                            {student.guardianName}
                        </span>
                        {student.guardianPhone && (
                            <span className="text-[11px] text-purple-900/50 dark:text-zinc-500 flex items-center gap-1">
                                <Phone className="h-2.5 w-2.5" />
                                {student.guardianPhone}
                            </span>
                        )}
                    </div>
                ) : (
                    <span className="text-[12px] text-purple-900/30 dark:text-zinc-600">—</span>
                )}
            </td>

            {/* Actions */}
            <td className="pr-4 py-3.5 text-right" onClick={e => e.stopPropagation()}>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity
                                       text-purple-900/50 dark:text-zinc-400 hover:bg-purple-600/10
                                       dark:hover:bg-purple-500/10 hover:text-purple-700"
                        >
                            <MoreHorizontal className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                        align="end"
                        className="w-44 rounded-xl border border-purple-100 dark:border-zinc-800
                                   bg-white dark:bg-zinc-950 shadow-xl"
                    >
                        {canEdit && (
                            <DropdownMenuItem
                                className="gap-2 cursor-pointer text-purple-950 dark:text-zinc-300
                                           focus:bg-purple-600/10 dark:focus:bg-purple-500/10 font-medium rounded-lg"
                                onClick={() => onView(student.id)}
                            >
                                <ExternalLink className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                View Profile
                            </DropdownMenuItem>
                        )}
                        {canEdit && (
                            <DropdownMenuItem
                                className="gap-2 cursor-pointer text-purple-950 dark:text-zinc-300
                                           focus:bg-purple-600/10 dark:focus:bg-purple-500/10 font-medium rounded-lg"
                                onClick={() => onEdit(student)}
                            >
                                <Pencil className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                Edit Profile
                            </DropdownMenuItem>
                        )}
                        {canDelete && (
                            <>
                                {canEdit && <DropdownMenuSeparator className="bg-purple-100 dark:bg-zinc-800" />}
                                <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-destructive dark:text-red-400
                                               focus:bg-destructive/10 font-medium rounded-lg"
                                    onClick={() => onDelete(student.id)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                    Delete
                                </DropdownMenuItem>
                            </>
                        )}
                        {!canEdit && !canDelete && (
                            <DropdownMenuItem disabled className="text-muted-foreground text-xs italic">
                                No actions available
                            </DropdownMenuItem>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </td>
        </motion.tr>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function StudentDirectory() {
    const { can } = usePermissions();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [classFilter, setClassFilter] = useState("");
    const [page, setPage] = useState(1);
    const [showFilters, setShowFilters] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Student | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Build a classroom → "Grade 10-A" label map keyed by student.id
    // (we use the student's grade/section fields for now; a full join would need backend change)
    const classroomMapById = useMemo(() => ({} as Record<string, string>), []);

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["students", search, statusFilter, classFilter, page],
        queryFn: () => fetchStudents(search, statusFilter, classFilter, page),
        enabled: can("students", "read"),
        staleTime: 30_000,
        placeholderData: (prev) => prev,
    });

    const { data: classrooms = [] } = useQuery({
        queryKey: ["classrooms-filter"],
        queryFn: fetchClassroomsForFilter,
        enabled: can("students", "read"),
        staleTime: 120_000,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/students/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["students"] });
            toast.success("Student removed");
            setDeleteId(null);
        },
        onError: () => {
            toast.error("Failed to delete student");
            setDeleteId(null);
        },
    });

    const students = data?.students ?? [];
    const pagination = data?.pagination;

    const handleCreate = () => { setEditTarget(null); setFormOpen(true); };
    const handleEdit = (s: Student) => { setEditTarget(s); setFormOpen(true); };
    const handleSuccess = () => {
        qc.invalidateQueries({ queryKey: ["students"] });
        setFormOpen(false);
    };

    const hasFilters = !!(statusFilter || classFilter);

    if (!can("students", "read")) return <AccessDenied />;

    return (
        <motion.div
            className="mx-auto text-foreground transition-colors duration-200 space-y-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            {/* ── Page Header ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between
                            pb-4 border-b border-border/40">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight
                                   text-[#5513a1] dark:text-[#8e44ad] flex items-center gap-3">
                        <GraduationCap className="h-6 w-6 md:h-8 md:w-8" />
                        Student Directory
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1.5 max-w-2xl">
                        Manage student enrolments, profiles, guardian info, and logistics.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <Button
                        variant="outline" size="icon"
                        className="h-10 w-10 border-border/80 bg-background hover:bg-muted
                                   dark:hover:bg-purple-950/20 dark:hover:text-purple-400 rounded-xl"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? "animate-spin text-[#7f39c2]" : ""}`} />
                    </Button>
                    <PermissionGate resource="students" action="create">
                        <Button
                            onClick={handleCreate}
                            className="gap-2 h-10 px-5 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600
                                       dark:hover:bg-purple-500 text-white rounded-xl font-semibold shadow-md
                                       hover:scale-[1.02] active:scale-[0.98] transition-transform"
                        >
                            <Plus className="h-4 w-4 stroke-[2.5]" /> Enroll Student
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* ── Toolbar ──────────────────────────────────────────────────── */}
            <Card className="p-3 lg:p-4 border-border/60 shadow-sm bg-card dark:bg-zinc-900/40 rounded-2xl">
                <div className="flex flex-col gap-3">
                    <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                        {/* Search */}
                        <div className="relative flex-1 max-w-full sm:max-w-sm">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name, email, or admission no…"
                                value={search}
                                onChange={e => { setSearch(e.target.value); setPage(1); }}
                                className="pl-9 h-11 border-none shadow-none focus-visible:ring-1
                                           focus-visible:ring-purple-500 bg-muted/60 dark:bg-zinc-950/60
                                           rounded-xl text-sm"
                            />
                        </div>

                        {/* Filter toggle */}
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setShowFilters(v => !v)}
                            className={`h-11 gap-2 rounded-xl border-border/80 font-semibold text-sm
                                        ${hasFilters ? "border-purple-400 text-purple-700 dark:text-purple-400 bg-purple-600/5" : ""}`}
                        >
                            <Filter className="h-4 w-4" />
                            Filters
                            {hasFilters && (
                                <span className="h-4 w-4 rounded-full bg-purple-600 text-white text-[9px] flex items-center justify-center font-bold">
                                    {[statusFilter, classFilter].filter(Boolean).length}
                                </span>
                            )}
                        </Button>

                        {/* Count badge */}
                        <div className="hidden sm:flex items-center gap-2 ml-auto">
                            {pagination && (
                                <span className="text-xs font-semibold text-[#5513a1] dark:text-purple-400
                                                 bg-[#5513a1]/10 dark:bg-purple-400/10 px-2.5 py-1 rounded-full
                                                 border border-purple-500/10">
                                    {pagination.total} student{pagination.total !== 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Expanded filter row */}
                    <AnimatePresence>
                        {showFilters && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                className="overflow-hidden"
                            >
                                <div className="flex flex-wrap gap-3 pt-1">
                                    {/* Status filter */}
                                    <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
                                        <SelectTrigger className="h-10 w-44 border-none bg-muted/60 dark:bg-zinc-950/60 rounded-xl text-sm font-medium focus:ring-1 focus:ring-purple-500">
                                            <SelectValue placeholder="All Statuses" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All Statuses</SelectItem>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="SUSPENDED">Suspended</SelectItem>
                                            <SelectItem value="GRADUATED">Graduated</SelectItem>
                                            <SelectItem value="TRANSFERRED">Transferred</SelectItem>
                                        </SelectContent>
                                    </Select>

                                    {/* Classroom filter */}
                                    <Select value={classFilter} onValueChange={v => { setClassFilter(v); setPage(1); }}>
                                        <SelectTrigger className="h-10 w-52 border-none bg-muted/60 dark:bg-zinc-950/60 rounded-xl text-sm font-medium focus:ring-1 focus:ring-purple-500">
                                            <SelectValue placeholder="All Classrooms" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">All Classrooms</SelectItem>
                                            {classrooms.map(c => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name} – {c.section}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>

                                    {/* Clear filters */}
                                    {hasFilters && (
                                        <Button
                                            variant="ghost" size="sm"
                                            onClick={() => { setStatusFilter(""); setClassFilter(""); setPage(1); }}
                                            className="h-10 gap-1 text-destructive hover:bg-destructive/10 rounded-xl font-medium"
                                        >
                                            <X className="h-3.5 w-3.5" /> Clear
                                        </Button>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </Card>

            {/* ── Data Table ───────────────────────────────────────────────── */}
            <Card className="border border-purple-100 dark:border-zinc-800
                             shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4)]
                             rounded-2xl overflow-hidden bg-white dark:bg-zinc-900/60">
                {isLoading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="h-7 w-7 animate-spin text-[#7f39c2]" />
                    </div>
                ) : students.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                        <div className="h-16 w-16 rounded-2xl bg-purple-600/5 dark:bg-purple-500/10
                                        border border-purple-100 dark:border-zinc-800 flex items-center justify-center">
                            <GraduationCap className="h-7 w-7 text-purple-400/60" />
                        </div>
                        <p className="text-sm font-bold text-purple-950/40 dark:text-zinc-500">No students found</p>
                        <p className="text-xs text-muted-foreground/60">Try adjusting filters or enroll a new student.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-muted/40 dark:bg-zinc-900/60 border-b border-border/60">
                                    <th className="pl-5 py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Student
                                    </th>
                                    <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">
                                        Admission No.
                                    </th>
                                    <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Status
                                    </th>
                                    <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">
                                        Class
                                    </th>
                                    <th className="py-3 text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">
                                        Guardian
                                    </th>
                                    <th className="pr-4 py-3 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {students.map(student => (
                                        <StudentRow
                                            key={student.id}
                                            student={student}
                                            classroomMap={classroomMapById}
                                            canEdit={can("students", "update")}
                                            canDelete={can("students", "delete")}
                                            onEdit={handleEdit}
                                            onDelete={setDeleteId}
                                            onView={id => navigate(`/dashboard/students/${id}`)}
                                        />
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Pagination */}
                {pagination && pagination.pages > 1 && (
                    <div className="flex items-center justify-between px-5 py-3 border-t border-border/40
                                    bg-muted/20 dark:bg-zinc-900/30">
                        <p className="text-xs text-muted-foreground font-semibold">
                            Page {pagination.page} of {pagination.pages}
                            &nbsp;·&nbsp; {pagination.total} total
                        </p>
                        <div className="flex items-center gap-2">
                            <Button
                                variant="outline" size="sm"
                                className="h-8 rounded-xl border-border/80 font-semibold text-xs"
                                disabled={page <= 1 || isFetching}
                                onClick={() => setPage(p => p - 1)}
                            >
                                Previous
                            </Button>
                            <Button
                                variant="outline" size="sm"
                                className="h-8 rounded-xl border-border/80 font-semibold text-xs"
                                disabled={page >= pagination.pages || isFetching}
                                onClick={() => setPage(p => p + 1)}
                            >
                                Next
                            </Button>
                        </div>
                    </div>
                )}
            </Card>

            {/* ── Dialogs ───────────────────────────────────────────────────── */}
            <AdmissionFormDialog
                open={formOpen}
                onOpenChange={setFormOpen}
                editTarget={editTarget}
                onSuccess={handleSuccess}
            />

            <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
                <AlertDialogContent className="rounded-xl border border-purple-100 dark:border-zinc-800
                                               bg-white dark:bg-zinc-950 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-purple-950 dark:text-zinc-50 font-bold">
                            Delete Student?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-purple-900/70 dark:text-zinc-400">
                            This will permanently delete the student's account and all associated data.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="bg-purple-100/50 dark:bg-zinc-900 text-purple-950
                                                       dark:text-zinc-300 hover:bg-purple-100 dark:hover:bg-zinc-800
                                                       border-none h-10 px-4 rounded-lg font-semibold">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="bg-destructive hover:bg-destructive/90 text-white h-10 px-4 rounded-lg font-semibold"
                        >
                            {deleteMutation.isPending
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : "Delete Student"
                            }
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
