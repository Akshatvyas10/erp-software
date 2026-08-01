import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    School, Search, Plus, Trash2, Loader2, RefreshCw,
    Users, BookOpen, MapPin, BookText,
    MoreHorizontal, Pencil, CalendarDays, LayoutGrid,
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
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
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import type { Classroom, CreateClassroomPayload } from "@/types/erp";

// ─── Validation schema ────────────────────────────────────────────────────────
const classroomSchema = z.object({
    name: z.string().min(1, "Class name is required").max(80),
    section: z.string().min(1, "Section is required").max(10),
    academicYear: z.string().min(1, "Academic year is required").max(20),
    roomNumber: z.string().max(20).optional(),
    status: z.enum(["ACTIVE", "INACTIVE"]),
});
type ClassroomFormValues = z.infer<typeof classroomSchema>;

// ─── API fetchers ─────────────────────────────────────────────────────────────
const fetchClassrooms = async (search: string, status: string): Promise<Classroom[]> => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const { data } = await api.get(`/classrooms?${params}`);
    return data.data.classrooms as Classroom[];
};

// ─── Sub-components ───────────────────────────────────────────────────────────

interface ClassroomCardProps {
    classroom: Classroom;
    canEdit: boolean;
    canDelete: boolean;
    onEdit: (c: Classroom) => void;
    onDelete: (id: string) => void;
    onView: (id: string) => void;
}

