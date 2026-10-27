import { useParams, useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, User, Mail, Shield, Calendar, Clock,
    UserCheck, UserX, Loader2, CheckCircle2, XCircle,
    BookOpen, GraduationCap, Hash
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import { SectionCard, DetailRow } from "@/components/shared/DetailCards";
import { DetailsPageSkeleton } from "@/components/common/skeletons/DetailsPageSkeleton";
import { useUserDetailQuery } from "@/features/users/api/useUserDetailQuery";

export default function UserDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { can } = usePermissions();
    const qc = useQueryClient();

    const { data: user, isLoading, error } = useUserDetailQuery(id, can("users", "read"));

    const toggleActive = useMutation({
        mutationFn: (active: boolean) => api.patch(`/users/${id}/${active ? "activate" : "deactivate"}`),
        onSuccess: (_, active) => {
            qc.invalidateQueries({ queryKey: ["user", id] });
            toast.success(`User ${active ? "activated" : "deactivated"}`);
        },
    });

    if (!can("users", "read")) return <AccessDenied />;
    if (isLoading) return <DetailsPageSkeleton />;
    if (error || !user) return (
        <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
            <User className="h-10 w-10 text-muted-foreground/40" />
            <p className="font-semibold text-sm text-foreground">User not found</p>
            <Button variant="outline" size="sm" className="rounded-xl hover:bg-accent hover:text-accent-foreground" onClick={() => navigate(-1)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
            </Button>
        </div>
    );

    const fullName = `${user.firstName} ${user.lastName}`;
    const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

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
                                <span className="text-3xl font-black text-primary select-none">
                                    {initials}
                                </span>
                            </div>
                            {/* Online-style status dot */}
                            <span className={`absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-background
                                             ${user.isActive ? "bg-emerald-500" : "bg-muted-foreground"}`}
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
                                        ${user.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "text-muted-foreground border-border"}`}
                                >
                                    {user.isActive ? "Active" : "Inactive"}
                                </Badge>
                            </div>

                            {/* ERP User ID chip */}
                            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                <Hash className="h-3 w-3 text-primary" />
                                <span className="text-xs font-mono font-bold text-primary">
                                    {user.userId}
                                </span>
                            </div>

                            {/* Secondary meta row */}
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {user.email}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <Clock className="h-3 w-3" />
                                    Last Login: {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"}
                                </span>
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </div>

                        {/* ── Action buttons ── */}
                        <PermissionGate resource="users" action="manage">
                            <Button
                                onClick={() => toggleActive.mutate(!user.isActive)}
                                disabled={toggleActive.isPending}
                                className={`gap-2 h-10 px-5 rounded-xl font-semibold shadow-md
                                           shrink-0 sm:self-start hover:scale-[1.02] active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none
                                           ${user.isActive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : "bg-emerald-600 text-white hover:bg-emerald-700"}`}
                            >
                                {toggleActive.isPending
                                    ? <Loader2 className="h-4 w-4 animate-spin" />
                                    : user.isActive
                                        ? <><UserX className="h-4 w-4" /> Deactivate</>
                                        : <><UserCheck className="h-4 w-4" /> Activate</>}
                            </Button>
                        </PermissionGate>
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* GRID LAYOUT                                                     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">

                {/* ── 1. Roles ──────────────────────────────────────────────── */}
                <SectionCard title="Assigned Roles" icon={Shield} accent="primary" className="lg:col-span-1">
                    {(user.Roles ?? []).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-4 text-center">No roles assigned</p>
                    ) : (
                        <div className="flex flex-wrap gap-2">
                            {(user.Roles ?? []).map(r => (
                                <div key={r.id} className="flex items-center justify-between w-full p-3 rounded-xl border border-primary/20 bg-primary/5">
                                    <div className="flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-primary" />
                                        <span className="text-sm font-medium capitalize text-foreground">{r.name.replace(/_/g, " ")}</span>
                                    </div>
                                    {r.isActive
                                        ? <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                                        : <XCircle className="h-4 w-4 text-muted-foreground" />}
                                </div>
                            ))}
                        </div>
                    )}
                </SectionCard>

                {/* ── 2. Linked Profiles ────────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-5">

                    {/* Teacher Profile */}
                    {user.teacherProfile && (
                        <SectionCard title="Teacher Profile" icon={BookOpen} accent="primary">
                            <div className="flex justify-end mb-2 -mt-10 relative z-10">
                                <Button size="sm" variant="ghost" className="h-8 gap-1 focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent"
                                    onClick={() => navigate(`/dashboard/teachers/${user.teacherProfile!.id}`)}>
                                    <ArrowLeft className="h-3 w-3 rotate-180" /> View Profile
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                                <DetailRow icon={Hash} label="Teacher ID" value={user.teacherProfile.teacherId} mono />
                                <DetailRow icon={BookOpen} label="Designation" value={user.teacherProfile.designationName || user.teacherProfile.designation} />
                                <DetailRow icon={Hash} label="Employee No." value={user.teacherProfile.employeeNumber} />
                                <DetailRow icon={Calendar} label="Joining Date" value={user.teacherProfile.joiningDate ? new Date(user.teacherProfile.joiningDate).toLocaleDateString() : undefined} />
                                <DetailRow icon={BookOpen} label="Qualification" value={user.teacherProfile.qualification} />
                            </div>
                            {user.teacherProfile.subjects.length > 0 && (
                                <div className="mt-4 pt-4 border-t border-border/40">
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2">Subjects</p>
                                    <div className="flex flex-wrap gap-2">
                                        {user.teacherProfile.subjects.map(s => (
                                            <Badge key={s} variant="secondary" className="text-xs bg-accent text-accent-foreground border-transparent px-2.5 py-0.5 rounded-md">{s}</Badge>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </SectionCard>
                    )}

                    {/* Student Profile */}
                    {user.studentProfile && (
                        <SectionCard title="Student Profile" icon={GraduationCap} accent="primary">
                            <div className="flex justify-end mb-2 -mt-10 relative z-10">
                                <Button size="sm" variant="ghost" className="h-8 gap-1 focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent"
                                    onClick={() => navigate(`/dashboard/students/${user.studentProfile!.id}`)}>
                                    <ArrowLeft className="h-3 w-3 rotate-180" /> View Profile
                                </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                                <DetailRow icon={Hash} label="Student ID" value={user.studentProfile.studentId} mono />
                                <DetailRow icon={Hash} label="Enrollment No" value={user.studentProfile.enrollmentNumber} mono />
                                <DetailRow icon={GraduationCap} label="Grade" value={user.studentProfile.grade} />
                                <DetailRow icon={GraduationCap} label="Section" value={user.studentProfile.section} />
                                <DetailRow icon={User} label="Guardian" value={user.studentProfile.guardianName} />
                                <DetailRow icon={User} label="Guardian Phone" value={user.studentProfile.guardianPhone} />
                            </div>
                        </SectionCard>
                    )}

                    {/* No profiles */}
                    {!user.teacherProfile && !user.studentProfile && (
                        <Card className="border border-border/60 shadow-sm bg-card/50 rounded-2xl border-dashed">
                            <CardContent className="py-12 flex flex-col items-center text-center text-muted-foreground gap-3">
                                <div className="h-12 w-12 rounded-xl bg-muted flex items-center justify-center">
                                    <User className="h-6 w-6 text-muted-foreground/60" />
                                </div>
                                <div>
                                    <p className="text-sm font-semibold text-foreground">No linked profile</p>
                                    <p className="text-xs mt-1">This user is likely a system administrator or unassigned.</p>
                                </div>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </motion.div>
    );
}
