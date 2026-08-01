
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, User, Mail, Shield, Calendar, Clock,
    UserCheck, UserX, Loader2, Edit2, CheckCircle2, XCircle,
    BookOpen, GraduationCap,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import type { User as UserType } from "@/types/erp";

const fetchUser = async (id: string): Promise<UserType> => {
    const { data } = await api.get(`/users/${id}`);
    return data.data.user;
};

export default function UserDetailPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { can } = usePermissions();
    const qc = useQueryClient();

    const { data: user, isLoading, error } = useQuery({
        queryKey: ["user", id],
        queryFn: () => fetchUser(id!),
        enabled: !!id && can("users", "read"),
    });

    const toggleActive = useMutation({
        mutationFn: (active: boolean) => api.patch(`/users/${id}/${active ? "activate" : "deactivate"}`),
        onSuccess: (_, active) => {
            qc.invalidateQueries({ queryKey: ["user", id] });
            toast.success(`User ${active ? "activated" : "deactivated"}`);
        },
    });

    if (!can("users", "read")) return <AccessDenied />;
    if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-[#5513a1] dark:text-[#8e44ad]" /></div>;
    if (error || !user) return <div className="text-center py-20 text-muted-foreground">User not found</div>;

    const fullName = `${user.firstName} ${user.lastName}`;
    const initials = `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();

    return (
        <div className="max-w-4xl mx-auto space-y-6 text-foreground transition-colors duration-200">
            {/* Back + header */}
            <div className="flex items-center gap-3">
                <Button variant="outline" size="icon" className="h-10 w-10 border-border/80 bg-background hover:bg-muted dark:hover:bg-purple-950/20 dark:hover:text-purple-400 transition-all rounded-xl mt-0.5" onClick={() => navigate("/dashboard/users")}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#5513a1] dark:text-[#8e44ad] flex items-center gap-3">{fullName}</h1>
                    <p className="text-muted-foreground text-sm mt-0.5">User Profile &amp; Details</p>
                </div>
                <PermissionGate resource="users" action="manage">
                    <Button
                        variant={user.isActive ? "outline" : "default"}
                        size="sm"
                        className={`gap-2 h-9 ${user.isActive ? "text-destructive border-destructive/30 hover:bg-destructive/10" : ""}`}
                        onClick={() => toggleActive.mutate(!user.isActive)}
                        disabled={toggleActive.isPending}
                    >
                        {toggleActive.isPending
                            ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            : user.isActive ? <><UserX className="h-3.5 w-3.5" /> Deactivate</> : <><UserCheck className="h-3.5 w-3.5" /> Activate</>}
                    </Button>
                </PermissionGate>
            </div>

            <div className="grid gap-5 lg:grid-cols-3">
                {/* Profile card */}
                <Card className="border-border/60 shadow-md bg-card dark:bg-zinc-900/20 rounded-2xl lg:col-span-1">
                    <CardContent className="pt-6 lg:pt-8 flex flex-col items-center text-center gap-4">
                        <Avatar className="h-20 w-20">
                            <AvatarFallback className="bg-gradient-to-br from-[#5513a1] to-[#3a0d6e] text-[#ffffff] dark:text-[#8e44ad]-foreground text-2xl ring-2 ring-orange-600 font-bold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <h2 className="text-lg font-bold">{fullName}</h2>
                            <p className="text-sm text-muted-foreground">{user.email}</p>
                        </div>
                        <Badge
                            variant={user.isActive ? "default" : "outline"}
                            className={`${user.isActive ? "bg-emerald-500/10 dark:bg-emerald-400/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" : "text-muted-foreground"}`}
                        >
                            {user.isActive ? <><CheckCircle2 className="h-3 w-3 mr-1" /> Active</> : <><XCircle className="h-3 w-3 mr-1" /> Inactive</>}
                        </Badge>

                        <Separator className="w-full" />

                        <div className="w-full space-y-3 text-left">
                            <InfoRow icon={User} label="ERP User ID" value={<code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{user.userId}</code>} />
                            <InfoRow icon={Mail} label="Email" value={user.email} />
                            <InfoRow icon={Clock} label="Last Login" value={user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : "Never"} />
                            <InfoRow icon={Calendar} label="Member Since" value={new Date(user.createdAt).toLocaleDateString()} />
                        </div>
                    </CardContent>
                </Card>

                {/* Right column */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Roles */}
                    <Card className="border-border/60 shadow-md bg-card dark:bg-zinc-900/20 rounded-2xl">
                        <CardHeader className="py-4 lg:py-5 px-6 border-b border-border/60 bg-muted/20 dark:bg-zinc-900/40">
                            <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                <Shield className="h-4 w-4 text-[#5513a1] dark:text-[#8e44ad]" /> Assigned Roles
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="p-6 pt-5">
                            {(user.Roles ?? []).length === 0 ? (
                                <p className="text-sm text-muted-foreground">No roles assigned</p>
                            ) : (
                                <div className="flex flex-wrap gap-2">
                                    {(user.Roles ?? []).map(r => (
                                        <div key={r.id} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#5513a1]/20 dark:border-[#8e44ad]/20 bg-[#5513a1]/5 dark:bg-[#5513a1]/10">
                                            <Shield className="h-3.5 w-3.5 text-[#5513a1] dark:text-[#8e44ad]" />
                                            <span className="text-sm font-medium capitalize">{r.name.replace(/_/g, " ")}</span>
                                            {r.isActive
                                                ? <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                                : <XCircle className="h-3.5 w-3.5 text-muted-foreground" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Teacher Profile */}
                    {user.teacherProfile && (
                        <Card className="border-border/60 shadow-md bg-card dark:bg-zinc-900/20 rounded-2xl">
                            <CardHeader className="py-4 lg:py-5 px-6 border-b border-border/60 bg-muted/20 dark:bg-zinc-900/40">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <BookOpen className="h-4 w-4 text-[#5513a1] dark:text-[#8e44ad]" /> Teacher Profile
                                    <Button size="sm" variant="ghost" className="ml-auto h-7 text-xs gap-1"
                                        onClick={() => navigate(`/dashboard/teachers/${user.teacherProfile!.id}`)}>
                                        <Edit2 className="h-3 w-3" /> View
                                    </Button>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-5 grid grid-cols-2 gap-3">
                                <InfoRow icon={BookOpen} label="Teacher ID" value={<code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{user.teacherProfile.teacherId}</code>} />
                                <InfoRow icon={BookOpen} label="Department" value={user.teacherProfile.department ?? "—"} />
                                <InfoRow icon={BookOpen} label="Designation" value={user.teacherProfile.designation ?? "—"} />
                                <InfoRow icon={BookOpen} label="Employee No." value={user.teacherProfile.employeeNumber ?? "—"} />
                                <InfoRow icon={Calendar} label="Joining Date" value={user.teacherProfile.joiningDate ? new Date(user.teacherProfile.joiningDate).toLocaleDateString() : "—"} />
                                <InfoRow icon={BookOpen} label="Qualification" value={user.teacherProfile.qualification ?? "—"} />
                                {user.teacherProfile.subjects.length > 0 && (
                                    <div className="col-span-2">
                                        <p className="text-xs text-muted-foreground mb-1.5">Subjects</p>
                                        <div className="flex flex-wrap gap-1.5">
                                            {user.teacherProfile.subjects.map(s => (
                                                <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    )}

                    {/* Student Profile */}
                    {user.studentProfile && (
                        <Card className="border-border/60 shadow-md bg-card dark:bg-zinc-900/20 rounded-2xl">
                            <CardHeader className="py-4 lg:py-5 px-6 border-b border-border/60 bg-muted/20 dark:bg-zinc-900/40">
                                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                                    <GraduationCap className="h-4 w-4 text-[#5513a1] dark:text-[#8e44ad]" /> Student Profile
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="p-6 pt-5 grid grid-cols-2 gap-3">
                                <InfoRow icon={GraduationCap} label="Student ID" value={<code className="font-mono text-xs bg-secondary px-1.5 py-0.5 rounded">{user.studentProfile.studentId}</code>} />
                                <InfoRow icon={GraduationCap} label="Grade" value={user.studentProfile.grade ?? "—"} />
                                <InfoRow icon={GraduationCap} label="Section" value={user.studentProfile.section ?? "—"} />
                                <InfoRow icon={GraduationCap} label="Enrollment No" value={user.studentProfile.enrollmentNumber ?? "—"} />
                                <InfoRow icon={GraduationCap} label="Guardian" value={user.studentProfile.guardianName ?? "—"} />
                                <InfoRow icon={GraduationCap} label="Guardian Phone" value={user.studentProfile.guardianPhone ?? "—"} />
                            </CardContent>
                        </Card>
                    )}

                    {/* No profiles */}
                    {!user.teacherProfile && !user.studentProfile && (
                        <Card className="border-border/60 shadow-md bg-card dark:bg-zinc-900/20 rounded-2xl border-dashed">
                            <CardContent className="py-8 text-center text-muted-foreground">
                                <User className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p className="text-sm">No linked profile (admin user)</p>
                            </CardContent>
                        </Card>
                    )}
                </div>
            </div>
        </div>
    );
}

function InfoRow({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: React.ReactNode }) {
    return (
        <div className="flex items-start gap-2">
            <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="min-w-0">
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</p>
                <div className="text-sm font-medium text-foreground">{value}</div>
            </div>
        </div>
    );
}
