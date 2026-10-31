import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ArrowLeft, BookOpen, Mail, Phone, Calendar,
    Clock, Briefcase, GraduationCap, Loader2,
    Edit2, UserCheck, UserX, Hash, Landmark, MapPin, CheckCircle2, DollarSign,
    Lock, Crown, Layers, CalendarCheck
} from "lucide-react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
    Dialog, DialogContent,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import type { Teacher } from "@/types/erp";
import { TeacherForm, type TeacherFormValues } from "@/components/teachers/TeacherForm";
import { SectionCard, DetailRow } from "@/components/shared/DetailCards";
import { ProfilePageSkeleton } from "@/components/common/skeletons/ProfilePageSkeleton";
import { TeacherProfileLeaveWidget } from "@/components/leaves/TeacherProfileLeaveWidget";
import { TeacherWorkloadWidget } from "@/features/teachers/components/TeacherWorkloadWidget";

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
        mutationFn: async ({ values, subjects, photoFile }: { values: TeacherFormValues; subjects: string[]; photoFile?: File }) => {
            const formData = new FormData();
            Object.entries(values).forEach(([key, val]) => {
                if (val !== undefined && val !== null && val !== '') {
                    formData.append(key, String(val));
                }
            });
            formData.append("subjects", JSON.stringify(subjects));
            if (photoFile) {
                formData.append("profilePhoto", photoFile);
            }
            return api.put(`/teachers/${teacher?.id}`, formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
        },
        onSuccess: () => {
            toast.success("Teacher profile updated successfully");
            qc.invalidateQueries({ queryKey: ["teacher", id] });
            qc.invalidateQueries({ queryKey: ["teachers"] });
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
    const photoUrl = teacher.profilePhotoUrl
        ? (teacher.profilePhotoUrl.startsWith('http') ? teacher.profilePhotoUrl : `${api.defaults.baseURL?.replace('/api', '')}${teacher.profilePhotoUrl}`)
        : undefined;

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
                <div className="h-2 w-full bg-gradient-to-r from-purple-600 via-indigo-600 to-primary" />

                <CardContent className="p-6 relative backdrop-blur-sm bg-card/50">
                    <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">

                        {/* ── Profile photo ── */}
                        <div className="relative shrink-0">
                            <div className="h-28 w-28 rounded-2xl border-4 border-background shadow-md overflow-hidden bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
                                <Avatar className="h-full w-full rounded-2xl">
                                    <AvatarImage src={photoUrl} className="object-cover" />
                                    <AvatarFallback className="bg-transparent text-primary text-3xl font-black">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                            </div>
                            {/* Online-style status dot */}
                            <span className={`absolute bottom-1 right-1 h-4 w-4 rounded-full border-2 border-background shadow-sm
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
                                    {account.isActive ? "Active Faculty" : "Inactive"}
                                </Badge>
                                {(account.Roles ?? []).map(r => (
                                    <Badge key={r.id} variant="outline" className="text-[10px] uppercase tracking-wider bg-purple-500/10 text-purple-700 dark:text-purple-300 border-purple-500/20 px-2 py-0.5 rounded-lg">
                                        {r.name.replace(/_/g, " ")}
                                    </Badge>
                                ))}
                            </div>

                            {/* ERP User ID chips */}
                            <div className="flex flex-wrap items-center gap-2">
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20">
                                    <Hash className="h-3 w-3 text-purple-600" />
                                    <span className="text-xs font-mono font-bold text-purple-600 dark:text-purple-400">
                                        {teacher.teacherId}
                                    </span>
                                </div>
                                {teacher.employeeNumber && (
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted border border-border">
                                        <Briefcase className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs font-mono font-medium text-foreground">
                                            {teacher.employeeNumber}
                                        </span>
                                    </div>
                                )}
                                {(teacher.headedDepartments ?? []).map(dept => (
                                    <div key={dept.id} className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300">
                                        <Crown className="h-3 w-3 text-amber-600 dark:text-amber-400" />
                                        <span className="text-xs font-semibold">
                                            Incharge: {dept.name}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Secondary meta row */}
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {account.email}
                                </span>
                                {(teacher.phone || account.phone) && (
                                    <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                        <Phone className="h-3 w-3" />
                                        {teacher.phone || account.phone}
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
                                    className="gap-2 h-10 px-5 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white rounded-xl font-semibold shadow-md
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

                {/* ── 1. Professional & Employment Details ──────────────────── */}
                <div className="lg:col-span-2 space-y-5">
                    {/* Assigned Classrooms (Class Teacher) & Incharge Sections */}
                    <SectionCard title="Classroom & Department Allocations" icon={Layers} accent="primary">
                        <div className="space-y-4">
                            {/* Class Teacher Allocation */}
                            <div>
                                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                    <GraduationCap className="h-3.5 w-3.5 text-primary" />
                                    Class Teacher Assignments
                                </h4>
                                {(teacher.classrooms ?? []).length === 0 ? (
                                    <p className="text-xs text-muted-foreground bg-muted/30 rounded-xl p-3 border border-border/40">
                                        Not currently assigned as Class Teacher for any section.
                                    </p>
                                ) : (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {teacher.classrooms?.map(c => (
                                            <div key={c.id} className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                                                <div>
                                                    <p className="font-semibold text-sm text-foreground">{c.name} - Section {c.section}</p>
                                                    <p className="text-xs text-muted-foreground">Academic Year: {c.academicYear} {c.roomNumber ? `• Room: ${c.roomNumber}` : ''}</p>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] bg-primary/10 text-primary border-primary/20">
                                                    Class Teacher
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Department Incharge Allocation */}
                            {(teacher.headedDepartments ?? []).length > 0 && (
                                <div className="pt-2 border-t border-border/40">
                                    <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                                        Department Incharge Leadership
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {teacher.headedDepartments?.map(dept => (
                                            <div key={dept.id} className="flex items-center justify-between p-3 rounded-xl border border-amber-500/20 bg-amber-500/5">
                                                <div>
                                                    <p className="font-semibold text-sm text-amber-800 dark:text-amber-200">{dept.name}</p>
                                                    <p className="text-xs text-muted-foreground">Designated Head of Department</p>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30">
                                                    Incharge
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Quick Module Links */}
                            <div className="pt-2 border-t border-border/40 flex flex-wrap gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs rounded-lg gap-1.5"
                                    onClick={() => navigate('/dashboard/attendance')}
                                >
                                    <CalendarCheck className="h-3.5 w-3.5 text-emerald-600" />
                                    Teacher Attendance Record
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs rounded-lg gap-1.5"
                                    onClick={() => navigate('/dashboard/leaves/my')}
                                >
                                    <Calendar className="h-3.5 w-3.5 text-indigo-600" />
                                    Leave Applications & Balances
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs rounded-lg gap-1.5"
                                    onClick={() => navigate('/dashboard/timetable')}
                                >
                                    <Clock className="h-3.5 w-3.5 text-purple-600" />
                                    Timetable Schedule
                                </Button>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 text-xs rounded-lg gap-1.5"
                                    onClick={() => navigate('/dashboard/salary')}
                                >
                                    <DollarSign className="h-3.5 w-3.5 text-amber-600" />
                                    Salary Slips
                                </Button>
                            </div>
                        </div>
                    </SectionCard>

                    {/* Teacher Workload Analytics Widget */}
                    <TeacherWorkloadWidget teacherId={teacher.id} />

                    {/* Teacher Leave Allocations Widget */}
                    <TeacherProfileLeaveWidget teacherId={teacher.id} />

                    {/* Professional Details */}
                    <SectionCard title="Professional Details" icon={Briefcase} accent="primary">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <DetailRow icon={Briefcase} label="Designation" value={teacher.designationName || teacher.designation} />
                            <DetailRow icon={Hash} label="Employee Number" value={teacher.employeeNumber} mono />
                            <DetailRow icon={GraduationCap} label="Qualification" value={teacher.qualification} />
                            <DetailRow icon={Briefcase} label="Employment Type" value={teacher.employmentType ? teacher.employmentType.replace(/_/g, " ").toUpperCase() : undefined} />
                            <DetailRow icon={Calendar} label="Joining Date" value={teacher.joiningDate ? new Date(teacher.joiningDate).toLocaleDateString() : undefined} />
                            <DetailRow icon={Calendar} label="Added On" value={new Date(teacher.createdAt).toLocaleDateString()} />
                        </div>
                    </SectionCard>

                    {/* Government & Banking verification - RBAC Gated */}
                    <SectionCard title="Identity & Banking Verification" icon={Landmark} accent="primary">
                        {teacher.canViewSensitive === false ? (
                            <div className="flex flex-col items-center justify-center p-6 text-center border border-dashed border-border/60 rounded-xl bg-muted/20">
                                <Lock className="h-8 w-8 text-muted-foreground/50 mb-2" />
                                <p className="text-sm font-semibold text-foreground">Sensitive Banking & Identity Details Protected</p>
                                <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                                    Bank account credentials and government identity identifiers are restricted to authorized HR & administrative roles.
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                                <DetailRow icon={CheckCircle2} label="Aadhaar Card" value={teacher.aadhaarNo ? `•••• •••• ${teacher.aadhaarNo.slice(-4)}` : undefined} mono />
                                <DetailRow icon={CheckCircle2} label="PAN Card Number" value={teacher.panNo} mono />
                                <DetailRow icon={Landmark} label="Bank Name" value={teacher.bankName} />
                                <DetailRow icon={Landmark} label="Account Holder" value={teacher.accountHolderName} />
                                <DetailRow icon={Hash} label="Account Number" value={teacher.accountNumber ? `•••• •••• ${teacher.accountNumber.slice(-4)}` : undefined} mono />
                                <DetailRow icon={Landmark} label="IFSC Code" value={teacher.ifscCode} mono />
                                <DetailRow icon={Landmark} label="Branch" value={teacher.bankBranch} />
                            </div>
                        )}
                    </SectionCard>

                    {/* Contact & Address */}
                    <SectionCard title="Residential & Contact Details" icon={MapPin} accent="primary">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <DetailRow icon={MapPin} label="Current Address" value={teacher.currentAddress} />
                            <DetailRow icon={MapPin} label="Permanent Address" value={teacher.permanentAddress} />
                            <DetailRow icon={Phone} label="Emergency Contact Person" value={teacher.emergencyContactName} />
                            <DetailRow icon={Phone} label="Emergency Phone" value={teacher.emergencyContactPhone} />
                        </div>
                    </SectionCard>
                </div>

                {/* ── 2. Subjects, Compensation & System Account ────────────── */}
                <div className="lg:col-span-1 space-y-5">

                    {/* Subjects */}
                    <SectionCard title="Allocated Subjects & Teaching Map" icon={BookOpen} accent="primary">
                        <div className="flex justify-end mb-2 -mt-10 relative z-10">
                            <Badge variant="secondary" className="text-xs bg-muted/60">
                                {(teacher.assignedSubjects?.length ?? 0) > 0 ? teacher.assignedSubjects?.length : teacher.subjects.length}
                            </Badge>
                        </div>

                        {/* If classroom subject mappings exist */}
                        {(teacher.assignedSubjects ?? []).length > 0 ? (
                            <div className="space-y-2 pt-2">
                                {teacher.assignedSubjects?.map((item) => (
                                    <div key={item.id} className="p-2.5 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold text-xs text-foreground">{item.subject?.name ?? 'Subject'}</p>
                                            <p className="text-[11px] text-muted-foreground">{item.classroom?.name} - {item.classroom?.section}</p>
                                        </div>
                                        <Badge variant="secondary" className="text-[10px] bg-purple-500/10 text-purple-700 dark:text-purple-300">
                                            {item.subject?.code ?? 'Mapped'}
                                        </Badge>
                                    </div>
                                ))}
                            </div>
                        ) : teacher.subjects.length === 0 ? (
                            <p className="text-sm text-muted-foreground py-2">No subjects assigned</p>
                        ) : (
                            <div className="flex flex-wrap gap-1.5 pt-2">
                                {teacher.subjects.map(s => (
                                    <Badge key={s} variant="secondary" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-transparent px-2.5 py-0.5 rounded-md">
                                        {s}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </SectionCard>

                    {/* Compensation & Working Terms */}
                    <SectionCard title="Compensation & Leave" icon={DollarSign} accent="primary">
                        <div className="pt-2 space-y-1">
                            <DetailRow icon={DollarSign} label="Salary Type" value={teacher.salaryType?.replace('_', ' ').toUpperCase()} />
                            <DetailRow icon={DollarSign} label="Monthly Salary" value={teacher.fixedMonthlySalary ? `₹${Number(teacher.fixedMonthlySalary).toLocaleString('en-IN')}` : undefined} />
                            <DetailRow icon={Clock} label="Daily Working Hours" value={teacher.dailyWorkingHours ? `${teacher.dailyWorkingHours} hrs` : undefined} />
                            <DetailRow icon={Calendar} label="Casual Leave Balance" value={teacher.casualLeaveBalance !== undefined ? `${teacher.casualLeaveBalance} days` : undefined} />
                            <DetailRow icon={Calendar} label="Sick Leave Balance" value={teacher.sickLeaveBalance !== undefined ? `${teacher.sickLeaveBalance} days` : undefined} />
                        </div>
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
                    <DialogContent className="max-w-2xl md:max-w-4xl flex flex-col p-0 overflow-hidden shadow-2xl rounded-2xl border-border/80">
                        <TeacherForm
                            isEditMode
                            initialData={{
                                userId: teacher.account.userId,
                                email: teacher.account.email,
                                password: "",
                                firstName: teacher.account.firstName,
                                lastName: teacher.account.lastName,
                                gender: teacher.account.gender || undefined,
                                dob: teacher.account.dob || "",
                                phone: teacher.phone || teacher.account.phone || "",
                                isActive: teacher.account.isActive,
                                employeeNumber: teacher.employeeNumber ?? "",
                                teacherId: teacher.teacherId,
                                department: teacher.department ?? "none",
                                designation: teacher.designation ?? "",
                                employmentType: teacher.employmentType || "full_time",
                                qualification: teacher.qualification ?? "",
                                joiningDate: teacher.joiningDate ?? "",
                                dailyWorkingHours: teacher.dailyWorkingHours !== undefined && teacher.dailyWorkingHours !== null ? String(teacher.dailyWorkingHours) : "8",
                                salaryType: teacher.salaryType || "fixed_monthly",
                                fixedMonthlySalary: teacher.fixedMonthlySalary !== undefined && teacher.fixedMonthlySalary !== null ? String(teacher.fixedMonthlySalary) : "",
                                hourlyRate: teacher.hourlyRate !== undefined && teacher.hourlyRate !== null ? String(teacher.hourlyRate) : "",
                                casualLeaveBalance: teacher.casualLeaveBalance !== undefined && teacher.casualLeaveBalance !== null ? String(teacher.casualLeaveBalance) : "12",
                                sickLeaveBalance: teacher.sickLeaveBalance !== undefined && teacher.sickLeaveBalance !== null ? String(teacher.sickLeaveBalance) : "10",
                                aadhaarNo: teacher.aadhaarNo || "",
                                panNo: teacher.panNo || "",
                                accountHolderName: teacher.accountHolderName || "",
                                bankName: teacher.bankName || "",
                                accountNumber: teacher.accountNumber || "",
                                ifscCode: teacher.ifscCode || "",
                                bankBranch: teacher.bankBranch || "",
                                currentAddress: teacher.currentAddress || "",
                                permanentAddress: teacher.permanentAddress || "",
                                emergencyContactName: teacher.emergencyContactName || "",
                                emergencyContactPhone: teacher.emergencyContactPhone || "",
                                profilePhotoUrl: teacher.profilePhotoUrl || "",
                            }}
                            initialSubjects={teacher.subjects ?? []}
                            onSubmit={(values, subjects, photoFile) => {
                                updateTeacher.mutate({ values, subjects, photoFile });
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