function ClassroomCard({ classroom, canEdit, canDelete, onEdit, onDelete, onView }: ClassroomCardProps) {
    const subjectCount = classroom.subjects?.length ?? 0;
    const studentCount = classroom.studentCount ?? 0;

    return (
        <motion.div
            layout
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97 }}
            transition={{ duration: 0.22 }}
        >
            <Card
                className="group relative border border-purple-100 dark:border-zinc-800 bg-white dark:bg-zinc-900/60
                           shadow-[0_6px_24px_-4px_rgba(0,0,0,0.08)] dark:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.4)]
                           rounded-2xl hover:border-purple-300 dark:hover:border-purple-500/40
                           hover:shadow-[0_8px_32px_-4px_rgba(88,28,220,0.12)] dark:hover:shadow-[0_8px_32px_-4px_rgba(139,92,246,0.15)]
                           transition-all duration-200 overflow-hidden"
            >
                {/* Status ribbon */}
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${classroom.status === "ACTIVE"
                    ? "bg-gradient-to-r from-purple-500 to-violet-400"
                    : "bg-zinc-300 dark:bg-zinc-700"
                    }`} />

                <CardContent className="p-5 pt-6">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="h-11 w-11 rounded-xl bg-purple-600/10 dark:bg-purple-500/15
                                            border border-purple-200/60 dark:border-purple-500/20
                                            flex items-center justify-center shrink-0">
                                <School className="h-5 w-5 text-purple-700 dark:text-purple-400" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-extrabold text-[15px] leading-tight text-purple-950 dark:text-zinc-50 tracking-tight">
                                        {classroom.name}
                                    </h3>
                                    <Badge className="text-[10px] font-bold uppercase tracking-wider px-2 py-0
                                                     bg-purple-600/10 dark:bg-purple-500/20 text-purple-700
                                                     dark:text-purple-300 border-purple-200/60 dark:border-purple-500/30
                                                     hover:bg-purple-600/15 rounded-lg">
                                        {classroom.section}
                                    </Badge>
                                </div>
                                <p className="text-xs text-purple-900/50 dark:text-zinc-500 font-semibold mt-0.5 flex items-center gap-1">
                                    <CalendarDays className="h-3 w-3" />
                                    {classroom.academicYear}
                                </p>
                            </div>
                        </div>

                        {/* Actions dropdown */}
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity
                                               text-purple-900/50 dark:text-zinc-400 hover:bg-purple-600/10
                                               dark:hover:bg-purple-500/10 hover:text-purple-700 dark:hover:text-purple-400"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-48 rounded-xl border border-purple-100 dark:border-zinc-800
                                           bg-white dark:bg-zinc-950 shadow-xl"
                            >
                                <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-purple-950 dark:text-zinc-300
                                               focus:bg-purple-600/10 dark:focus:bg-purple-500/10 font-medium rounded-lg"
                                    onClick={() => onView(classroom.id)}
                                >
                                    <Users className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    View Roster
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-purple-950 dark:text-zinc-300
                                               focus:bg-purple-600/10 dark:focus:bg-purple-500/10 font-medium rounded-lg"
                                    onClick={() => onView(classroom.id)}
                                >
                                    <LayoutGrid className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                    Timetable Setup
                                </DropdownMenuItem>
                                {canEdit && (
                                    <>
                                        <DropdownMenuSeparator className="bg-purple-100 dark:bg-zinc-800" />
                                        <DropdownMenuItem
                                            className="gap-2 cursor-pointer text-purple-950 dark:text-zinc-300
                                                       focus:bg-purple-600/10 dark:focus:bg-purple-500/10 font-medium rounded-lg"
                                            onClick={() => onEdit(classroom)}
                                        >
                                            <Pencil className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                                            Edit Details
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {canDelete && (
                                    <DropdownMenuItem
                                        className="gap-2 cursor-pointer text-destructive dark:text-red-400
                                                   focus:bg-destructive/10 font-medium rounded-lg"
                                        onClick={() => onDelete(classroom.id)}
                                    >
                                        <Trash2 className="h-4 w-4" />
                                        Delete
                                    </DropdownMenuItem>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>

                    {/* Stats row */}
                    <div className="grid grid-cols-2 gap-2 mt-1">
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                                        bg-purple-50 dark:bg-purple-500/5 border border-purple-100/80 dark:border-purple-500/10">
                            <Users className="h-4 w-4 text-purple-600/70 dark:text-purple-400/70 shrink-0" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-900/50 dark:text-zinc-500">Students</p>
                                <p className="text-sm font-extrabold text-purple-950 dark:text-zinc-100">{studentCount}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl
                                        bg-purple-50 dark:bg-purple-500/5 border border-purple-100/80 dark:border-purple-500/10">
                            <BookOpen className="h-4 w-4 text-purple-600/70 dark:text-purple-400/70 shrink-0" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-purple-900/50 dark:text-zinc-500">Subjects</p>
                                <p className="text-sm font-extrabold text-purple-950 dark:text-zinc-100">{subjectCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Room + status footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-purple-100/60 dark:border-zinc-800/60">
                        <div className="flex items-center gap-1.5 text-xs text-purple-900/50 dark:text-zinc-500 font-semibold">
                            <MapPin className="h-3 w-3" />
                            {classroom.roomNumber ?? "—"}
                        </div>
                        <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-0.5 ${classroom.status === "ACTIVE"
                                ? "border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/10"
                                : "border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-500 bg-zinc-50 dark:bg-zinc-900/40"
                                }`}
                        >
                            {classroom.status}
                        </Badge>
                    </div>

                    {/* View Details CTA */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-3 h-9 text-xs font-bold text-purple-700 dark:text-purple-400
                                   hover:bg-purple-600/10 dark:hover:bg-purple-500/10 rounded-xl border
                                   border-purple-100 dark:border-zinc-800 group-hover:border-purple-200
                                   dark:group-hover:border-purple-500/30 transition-colors"
                        onClick={() => onView(classroom.id)}
                    >
                        Open Classroom
                    </Button>
                </CardContent>
            </Card>
        </motion.div>
    );
}

// ─── Create / Edit Form Dialog ────────────────────────────────────────────────

interface ClassroomFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editTarget: Classroom | null;
    onSuccess: () => void;
}

