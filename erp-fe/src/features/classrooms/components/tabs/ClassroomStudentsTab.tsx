import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Search, Trash2, Loader2, Users, Crown,
    UserPlus, Check, X, UserCheck, Hash, ArrowRightLeft,
    MoreVertical, GraduationCap
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import api from "@/lib/api";
import { fetchAllStudents } from "@/features/classrooms/api/classroomApi";
import type { Classroom, ClassroomEnrollment } from "@/types/erp";
import { AssignMonitorsDialog } from "@/features/classrooms/components/directory/AssignMonitorsDialog";
import { AutoAssignRollNumbersDialog } from "@/features/classrooms/components/directory/AutoAssignRollNumbersDialog";
import { TransferSectionDialog } from "@/features/classrooms/components/directory/TransferSectionDialog";
import { EditRollNumberDialog } from "@/features/classrooms/components/directory/EditRollNumberDialog";
import { SingleStudentPromotionDialog } from "@/features/classrooms/components/directory/SingleStudentPromotionDialog";
import PermissionGate from "@/components/auth/PermissionGate";
import { PERMISSIONS } from "@/constants/permissions";

export interface ClassroomStudentsTabProps {
    classroomId: string;
    classroomName?: string;
    enrollments: ClassroomEnrollment[];
    canEdit: boolean;
    onRefresh: () => void;
    monitorMaleId?: string;
    monitorFemaleId?: string;
    maleMonitor?: Classroom["maleMonitor"];
    femaleMonitor?: Classroom["femaleMonitor"];
}

type RosterFilter = "all" | "monitors" | "male" | "female";

