import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Teacher, Pagination } from "@/types/erp";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";

// Reusable Components
import { DataTable, type Column } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import { TeacherForm, type TeacherFormValues } from "@/components/teachers/TeacherForm";

// UI Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Icons
import {
    Plus,
    Search,
    Trash2,
    Eye,
    BookOpen,
    RefreshCw,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import AccessDenied from "@/components/auth/AccessDenied";
import { motion } from "framer-motion";

const fetchTeachers = async (page: number, search: string, department: string) => {
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (search) params.set("search", search);
    if (department) params.set("department", department);
    const { data } = await api.get(`/teachers?${params}`);
    return data.data as { teachers: Teacher[]; pagination: Pagination };
};

export default function TeachersPage() {
    const { can } = usePermissions();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const department = "";
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["teachers", page, search, department],
        queryFn: () => fetchTeachers(page, search, department),
        enabled: can("teachers", "read"),
        staleTime: 60_000,
    });

    const createTeacher = useMutation({
        mutationFn: (values: TeacherFormValues & { subjects: string[] }) => api.post("/teachers", values),
        onSuccess: () => {
            toast.success("Teacher profile created successfully");
            setIsCreateOpen(false);
            qc.invalidateQueries({ queryKey: ["teachers"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to create teacher profile");
        },
    });

    const deleteTeacher = useMutation({
        mutationFn: (id: string) => api.delete(`/teachers/${id}`),
        onSuccess: () => {
            toast.success("Teacher profile deleted successfully");
            setTeacherToDelete(null);
            qc.invalidateQueries({ queryKey: ["teachers"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete teacher profile");
        },
    });

    if (!can("teachers", "read")) return <AccessDenied />;

    const teachersList = data?.teachers ?? [];
    const pagination = data?.pagination ?? { total: 0, page: 1, limit: 15, pages: 1 };

    const columns: Column<Teacher>[] = [
        {
            header: "Teacher Profile",
            cell: (teacher) => (
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/teachers/${teacher.id}`);
                    }}
                >
                    <Avatar className="h-9 w-9 border border-primary/20 shadow-xs shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {teacher.account.firstName[0]?.toUpperCase()}{teacher.account.lastName[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm tracking-tight text-foreground hover:text-primary transition-colors truncate">
                            {teacher.account.firstName} {teacher.account.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{teacher.account.email}</p>
                    </div>
                </div>
            ),
        },
        {
            header: "Teacher ID",
            cell: (teacher) => <span className="font-mono text-xs text-muted-foreground">{teacher.teacherId}</span>,
            mobileHide: true,
        },
        {
            header: "Department",
            cell: (teacher) => (
                <span className="text-xs font-medium text-foreground">
                    {teacher.departmentName ?? teacher.department ?? "—"}
                </span>
            ),
        },
        {
            header: "Designation",
            cell: (teacher) => (
                <span className="text-xs text-muted-foreground">
                    {teacher.designationName ?? teacher.designation ?? "—"}
                </span>
            ),
            mobileHide: true,
        },
        {
            header: "Subjects",
            cell: (teacher) => (
                <div className="flex flex-wrap gap-1">
                    {(teacher.subjects ?? []).slice(0, 3).map((s) => (
                        <Badge
                            key={s}
                            variant="secondary"
                            className="text-[10px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0 rounded-md"
                        >
                            {s}
                        </Badge>
                    ))}
                    {(teacher.subjects ?? []).length > 3 && (
                        <span className="text-[10px] text-muted-foreground">+{teacher.subjects.length - 3}</span>
                    )}
                </div>
            ),
        },
        {
            header: "Status",
            cell: (teacher) => (
                <Badge
                    variant="outline"
                    className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-full ${
                        teacher.account.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                >
                    {teacher.account.isActive ? "Active" : "Inactive"}
                </Badge>
            ),
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (teacher) => (
                <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                    <Button
                        size="icon-xs"
                        variant="ghost"
                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                        onClick={() => navigate(`/dashboard/teachers/${teacher.id}`)}
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    <PermissionGate resource="teachers" action="delete">
                        <Button
                            size="icon-xs"
                            variant="ghost"
                            className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setTeacherToDelete(teacher.id)}
                        >
                            <Trash2 className="h-4 w-4" />
                        </Button>
                    </PermissionGate>
                </div>
            ),
        },
    ];

    const renderMobileCard = (teacher: Teacher) => (
        <div className="flex items-center justify-between gap-3">
            <div
                className="flex items-center gap-3 min-w-0 cursor-pointer"
                onClick={() => navigate(`/dashboard/teachers/${teacher.id}`)}
            >
                <Avatar className="h-10 w-10 border border-primary/20 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {teacher.account.firstName[0]?.toUpperCase()}{teacher.account.lastName[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">
                        {teacher.account.firstName} {teacher.account.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                        {teacher.departmentName ?? teacher.department ?? "General"} • {teacher.teacherId}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.2 rounded-full ${
                                teacher.account.isActive
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                        >
                            {teacher.account.isActive ? "Active" : "Inactive"}
                        </Badge>
                    </div>
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon-xs"
                className="h-8 w-8 shrink-0"
                onClick={() => navigate(`/dashboard/teachers/${teacher.id}`)}
            >
                <Eye className="h-4 w-4 text-muted-foreground" />
            </Button>
        </div>
    );

    return (
        <motion.div
            className="space-y-6 text-foreground"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <PageHeader title="Teachers Management" description="Manage teaching staff and institutional profiles.">
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={() => refetch()}
                    disabled={isFetching}
                >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
                </Button>
                <PermissionGate resource="teachers" action="create">
                    <Button
                        className="gap-2 h-10 px-4 rounded-xl font-semibold shadow-sm"
                        onClick={() => setIsCreateOpen(true)}
                    >
                        <Plus className="h-4 w-4" /> New Teacher
                    </Button>
                    <ResponsiveModal
                        open={isCreateOpen}
                        onOpenChange={setIsCreateOpen}
                        title="Add New Teacher"
                        description="Register a new academic staff member with institutional designations."
                        maxWidth="sm:max-w-2xl md:max-w-3xl"
                    >
                        <TeacherForm
                            onSubmit={(values: TeacherFormValues, subjects: string[]) =>
                                createTeacher.mutate({ ...values, subjects })
                            }
                            onCancel={() => setIsCreateOpen(false)}
                            isSubmitting={createTeacher.isPending}
                        />
                    </ResponsiveModal>
                </PermissionGate>
            </PageHeader>

            {/* Filter Bar */}
            <Card className="p-4 border-border/60 bg-card rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, ID or email..."
                            className="pl-9 h-10 bg-muted/40 border-border/60 rounded-xl text-sm"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                </div>
            </Card>

            {/* Generic DataTable */}
            <DataTable
                columns={columns}
                data={teachersList}
                keyExtractor={(t) => t.id}
                isLoading={isLoading}
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.pages,
                    total: pagination.total,
                    limit: pagination.limit,
                    onPageChange: (newPage) => setPage(newPage),
                }}
                emptyTitle="No teachers found"
                emptyDescription="No teacher profiles match your search filter."
                emptyIcon={BookOpen}
                emptyActionLabel={can("teachers", "create") ? "Add New Teacher" : undefined}
                onEmptyAction={() => setIsCreateOpen(true)}
                renderMobileCard={renderMobileCard}
            />

            {/* Delete Modal */}
            <AlertDialog open={!!teacherToDelete} onOpenChange={(v) => !v && setTeacherToDelete(null)}>
                <AlertDialogContent className="w-[95vw] sm:max-w-lg mx-auto rounded-3xl p-6 border-border shadow-2xl bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">Delete Teacher Profile?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2">
                            This will permanently delete the teacher profile and unassign them from active classrooms.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="h-11 rounded-xl font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => teacherToDelete && deleteTeacher.mutate(teacherToDelete)}
                            className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteTeacher.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Teacher"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
