import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    School, Search, Plus, Trash2, Loader2, RefreshCw,
    Users, BookOpen, MapPin, BookText,
    MoreHorizontal, Pencil, CalendarDays, LayoutGrid, UserCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
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
    classTeacherId: z.string().uuid("Invalid Teacher ID").optional().or(z.literal("")),
    status: z.enum(["ACTIVE", "INACTIVE"]),
    department: z.string().max(50).optional(),
    buildingBlock: z.string().max(100).optional(),
    maxCapacity: z.coerce.number().min(1).default(40),
    monitorMaleId: z.string().uuid("Invalid Student ID").optional().or(z.literal("")),
    monitorFemaleId: z.string().uuid("Invalid Student ID").optional().or(z.literal("")),
});
type ClassroomFormInput = z.input<typeof classroomSchema>;
type ClassroomFormValues = z.infer<typeof classroomSchema>;

// ─── API fetchers ─────────────────────────────────────────────────────────────
const fetchClassrooms = async (search: string, status: string): Promise<Classroom[]> => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const { data } = await api.get(`/classrooms?${params}`);
    return data.data.classrooms as Classroom[];
};

const fetchTeachers = async () => {
    const { data } = await api.get("/teachers");
    return data.data.teachers;
};

const fetchStudents = async () => {
    const { data } = await api.get("/students?limit=1000");
    return data.data.students || [];
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
                className="group relative border border-border bg-card shadow-sm rounded-2xl hover:border-primary/40 hover:shadow-md transition-all duration-200 overflow-hidden"
            >
                {/* Status ribbon */}
                <div className={`absolute top-0 left-0 right-0 h-1 rounded-t-2xl ${classroom.status === "ACTIVE"
                    ? "bg-primary"
                    : "bg-muted"
                    }`} />

                <CardContent className="p-5 pt-6">
                    {/* Header row */}
                    <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3 cursor-pointer" onClick={() => onView(classroom.id)}>
                            <div className="h-11 w-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                                <School className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="font-extrabold text-[15px] leading-tight text-foreground tracking-tight">
                                        {classroom.name}
                                    </h3>
                                    <Badge className="text-[10px] font-bold uppercase tracking-wider px-2 py-0 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 rounded-lg">
                                        {classroom.section}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground font-semibold mt-0.5 flex items-center gap-1">
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
                                    className="h-8 w-8 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                    <MoreHorizontal className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent
                                align="end"
                                className="w-48 rounded-xl border border-border bg-popover shadow-xl"
                            >
                                <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-foreground focus:bg-accent font-medium rounded-lg"
                                    onClick={() => onView(classroom.id)}
                                >
                                    <Users className="h-4 w-4 text-primary" />
                                    View Roster
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                    className="gap-2 cursor-pointer text-foreground focus:bg-accent font-medium rounded-lg"
                                    onClick={() => onView(classroom.id)}
                                >
                                    <LayoutGrid className="h-4 w-4 text-primary" />
                                    Timetable Setup
                                </DropdownMenuItem>
                                {canEdit && (
                                    <>
                                        <DropdownMenuSeparator className="bg-border" />
                                        <DropdownMenuItem
                                            className="gap-2 cursor-pointer text-foreground focus:bg-accent font-medium rounded-lg"
                                            onClick={() => onEdit(classroom)}
                                        >
                                            <Pencil className="h-4 w-4 text-primary" />
                                            Edit Details
                                        </DropdownMenuItem>
                                    </>
                                )}
                                {canDelete && (
                                    <DropdownMenuItem
                                        className="gap-2 cursor-pointer text-destructive focus:bg-destructive/10 font-medium rounded-lg"
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
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40">
                            <Users className="h-4 w-4 text-primary/70 shrink-0" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Students</p>
                                <p className="text-sm font-extrabold text-foreground">{studentCount}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl bg-muted/30 border border-border/40">
                            <BookOpen className="h-4 w-4 text-primary/70 shrink-0" />
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Subjects</p>
                                <p className="text-sm font-extrabold text-foreground">{subjectCount}</p>
                            </div>
                        </div>
                    </div>

                    {/* Room + status footer */}
                    <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/60">
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold">
                            <MapPin className="h-3 w-3" />
                            {classroom.roomNumber ?? "—"}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-semibold truncate max-w-[120px]">
                            <UserCheck className="h-3 w-3" />
                            {classroom.classTeacher ? `${classroom.classTeacher.account.firstName} ${classroom.classTeacher.account.lastName}` : "No Class Teacher"}
                        </div>
                        <Badge
                            variant="outline"
                            className={`text-[10px] font-bold uppercase tracking-wider rounded-lg px-2 py-0.5 ${classroom.status === "ACTIVE"
                                ? "border-emerald-500/20 text-emerald-600 dark:text-emerald-400 bg-emerald-500/10"
                                : "border-border text-muted-foreground bg-muted/40"
                                }`}
                        >
                            {classroom.status}
                        </Badge>
                    </div>

                    {/* View Details CTA */}
                    <Button
                        variant="ghost"
                        size="sm"
                        className="w-full mt-3 h-9 text-xs font-bold text-primary hover:bg-primary/10 rounded-xl border border-border/40 group-hover:border-primary/30 transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
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

    const form = useForm<ClassroomFormInput, any, ClassroomFormValues>({
        resolver: zodResolver(classroomSchema),
        defaultValues: {
            name: editTarget?.name ?? "",
            section: editTarget?.section ?? "",
            academicYear: editTarget?.academicYear ?? "",
            roomNumber: editTarget?.roomNumber ?? "",
            classTeacherId: editTarget?.classTeacherId ?? "",
            status: editTarget?.status ?? "ACTIVE",
            department: editTarget?.department ?? "",
            buildingBlock: editTarget?.buildingBlock ?? "",
            maxCapacity: editTarget?.maxCapacity ?? 40,
            monitorMaleId: editTarget?.monitorMaleId ?? "",
            monitorFemaleId: editTarget?.monitorFemaleId ?? "",
        },
    });

    const { data: teachers = [] } = useQuery({
        queryKey: ["teachers-list"],
        queryFn: fetchTeachers,
        enabled: open,
        staleTime: 60_000,
    });

    const { data: students = [] } = useQuery({
        queryKey: ["students-list"],
        queryFn: fetchStudents,
        enabled: open,
        staleTime: 60_000,
    });

    // Reset form whenever dialog opens or edit target changes
    useEffect(() => {
        if (open) {
            form.reset({
                name: editTarget?.name ?? "",
                section: editTarget?.section ?? "",
                academicYear: editTarget?.academicYear ?? "",
                roomNumber: editTarget?.roomNumber ?? "",
                classTeacherId: editTarget?.classTeacherId ?? "",
                status: editTarget?.status ?? "ACTIVE",
                department: editTarget?.department ?? "",
                buildingBlock: editTarget?.buildingBlock ?? "",
                maxCapacity: editTarget?.maxCapacity ?? 40,
                monitorMaleId: editTarget?.monitorMaleId ?? "",
                monitorFemaleId: editTarget?.monitorFemaleId ?? "",
            });
        }
    }, [open, editTarget, form]);

    const handleOpenChange = (val: boolean) => {
        if (!val) form.reset();
        onOpenChange(val);
    };

    const onSubmit = async (values: ClassroomFormValues) => {
        const payload: CreateClassroomPayload = {
            name: values.name,
            section: values.section,
            academicYear: values.academicYear,
            roomNumber: values.roomNumber || undefined,
            classTeacherId: values.classTeacherId || undefined,
            status: values.status,
            department: values.department || undefined,
            buildingBlock: values.buildingBlock || undefined,
            maxCapacity: values.maxCapacity,
            monitorMaleId: values.monitorMaleId || undefined,
            monitorFemaleId: values.monitorFemaleId || undefined,
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

    const inputCls = "h-9 bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none";
    const labelCls = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={handleOpenChange}
            title={isEdit ? "Edit Classroom" : "Create New Classroom"}
            description="Manage class section parameters, academic period, and staff assignments."
            maxWidth="sm:max-w-lg"
            footer={
                <>
                    <Button
                        type="button"
                        variant="outline"
                        className="border-border/80 bg-background hover:bg-muted font-medium rounded-xl transition-colors h-10 px-5"
                        onClick={() => onOpenChange(false)}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="submit"
                        form="classroom-form"
                        className="gap-2 h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        {form.formState.isSubmitting
                            ? <Loader2 className="h-4 w-4 animate-spin" />
                            : isEdit ? "Save Changes" : "Create Classroom"}
                    </Button>
                </>
            }
        >
            <Form {...form}>
                <form id="classroom-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={form.control} name="academicYear" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelCls}>Academic Year *</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className={inputCls}>
                                            <SelectValue placeholder="Select year" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="2023-2024">2023-2024</SelectItem>
                                        <SelectItem value="2024-2025">2024-2025</SelectItem>
                                        <SelectItem value="2025-2026">2025-2026</SelectItem>
                                        <SelectItem value="2026-2027">2026-2027</SelectItem>
                                    </SelectContent>
                                </Select>
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
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <FormField control={form.control} name="department" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelCls}>Department</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                        <SelectTrigger className={inputCls}>
                                            <SelectValue placeholder="Select Dept" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="PRIMARY">Primary</SelectItem>
                                        <SelectItem value="MIDDLE">Middle</SelectItem>
                                        <SelectItem value="HIGH_SCHOOL">High School</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="buildingBlock" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelCls}>Building / Block</FormLabel>
                                <FormControl><Input placeholder="e.g. Science Block" className={inputCls} {...field} /></FormControl>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="maxCapacity" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelCls}>Max Capacity</FormLabel>
                                <FormControl><Input type="number" min="1" className={inputCls} {...field} value={field.value as string | number | undefined} /></FormControl>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )} />
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={form.control} name="classTeacherId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelCls}>Class Teacher</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <FormControl>
                                        <SelectTrigger className={inputCls}>
                                            <SelectValue placeholder="Assign a teacher" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-56">
                                        <SelectItem value="">-- Unassigned --</SelectItem>
                                        {teachers.map((t: any) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.account.firstName} {t.account.lastName}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )} />
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
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField control={form.control} name="monitorMaleId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelCls}>Male Monitor</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                        <SelectTrigger className={inputCls}>
                                            <SelectValue placeholder="Assign Male Monitor" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-56">
                                        <SelectItem value="">-- Unassigned --</SelectItem>
                                        {students.filter((s: any) => s.gender?.toUpperCase() === 'MALE' && (!isEdit || s.classroomEnrollments?.some((ce: any) => ce.classroomId === editTarget.id))).map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.account.firstName} {s.account.lastName} ({s.studentId})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="monitorFemaleId" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelCls}>Female Monitor</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || ""}>
                                    <FormControl>
                                        <SelectTrigger className={inputCls}>
                                            <SelectValue placeholder="Assign Female Monitor" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-56">
                                        <SelectItem value="">-- Unassigned --</SelectItem>
                                        {students.filter((s: any) => s.gender?.toUpperCase() === 'FEMALE' && (!isEdit || s.classroomEnrollments?.some((ce: any) => ce.classroomId === editTarget.id))).map((s: any) => (
                                            <SelectItem key={s.id} value={s.id}>
                                                {s.account.firstName} {s.account.lastName} ({s.studentId})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )} />
                    </div>
                </form>
            </Form>
        </ResponsiveModal>
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
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-primary flex items-center gap-3">
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
                        className="h-10 w-10 border-border/80 bg-background hover:bg-accent hover:text-accent-foreground transition-colors rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? "animate-spin text-primary" : ""}`} />
                    </Button>

                    <Button
                        variant="outline"
                        className="gap-2 h-10 px-4 bg-background hover:bg-accent hover:text-accent-foreground text-primary border-primary/20 rounded-xl font-semibold shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={() => navigate("/dashboard/subjects")}
                    >
                        <BookText className="h-4 w-4" /> Manage Subjects
                    </Button>

                    <PermissionGate resource="classrooms" action="create">
                        <Button
                            variant="primary"
                            onClick={handleCreateNew}
                            className="w-full md:w-auto gap-2 h-10 px-5 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <Plus className="h-4 w-4 stroke-[2.5]" /> New Classroom
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Toolbar */}
            <Card className="p-3 lg:p-4 border-border/60 shadow-sm bg-card rounded-2xl">
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                    <div className="relative flex-1 max-w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name or section…"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                             className="pl-9 h-11 border-none shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none bg-muted/60 rounded-xl hover:bg-muted text-sm transition-colors"
                        />
                    </div>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="h-11 w-full sm:w-40 border-none bg-muted/60 rounded-xl text-sm font-medium focus:ring-2 focus:ring-ring focus:outline-none">
                            <SelectValue placeholder="All Statuses" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="">All Statuses</SelectItem>
                            <SelectItem value="ACTIVE">Active</SelectItem>
                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                        </SelectContent>
                    </Select>

                    <div className="hidden sm:flex items-center gap-2 ml-auto">
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                            {classrooms.length} classroom{classrooms.length !== 1 ? "s" : ""}
                        </span>
                    </div>
                </div>
            </Card>

            {/* Classroom Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {Array.from({ length: 8 }).map((_, i) => (
                        <Card key={i} className="border-border/60 bg-card rounded-2xl shadow-sm overflow-hidden p-5 space-y-4">
                            <div className="flex items-start justify-between">
                                <div className="space-y-2">
                                    <Skeleton className="h-5 w-32" />
                                    <Skeleton className="h-4 w-20 rounded-md" />
                                </div>
                                <Skeleton className="h-8 w-8 rounded-lg" />
                            </div>

                            <div className="grid grid-cols-2 gap-2">
                                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                                    <Skeleton className="h-3 w-14" />
                                    <Skeleton className="h-5 w-8" />
                                </div>
                                <div className="p-2.5 rounded-xl bg-muted/40 border border-border/40 space-y-1">
                                    <Skeleton className="h-3 w-14" />
                                    <Skeleton className="h-5 w-8" />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-3 border-t border-border/60">
                                <Skeleton className="h-4 w-16" />
                                <Skeleton className="h-4 w-24" />
                                <Skeleton className="h-4 w-14 rounded-md" />
                            </div>

                            <Skeleton className="h-9 w-full rounded-xl mt-2" />
                        </Card>
                    ))}
                </div>
            ) : classrooms.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
                    <div className="h-16 w-16 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                        <School className="h-7 w-7 text-primary/40" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">No classrooms found</p>
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
                <AlertDialogContent className="w-[95vw] sm:max-w-lg mx-auto rounded-3xl p-6 border-border shadow-2xl bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">
                            Delete Classroom?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2">
                            This will permanently remove the classroom along with all enrolled students,
                            subjects, and timetable slots. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="h-11 rounded-xl font-semibold border-border/50 bg-background hover:bg-accent text-foreground transition-colors">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
                        >
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