export function ClassroomStudentsTab({
    classroomId,
    classroomName,
    enrollments,
    canEdit,
    onRefresh,
    monitorMaleId,
    monitorFemaleId,
    maleMonitor,
    femaleMonitor,
}: ClassroomStudentsTabProps) {
    const navigate = useNavigate();
    const [rosterSearch, setRosterSearch] = useState("");
    const [activeFilter, setActiveFilter] = useState<RosterFilter>("all");
    const [assignOpen, setAssignOpen] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [removeId, setRemoveId] = useState<string | null>(null);
    const [monitorsDialogOpen, setMonitorsDialogOpen] = useState(false);
    const [autoAssignOpen, setAutoAssignOpen] = useState(false);
    const [transferEnrollment, setTransferEnrollment] = useState<ClassroomEnrollment | null>(null);
    const [editRollEnrollment, setEditRollEnrollment] = useState<ClassroomEnrollment | null>(null);
    const [promotionEnrollment, setPromotionEnrollment] = useState<ClassroomEnrollment | null>(null);

    // Resolve real monitors
    const monitor1Student = enrollments.find(e => e.student?.id === monitorMaleId)?.student || maleMonitor;
    const monitor2Student = enrollments.find(e => e.student?.id === monitorFemaleId)?.student || femaleMonitor;

    const appointedMonitors = useMemo(() => {
        const list = [];
        if (monitor1Student) {
            list.push({ student: monitor1Student, label: "Monitor 1", isPrimary: true });
        }
        if (monitor2Student && monitor2Student.id !== monitor1Student?.id) {
            list.push({ student: monitor2Student, label: "Monitor 2", isPrimary: false });
        }
        return list;
    }, [monitor1Student, monitor2Student]);

    const enrolledIds = useMemo(() => new Set(enrollments.map(e => e.student?.id).filter(Boolean)), [enrollments]);

    const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
        queryKey: ["students-all", studentSearch],
        queryFn: () => fetchAllStudents(studentSearch),
        enabled: assignOpen,
        staleTime: 30_000,
    });

    const availableStudents = useMemo(
        () => allStudents.filter(s => !enrolledIds.has(s.id)),
        [allStudents, enrolledIds]
    );

    const assignMutation = useMutation({
        mutationFn: (studentIds: string[]) =>
            api.post(`/classrooms/${classroomId}/students`, { studentIds }),
        onSuccess: () => {
            toast.success(`${selected.size} student(s) successfully enrolled`);
            setSelected(new Set());
            setAssignOpen(false);
            onRefresh();
        },
        onError: (err: any) => {
            const msg = err?.response?.data?.message;
            const valMsg = err?.response?.data?.errors?.[0]?.msg;
            toast.error(valMsg || msg || err?.message || "Failed to assign students");
        },
    });

    const removeMutation = useMutation({
        mutationFn: (studentId: string) =>
            api.delete(`/classrooms/${classroomId}/students/${studentId}`),
        onSuccess: () => {
            toast.success("Student unassigned from classroom");
            setRemoveId(null);
            onRefresh();
        },
        onError: () => toast.error("Failed to unassign student"),
    });

    const filteredEnrollments = useMemo(() => {
        return enrollments.filter(e => {
            // 1. Text Search Filter
            if (rosterSearch.trim()) {
                const q = rosterSearch.toLowerCase().trim();
                const acc = e.student?.account;
                const firstName = acc?.firstName || "";
                const lastName = acc?.lastName || "";
                const email = acc?.email || "";
                const studentId = e.student?.studentId || "";
                const adm = e.student?.admissionNumber || "";
                const matches = (
                    firstName.toLowerCase().includes(q) ||
                    lastName.toLowerCase().includes(q) ||
                    email.toLowerCase().includes(q) ||
                    studentId.toLowerCase().includes(q) ||
                    adm.toLowerCase().includes(q)
                );
                if (!matches) return false;
            }

            // 2. Chip Filter
            if (activeFilter === "monitors") {
                return e.student?.id === monitorMaleId || e.student?.id === monitorFemaleId;
            }
            if (activeFilter === "male") {
                const g = e.student?.gender?.toLowerCase();
                return g === "male" || g === "m";
            }
            if (activeFilter === "female") {
                const g = e.student?.gender?.toLowerCase();
                return g === "female" || g === "f";
            }

            return true;
        });
    }, [enrollments, rosterSearch, activeFilter, monitorMaleId, monitorFemaleId]);

    const toggleStudent = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* ── 1. Royal Class Monitors Showcase Ribbon ─────────────────────────── */}
            <div className="relative rounded-xl sm:rounded-2xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/[0.03] to-transparent p-3.5 sm:p-5 shadow-2xs overflow-hidden">
                <Crown className="absolute -right-4 -bottom-4 w-28 sm:w-32 h-28 sm:h-32 text-amber-500/[0.04] pointer-events-none" />

                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex items-start gap-2.5 sm:gap-3.5">
                        <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-lg sm:rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
                            <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-amber-500" />
                        </div>
                        <div>
                            <div className="flex items-center gap-1.5 sm:gap-2">
                                <h4 className="text-xs sm:text-sm font-black text-foreground">
                                    Appointed Class Monitors
                                </h4>
                                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] sm:text-[10px] font-bold py-0 px-1.5">
                                    {appointedMonitors.length} / 2 Leaders
                                </Badge>
                            </div>
                            <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 max-w-lg line-clamp-1 sm:line-clamp-none">
                                Student leaders representing the class council and assisting the teacher with discipline and coordination.
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 self-start md:self-center flex-wrap">
                        {appointedMonitors.length > 0 ? (
                            <>
                                {appointedMonitors.map(({ student, label, isPrimary }) => {
                                    const name = student.account
                                        ? `${student.account.firstName} ${student.account.lastName}`
                                        : `Student #${student.studentId}`;
                                    const id = student.admissionNumber || student.studentId;
                                    return (
                                        <div
                                            key={student.id}
                                            className="flex items-center gap-1.5 sm:gap-2 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg sm:rounded-xl border border-border/80 bg-background shadow-2xs"
                                        >
                                            <Avatar className="w-5 h-5 sm:w-6 sm:h-6 border border-border">
                                                <AvatarFallback className="text-[9px] sm:text-[10px] font-bold bg-amber-500/10 text-amber-600">
                                                    {student.account?.firstName?.[0] || "M"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="text-left">
                                                <div className="flex items-center gap-1">
                                                    <span className="text-[11px] sm:text-xs font-bold text-foreground truncate max-w-[100px] sm:max-w-[130px]">{name}</span>
                                                    <Badge
                                                        variant="outline"
                                                        className={cn(
                                                            "text-[8px] sm:text-[9px] py-0 px-1 font-bold",
                                                            isPrimary
                                                                ? "border-amber-500/30 text-amber-600 bg-amber-500/10"
                                                                : "border-blue-500/30 text-blue-600 bg-blue-500/10"
                                                        )}
                                                    >
                                                        {label}
                                                    </Badge>
                                                </div>
                                                <p className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">ID: {id}</p>
                                            </div>
                                        </div>
                                    );
                                })}

                                {canEdit && (
                                    <PermissionGate permission={PERMISSIONS.CLASSROOMS.UPDATE}>
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => setMonitorsDialogOpen(true)}
                                            className="h-7 sm:h-8 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl border-amber-500/40 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                                        >
                                            Edit Leaders
                                        </Button>
                                    </PermissionGate>
                                )}
                            </>
                        ) : (
                            canEdit && (
                                <PermissionGate permission={PERMISSIONS.CLASSROOMS.UPDATE}>
                                    <Button
                                        size="sm"
                                        onClick={() => setMonitorsDialogOpen(true)}
                                        className="h-7 sm:h-8 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl bg-amber-600 hover:bg-amber-700 text-white shadow-xs gap-1.5"
                                    >
                                        <Crown className="w-3.5 h-3.5" /> Appoint 2 Monitors
                                    </Button>
                                </PermissionGate>
                            )
                        )}
                    </div>
                </div>
            </div>

            {/* ── 2. Interactive Roster Toolbar & Quick Filter Chips ───────────────── */}
            <div className="flex flex-col gap-2.5 sm:gap-3">
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 sm:gap-3">
                    <div className="relative flex-1 max-w-full sm:max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search students by name, email, or admission ID…"
                            value={rosterSearch}
                            onChange={(e) => setRosterSearch(e.target.value)}
                            className="pl-9 pr-8 h-8 sm:h-9 text-xs rounded-lg sm:rounded-xl"
                        />
                        {rosterSearch && (
                            <button
                                type="button"
                                onClick={() => setRosterSearch("")}
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-auto shrink-0 w-full sm:w-auto justify-end">
                        {canEdit && (
                            <>
                                <PermissionGate permission={PERMISSIONS.CLASSROOMS.UPDATE}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setAutoAssignOpen(true)}
                                        className="h-8 sm:h-9 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl gap-1 sm:gap-1.5 border-border/80 hover:bg-muted"
                                        title="Auto-Assign Roll Numbers"
                                    >
                                        <Hash className="h-3.5 w-3.5 text-primary" />
                                        Roll Numbers
                                    </Button>
                                </PermissionGate>

                                <PermissionGate permission={PERMISSIONS.CLASSROOMS.UPDATE}>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setMonitorsDialogOpen(true)}
                                        className="h-8 sm:h-9 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl gap-1 sm:gap-1.5 border-border/80 hover:bg-muted"
                                    >
                                        <Crown className="h-3.5 w-3.5 text-amber-500" />
                                        Monitors
                                    </Button>
                                </PermissionGate>

                                <PermissionGate permission={PERMISSIONS.CLASSROOMS.UPDATE}>
                                    <Button
                                        size="sm"
                                        onClick={() => setAssignOpen(true)}
                                        className="h-8 sm:h-9 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl gap-1 sm:gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                    >
                                        <UserPlus className="h-3.5 w-3.5" />
                                        Assign Students
                                    </Button>
                                </PermissionGate>
                            </>
                        )}
                    </div>
                </div>

                {/* Quick Filter Pills (Horizontally Scrollable on Mobile) */}
                <div className="flex items-center gap-1 overflow-x-auto pb-1 sm:pb-0 scrollbar-none w-full">
                    <Button
                        variant={activeFilter === "all" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveFilter("all")}
                        className="h-7 sm:h-8 text-[11px] sm:text-xs font-semibold rounded-lg px-2 sm:px-2.5 shrink-0 whitespace-nowrap"
                    >
                        All ({enrollments.length})
                    </Button>
                    <Button
                        variant={activeFilter === "monitors" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveFilter("monitors")}
                        className="h-7 sm:h-8 text-[11px] sm:text-xs font-semibold rounded-lg px-2 sm:px-2.5 gap-1 shrink-0 whitespace-nowrap"
                    >
                        <Crown className="w-3 h-3 text-amber-500" /> Monitors ({appointedMonitors.length})
                    </Button>
                    <Button
                        variant={activeFilter === "male" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveFilter("male")}
                        className="h-7 sm:h-8 text-[11px] sm:text-xs font-semibold rounded-lg px-2 sm:px-2.5 shrink-0 whitespace-nowrap"
                    >
                        Boys
                    </Button>
                    <Button
                        variant={activeFilter === "female" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setActiveFilter("female")}
                        className="h-7 sm:h-8 text-[11px] sm:text-xs font-semibold rounded-lg px-2 sm:px-2.5 shrink-0 whitespace-nowrap"
                    >
                        Girls
                    </Button>
                </div>
            </div>

            {/* ── 3. Student Roster Table & Mobile Card View ───────────────────────── */}
            {filteredEnrollments.length === 0 ? (
                <div className="py-16 px-4 text-center rounded-2xl border-2 border-dashed border-border/70 bg-card flex flex-col items-center justify-center gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center">
                        <Users className="h-7 w-7" />
                    </div>
                    {rosterSearch || activeFilter !== "all" ? (
                        <>
                            <p className="text-base font-bold text-foreground">No Matching Students Found</p>
                            <p className="text-xs text-muted-foreground max-w-sm">
                                No student records matched your current search and filter combination.
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    setRosterSearch("");
                                    setActiveFilter("all");
                                }}
                                className="mt-1 text-xs font-bold rounded-xl"
                            >
                                Reset All Filters
                            </Button>
                        </>
                    ) : (
                        <>
                            <p className="text-base font-bold text-foreground">No Students Enrolled in this Section</p>
                            <p className="text-xs text-muted-foreground max-w-sm">
                                This section is empty. Assign enrolled students to start taking daily attendance, publishing assignments, and building gradebooks.
                            </p>
                            {canEdit && (
                                <Button
                                    size="sm"
                                    onClick={() => setAssignOpen(true)}
                                    className="mt-2 text-xs font-bold rounded-xl gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                                >
                                    <UserPlus className="h-4 w-4" /> Assign Students Now
                                </Button>
                            )}
                        </>
                    )}
                </div>
            ) : (
                <>
                    {/* Desktop Table View */}
                    <div className="hidden md:block rounded-2xl border border-border/80 bg-card overflow-hidden shadow-2xs">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/80">
                                    <TableHead className="w-[10%] text-xs font-bold pl-5">Roll No</TableHead>
                                    <TableHead className="w-[30%] text-xs font-bold">Student</TableHead>
                                    <TableHead className="w-[18%] text-xs font-bold">Admission / ID</TableHead>
                                    <TableHead className="w-[12%] text-xs font-bold">Gender</TableHead>
                                    <TableHead className="w-[15%] text-xs font-bold">Enrollment Status</TableHead>
                                    {canEdit && <TableHead className="w-[15%] text-right text-xs font-bold pr-5">Actions</TableHead>}
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredEnrollments.map((enr, i) => {
                                    const acc = enr.student?.account;
                                    const firstName = acc?.firstName || "Unknown";
                                    const lastName = acc?.lastName || "Student";
                                    const fullName = `${firstName} ${lastName}`;
                                    const admNo = enr.student?.admissionNumber || enr.student?.studentId || "—";
                                    const gender = enr.student?.gender || "—";
                                    const isM1 = enr.student?.id === monitorMaleId;
                                    const isM2 = enr.student?.id === monitorFemaleId;
                                    const isActive = enr.student?.status === "ACTIVE" || (acc?.isActive !== false);

                                    return (
                                         <TableRow
                                             key={enr.id}
                                             className={cn(
                                                 "border-b border-border/50 hover:bg-muted/40 transition-colors group",
                                                 i % 2 === 0 ? "bg-card" : "bg-muted/[0.15]"
                                             )}
                                         >
                                             {/* Roll Number Column */}
                                             <TableCell className="py-3.5 pl-5">
                                                 {enr.rollNumber ? (
                                                     <Badge
                                                         variant="outline"
                                                         className="font-mono text-xs font-bold px-2 py-0.5 bg-primary/10 text-primary border-primary/25 cursor-pointer hover:bg-primary/20 transition-colors"
                                                         onClick={() => canEdit && setEditRollEnrollment(enr)}
                                                         title="Click to edit roll number"
                                                     >
                                                         #{enr.rollNumber}
                                                     </Badge>
                                                 ) : canEdit ? (
                                                     <Button
                                                         variant="ghost"
                                                         size="sm"
                                                         onClick={() => setEditRollEnrollment(enr)}
                                                         className="h-6 px-1.5 text-[10px] text-muted-foreground hover:text-primary font-bold rounded-md"
                                                     >
                                                         + Set
                                                     </Button>
                                                 ) : (
                                                     <span className="text-xs text-muted-foreground font-mono">—</span>
                                                 )}
                                             </TableCell>

                                             {/* Name Column with initials and crown badges */}
                                             <TableCell className="py-3.5">
                                                 <div className="flex items-center gap-3">
                                                     <Avatar className="h-9 w-9 border border-border shadow-2xs shrink-0 transition-transform group-hover:scale-105">
                                                         <AvatarFallback className="text-xs font-bold bg-primary/10 text-primary">
                                                             {firstName[0] || ""}
                                                             {lastName[0] || ""}
                                                         </AvatarFallback>
                                                     </Avatar>
                                                     <div className="min-w-0">
                                                         <div className="flex items-center gap-2">
                                                             <span
                                                                 className="text-sm font-bold text-foreground hover:text-primary transition-colors cursor-pointer truncate"
                                                                 onClick={() => enr.student?.id && navigate(`/dashboard/students/${enr.student.id}`)}
                                                             >
                                                                 {fullName}
                                                             </span>
                                                             {isM1 && (
                                                                 <Badge className="text-[10px] py-0 px-1.5 border-amber-500/40 text-amber-700 dark:text-amber-300 bg-amber-500/15 font-black gap-1 shadow-2xs">
                                                                     <Crown className="w-2.5 h-2.5 text-amber-500" /> Monitor 1
                                                                 </Badge>
                                                             )}
                                                             {isM2 && (
                                                                 <Badge className="text-[10px] py-0 px-1.5 border-blue-500/40 text-blue-700 dark:text-blue-300 bg-blue-500/15 font-black gap-1 shadow-2xs">
                                                                     <Crown className="w-2.5 h-2.5 text-blue-500" /> Monitor 2
                                                                 </Badge>
                                                             )}
                                                         </div>
                                                         {acc?.email && (
                                                             <p className="text-xs text-muted-foreground truncate">{acc.email}</p>
                                                         )}
                                                     </div>
                                                 </div>
                                             </TableCell>

                                             {/* Admission ID Column */}
                                             <TableCell className="py-3.5">
                                                 <Badge variant="outline" className="text-xs font-mono font-bold bg-muted/50 border-border/70 px-2 py-0.5">
                                                     {admNo}
                                                 </Badge>
                                             </TableCell>

                                             {/* Gender Column */}
                                             <TableCell className="py-3.5 text-xs font-semibold text-foreground capitalize">
                                                 {gender}
                                             </TableCell>

                                             {/* Status Column */}
                                             <TableCell className="py-3.5">
                                                 <span className="inline-flex items-center gap-1.5 text-xs font-semibold">
                                                     <span className={cn(
                                                         "w-2 h-2 rounded-full",
                                                         isActive ? "bg-emerald-500" : "bg-muted-foreground"
                                                     )} />
                                                     {enr.student?.status || (isActive ? "Active" : "Inactive")}
                                                 </span>
                                             </TableCell>

                                             {/* Actions Column with Transfer Section and Row Menu */}
                                             {canEdit && (
                                                 <TableCell className="py-3.5 text-right pr-5">
                                                     <PermissionGate permission={PERMISSIONS.CLASSROOMS.UPDATE}>
                                                         <div className="flex items-center justify-end gap-1">
                                                             <Button
                                                                 variant="ghost"
                                                                 size="icon"
                                                                 className="h-8 w-8 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10"
                                                                 onClick={() => setTransferEnrollment(enr)}
                                                                 title="Transfer Section"
                                                             >
                                                                 <ArrowRightLeft className="h-3.5 w-3.5" />
                                                             </Button>

                                                             <DropdownMenu>
                                                                 <DropdownMenuTrigger asChild>
                                                                     <Button
                                                                         variant="ghost"
                                                                         size="icon"
                                                                         className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
                                                                     >
                                                                         <MoreVertical className="h-4 w-4" />
                                                                     </Button>
                                                                 </DropdownMenuTrigger>
                                                                 <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                                                     <DropdownMenuItem
                                                                         onClick={() => setEditRollEnrollment(enr)}
                                                                         className="text-xs font-semibold gap-2 cursor-pointer"
                                                                     >
                                                                         <Hash className="w-3.5 h-3.5 text-primary" /> Edit Roll Number
                                                                     </DropdownMenuItem>
                                                                     <DropdownMenuItem
                                                                         onClick={() => setTransferEnrollment(enr)}
                                                                         className="text-xs font-semibold gap-2 cursor-pointer"
                                                                     >
                                                                         <ArrowRightLeft className="w-3.5 h-3.5 text-blue-500" /> Transfer Section
                                                                     </DropdownMenuItem>
                                                                      <DropdownMenuItem
                                                                          onClick={() => setPromotionEnrollment(enr)}
                                                                          className="text-xs font-semibold gap-2 cursor-pointer text-emerald-600"
                                                                      >
                                                                          <GraduationCap className="w-3.5 h-3.5 text-emerald-600" /> Promote / Rollover
                                                                      </DropdownMenuItem>
                                                                     <DropdownMenuItem
                                                                         onClick={() => enr.student?.id && setRemoveId(enr.student.id)}
                                                                         className="text-xs font-semibold text-destructive gap-2 cursor-pointer"
                                                                     >
                                                                         <Trash2 className="w-3.5 h-3.5" /> Unassign Student
                                                                     </DropdownMenuItem>
                                                                 </DropdownMenuContent>
                                                             </DropdownMenu>
                                                         </div>
                                                     </PermissionGate>
                                                 </TableCell>
                                             )}
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 sm:gap-3 md:hidden">
                        {filteredEnrollments.map((enr) => {
                            const acc = enr.student?.account;
                            const firstName = acc?.firstName || "Unknown";
                            const lastName = acc?.lastName || "Student";
                            const fullName = `${firstName} ${lastName}`;
                            const admNo = enr.student?.admissionNumber || enr.student?.studentId || "—";
                            const gender = enr.student?.gender || "—";
                            const isM1 = enr.student?.id === monitorMaleId;
                            const isM2 = enr.student?.id === monitorFemaleId;
                            const isActive = enr.student?.status === "ACTIVE" || (acc?.isActive !== false);

                            return (
                                <Card key={enr.id} className="border border-border/80 shadow-xs rounded-xl sm:rounded-2xl overflow-hidden bg-card">
                                    <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-2.5">
                                        <div className="flex items-start justify-between gap-2">
                                            <div className="flex items-center gap-2.5 min-w-0">
                                                <Avatar className="h-8 w-8 sm:h-9 sm:w-9 border border-border shrink-0">
                                                    <AvatarFallback className="text-[11px] font-bold bg-primary/10 text-primary">
                                                        {firstName[0] || ""}
                                                        {lastName[0] || ""}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-1.5 flex-wrap">
                                                        {enr.rollNumber && (
                                                            <Badge
                                                                variant="outline"
                                                                className="font-mono text-[9px] font-bold px-1.5 py-0 bg-primary/10 text-primary border-primary/25 cursor-pointer"
                                                                onClick={() => canEdit && setEditRollEnrollment(enr)}
                                                            >
                                                                #{enr.rollNumber}
                                                            </Badge>
                                                        )}
                                                        <p
                                                            className="text-xs sm:text-sm font-bold text-foreground truncate cursor-pointer hover:underline"
                                                            onClick={() => enr.student?.id && navigate(`/dashboard/students/${enr.student.id}`)}
                                                        >
                                                            {fullName}
                                                        </p>
                                                    </div>
                                                    <p className="text-[10px] sm:text-[11px] font-mono text-muted-foreground truncate">ID: {admNo}</p>
                                                </div>
                                            </div>

                                            <Badge
                                                variant={isActive ? "default" : "secondary"}
                                                className="text-[9px] sm:text-[10px] font-bold py-0.5 px-1.5 shrink-0"
                                            >
                                                {enr.student?.status || (isActive ? "ACTIVE" : "INACTIVE")}
                                            </Badge>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] sm:text-xs pt-2 sm:pt-2.5 border-t border-border/50 text-muted-foreground">
                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                <span className="capitalize font-medium">Gender: <strong className="text-foreground">{gender}</strong></span>
                                                {isM1 && (
                                                    <Badge className="text-[8px] sm:text-[9px] py-0 px-1 border-amber-500/30 text-amber-700 dark:text-amber-300 bg-amber-500/10 font-bold">
                                                        Monitor 1
                                                    </Badge>
                                                )}
                                                {isM2 && (
                                                    <Badge className="text-[8px] sm:text-[9px] py-0 px-1 border-blue-500/30 text-blue-700 dark:text-blue-300 bg-blue-500/10 font-bold">
                                                        Monitor 2
                                                    </Badge>
                                                )}
                                            </div>

                                            {canEdit && (
                                                <PermissionGate permission={PERMISSIONS.CLASSROOMS.UPDATE}>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 min-h-[28px] px-2 text-primary hover:bg-primary/10 text-[11px] font-bold rounded-lg shrink-0"
                                                            onClick={() => setTransferEnrollment(enr)}
                                                            title="Transfer Section"
                                                        >
                                                            <ArrowRightLeft className="h-3 w-3 mr-1" /> Transfer
                                                        </Button>
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="h-7 min-h-[28px] px-2 text-destructive hover:bg-destructive/10 text-[11px] font-bold rounded-lg shrink-0"
                                                            onClick={() => enr.student?.id && setRemoveId(enr.student.id)}
                                                        >
                                                            <Trash2 className="h-3 w-3 mr-1" /> Remove
                                                        </Button>
                                                    </div>
                                                </PermissionGate>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </>
            )}

            {/* ── 4. Assign Students Dialog ────────────────────────────────────────── */}
            <Dialog open={assignOpen} onOpenChange={(v) => { setAssignOpen(v); if (!v) { setSelected(new Set()); setStudentSearch(""); } }}>
                <DialogContent className="sm:max-w-lg p-0 rounded-2xl border border-border shadow-2xl bg-background overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b border-border bg-muted/30">
                        <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                            <UserPlus className="w-4 h-4 text-primary" />
                            Assign Students to {classroomName || "Classroom"}
                        </DialogTitle>
                    </DialogHeader>

                    <div className="p-5 space-y-3">
                        <Command className="rounded-xl border border-border bg-transparent">
                            <CommandInput
                                placeholder="Search by student name or admission ID…"
                                value={studentSearch}
                                onValueChange={setStudentSearch}
                                className="text-xs h-10"
                            />
                            <CommandList>
                                <CommandEmpty className="py-6 text-center text-xs text-muted-foreground">
                                    {studentsLoading ? (
                                        <div className="flex justify-center py-2">
                                            <Loader2 className="h-4 w-4 animate-spin text-primary" />
                                        </div>
                                    ) : (
                                        "No available unassigned students found."
                                    )}
                                </CommandEmpty>
                                <CommandGroup>
                                    <ScrollArea className="h-56">
                                        {availableStudents.map(student => {
                                            const isChecked = selected.has(student.id);
                                            const name = `${student.account.firstName} ${student.account.lastName}`;
                                            return (
                                                <CommandItem
                                                    key={student.id}
                                                    value={`${name} ${student.studentId} ${student.admissionNumber || ""}`}
                                                    onSelect={() => toggleStudent(student.id)}
                                                    className="gap-3 cursor-pointer rounded-xl text-xs py-2 px-3"
                                                >
                                                    <div className={cn(
                                                        "w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                                                        isChecked ? "bg-primary border-primary text-primary-foreground" : "border-border"
                                                    )}>
                                                        {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-bold text-foreground truncate">{name}</p>
                                                        <p className="text-[11px] text-muted-foreground font-mono">
                                                            ID: {student.admissionNumber || student.studentId}
                                                            {student.grade ? ` · Grade: ${student.grade}` : ""}
                                                        </p>
                                                    </div>
                                                </CommandItem>
                                            );
                                        })}
                                    </ScrollArea>
                                </CommandGroup>
                            </CommandList>
                        </Command>

                        {selected.size > 0 && (
                            <p className="text-xs font-bold text-primary px-1">
                                {selected.size} student{selected.size !== 1 ? "s" : ""} selected for enrollment
                            </p>
                        )}
                    </div>

                    <div className="px-6 py-3.5 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            className="text-xs font-bold rounded-xl"
                            onClick={() => setAssignOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            disabled={selected.size === 0 || assignMutation.isPending}
                            onClick={() => assignMutation.mutate(Array.from(selected))}
                            className="text-xs font-bold rounded-xl gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                        >
                            {assignMutation.isPending ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                                <UserCheck className="h-3.5 w-3.5" />
                            )}
                            Enroll ({selected.size})
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* ── 5. Remove Confirmation ─────────────────────────────────────────────── */}
            <AlertDialog open={!!removeId} onOpenChange={(v) => !v && setRemoveId(null)}>
                <AlertDialogContent className="sm:max-w-md rounded-2xl border-border bg-background shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold text-foreground">
                            Unassign Student from Classroom?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-xs text-muted-foreground mt-1.5">
                            This student will be removed from this section roster. Their admission file and account credentials will remain preserved.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="text-xs font-semibold rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => removeId && removeMutation.mutate(removeId)}
                            className="bg-destructive hover:bg-destructive/90 text-destructive-foreground text-xs font-bold rounded-xl"
                        >
                            {removeMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : "Unassign Student"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            {/* ── 6. Appoint Monitors Dialog ────────────────────────────────────────── */}
            <AssignMonitorsDialog
                open={monitorsDialogOpen}
                onOpenChange={setMonitorsDialogOpen}
                classroomId={classroomId}
                classroomName={classroomName || "this Classroom Section"}
                enrollments={enrollments}
                currentMonitor1Id={monitorMaleId}
                currentMonitor2Id={monitorFemaleId}
                onSuccess={onRefresh}
            />

            {/* ── 7. Auto-Assign Roll Numbers Dialog ─────────────────────────────────── */}
            <AutoAssignRollNumbersDialog
                open={autoAssignOpen}
                onOpenChange={setAutoAssignOpen}
                classroomId={classroomId}
                studentCount={enrollments.length}
                onSuccess={onRefresh}
            />

            {/* ── 8. Transfer Student Section Dialog ─────────────────────────────────── */}
            <TransferSectionDialog
                open={!!transferEnrollment}
                onOpenChange={(v) => !v && setTransferEnrollment(null)}
                enrollment={transferEnrollment}
                currentClassroomId={classroomId}
                onSuccess={onRefresh}
            />

            {/* ── 9. Edit Roll Number Dialog ─────────────────────────────────────────── */}
            <EditRollNumberDialog
                open={!!editRollEnrollment}
                onOpenChange={(v) => !v && setEditRollEnrollment(null)}
                enrollment={editRollEnrollment}
                classroomId={classroomId}
                onSuccess={onRefresh}
            />
        
            {/* 10. Single Student Promotion Dialog */}
            {promotionEnrollment && (
                <SingleStudentPromotionDialog
                    open={!!promotionEnrollment}
                    onOpenChange={(v) => !v && setPromotionEnrollment(null)}
                    enrollment={promotionEnrollment}
                    sourceClassroomId={classroomId}
                    sourceClassroomName={classroomName}
                    onSuccess={onRefresh}
                />
            )}
</div>
    );
}

export default ClassroomStudentsTab;
