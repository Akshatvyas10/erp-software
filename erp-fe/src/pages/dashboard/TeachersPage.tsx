import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    BookOpen, Plus, Search, Eye, RefreshCw, ChevronLeft, ChevronRight, Trash2, MoreHorizontal, Edit, Loader2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import type { Teacher, Pagination } from "@/types/erp";
import { TeacherForm, type TeacherFormValues } from "@/components/teachers/TeacherForm";
import { TeacherSkeleton } from "@/components/skeletons/TeacherSkeleton";
import { useDebounce } from "@/hooks/use-debounce";

const fetchTeachers = async (page: number, search: string) => {
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (search) params.set("search", search);
    const { data } = await api.get(`/teachers?${params}`);
    return data.data as { teachers: Teacher[]; pagination: Pagination };
};

export default function TeachersPage() {
    const { can } = usePermissions();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [page, setPage] = useState(1);
    const [searchInput, setSearchInput] = useState("");
    const search = useDebounce(searchInput, 500);

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [teacherToDelete, setTeacherToDelete] = useState<string | null>(null);

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["teachers", page, search],
        queryFn: () => fetchTeachers(page, search),
        enabled: can("teachers", "read"),
        staleTime: 60_000,
    });

    const createTeacher = useMutation({
        mutationFn: (payload: TeacherFormValues & { subjects: string[] }) => api.post("/teachers", payload),
        onSuccess: (res) => {
            qc.invalidateQueries({ queryKey: ["teachers"] });
            toast.success(`Teacher ${res.data.data.teacher.teacherId} created successfully`);
            setIsCreateOpen(false);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Failed to create teacher");
        }
    });

    const deleteTeacher = useMutation({
        mutationFn: (id: string) => api.delete(`/teachers/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["teachers"] });
            toast.success("Teacher deleted");
            setTeacherToDelete(null);
        },
        onError: () => {
            toast.error("Failed to delete teacher");
            setTeacherToDelete(null);
        },
    });

    if (!can("teachers", "read")) return <AccessDenied />;

    const teachersList = data?.teachers ?? [];
    const pagination = data?.pagination ?? { total: 0, page: 1, limit: 15, pages: 1 };

    const pageVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <motion.div
            className="mx-auto text-foreground transition-colors duration-200"
            variants={pageVariants}
            initial="hidden"
            animate="visible"
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-border/40 bg-transparent">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#5513a1] dark:text-[#8e44ad] flex items-center gap-3">
                        <BookOpen className="h-6 w-6 md:h-8 md:w-8" />
                        Teachers Management
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm lg:text-base mt-1.5 max-w-2xl">
                        Manage teaching staff and their profiles.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 border-border/80 bg-background hover:bg-muted dark:hover:bg-purple-950/20 dark:hover:text-purple-400 transition-all rounded-xl"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? "animate-spin text-[#7f39c2]" : ""}`} />
                    </Button>
                    <PermissionGate resource="teachers" action="create">
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button variant="primary" className="w-full md:w-auto gap-2 h-10 px-5 transition-all hover:scale-[1.02] active:scale-[0.98] ">
                                    <Plus className="h-4 w-4 stroke-[2.5]" /> New Teacher
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl md:max-w-3xl flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-background dark:bg-zinc-950 bg-white">
                                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                                    <DialogTitle className="text-lg md:text-xl font-bold tracking-tight text-foreground">Add New Teacher</DialogTitle>
                                </DialogHeader>
                                <TeacherForm 
                                    onSubmit={(values, subjects) => createTeacher.mutate({ ...values, subjects })}
                                    onCancel={() => setIsCreateOpen(false)}
                                    isSubmitting={createTeacher.isPending}
                                />
                            </DialogContent>
                        </Dialog>
                    </PermissionGate>
                </div>
            </div>

            <Card className="mt-6 border-none shadow-none bg-transparent">
                <CardHeader className="px-0 pt-0 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <CardTitle className="text-lg font-semibold tracking-tight text-foreground flex items-center gap-2">
                        Directory <Badge variant="secondary" className="bg-[#5513a1]/10 text-[#5513a1] dark:bg-purple-500/20 dark:text-purple-300 border-none px-2 rounded-full font-bold">{pagination.total}</Badge>
                    </CardTitle>
                    <div className="relative w-full md:max-w-sm group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-[#5513a1] dark:group-focus-within:text-purple-400 transition-colors" />
                        <Input
                            placeholder="Search by name, ID, or email..."
                            value={searchInput}
                            onChange={(e) => { setSearchInput(e.target.value); setPage(1); }}
                            className="pl-10 h-10 bg-white dark:bg-zinc-900/50 border-border/50 focus-visible:ring-1 focus-visible:ring-purple-500/50 transition-all rounded-xl shadow-sm w-full"
                        />
                    </div>
                </CardHeader>
                <CardContent className="px-0 pb-0">
                    {isLoading ? (
                        <TeacherSkeleton />
                    ) : teachersList.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 px-4 border border-dashed border-border/80 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20">
                            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mb-4"><Search className="h-8 w-8 text-muted-foreground/50" /></div>
                            <h3 className="text-lg font-bold text-foreground">No teachers found</h3>
                            <p className="text-sm text-muted-foreground max-w-sm text-center mt-2">Adjust your search or add a new teacher to get started.</p>
                        </div>
                    ) : (
                        <div className="w-full">
                            {/* Mobile View */}
                            <div className="md:hidden space-y-4">
                                {teachersList.map((teacher) => {
                                    const name = `${teacher.account.firstName} ${teacher.account.lastName}`;
                                    const initials = `${teacher.account.firstName[0]}${teacher.account.lastName[0]}`.toUpperCase();
                                    return (
                                        <Card key={teacher.id} className="border-border/50 hover:border-purple-500/30 transition-colors shadow-sm overflow-hidden group">
                                            <CardContent className="p-4 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <div className="flex items-center gap-3">
                                                        <Avatar className="h-12 w-12 border border-purple-500/20 shadow-sm transition-transform group-hover:scale-105 duration-200">
                                                            <AvatarFallback className="bg-[#5513a1]/10 text-[#5513a1] dark:bg-purple-400/20 dark:text-purple-300 text-sm font-bold">
                                                                {initials}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <div>
                                                            <p className="font-bold text-[15px] tracking-tight text-foreground group-hover:text-[#5513a1] dark:group-hover:text-purple-400 transition-colors">
                                                                {name}
                                                            </p>
                                                            <Badge variant="outline" className="font-mono bg-muted/60 dark:bg-zinc-950 text-foreground border-border/60 px-1.5 py-0 rounded-md text-[10px] tracking-wide mt-1">
                                                                {teacher.teacherId}
                                                            </Badge>
                                                        </div>
                                                    </div>
                                                    <Badge variant="outline"
                                                        className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0 border-none rounded-sm
                                                            ${teacher.account.isActive
                                                                ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                                                                : "bg-muted dark:bg-zinc-950 text-muted-foreground"}`}>
                                                        {teacher.account.isActive ? "Active" : "Inactive"}
                                                    </Badge>
                                                </div>
                                                <div className="text-xs text-muted-foreground space-y-1">
                                                    <div className="flex flex-col">
                                                        <span className="font-semibold text-base text-foreground leading-none">{teacher.account?.firstName} {teacher.account?.lastName}</span>
                                                        <span className="text-[13px] text-muted-foreground mt-1">{teacher.account?.email}</span>
                                                        <p><span className="font-medium text-foreground">Dept:</span> {teacher.departmentName ?? teacher.department ?? "—"} • <span className="font-medium text-foreground">Role:</span> {teacher.designationName ?? teacher.designation ?? "—"}</p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-wrap gap-1">
                                                    {(teacher.subjects ?? []).map(s => (
                                                        <Badge key={s} variant="secondary" className="text-[9px] font-bold uppercase tracking-wider bg-purple-500/5 text-[#5513a1] border border-purple-500/10 dark:bg-purple-400/10 dark:text-purple-300 px-1.5 py-0 rounded-md">
                                                            {s}
                                                        </Badge>
                                                    ))}
                                                </div>
                                                <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                                                    <Button size="sm" variant="outline" className="h-8 text-xs font-medium" onClick={() => navigate(`/dashboard/teachers/${teacher.id}`)}>
                                                        <Eye className="h-3.5 w-3.5 mr-1" /> View Details
                                                    </Button>
                                                    <PermissionGate resource="teachers" action="delete">
                                                        <Button size="icon" variant="outline" className="h-8 w-8 text-destructive hover:bg-destructive hover:text-white" onClick={() => setTeacherToDelete(teacher.id)}>
                                                            <Trash2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                    </PermissionGate>
                                                </div>
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>

                            {/* Desktop View */}
                            <div className="hidden md:block overflow-x-auto custom-scrollbar rounded-xl border border-border/50 bg-white dark:bg-zinc-900/50 shadow-sm">
                                <Table className="w-full min-w-[950px]">
                                    <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                                        <TableRow className="border-border/50 hover:bg-transparent">
                                            <TableHead className="pl-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Teacher Profile</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Teacher ID</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Department</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Designation</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Subjects</TableHead>
                                            <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Status</TableHead>
                                            <TableHead className="text-right pr-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Actions</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {teachersList.map((teacher) => {
                                            const name = `${teacher.account.firstName} ${teacher.account.lastName}`;
                                            const initials = `${teacher.account.firstName[0]}${teacher.account.lastName[0]}`.toUpperCase();
                                            return (
                                                <TableRow key={teacher.id} className="hover:bg-purple-500/[0.02] dark:hover:bg-purple-500/[0.04] transition-colors border-border/40 group">
                                                    <TableCell className="pl-6 py-4.5">
                                                        <div className="flex items-center gap-3">
                                                            <Avatar className="h-9 w-9 border border-purple-500/20 shadow-sm transition-transform group-hover:scale-105 duration-200">
                                                                <AvatarFallback className="bg-[#5513a1]/10 text-[#5513a1] dark:bg-purple-400/20 dark:text-purple-300 text-xs font-bold">
                                                                    {initials}
                                                                </AvatarFallback>
                                                            </Avatar>
                                                            <div>
                                                                <p className="font-bold text-sm tracking-tight text-foreground group-hover:text-[#5513a1] dark:group-hover:text-purple-400 transition-colors">
                                                                    {name}
                                                                </p>
                                                                <p className="text-xs text-muted-foreground truncate max-w-[220px]">
                                                                    {teacher.account.email}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4.5">
                                                        <Badge variant="outline" className="font-mono bg-muted/60 dark:bg-zinc-950 text-foreground border-border/60 px-2.5 py-0.5 rounded-md text-xs tracking-wide">
                                                            {teacher.teacherId}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-sm font-medium text-muted-foreground py-4.5">
                                                        {teacher.departmentName ?? teacher.department ?? "—"}
                                                    </TableCell>
                                                    <TableCell className="text-sm font-medium text-muted-foreground py-4.5">
                                                        {teacher.designationName ?? teacher.designation ?? "—"}
                                                    </TableCell>
                                                    <TableCell className="py-4.5">
                                                        <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                                                            {(teacher.subjects ?? []).slice(0, 2).map(s => (
                                                                <Badge key={s} variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/5 text-[#5513a1] border border-purple-500/10 dark:bg-purple-400/10 dark:text-purple-300 px-2 py-0.5 rounded-md">
                                                                    {s}
                                                                </Badge>
                                                            ))}
                                                            {(teacher.subjects ?? []).length > 2 && (
                                                                <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider border-border/60 px-2 py-0.5 rounded-md">
                                                                    +{teacher.subjects.length - 2}
                                                                </Badge>
                                                            )}
                                                            {(teacher.subjects ?? []).length === 0 && <span className="text-xs text-muted-foreground/60 font-medium italic">—</span>}
                                                        </div>
                                                    </TableCell>
                                                    <TableCell className="py-4.5">
                                                        <Badge variant="outline"
                                                            className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-none rounded-md
                                                                ${teacher.account.isActive
                                                                    ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                                                                    : "bg-muted dark:bg-zinc-950 text-muted-foreground"}`}>
                                                            {teacher.account.isActive ? "Active" : "Inactive"}
                                                        </Badge>
                                                    </TableCell>
                                                    <TableCell className="text-right pr-6 py-4.5">
                                                        <DropdownMenu>
                                                            <DropdownMenuTrigger asChild>
                                                                <Button variant="ghost" className="h-8 w-8 p-0">
                                                                    <span className="sr-only">Open menu</span>
                                                                    <MoreHorizontal className="h-4 w-4" />
                                                                </Button>
                                                            </DropdownMenuTrigger>
                                                            <DropdownMenuContent align="end" className="w-[160px]">
                                                                <DropdownMenuItem className="cursor-pointer font-medium text-xs" onClick={() => navigate(`/dashboard/teachers/${teacher.id}`)}>
                                                                    <Eye className="mr-2 h-3.5 w-3.5" /> View Details
                                                                </DropdownMenuItem>
                                                                <DropdownMenuItem className="cursor-pointer font-medium text-xs" onClick={() => navigate(`/dashboard/teachers/${teacher.id}?edit=true`)}>
                                                                    <Edit className="mr-2 h-3.5 w-3.5" /> Edit Profile
                                                                </DropdownMenuItem>
                                                                <PermissionGate resource="teachers" action="delete">
                                                                    <DropdownMenuItem className="cursor-pointer font-medium text-xs text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setTeacherToDelete(teacher.id)}>
                                                                        <Trash2 className="mr-2 h-3.5 w-3.5" /> Delete Teacher
                                                                    </DropdownMenuItem>
                                                                </PermissionGate>
                                                            </DropdownMenuContent>
                                                        </DropdownMenu>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Pagination */}
            {pagination.pages > 1 && (
                <div className="flex items-center justify-between pt-1">
                    <p className="text-xs font-medium text-muted-foreground hidden sm:block">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} entries
                    </p>
                    <div className="flex items-center gap-1.5 w-full sm:w-auto justify-between sm:justify-end">
                        <Button
                            variant="outline" size="sm"
                            className="h-9 px-3 rounded-xl border-border/80 bg-background hover:bg-muted font-medium text-xs shadow-sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1}
                        >
                            <ChevronLeft className="h-4 w-4 mr-1" /> Prev
                        </Button>
                        <div className="flex items-center justify-center min-w-[32px] text-xs font-bold text-foreground bg-muted/40 h-9 rounded-xl border border-border/40">
                            {page}
                        </div>
                        <Button
                            variant="outline" size="sm"
                            className="h-9 px-3 rounded-xl border-border/80 bg-background hover:bg-muted font-medium text-xs shadow-sm"
                            onClick={() => setPage(p => Math.min(pagination.pages, p + 1))}
                            disabled={page === pagination.pages}
                        >
                            Next <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!teacherToDelete} onOpenChange={(open) => !open && setTeacherToDelete(null)}>
                <AlertDialogContent className="rounded-2xl border border-border/80 shadow-2xl p-0 overflow-hidden sm:max-w-md">
                    <div className="p-6 pb-4">
                        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-destructive/10 text-destructive mb-4">
                            <Trash2 className="h-6 w-6" />
                        </div>
                        <AlertDialogHeader>
                            <AlertDialogTitle className="text-xl font-bold tracking-tight">Delete Teacher Profile</AlertDialogTitle>
                            <AlertDialogDescription className="text-sm mt-2">
                                Are you sure you want to permanently delete this teacher? This action cannot be undone and will remove their access.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                    </div>
                    <AlertDialogFooter className="bg-muted/40 px-6 py-4 border-t border-border/60 sm:justify-end gap-2">
                        <AlertDialogCancel className="mt-0 rounded-xl font-medium border-border/80 hover:bg-background">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); teacherToDelete && deleteTeacher.mutate(teacherToDelete); }}
                            className="rounded-xl bg-destructive hover:bg-destructive/90 text-white font-semibold"
                        >
                            {deleteTeacher.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete Teacher"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
