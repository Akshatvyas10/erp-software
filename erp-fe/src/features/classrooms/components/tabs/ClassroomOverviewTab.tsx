import {
    AlertTriangle, Crown, BookOpen,
    DoorOpen, Building2, Users2, GraduationCap,
    ArrowRight, School, ShieldCheck
} from "lucide-react";
import type { Classroom, ClassroomSubject, Subject, ClassroomEnrollment } from "@/types/erp";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export interface ClassroomOverviewTabProps {
    classroom: Classroom;
    teacherSubjectsMap: Array<{
        teacher: NonNullable<ClassroomSubject["teacher"]>;
        subjects: Subject[];
    }>;
    canEdit?: boolean;
    onAssignTeacher?: () => void;
    onAppointMonitors?: () => void;
    onNavigateToTimetable?: () => void;
}

export function ClassroomOverviewTab({
    classroom,
    teacherSubjectsMap,
    canEdit,
    onAssignTeacher,
    onAppointMonitors,
    onNavigateToTimetable,
}: ClassroomOverviewTabProps) {
    const studentCount = classroom.enrollments?.length ?? classroom.studentCount ?? 0;
    const capacity = classroom.maxCapacity || 40;
    const occupancyPercent = Math.min(100, Math.round((studentCount / capacity) * 100));

    // Calculate gender demographics from real enrollments
    const enrollments = classroom.enrollments || [];
    const maleStudents = enrollments.filter(e => e.student?.gender?.toLowerCase() === "male" || e.student?.gender?.toLowerCase() === "m");
    const femaleStudents = enrollments.filter(e => e.student?.gender?.toLowerCase() === "female" || e.student?.gender?.toLowerCase() === "f");

    const monitor1 = enrollments.find(e => e.student?.id === classroom.monitorMaleId)?.student || classroom.maleMonitor;
    const monitor2 = enrollments.find(e => e.student?.id === classroom.monitorFemaleId)?.student || classroom.femaleMonitor;
    type MonitorStudent = ClassroomEnrollment["student"] | NonNullable<Classroom["maleMonitor"]>;
    const monitorsList = [
        monitor1 ? { student: monitor1 as MonitorStudent, label: "Monitor 1", isPrimary: true } : null,
        monitor2 && monitor2?.id !== monitor1?.id ? { student: monitor2 as MonitorStudent, label: "Monitor 2", isPrimary: false } : null,
    ].filter(Boolean) as Array<{ student: MonitorStudent; label: string; isPrimary: boolean }>;

    const departmentName =
        classroom.departmentRef?.name ||
        classroom.academicClass?.department?.name ||
        classroom.department ||
        null;

    const inchargeLead =
        classroom.departmentRef?.incharge ||
        classroom.departmentRef?.head ||
        classroom.academicClass?.department?.incharge ||
        classroom.academicClass?.department?.head ||
        null;

    const inchargeName = inchargeLead?.account
        ? `${inchargeLead.account.firstName} ${inchargeLead.account.lastName}`.trim()
        : null;

    return (
        <div className="space-y-4 sm:space-y-6">
            {/* ── 1. Leadership Showcase (Class Teacher + Student Council + Facility) ── */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
                {/* 1. Class Teacher Spotlight Card */}
                <Card className={cn(
                    "rounded-xl sm:rounded-2xl border transition-all duration-200 overflow-hidden shadow-2xs hover:shadow-sm",
                    classroom.classTeacher ? "border-primary/30 bg-card" : "border-amber-500/40 bg-amber-500/[0.03]"
                )}>
                    <CardHeader className="py-2.5 px-3.5 sm:py-3 sm:px-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
                        <CardTitle className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                            <GraduationCap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> Class Teacher
                        </CardTitle>
                        {classroom.classTeacher && (
                            <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0 px-1.5 sm:px-2 border-primary/30 text-primary bg-primary/10 font-bold">
                                Assigned
                            </Badge>
                        )}
                    </CardHeader>
                    <CardContent className="p-3.5 sm:p-4">
                        {classroom.classTeacher ? (
                            <div className="space-y-2.5 sm:space-y-3">
                                <div className="flex items-center gap-2.5 sm:gap-3.5">
                                    <Avatar className="h-10 w-10 sm:h-12 sm:w-12 border-2 border-primary/30 shadow-xs ring-2 ring-primary/10 shrink-0">
                                        <AvatarFallback className="bg-primary/15 text-primary font-black text-xs sm:text-sm">
                                            {classroom.classTeacher.account?.firstName?.[0] || "T"}
                                            {classroom.classTeacher.account?.lastName?.[0] || ""}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="min-w-0">
                                        <p className="text-sm sm:text-base font-black text-foreground truncate">
                                            {classroom.classTeacher.account?.firstName} {classroom.classTeacher.account?.lastName}
                                        </p>
                                        <p className="text-[10px] sm:text-xs text-muted-foreground font-mono truncate">
                                            Teacher ID: {classroom.classTeacher.teacherId}
                                        </p>
                                    </div>
                                </div>
                                <div className="p-2 sm:p-2.5 rounded-lg sm:rounded-xl bg-muted/40 border border-border/60 text-[11px] sm:text-xs text-muted-foreground flex items-center justify-between">
                                    <span className="truncate">Primary mentor responsible for student welfare</span>
                                    {canEdit && onAssignTeacher && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={onAssignTeacher}
                                            className="h-6 text-[11px] sm:text-xs text-primary font-bold hover:bg-primary/10 px-2 shrink-0 ml-1"
                                        >
                                            Change
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-dashed border-amber-500/40 bg-amber-500/10 space-y-2 sm:space-y-3 text-center">
                                <div className="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center mx-auto">
                                    <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5" />
                                </div>
                                <div>
                                    <p className="text-xs sm:text-sm font-bold text-amber-900 dark:text-amber-200">No Teacher Assigned</p>
                                    <p className="text-[10px] sm:text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                                        Appoint a teacher to guide this section
                                    </p>
                                </div>
                                {canEdit && onAssignTeacher && (
                                    <Button
                                        size="sm"
                                        onClick={onAssignTeacher}
                                        className="w-full h-8 text-[11px] sm:text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg sm:rounded-xl shadow-xs"
                                    >
                                        Assign Class Teacher
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 2. Class Monitors (Student Council) */}
                <Card className="rounded-xl sm:rounded-2xl border border-amber-500/20 bg-card shadow-2xs hover:shadow-sm transition-all">
                    <CardHeader className="py-2.5 px-3.5 sm:py-3 sm:px-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
                        <CardTitle className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                            <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500" /> Monitors (Council)
                        </CardTitle>
                        {canEdit && onAppointMonitors && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onAppointMonitors}
                                className="h-6 px-1.5 sm:px-2 text-[11px] sm:text-xs text-primary font-bold hover:bg-primary/10"
                            >
                                {monitorsList.length > 0 ? "Edit" : "Appoint"}
                            </Button>
                        )}
                    </CardHeader>
                    <CardContent className="p-3.5 sm:p-4">
                        {monitorsList.length > 0 ? (
                            <div className="space-y-2 sm:space-y-2.5">
                                {monitorsList.map(({ student, label, isPrimary }) => {
                                    const name = student.account
                                        ? `${student.account.firstName} ${student.account.lastName}`
                                        : `Student #${student.studentId}`;
                                    const id = student.admissionNumber || student.studentId;
                                    return (
                                        <div
                                            key={student.id}
                                            className="flex items-center justify-between p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-border/70 bg-muted/20 hover:bg-muted/40 transition-colors"
                                        >
                                            <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
                                                <Avatar className="h-7 w-7 sm:h-8 sm:w-8 border border-amber-500/30 shrink-0">
                                                    <AvatarFallback className="text-[10px] sm:text-xs font-bold bg-amber-500/10 text-amber-600">
                                                        {student.account?.firstName?.[0] || "M"}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="min-w-0">
                                                    <p className="text-[11px] sm:text-xs font-bold text-foreground truncate">{name}</p>
                                                    <p className="text-[9px] sm:text-[10px] text-muted-foreground font-mono">ID: {id}</p>
                                                </div>
                                            </div>
                                            <Badge
                                                variant="outline"
                                                className={cn(
                                                    "text-[9px] sm:text-[10px] py-0 px-1.5 font-bold shrink-0",
                                                    isPrimary
                                                        ? "border-amber-500/40 text-amber-600 dark:text-amber-400 bg-amber-500/10"
                                                        : "border-blue-500/40 text-blue-600 dark:text-blue-400 bg-blue-500/10"
                                                )}
                                            >
                                                {label}
                                            </Badge>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <div className="p-3 sm:p-4 rounded-lg sm:rounded-xl border border-dashed border-border/80 bg-muted/20 text-center space-y-2 sm:space-y-2.5">
                                <Crown className="w-6 h-6 sm:w-7 sm:h-7 text-amber-500/50 mx-auto" />
                                <div>
                                    <p className="text-xs font-bold text-foreground">No Monitors Appointed</p>
                                    <p className="text-[10px] sm:text-[11px] text-muted-foreground">Appoint student leaders for classroom coordination.</p>
                                </div>
                                {canEdit && onAppointMonitors && (
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={onAppointMonitors}
                                        className="h-7 sm:h-8 text-[11px] sm:text-xs font-bold rounded-lg sm:rounded-xl border-amber-500/30 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10"
                                    >
                                        <Crown className="w-3 h-3 sm:w-3.5 sm:h-3.5 mr-1 text-amber-500" /> Appoint 2 Monitors
                                    </Button>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* 3. Physical Space & Facilities */}
                <Card className="rounded-xl sm:rounded-2xl border border-cyan-500/20 bg-card shadow-2xs hover:shadow-sm transition-all md:col-span-2 lg:col-span-1">
                    <CardHeader className="py-2.5 px-3.5 sm:py-3 sm:px-4 border-b border-border/60 bg-muted/20">
                        <CardTitle className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5 sm:gap-2">
                            <DoorOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-600 dark:text-cyan-400" /> Space & Facilities
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-3 sm:p-4 space-y-2 sm:space-y-3 text-[11px] sm:text-xs">
                        <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-border/50">
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                <DoorOpen className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-cyan-600 dark:text-cyan-400" /> Room
                            </span>
                            <span className="font-bold text-foreground">
                                {classroom.roomNumber ? `Room ${classroom.roomNumber}` : "Unassigned"}
                            </span>
                        </div>

                        <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-border/50">
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                <Building2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 dark:text-indigo-400" /> Block
                            </span>
                            <span className="font-bold text-foreground">
                                {classroom.buildingBlock || "Main Wing"}
                            </span>
                        </div>

                        <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-border/50">
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                <School className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-violet-600 dark:text-violet-400" /> Department
                            </span>
                            <span className="font-bold text-foreground">
                                {departmentName || "General"}
                            </span>
                        </div>

                        <div className="flex items-center justify-between pb-1.5 sm:pb-2 border-b border-border/50">
                            <span className="text-muted-foreground font-medium flex items-center gap-1.5">
                                <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-600 dark:text-amber-400" /> Incharge
                            </span>
                            <span className={cn("font-bold truncate max-w-[120px]", inchargeName ? "text-foreground" : "text-amber-600 dark:text-amber-400 italic")}>
                                {inchargeName || "Unassigned"}
                            </span>
                        </div>

                        <div className="space-y-1">
                            <div className="flex items-center justify-between text-muted-foreground font-medium text-[10px] sm:text-xs">
                                <span className="flex items-center gap-1">
                                    <Users2 className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-emerald-600 dark:text-emerald-400" /> Occupancy
                                </span>
                                <span className="font-bold text-foreground">
                                    {studentCount} / {capacity} ({occupancyPercent}%)
                                </span>
                            </div>
                            <div className="h-1 sm:h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-primary rounded-full transition-all duration-500"
                                    style={{ width: `${occupancyPercent}%` }}
                                />
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* ── 2. Demographics Snapshot Bar (3 Compact Columns on Mobile!) ─────────── */}
            <div className="grid grid-cols-3 gap-2 sm:gap-3.5">
                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-primary/20 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-center gap-2 sm:gap-3 shadow-2xs">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-black text-xs sm:text-base shadow-xs shrink-0">
                        {studentCount}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs font-bold text-foreground truncate">Total</p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate hidden sm:block">Enrolled</p>
                    </div>
                </div>

                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-blue-500/20 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-transparent flex items-center gap-2 sm:gap-3 shadow-2xs">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-xs sm:text-base shadow-xs shrink-0">
                        {maleStudents.length}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs font-bold text-foreground truncate">Boys</p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate hidden sm:block">
                            {studentCount > 0 ? Math.round((maleStudents.length / studentCount) * 100) : 0}% of class
                        </p>
                    </div>
                </div>

                <div className="p-2.5 sm:p-4 rounded-xl sm:rounded-2xl border border-pink-500/20 bg-gradient-to-r from-pink-500/10 via-pink-500/5 to-transparent flex items-center gap-2 sm:gap-3 shadow-2xs">
                    <div className="w-8 h-8 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-pink-600 text-white flex items-center justify-center font-black text-xs sm:text-base shadow-xs shrink-0">
                        {femaleStudents.length}
                    </div>
                    <div className="min-w-0">
                        <p className="text-[11px] sm:text-xs font-bold text-foreground truncate">Girls</p>
                        <p className="text-[10px] sm:text-[11px] text-muted-foreground font-medium truncate hidden sm:block">
                            {studentCount > 0 ? Math.round((femaleStudents.length / studentCount) * 100) : 0}% of class
                        </p>
                    </div>
                </div>
            </div>

            {/* ── 3. Subject Faculty & Timetable Distribution ───────────────────────── */}
            <Card className="rounded-xl sm:rounded-2xl border border-border/80 shadow-xs overflow-hidden">
                <CardHeader className="py-2.5 px-3.5 sm:py-3.5 sm:px-5 border-b border-border/70 bg-muted/20 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-[11px] sm:text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5 sm:gap-2">
                            <BookOpen className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary" /> Faculty & Courses ({teacherSubjectsMap.length})
                        </CardTitle>
                    </div>
                    {onNavigateToTimetable && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onNavigateToTimetable}
                            className="h-7 sm:h-8 text-[11px] sm:text-xs font-bold gap-1 rounded-lg sm:rounded-xl hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                            Timetable <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                        </Button>
                    )}
                </CardHeader>
                <CardContent className="p-0">
                    {teacherSubjectsMap.length === 0 ? (
                        <div className="py-12 px-4 text-center text-xs text-muted-foreground space-y-2">
                            <BookOpen className="w-8 h-8 text-muted-foreground/30 mx-auto" />
                            <p className="font-bold text-foreground text-sm">No Curriculum Scheduled</p>
                            <p className="max-w-sm mx-auto">
                                No subject teachers or weekly periods have been configured for this classroom section yet.
                            </p>
                            {onNavigateToTimetable && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onNavigateToTimetable}
                                    className="mt-2 text-xs font-bold rounded-xl"
                                >
                                    Build Timetable Now
                                </Button>
                            )}
                        </div>
                    ) : (
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/30 hover:bg-muted/30">
                                    <TableHead className="text-xs font-bold pl-5">Teacher Profile</TableHead>
                                    <TableHead className="text-xs font-bold">Staff ID</TableHead>
                                    <TableHead className="text-xs font-bold pr-5">Assigned Courses</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {teacherSubjectsMap.map(({ teacher, subjects }) => {
                                    const teacherName = `${teacher.account?.firstName || ""} ${teacher.account?.lastName || ""}`.trim() || "Teacher";
                                    const isClassTeacher = classroom.classTeacherId === teacher.id;
                                    return (
                                        <TableRow key={teacher.id} className="hover:bg-muted/30">
                                            <TableCell className="py-3.5 pl-5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8 border border-border">
                                                        <AvatarFallback className="text-xs font-bold bg-muted text-foreground">
                                                            {teacher.account?.firstName?.[0] || "T"}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className="text-xs font-bold text-foreground">{teacherName}</span>
                                                            {isClassTeacher && (
                                                                <Badge variant="outline" className="text-[9px] py-0 px-1.5 border-primary/30 text-primary bg-primary/10 font-bold">
                                                                    Class Teacher
                                                                </Badge>
                                                            )}
                                                        </div>
                                                        <p className="text-[11px] text-muted-foreground">Subject Specialist</p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-3.5 text-xs font-mono font-medium text-muted-foreground">
                                                {teacher.teacherId}
                                            </TableCell>
                                            <TableCell className="py-3.5 pr-5">
                                                <div className="flex flex-wrap gap-1.5">
                                                    {subjects.map(s => (
                                                        <Badge
                                                            key={s.id}
                                                            variant="secondary"
                                                            className="text-[11px] font-semibold bg-muted hover:bg-muted/80 text-foreground"
                                                        >
                                                            {s.name}
                                                        </Badge>
                                                    ))}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}

export default ClassroomOverviewTab;
