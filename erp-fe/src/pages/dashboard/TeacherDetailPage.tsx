import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, BookOpen, Mail, Phone, Calendar,
    Clock, Briefcase, GraduationCap, Loader2,
    Edit2, CheckCircle2, UserCheck, UserX,
    Hash,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
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
    if (isLoading) return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-[#5513a1] dark:text-[#8e44ad]" />
        </div>
    );
    if (!teacher) return (
        <div className="text-center py-20 text-muted-foreground">Teacher not found</div>
    );

    const { account } = teacher;
    const fullName = `${account.firstName} ${account.lastName}`;
    const initials = `${account.firstName[0]}${account.lastName[0]}`.toUpperCase();

    return (
        <div className="max-w-5xl mx-auto space-y-6 text-foreground transition-colors duration-200">
            {/* Header */}
            <div className="flex items-start gap-3">
                <Button variant="outline" size="icon" className="h-10 w-10 border-border/80 bg-background hover:bg-muted dark:hover:bg-purple-950/20 dark:hover:text-purple-400 transition-all rounded-xl mt-0.5"
                    onClick={() => navigate("/dashboard/teachers")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1 min-w-0">
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#5513a1] dark:text-[#8e44ad] flex items-center gap-3 truncate">{fullName}</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">
                        {teacher.designation ?? "Teacher"} · {teacher.department ?? "No Department"}
                    </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <PermissionGate resource="teachers" action="update">
                        <Button size="sm" variant="outline" className="gap-2 h-9"
                            onClick={() => setEditOpen(true)}>
                            <Edit2 className="h-3.5 w-3.5" /> Edit
                        </Button>
                    </PermissionGate>
                    <PermissionGate resource="teachers" action="update">
                        <Button
                            size="sm"
                            variant="outline"
                            className={`gap-2 h-9 ${account.isActive
                                ? "text-destructive border-destructive/30 hover:bg-destructive/10"
                                : "text-emerald-600 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-50 dark:bg-emerald-950/30"}`}
                            onClick={() => toggleActive.mutate(!account.isActive)}
                            disabled={toggleActive.isPending}
                        >
                            {toggleActive.isPending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : account.isActive
                                    ? <><UserX className="h-3.5 w-3.5" /> Deactivate</>
                                    : <><UserCheck className="h-3.5 w-3.5" /> Activate</>}
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                {/* ── Left: Profile card ─────────────────────────────────────────── */}
                <Card className="border-border/60 shadow-md bg-card dark:bg-zinc-900/20 rounded-2xl lg:col-span-1">
                    <CardContent className="pt-6 lg:pt-8 flex flex-col items-center text-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarFallback className="bg-gradient-to-br from-[#5513a1] to-[#3a0d6e] text-[#ffffff] dark:text-[#8e44ad]-foreground text-2xl ring-2 ring-orange-600 font-bold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>

                        <div>
                            <h2 className="text-lg font-bold">{fullName}</h2>
                            <p className="text-sm text-muted-foreground">{account.email}</p>
                        </div>

                        <Badge
                            className={account.isActive
                                ? "bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                : "text-muted-foreground"}
                            variant={account.isActive ? "default" : "outline"}
                        >
                            {account.isActive
                                ? <><CheckCircle2 className="h-3 w-3 mr-1" />Active</>
                                : <>Inactive</>}
                        </Badge>

                        <Separator className="w-full" />

                        <div className="w-full space-y-3 text-left">
                            <InfoRow icon={Hash} label="Teacher ID" value={<code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{teacher.teacherId}</code>} />
                            <InfoRow icon={Hash} label="ERP User ID" value={<code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{account.userId}</code>} />
                            <InfoRow icon={Mail} label="Email" value={account.email} />
                            <InfoRow icon={Phone} label="Phone" value={teacher.phone ?? "—"} />
                            <InfoRow icon={Clock} label="Last Login" value={account.lastLoginAt ? new Date(account.lastLoginAt).toLocaleDateString() : "Never"} />
                            <InfoRow icon={Calendar} label="Joined" value={teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : "—"} />
                            <InfoRow icon={Calendar} label="Added On" value={new Date(teacher.createdAt).toLocaleDateString()} />
                        </div>

                        {/* Roles */}
                        {(account.Roles ?? []).length > 0 && (
                            <>
                                <Separator className="w-full" />
                                <div className="w-full">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Roles</p>
                                    <div className="flex flex-wrap gap-1.5">
                                        {(account.Roles ?? []).map(r => (
                                            <Badge key={r.id} variant="outline" className="text-[11px] capitalize bg-[#5513a1]/5 dark:bg-[#5513a1]/10 text-[#5513a1] dark:text-[#8e44ad] border-[#5513a1]/20 dark:border-[#8e44ad]/20">
                                                {r.name.replace(/_/g, " ")}
                                            </Badge>
                                        ))}
                                    </div>
                                </div>
                            </>
                        )}
                    </CardContent>
                </Card>

                {/* ── Right: Detail cards ────────────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Professional details */}
                    <Card className="border-border/60 shadow-md bg-card dark:bg-zinc-900/20 rounded-2xl">
                        <CardHeader className="py-4 lg:py-5 px-6 border-b border-border/60 bg-muted/20 dark:bg-zinc-900/40">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Briefcase className="h-4 w-4 text-[#5513a1] dark:text-[#8e44ad]" /> Professional Details
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-5 grid grid-cols-2 gap-4">
                            <InfoRow icon={Briefcase} label="Department" value={teacher.department ?? "—"} />
                            <InfoRow icon={Briefcase} label="Designation" value={teacher.designation ?? "—"} />
                            <InfoRow icon={Hash} label="Employee No." value={teacher.employeeNumber ?? "—"} />
                            <InfoRow icon={GraduationCap} label="Qualification" value={teacher.qualification ?? "—"} />
                        </CardContent>
                    </Card>

                    {/* Subjects */}
                    <Card className="border-border/60 shadow-md bg-card dark:bg-zinc-900/20 rounded-2xl">
                        <CardHeader className="py-4 lg:py-5 px-6 border-b border-border/60 bg-muted/20 dark:bg-zinc-900/40">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <BookOpen className="h-4 w-4 text-[#5513a1] dark:text-[#8e44ad]" />
                                Subjects
                                <Badge variant="secondary" className="ml-auto text-xs">{teacher.subjects.length}</Badge>
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-5">
                            {teacher.subjects.length === 0 ? (
                                <p className="text-sm text-muted-foreground">No subjects assigned</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {teacher.subjects.map(s => (
                                        <Badge key={s} variant="secondary" className="text-sm px-3 py-1">
                                            {s}
                                        </Badge>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Quick stats */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                        {[
                            { label: "Department", value: teacher.department ?? "—", icon: Briefcase },
                            { label: "Designation", value: teacher.designation ?? "—", icon: Briefcase },
                            { label: "Subjects", value: teacher.subjects.length, icon: BookOpen },
                        ].map(({ label, value, icon: Icon }) => (
                            <div key={label} className="p-4 rounded-xl border border-border bg-card">
                                <div className="flex items-center gap-2 mb-1">
                                    <Icon className="h-3.5 w-3.5 text-[#5513a1] dark:text-[#8e44ad]" />
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
                                </div>
                                <p className="text-sm font-semibold truncate">{value}</p>
                            </div>
                        ))}
                    </div>

                    {/* User account link */}
                    <Card className="border-border/60 shadow-md bg-card dark:bg-zinc-900/20 rounded-2xl border-dashed">
                        <CardContent className="py-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="h-9 w-9 rounded-lg bg-[#5513a1]/10 dark:bg-purple-500/20 flex items-center justify-center">
                                    <BookOpen className="h-4 w-4 text-[#5513a1] dark:text-[#8e44ad]" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold">Linked User Account</p>
                                    <p className="text-xs text-muted-foreground">{account.userId} · {account.email}</p>
                                </div>
                            </div>
                            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs"
                                onClick={() => navigate(`/dashboard/users/${account.id}`)}>
                                View Account
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* Edit dialog */}
            {editOpen && (
                <Dialog open onOpenChange={setEditOpen}>
                    <DialogContent className="max-w-2xl md:max-w-3xl flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl">
                        <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                            <DialogTitle className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight">
                                <Edit2 className="h-5 w-5 text-[#5513a1] dark:text-[#8e44ad]" />
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
        </div>
    );
}

// ─── Info row helper ──────────────────────────────────────────────────────────
function InfoRow({ icon: Icon, label, value }: {
    icon: React.ElementType; label: string; value: React.ReactNode;
}) {
    return (
        <div className="flex items-start gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                <div className="text-sm font-medium text-foreground break-words">{value}</div>
            </div>
        </div>
    );
}
