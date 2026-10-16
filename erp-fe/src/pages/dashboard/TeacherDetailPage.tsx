import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, BookOpen, Mail, Phone, Calendar,
    Clock, Briefcase, GraduationCap, Loader2,
    Edit2, UserCheck, UserX, Hash
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import type { Teacher } from "@/types/erp";
import { TeacherForm } from "@/components/teachers/TeacherForm";
import { SectionCard, DetailRow } from "@/components/shared/DetailCards";
import { ProfilePageSkeleton } from "@/components/common/skeletons/ProfilePageSkeleton";

// ─── API ──────────────────────────────────────────────────────────────────────
const fetchTeacher = async (id: string): Promise<Teacher> => {
    const { data } = await api.get(`/teachers/${id}`);
    return data.data.teacher;
};

export default function TeacherDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { can } = usePermissions();
    const qc = useQueryClient();

    const [editOpen, setEditOpen] = useState(false);

    const { data: teacher, isLoading } = useQuery({
        queryKey: ["teacher", id],
        queryFn: () => fetchTeacher(id!),
        enabled: !!id && can("teachers", "read"),
    });

    const toggleActive = useMutation({
        mutationFn: (active: boolean) =>
            api.patch(`/users/${teacher!.account.id}/${active ? "activate" : "deactivate"}`),
        onSuccess: (_, active) => {
            qc.invalidateQueries({ queryKey: ["teacher", id] });
            toast.success(`Teacher ${active ? "activated" : "deactivated"}`);
        },
        onError: () => toast.error("Failed to update status"),
    });

    const updateTeacher = useMutation({
        mutationFn: (values: any) => api.put(`/teachers/${teacher?.id}`, values),
        onSuccess: () => {
            toast.success("Teacher updated successfully");
            qc.invalidateQueries({ queryKey: ["teacher", id] });
            setEditOpen(false);
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message ?? "Failed to update teacher");
        }
    });

    if (!can("teachers", "read")) return <AccessDenied />;
    if (isLoading) return <ProfilePageSkeleton />;
    if (!teacher) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <Briefcase className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold text-sm text-foreground">Teacher not found</p>
            <Button variant="outline" size="sm" className="rounded-xl hover:bg-accent hover:text-accent-foreground" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
        </div>
    );

    const { account } = teacher;
    const fullName = `${account.firstName} ${account.lastName}`;
    const initials = `${account.firstName[0]}${account.lastName[0]}`.toUpperCase();

    return (
        <motion.div
            className="max-w-5xl mx-auto space-y-6 text-foreground transition-colors duration-200"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >


            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* HEADER PANEL                                                    */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <Card className="border border-border/60 rounded-2xl overflow-hidden shadow-md bg-card">
                {/* Top gradient ribbon */}
                <div className="h-2 w-full bg-primary" />

                <CardContent className="p-6 relative backdrop-blur-sm bg-card/50">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

                        {/* ── Profile photo ── */}
                        <div className="relative shrink-0">
                            <div className="h-28 w-28 rounded-full border-4 border-background shadow-sm overflow-hidden
                                            bg-primary/10 flex items-center justify-center">
                                <Avatar className="h-full w-full">
                                    <AvatarFallback className="bg-transparent text-primary text-3xl font-black">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            {/* Online-style status dot */}
                            <span className={`absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-background
                                             ${account.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`}
                            />
                        </div>

                        {/* ── Name / meta ── */}
                        <div className="flex flex-col items-center sm:items-start gap-2 flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                                <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
                                    {fullName}
                                </h1>
                                <Badge
                                    variant="outline"
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg 
                                        ${account.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "text-muted-foreground border-border"}`}
                                >
                                    {account.isActive ? "Active" : "Inactive"}
                                </Badge>
                                {(account.Roles ?? []).map(r => (
                                    <Badge key={r.id} variant="outline" className="text-[10px] uppercase tracking-wider bg-primary/10 text-primary border-primary/20 px-2 py-0.5 rounded-lg">
                                        {r.name.replace(/_/g, " ")}
                                    </Badge>
                                ))}
                            </div>

                            {/* ERP User ID chip */}
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                <Hash className="h-3 w-3 text-primary" />
                                <span className="text-xs font-mono font-bold text-primary">
                                    {teacher.teacherId}
                                </span>
                            </div>

                            {/* Secondary meta row */}
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {account.email}
                                </span>
                                {teacher.phone && (
                                    <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {teacher.phone}
                                    </span>
                                )}
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Last Login: {account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleString() : "Never"}
                                </span>
                            </div>
                        </div>

                        {/* ── Action buttons ── */}
                        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto shrink-0">
                            <PermissionGate resource="teachers" action="update">
                                <Button
                                    onClick={() => toggleActive.mutate(!account.isActive)}
                                    disabled={toggleActive.isPending}
                                    variant="outline"
                                    className={`gap-2 h-10 px-4 rounded-xl font-semibold shadow-sm w-full sm:w-auto focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none
                                            ${account.isActive ? "text-destructive border-destructive/30 hover:bg-destructive/10" : "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10"}`}
                                >
                                    {toggleActive.isPending
                                        ? <Loader2 className="h-4 w-4 animate-spin" />
                                        : account.isActive
                                            ? <><UserX className="h-4 w-4" /> Deactivate</>
                                            : <><UserCheck className="h-4 w-4" /> Activate</>}
                                </Button>
                            </PermissionGate>
                            <PermissionGate resource="teachers" action="update">
                                <Button
                                    onClick={() => setEditOpen(true)}
                                    className="gap-2 h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md
                                            w-full sm:w-auto hover:scale-[1.02] active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                                >
                                    <Edit2 className="h-4 w-4" />
                                    Edit Profile
                                </Button>
                            </PermissionGate>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* GRID LAYOUT                                                     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                {/* ── 1. Professional Details ──────────────────────────────── */}
                <div className="lg:col-span-2">
                    <SectionCard title="Professional Details" icon={Briefcase} accent="primary">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <DetailRow icon={Briefcase} label="Department" value={teacher.departmentName || teacher.department} />
                            <DetailRow icon={Briefcase} label="Designation" value={teacher.designationName || teacher.designation} />
                            <DetailRow icon={Hash} label="Employee No." value={teacher.employeeNumber} />
                            <DetailRow icon={GraduationCap} label="Qualification" value={teacher.qualification} />
                            <DetailRow icon={Calendar} label="Joining Date" value={teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : undefined} />
                            <DetailRow icon={Calendar} label="Added On" value={new Date(teacher.createdAt).toLocaleDateString()} />
                        </div>
                    </SectionCard>
                </div>

                {/* ── 2. Subjects & Stats ──────────────────────────────────── */}
                <div className="lg:col-span-1 space-y-5">

                    {/* Subjects */}
                    <SectionCard title="Subjects Taught" icon={BookOpen} accent="primary">
                        <div className="flex justify-end mb-2 -mt-10 relative z-10">
                            <Badge variant="secondary" className="text-xs bg-muted/60">{teacher.subjects.length}</Badge>
                        </div>
                        {teacher.subjects.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">No subjects assigned</p>
                        ) : (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {teacher.subjects.map(s => (
                                    <Badge key={s} variant="secondary" className="text-xs bg-accent text-accent-foreground border-transparent px-2.5 py-0.5 rounded-md">
                                        {s}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Linked Account */}
                    <SectionCard title="System Account" icon={Mail} accent="primary">
                        <div className="flex justify-end mb-2 -mt-10 relative z-10">
                            <Button size="sm" variant="ghost" className="h-8 gap-1 focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent"
                                onClick={() => navigate(`/dashboard/users/${account.id}`)}>
                                <ArrowLeft className="h-3 w-3 rotate-180" /> View
                            </Button>
                        </div>
                        <div className="pt-2">
                            <DetailRow icon={Hash} label="ERP User ID" value={account.userId} mono />
                            <DetailRow icon={Mail} label="Email Address" value={account.email} />
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* EDIT DIALOG                                                     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {editOpen && (
                <Dialog open onOpenChange={setEditOpen}>
                    <DialogContent className="max-w-2xl md:max-w-3xl flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
                        <DialogHeader className="px-6 py-5 bg-muted/40 border-b border-border">
                            <DialogTitle className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight">
                                <Edit2 className="h-5 w-5 text-primary" />
                                Edit Teacher — {fullName}
                            </DialogTitle>
                        </DialogHeader>
                        <TeacherForm
                            isEditMode
                            initialData={{
                                userId: teacher.account.userId,
                                email: teacher.account.email,
                                password: "",
                                firstName: teacher.account.firstName,
                                lastName: teacher.account.lastName,
                                employeeNumber: teacher.employeeNumber ?? "",
                                department: teacher.department ?? "none",
                                designation: teacher.designation ?? "",
                                qualification: teacher.qualification ?? "",
                                joiningDate: teacher.joiningDate ?? "",
                                phone: teacher.phone ?? "",
                            }}
                            initialSubjects={teacher.subjects ?? []}
                            onSubmit={(values, subjects) => {
                                const payload = { ...values, subjects };
                                if (payload.department === "none") payload.department = "";
                                updateTeacher.mutate(payload);
                            }}
                            onCancel={() => setEditOpen(false)}
                            isSubmitting={updateTeacher.isPending}
                        />
                    </DialogContent>
                </Dialog>
            )}
        </motion.div>
    );
}