function ClassroomFormDialog({ open, onOpenChange, editTarget, onSuccess }: ClassroomFormDialogProps) {
    const isEdit = !!editTarget;

    const form = useForm<ClassroomFormValues>({
        resolver: zodResolver(classroomSchema),
        defaultValues: {
            name: editTarget?.name ?? "",
            section: editTarget?.section ?? "",
            academicYear: editTarget?.academicYear ?? "",
            roomNumber: editTarget?.roomNumber ?? "",
            status: editTarget?.status ?? "ACTIVE",
        },
    });

    // Reset form whenever dialog opens with a new target
    const handleOpenChange = (val: boolean) => {
        if (val) {
            form.reset({
                name: editTarget?.name ?? "",
                section: editTarget?.section ?? "",
                academicYear: editTarget?.academicYear ?? "",
                roomNumber: editTarget?.roomNumber ?? "",
                status: editTarget?.status ?? "ACTIVE",
            });
        }
        onOpenChange(val);
    };

    const onSubmit = async (values: ClassroomFormValues) => {
        const payload: CreateClassroomPayload = {
            name: values.name,
            section: values.section,
            academicYear: values.academicYear,
            roomNumber: values.roomNumber || undefined,
            status: values.status,
        };
        try {
            if (isEdit) {
                await api.put(`/classrooms/${editTarget!.id}`, payload);
                toast.success("Classroom updated");
            } else {
                await api.post("/classrooms", payload);
                toast.success("Classroom created");
            }
            onSuccess();
            onOpenChange(false);
        } catch (err: unknown) {
            toast.error(
                (err as { response?: { data?: { message?: string } } })?.response?.data?.message
                ?? "Operation failed"
            );
        }
    };

    const inputCls = "h-9 bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50";
    const labelCls = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-lg p-0 overflow-hidden border border-border/80
                                       shadow-2xl rounded-2xl bg-white dark:bg-zinc-950">
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                        {isEdit ? "Edit Classroom" : "Create New Classroom"}
                    </DialogTitle>
                </DialogHeader>

                <div className="p-6 bg-background dark:bg-zinc-950">
                    <Form {...form}>
                        <form id="classroom-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                                <FormField control={form.control} name="name" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelCls}>Class Name *</FormLabel>
                                        <FormControl><Input placeholder="e.g. Grade 10" className={inputCls} {...field} /></FormControl>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="section" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelCls}>Section *</FormLabel>
                                        <FormControl><Input placeholder="e.g. A" className={inputCls} {...field} /></FormControl>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <FormField control={form.control} name="academicYear" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelCls}>Academic Year *</FormLabel>
                                        <FormControl><Input placeholder="e.g. 2024-25" className={inputCls} {...field} /></FormControl>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />
                                <FormField control={form.control} name="roomNumber" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelCls}>Room Number</FormLabel>
                                        <FormControl><Input placeholder="e.g. R-101" className={inputCls} {...field} /></FormControl>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="status" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className={labelCls}>Status</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className={inputCls}>
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />
                        </form>
                    </Form>
                </div>

                <div className="px-6 py-4 bg-muted/40 dark:bg-purple-950/10 border-t border-border flex justify-end gap-3">
                    <Button type="button" variant="outline"
                        className="border-border/80 bg-background hover:bg-muted font-medium rounded-xl"
                        onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button type="submit" form="classroom-form"
                        className="gap-2 h-10 px-6 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600
                                   dark:hover:bg-purple-500 text-white rounded-xl font-semibold shadow-md">
                        {form.formState.isSubmitting
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : isEdit ? "Save Changes" : "Create Classroom"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page Component ──────────────────────────────────────────────────────

export default function ClassroomList() {
    const { can } = usePermissions();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Classroom | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: classrooms = [], isLoading, isFetching, refetch } = useQuery({
        queryKey: ["classrooms", search, statusFilter],
        queryFn: () => fetchClassrooms(search, statusFilter),
        enabled: can("classrooms", "read"),
        staleTime: 60_000,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/classrooms/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["classrooms"] });
            toast.success("Classroom deleted");
            setDeleteId(null);
        },
        onError: () => {
            toast.error("Failed to delete classroom");
            setDeleteId(null);
        },
    });

    const handleEdit = (classroom: Classroom) => {
        setEditTarget(classroom);
        setIsFormOpen(true);
    };

    const handleCreateNew = () => {
        setEditTarget(null);
        setIsFormOpen(true);
    };

    if (!can("classrooms", "read")) return <AccessDenied />;

    return (
        <motion.div
            className="mx-auto text-foreground transition-colors duration-200 space-y-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            {/* Page Header */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between
                            pb-4 border-b border-border/40">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight
                                   text-[#5513a1] dark:text-[#8e44ad] flex items-center gap-3">
                        <School className="h-6 w-6 md:h-8 md:w-8" />
                        Classroom Management
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1.5 max-w-2xl">
                        Organise classrooms, assign students, configure subjects and build timetables.
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

                    <Button
                        variant="outline"
                        className="gap-2 h-10 px-4 bg-white hover:bg-zinc-100 dark:bg-zinc-900 dark:hover:bg-zinc-800 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800 rounded-xl font-semibold shadow-sm"
                        onClick={() => navigate("/dashboard/subjects")}
                    >
                        <BookText className="h-4 w-4" /> Manage Subjects
                    </Button>

                    <PermissionGate resource="classrooms" action="create">
                        <Button
                            onClick={handleCreateNew}
                            className="gap-2 h-10 px-5 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600
                                       dark:hover:bg-purple-500 text-white rounded-xl font-semibold shadow-md
                                       hover:scale-[1.02] active:scale-[0.98] transition-transform"
                        >
                            <Plus className="h-4 w-4 stroke-[2.5]" /> New Classroom
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Toolbar */}
            <Card className="p-3 lg:p-4 border-border/60 shadow-sm bg-card dark:bg-zinc-900/40 rounded-2xl">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 max-w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or section…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            className="pl-9 h-11 border-none shadow-none focus-visible:ring-1
                                       focus-visible:ring-purple-500 bg-muted/60 dark:bg-zinc-950/60
                                       rounded-xl hover:bg-muted dark:hover:bg-zinc-950 text-sm"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-11 w-full sm:w-40 border-none bg-muted/60 dark:bg-zinc-950/60
                                                   rounded-xl text-sm font-medium focus:ring-1 focus:ring-purple-500">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Statuses</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="hidden sm:flex items-center gap-2 ml-auto">
                        <span className="text-xs font-semibold text-[#5513a1] dark:text-purple-400
                                         bg-[#5513a1]/10 dark:bg-purple-400/10 px-2.5 py-1 rounded-full
                                         border border-purple-500/10">
                            {classrooms.length} classroom{classrooms.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            </Card>

            {/* Classroom Grid */}
            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-7 w-7 animate-spin text-[#7f39c2]" />
                </div>
            ) : classrooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <div className="h-16 w-16 rounded-2xl bg-purple-600/5 dark:bg-purple-500/10
                                    border border-purple-100 dark:border-zinc-800 flex items-center justify-center">
                        <School className="h-7 w-7 text-purple-400/60" />
                    </div>
                    <p className="text-sm font-bold text-purple-950/40 dark:text-zinc-500">No classrooms found</p>
                    <p className="text-xs text-muted-foreground/60">Try adjusting filters or create a new classroom.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {classrooms.map(classroom => (
                        <ClassroomCard
                            key={classroom.id}
                            classroom={classroom}
                            canEdit={can("classrooms", "update")}
                            canDelete={can("classrooms", "delete")}
                            onEdit={handleEdit}
                            onDelete={setDeleteId}
                            onView={id => navigate(`/dashboard/classrooms/${id}`)}
                        />
                    ))}
                </div>
            )}

            {/* Create / Edit Form Dialog */}
            <ClassroomFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                editTarget={editTarget}
                onSuccess={() => qc.invalidateQueries({ queryKey: ["classrooms"] })}
            />

            {/* Delete Confirmation Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={v => !v && setDeleteId(null)}>
                <AlertDialogContent className="rounded-xl border border-purple-100 dark:border-zinc-800
                                               bg-white dark:bg-zinc-950 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-purple-950 dark:text-zinc-50 font-bold">
                            Delete Classroom?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-purple-900/70 dark:text-zinc-400">
                            This will permanently remove the classroom along with all enrolled students,
                            subjects, and timetable slots. This action cannot be undone.
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
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
