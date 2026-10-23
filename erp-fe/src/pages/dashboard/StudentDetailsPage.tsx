import { useState } from "react";
import {
    ArrowLeft, Pencil, GraduationCap, Phone, Mail, MapPin,
    Fingerprint, Bus, BadgeDollarSign, Droplets, AlertTriangle,
    BookOpen, Users, CalendarDays, Hash, School, Loader2,
    ShieldCheck, HeartPulse, Check, X, Clock, Minus, ChevronLeft, ChevronRight, Palmtree,
    History, Award, ArrowUpRight, CheckCircle2, TrendingUp, Filter, FileText, Sparkles
} from "lucide-react";
import { motion } from "framer-motion";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import AccessDenied from "@/components/auth/AccessDenied";
import AdmissionFormDialog from "./AdmissionFormDialog";
import type { Student, StudentStatus, TransportMode, FeeQuota, StudentAcademicHistory, PromotionLogRecord } from "@/types/erp";
import { SectionCard, DetailRow } from "@/components/shared/DetailCards";
import { ProfilePageSkeleton } from "@/components/common/skeletons/ProfilePageSkeleton";
import { useNavigate, useParams } from "react-router-dom";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "http://localhost:5000";

const STATUS_STYLES: Record<StudentStatus, string> = {
    ACTIVE: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    SUSPENDED: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    GRADUATED: "bg-accent text-accent-foreground border-border",
    TRANSFERRED: "bg-muted text-muted-foreground border-border",
};

const TRANSPORT_LABEL: Record<TransportMode, string> = {
    SCHOOL_BUS: "School Bus",
    PRIVATE_TRANSPORT: "Private Transport",
    WALKER: "Walker",
};

const FEE_LABEL: Record<FeeQuota, string> = {
    REGULAR: "Regular",
    STAFF_CHILD: "Staff Child",
    SCHOLARSHIP_HALF: "Scholarship (50%)",
    SCHOLARSHIP_FULL: "Full Scholarship",
};

const BLOOD_COLORS: Record<string, string> = {
    "A+": "bg-destructive/10 text-destructive border-destructive/20",
    "A−": "bg-destructive/10 text-destructive border-destructive/20",
    "B+": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    "B−": "bg-orange-500/10 text-orange-600 dark:text-orange-400 border-orange-500/20",
    "AB+": "bg-primary/10 text-primary border-primary/20",
    "AB−": "bg-primary/10 text-primary border-primary/20",
    "O+": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    "O−": "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

// =============================================================================
// Attendance Component
// =============================================================================

function getLocalISODate(date: Date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
}


function StudentAttendanceCard({ studentId }: { studentId: string }) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const startDate = getLocalISODate(new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1));
    const endDate = getLocalISODate(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0));

    const { data, isLoading } = useQuery({
        queryKey: ["student-attendance", studentId, startDate, endDate],
        queryFn: () => api.get(`/students/${studentId}/attendance?startDate=${startDate}&endDate=${endDate}`).then(res => res.data.data),
    });

    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));

    if (isLoading) {
        return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
    }

    const summary = data?.summary || { total: 0, present: 0, absent: 0, late: 0, halfDay: 0, percentage: 0 };
    const records = data?.records || [];
    const holidays = data?.holidays || [];
    const recordMap = new Map();
    records.forEach((r: any) => recordMap.set(r.attendanceDate, r));

    const daysInMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0).getDate();
    const startDayOfWeek = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1).getDay();
    const todayStr = getLocalISODate(new Date());

    const isHoliday = (dateStr: string) => {
        return holidays.find((h: any) => {
            const hStart = getLocalISODate(new Date(h.start_date));
            const hEnd = getLocalISODate(new Date(h.end_date));
            return dateStr >= hStart && dateStr <= hEnd;
        });
    };

    const renderDayCell = (day: number) => {
        const dateObj = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
        const dateStr = getLocalISODate(dateObj);
        const record = recordMap.get(dateStr);
        const holidayEvent = !record ? isHoliday(dateStr) : null;
        const isWeekend = dateObj.getDay() === 0 || dateObj.getDay() === 6;

        let Icon = null;
        let iconClass = "";
        let bgClass = "bg-card";
        let tooltipText = "";
        let labelText = "";

        if (record) {
            if (record.status === 'PRESENT') {
                Icon = Check;
                iconClass = "text-emerald-600 dark:text-emerald-400";
                bgClass = "bg-emerald-500/10 border-emerald-500/20";
                tooltipText = "Present";
            }
            else if (record.status === 'ABSENT') {
                Icon = X;
                iconClass = "text-destructive";
                bgClass = "bg-destructive/10 border-destructive/20";
                tooltipText = "Absent";
            }
            else if (record.status === 'LATE' || record.status === 'HALF_DAY') {
                Icon = Clock;
                iconClass = "text-amber-600 dark:text-amber-400";
                bgClass = "bg-amber-500/10 border-amber-500/20";
                tooltipText = "Late / Half Day";
            }
        } else if (holidayEvent) {
            Icon = Palmtree;
            iconClass = "text-indigo-500";
            bgClass = "bg-indigo-500/10 border-indigo-500/20";
            tooltipText = holidayEvent.title || "Holiday";
            labelText = "Holiday";
        } else if (isWeekend) {
            Icon = Minus;
            iconClass = "text-muted-foreground opacity-50";
            bgClass = "bg-muted/10 border-border/50";
            tooltipText = "Weekend";
            labelText = "Weekend";
        } else if (dateStr < todayStr) {
            Icon = AlertTriangle;
            iconClass = "text-muted-foreground opacity-50";
            bgClass = "bg-muted/10 border-border/50";
            tooltipText = "Not Marked";
        }

        const isToday = dateStr === todayStr;

        return (
            <div
                key={day}
                title={tooltipText}
                className={cn(
                    "flex flex-col items-center justify-center p-2 border rounded-md h-16 sm:h-20 relative transition-colors cursor-default",
                    bgClass,
                    isToday && "ring-2 ring-primary ring-offset-1 ring-offset-background hover:opacity-90"
                )}
            >
                <span className={cn("text-[10px] sm:text-xs absolute top-1 left-1.5 font-medium", isToday && "text-primary font-bold")}>
                    {day}
                </span>
                {Icon && !labelText && <Icon className={cn("h-4 w-4 sm:h-5 sm:w-5 mt-2", iconClass)} />}
                {Icon && labelText && <Icon className={cn("h-3 w-3 sm:h-4 sm:w-4 mt-1", iconClass)} />}
                {labelText && <span className={cn("text-[8px] sm:text-[9px] mt-1 font-semibold leading-none", iconClass)}>{labelText}</span>}
            </div>
        );
    };

    return (
        <div className="flex flex-col">
            {/* Calendar Header / Controls */}
            <div className="flex items-center justify-between p-4 border-b border-border/60 bg-muted/5">
                <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8">
                    <ChevronLeft className="h-4 w-4" />
                </Button>
                <h3 className="text-sm font-bold text-foreground">
                    {currentMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h3>
                <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8" disabled={currentMonth.getMonth() === new Date().getMonth() && currentMonth.getFullYear() === new Date().getFullYear()}>
                    <ChevronRight className="h-4 w-4" />
                </Button>
            </div>

            {/* Summary Row */}
            <div className="grid grid-cols-5 gap-2 p-4 border-b border-border/60 bg-muted/5">
                <div className="flex flex-col items-center p-2 rounded-lg bg-card border shadow-sm">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground">Total</span>
                    <span className="text-sm font-black text-foreground">{summary.total}</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                    <span className="text-[10px] uppercase font-bold text-emerald-600 dark:text-emerald-400">Present</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{summary.present}</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-destructive/10 border border-destructive/20">
                    <span className="text-[10px] uppercase font-bold text-destructive">Absent</span>
                    <span className="text-sm font-black text-destructive">{summary.absent}</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <span className="text-[10px] uppercase font-bold text-amber-600 dark:text-amber-400">Late</span>
                    <span className="text-sm font-black text-amber-700 dark:text-amber-300">{summary.late + summary.halfDay}</span>
                </div>
                <div className="flex flex-col items-center p-2 rounded-lg bg-primary/10 border border-primary/20">
                    <span className="text-[10px] uppercase font-bold text-primary">Att %</span>
                    <span className="text-sm font-black text-primary">{summary.percentage}%</span>
                </div>
            </div>

            {/* Calendar Grid */}
            <div className="p-4 sm:p-6">
                <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
                    {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map(day => (
                        <div key={day} className="text-center text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 gap-1 sm:gap-2">
                    {Array.from({ length: startDayOfWeek }).map((_, i) => (
                        <div key={`blank-${i}`} className="h-16 sm:h-20" />
                    ))}
                    {Array.from({ length: daysInMonth }).map((_, i) => renderDayCell(i + 1))}
                </div>
            </div>

            {/* Legend */}
            <div className="p-4 border-t border-border/60 bg-muted/5 flex items-center justify-center gap-4 flex-wrap text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5"><Check className="h-3 w-3 text-emerald-500" /> Present</div>
                <div className="flex items-center gap-1.5"><X className="h-3 w-3 text-destructive" /> Absent</div>
                <div className="flex items-center gap-1.5"><Clock className="h-3 w-3 text-amber-500" /> Late/Half</div>
                <div className="flex items-center gap-1.5"><Palmtree className="h-3 w-3 text-indigo-500" /> Holiday</div>
                <div className="flex items-center gap-1.5"><AlertTriangle className="h-3 w-3 opacity-50" /> Not Marked</div>
            </div>
        </div>
    );
}

// =============================================================================
// Exam Results Component
// =============================================================================
function StudentExamResults({ studentId }: { studentId: string }) {
    const { data: results = [], isLoading } = useQuery({
        queryKey: ["student-exams", studentId],
        queryFn: () => api.get(`/students/${studentId}/exam-results`).then(res => res.data.data.results),
    });

    if (isLoading) {
        return <div className="p-6"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></div>;
    }

    if (results.length === 0) {
        return (
            <div className="p-6 text-center text-sm text-muted-foreground italic flex flex-col items-center gap-2">
                <BookOpen className="h-8 w-8 opacity-20" />
                No published exam results found.
            </div>
        );
    }

    const groupedResults = results.reduce((acc: any, curr: any) => {
        const scheduleId = curr.exam?.examSchedule?.id || 'unknown';
        const scheduleName = curr.exam?.examSchedule?.name || 'Unknown Schedule';
        const scheduleType = curr.exam?.examSchedule?.type || '';

        if (!acc[scheduleId]) {
            acc[scheduleId] = {
                id: scheduleId,
                name: scheduleName,
                type: scheduleType,
                results: []
            };
        }
        acc[scheduleId].results.push(curr);
        return acc;
    }, {});

    const schedules = Object.values(groupedResults) as any[];

    return (
        <Accordion type="single" collapsible className="w-full" defaultValue={schedules[0]?.id}>
            {schedules.map((schedule) => {
                let totalMarks = 0;
                let obtainedMarks = 0;
                schedule.results.forEach((r: any) => {
                    if (!r.isAbsent && r.marksObtained != null) {
                        obtainedMarks += Number(r.marksObtained);
                        totalMarks += Number(r.exam?.maxMarks || 100);
                    }
                });
                const percentage = totalMarks > 0 ? ((obtainedMarks / totalMarks) * 100).toFixed(1) : "0.0";

                return (
                    <AccordionItem value={schedule.id} key={schedule.id} className="border-b last:border-0 border-border/60">
                        <AccordionTrigger className="px-6 py-4 hover:no-underline hover:bg-muted/5 transition-colors group">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between w-full pr-4 gap-2">
                                <div className="flex flex-col items-start gap-1">
                                    <span className="font-bold text-base text-foreground group-hover:text-primary transition-colors">{schedule.name}</span>
                                    {schedule.type && <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-bold">{schedule.type}</span>}
                                </div>
                                <div className="flex flex-wrap items-center gap-3">
                                    <Badge variant="secondary" className="font-mono text-xs shadow-sm bg-muted text-muted-foreground">
                                        {obtainedMarks} / {totalMarks}
                                    </Badge>
                                    <Badge variant="outline" className={cn(
                                        "font-bold text-xs shadow-sm",
                                        Number(percentage) >= 40 ? "text-emerald-600 bg-emerald-500/10 border-emerald-500/20" : "text-destructive bg-destructive/10 border-destructive/20"
                                    )}>
                                        {percentage}%
                                    </Badge>
                                </div>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-6 pb-6 pt-2">
                            <div className="overflow-x-auto custom-scrollbar border border-border/60 rounded-xl shadow-sm bg-card">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-muted/30">
                                        <tr>
                                            <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Subject</th>
                                            <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Date</th>
                                            <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Marks</th>
                                            <th className="px-4 py-3 font-semibold text-muted-foreground border-b border-border/60">Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/50">
                                        {schedule.results.map((r: any) => (
                                            <tr key={r.id} className="hover:bg-muted/5 transition-colors">
                                                <td className="px-4 py-3 font-semibold text-primary">{r.exam?.subject?.name}</td>
                                                <td className="px-4 py-3 whitespace-nowrap text-muted-foreground">
                                                    {r.exam?.date ? new Date(r.exam.date).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "-"}
                                                </td>
                                                <td className="px-4 py-3 font-mono font-medium">
                                                    {r.isAbsent ? (
                                                        <span className="text-destructive font-bold">Absent</span>
                                                    ) : (
                                                        <span>{r.marksObtained != null ? r.marksObtained : "-"} <span className="text-muted-foreground text-xs">/ {r.exam?.maxMarks}</span></span>
                                                    )}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {r.status ? (
                                                        <Badge variant="outline" className={cn(
                                                            "text-[10px] uppercase font-bold tracking-wider",
                                                            r.status === 'PASSED' ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" :
                                                                r.status === 'FAILED' ? "bg-destructive/10 text-destructive border-destructive/20" :
                                                                    "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                                        )}>
                                                            {r.status}
                                                        </Badge>
                                                    ) : "-"}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </AccordionContent>
                    </AccordionItem>
                )
            })}
        </Accordion>
    );
}

// =============================================================================
// Student Academic History & Progression Timeline
// =============================================================================
function StudentAcademicHistoryTimeline({ studentId }: { studentId: string }) {
    const [selectedYear, setSelectedYear] = useState<string>("ALL");
    const [selectedClass, setSelectedClass] = useState<string>("ALL");
    const [filterCategory, setFilterCategory] = useState<"ALL" | "ACADEMIC" | "ATTENDANCE" | "REMARKS">("ALL");

    const { data, isLoading } = useQuery<{
        history: StudentAcademicHistory[];
        promotionLogs: PromotionLogRecord[];
    }>({
        queryKey: ["student-academic-history", studentId, selectedYear, selectedClass],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (selectedYear !== "ALL") params.append("academicYear", selectedYear);
            if (selectedClass !== "ALL") params.append("className", selectedClass);
            const queryStr = params.toString() ? `?${params.toString()}` : "";
            const res = await api.get(`/students/${studentId}/academic-history${queryStr}`);
            return res.data.data;
        }
    });

    if (isLoading) {
        return (
            <div className="p-8 text-center flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    const history = data?.history || [];
    const promotionLogs = data?.promotionLogs || [];

    // Distinct filter options
    const distinctYears = Array.from(new Set(history.map(h => h.academicYear).filter(Boolean)));
    const distinctClasses = Array.from(new Set(history.map(h => h.className).filter(Boolean)));

    return (
        <div className="p-4 sm:p-6 space-y-6">
            {/* Filter Bar */}
            <div className="p-3.5 rounded-xl bg-muted/20 border border-border/60 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <Filter className="w-3.5 h-3.5 text-primary" />
                    <span>Filter Timeline:</span>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                    {/* Academic Year Filter */}
                    <div className="w-36">
                        <Select value={selectedYear} onValueChange={setSelectedYear}>
                            <SelectTrigger size="sm" className="h-8 text-xs bg-background">
                                <SelectValue placeholder="All Sessions" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Sessions</SelectItem>
                                {distinctYears.map(yr => (
                                    <SelectItem key={yr} value={yr}>{yr}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Class Filter */}
                    <div className="w-36">
                        <Select value={selectedClass} onValueChange={setSelectedClass}>
                            <SelectTrigger size="sm" className="h-8 text-xs bg-background">
                                <SelectValue placeholder="All Classes" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="ALL">All Classes</SelectItem>
                                {distinctClasses.map(cls => (
                                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Category Filter Pills */}
                    <div className="flex items-center gap-1 border border-border/60 p-0.5 rounded-lg bg-background">
                        {(["ALL", "ACADEMIC", "ATTENDANCE", "REMARKS"] as const).map(cat => (
                            <button
                                key={cat}
                                type="button"
                                onClick={() => setFilterCategory(cat)}
                                className={cn(
                                    "px-2.5 py-1 text-[11px] font-bold rounded-md transition-all",
                                    filterCategory === cat
                                        ? "bg-primary text-primary-foreground shadow-2xs"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/40"
                                )}
                            >
                                {cat === "ALL" ? "All Records" :
                                 cat === "ACADEMIC" ? "Exams & Tests" :
                                 cat === "ATTENDANCE" ? "Attendance" : "Remarks"}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {history.length === 0 && promotionLogs.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground flex flex-col items-center gap-2">
                    <History className="h-10 w-10 opacity-25" />
                    <p className="text-sm font-semibold">No prior academic history matching filters.</p>
                    <p className="text-xs max-w-sm">
                        Historical records and promotion logs are permanently snapshotted whenever academic sessions conclude.
                    </p>
                </div>
            ) : (
                /* Timeline of Academic Classes */
                <div className="relative pl-6 sm:pl-8 border-l-2 border-primary/20 space-y-6 ml-2 sm:ml-4">
                    {history.map((record, index) => {
                        const isPromoted = record.resultStatus === "PROMOTED" || record.resultStatus === "PASSED";
                        const isGraduated = record.resultStatus === "GRADUATED";
                        const isRetained = record.resultStatus === "RETAINED" || record.resultStatus === "FAILED";

                        const showAcademic = filterCategory === "ALL" || filterCategory === "ACADEMIC";
                        const showAttendance = filterCategory === "ALL" || filterCategory === "ATTENDANCE";
                        const showRemarks = filterCategory === "ALL" || filterCategory === "REMARKS";

                        return (
                            <div key={record.id || index} className="relative group">
                                {/* Milestone Dot on timeline */}
                                <div className={cn(
                                    "absolute -left-[31px] sm:-left-[39px] top-1.5 w-5 h-5 rounded-full border-2 border-background flex items-center justify-center shadow-xs",
                                    isGraduated ? "bg-amber-500 text-white" :
                                    isPromoted ? "bg-emerald-500 text-white" :
                                    isRetained ? "bg-destructive text-white" :
                                    "bg-primary text-white"
                                )}>
                                    {isGraduated ? <Award className="w-3 h-3" /> :
                                     isPromoted ? <CheckCircle2 className="w-3 h-3" /> :
                                     <History className="w-3 h-3" />}
                                </div>

                                <Card className="rounded-xl border border-border/70 shadow-2xs overflow-hidden bg-card/60 backdrop-blur-xs hover:border-primary/40 transition-all">
                                    <div className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-border/50 bg-muted/15">
                                        <div className="space-y-0.5">
                                            <div className="flex items-center gap-2">
                                                <h3 className="font-extrabold text-base text-foreground tracking-tight">
                                                    {record.className} – Section {record.sectionName}
                                                </h3>
                                                <Badge variant="outline" className={cn(
                                                    "text-[10px] font-bold uppercase tracking-wider py-0 px-2 rounded-md",
                                                    isGraduated ? "bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30" :
                                                    isPromoted ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30" :
                                                    "bg-destructive/15 text-destructive border-destructive/30"
                                                )}>
                                                    {record.resultStatus}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                                                <span>Session: {record.academicYear}</span>
                                                {record.rollNumber && <span>• Roll No: #{record.rollNumber}</span>}
                                            </p>
                                        </div>

                                        {/* Score pill */}
                                        <div className="flex items-center gap-2 shrink-0">
                                            {record.overallPercentage != null && (
                                                <div className="flex flex-col items-end">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Cumulative</span>
                                                    <span className="text-sm font-black text-primary font-mono">{record.overallPercentage}%</span>
                                                </div>
                                            )}
                                            {record.attendancePercentage != null && (
                                                <div className="flex flex-col items-end pl-3 border-l border-border/60">
                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Attendance</span>
                                                    <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-mono">
                                                        {record.attendancePercentage}%
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    <div className="p-4 space-y-3">
                                        {/* Attendance card highlight if filtered */}
                                        {showAttendance && record.attendancePercentage != null && filterCategory === "ATTENDANCE" && (
                                            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-between text-xs">
                                                <span className="font-semibold text-emerald-800 dark:text-emerald-300">
                                                    Final Session Attendance Recorded:
                                                </span>
                                                <span className="font-black font-mono text-emerald-700 dark:text-emerald-400 text-sm">
                                                    {record.attendancePercentage}%
                                                </span>
                                            </div>
                                        )}

                                        {/* Teacher Remarks & Appraisal Notes */}
                                        {showRemarks && (record.teacherRemarks || record.appraisalNotes) && (
                                            <div className="space-y-2">
                                                {record.teacherRemarks && (
                                                    <div className="text-xs p-2.5 rounded-lg bg-muted/40 border border-border/50 text-muted-foreground">
                                                        <div className="font-bold text-foreground text-[10px] uppercase mb-0.5 flex items-center gap-1">
                                                            <FileText className="w-3 h-3 text-primary" /> Teacher Remarks
                                                        </div>
                                                        <span className="italic font-normal">"{record.teacherRemarks}"</span>
                                                    </div>
                                                )}
                                                {record.appraisalNotes && (
                                                    <div className="text-xs p-2.5 rounded-lg bg-primary/5 border border-primary/20 text-foreground">
                                                        <div className="font-bold text-primary text-[10px] uppercase mb-0.5 flex items-center gap-1">
                                                            <Sparkles className="w-3 h-3 text-primary" /> Student Appraisal & Conduct
                                                        </div>
                                                        <span className="font-medium">{record.appraisalNotes}</span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Final Exam Results breakdown */}
                                        {showAcademic && record.finalExamResults && record.finalExamResults.length > 0 && (
                                            <div className="overflow-x-auto border border-border/60 rounded-lg">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-muted/30 text-muted-foreground font-bold">
                                                        <tr>
                                                            <th className="px-3 py-2">Final Exam Subject</th>
                                                            <th className="px-3 py-2 text-right">Marks</th>
                                                            <th className="px-3 py-2 text-center">Grade</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/40">
                                                        {record.finalExamResults.map((sub, sIdx) => (
                                                            <tr key={sIdx} className="hover:bg-muted/10">
                                                                <td className="px-3 py-2 font-semibold text-foreground">{sub.subjectName || "Subject"}</td>
                                                                <td className="px-3 py-2 font-mono font-medium text-right">
                                                                    {sub.marksObtained ?? "-"} / {sub.maxMarks ?? 100}
                                                                </td>
                                                                <td className="px-3 py-2 text-center">
                                                                    <Badge variant="outline" className="text-[10px] font-bold py-0">
                                                                        {sub.grade || "N/A"}
                                                                    </Badge>
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}

                                        {/* Periodical Tests / Internal Assessments breakdown */}
                                        {showAcademic && record.testBreakdown && record.testBreakdown.length > 0 && (
                                            <div className="overflow-x-auto border border-border/60 rounded-lg bg-muted/5">
                                                <table className="w-full text-xs text-left">
                                                    <thead className="bg-muted/20 text-muted-foreground font-semibold text-[11px]">
                                                        <tr>
                                                            <th className="px-3 py-1.5">Periodical / Internal Assessment</th>
                                                            <th className="px-3 py-1.5 text-right">Score</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="divide-y divide-border/40">
                                                        {record.testBreakdown.map((t, tIdx) => (
                                                            <tr key={tIdx} className="hover:bg-muted/10">
                                                                <td className="px-3 py-1.5 text-foreground">{t.testName || "Assessment"}</td>
                                                                <td className="px-3 py-1.5 font-mono text-right text-muted-foreground">
                                                                    {t.marksObtained ?? "-"} / {t.maxMarks ?? 100}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Audit / Progression Trail */}
            {promotionLogs.length > 0 && (
                <div className="mt-8 pt-6 border-t border-border/60 space-y-3">
                    <h4 className="text-xs uppercase font-extrabold tracking-wider text-muted-foreground flex items-center gap-1.5">
                        <TrendingUp className="w-3.5 h-3.5 text-primary" /> Formal Progression & Promotion Trail
                    </h4>
                    <div className="space-y-2">
                        {promotionLogs.map((log) => {
                            const yearDisplay = log.targetAcademicYear || log.academicYear || log.sourceAcademicYear || "Session";
                            const statusDisplay = log.action || log.promotionStatus || "PROMOTED";
                            return (
                                <div key={log.id} className="p-3 rounded-xl bg-muted/20 border border-border/50 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <Badge variant="outline" className="font-mono text-[10px] font-bold">
                                            {yearDisplay}
                                        </Badge>
                                        <span className="font-semibold text-foreground">
                                            {log.sourceClassroom ? `${log.sourceClassroom.name} - ${log.sourceClassroom.section}` : "Initial"}
                                        </span>
                                        <ArrowUpRight className="w-3.5 h-3.5 text-muted-foreground" />
                                        <span className="font-bold text-primary">
                                            {log.targetClassroom ? `${log.targetClassroom.name} - ${log.targetClassroom.section}` : statusDisplay}
                                        </span>
                                        {log.isManualOverride && (
                                            <Badge variant="secondary" className="text-[9px] bg-amber-500/15 text-amber-700 dark:text-amber-400 border border-amber-500/30 py-0">
                                                Override: {log.overrideReason || "Approved"}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-muted-foreground flex items-center gap-2 shrink-0">
                                        <Badge className="text-[10px] py-0">{statusDisplay}</Badge>
                                        {log.createdAt && <span>{new Date(log.createdAt).toLocaleDateString()}</span>}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// Main Page Component
// =============================================================================
export default function StudentDetailsPage() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { can } = usePermissions();

    const [editOpen, setEditOpen] = useState(false);

    const { data: student, isLoading, error: fetchError } = useQuery<Student>({
        queryKey: ["student", id],
        queryFn: async () => {
            const { data } = await api.get(`/students/${id}`);
            return data.data.student as Student;
        },
        enabled: !!id && can("students", "read"),
        staleTime: 30_000,
    });

    if (!can("students", "read")) return <AccessDenied />;

    if (isLoading) {
        return <ProfilePageSkeleton />;
    }

    if (fetchError || !student) {
        return (
            <div className="flex flex-col items-center justify-center h-64 gap-3 text-muted-foreground">
                <GraduationCap className="h-10 w-10 text-muted-foreground/40" />
                <p className="font-semibold text-sm text-foreground">Student not found</p>
                <Button variant="outline" size="sm" className="rounded-xl hover:bg-accent hover:text-accent-foreground" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4 mr-2" /> Go Back
                </Button>
            </div>
        );
    }

    const { account } = student;
    const fullName = `${account.firstName} ${account.lastName}`;
    const initials = `${account.firstName[0]}${account.lastName[0]}`.toUpperCase();
    const photoUrl = student.profilePhotoUrl
        ? `${API_BASE}${student.profilePhotoUrl}`
        : null;

    // First active classroom enrollment
    const enrollment = student.classroomEnrollments?.[0];
    const classroom = enrollment?.classroom;

    const handleEditSuccess = () => {
        qc.invalidateQueries({ queryKey: ["student", id] });
        qc.invalidateQueries({ queryKey: ["students"] });
    };

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
                                {photoUrl ? (
                                    <img
                                        src={photoUrl}
                                        alt={fullName}
                                        className="h-full w-full object-cover"
                                        onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
                                    />
                                ) : (
                                    <Avatar className="h-full w-full">
                                        <AvatarFallback className="bg-transparent text-primary text-3xl font-black">
                                            {initials}
                                        </AvatarFallback>
                                    </Avatar>
                                )}
                            </div>
                            {/* Online-style status dot */}
                            <span className={`absolute bottom-1.5 right-1.5 h-4 w-4 rounded-full border-2 border-background
                                             ${student.status === "ACTIVE"
                                    ? "bg-emerald-500"
                                    : student.status === "SUSPENDED"
                                        ? "bg-amber-500"
                                        : "bg-muted-foreground"}`}
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
                                    className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg ${STATUS_STYLES[student.status]}`}
                                >
                                    {student.status}
                                </Badge>
                                {classroom && ((classroom as any).monitorMaleId === student.id || (classroom as any).monitorFemaleId === student.id) && (
                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-lg bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20">
                                        Monitor
                                    </Badge>
                                )}
                            </div>

                            {/* Admission number chip */}
                            {student.admissionNumber && (
                                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
                                    <Hash className="h-3 w-3 text-primary" />
                                    <span className="text-xs font-mono font-bold text-primary">
                                        {student.admissionNumber}
                                    </span>
                                </div>
                            )}

                            {/* Secondary meta row */}
                            <div className="flex flex-wrap items-center gap-3 mt-0.5">
                                <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                    <Mail className="h-3 w-3" />
                                    {account.email}
                                </span>
                                {student.gender && (
                                    <span className="text-xs text-muted-foreground font-semibold">
                                        {student.gender}
                                    </span>
                                )}
                                {student.dateOfBirth && (
                                    <span className="text-xs text-muted-foreground font-semibold flex items-center gap-1">
                                        <CalendarDays className="h-3 w-3" />
                                        {new Date(student.dateOfBirth).toLocaleDateString("en-IN", {
                                            day: "2-digit", month: "short", year: "numeric",
                                        })}
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* ── Edit button ── */}
                        {can("students", "update") && (
                            <Button
                                onClick={() => setEditOpen(true)}
                                className="gap-2 h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md
                                           w-full sm:w-auto shrink-0 sm:self-start hover:scale-[1.02] active:scale-[0.98] transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <Pencil className="h-4 w-4" />
                                Edit Profile
                            </Button>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* GRID LAYOUT                                                     */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">

                {/* ── 1. Academic Matrix ─────────────────────────────────────── */}
                <div className="lg:col-span-2">
                    <SectionCard title="Academic Matrix" icon={BookOpen} accent="primary">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <DetailRow icon={Hash} label="Roll Number" value={student.classroomEnrollments?.[0]?.rollNumber || "Unassigned"} mono />
                            <DetailRow icon={School} label="Classroom"
                                value={classroom
                                    ? `${classroom.name} – ${classroom.section} (${classroom.academicYear})`
                                    : undefined}
                            />
                            <DetailRow icon={Users} label="Section" value={student.section} />
                            <DetailRow icon={GraduationCap} label="Grade" value={student.grade} />
                            <DetailRow icon={Hash} label="Student ID" value={student.studentId} mono />
                            {student.previousSchoolDetails && (
                                <DetailRow icon={BookOpen} label="Previous School" value={student.previousSchoolDetails} />
                            )}
                        </div>
                    </SectionCard>
                </div>

                {/* ── 2. Logistical & Legal ──────────────────────────────────── */}
                <div className="lg:col-span-1">
                    <SectionCard title="Logistical & Legal" icon={Fingerprint} accent="emerald">
                        <DetailRow
                            icon={Fingerprint} label="Government ID"
                            value={student.governmentId} mono
                        />
                        <DetailRow
                            icon={Bus} label="Transportation"
                            value={student.transportationMode
                                ? TRANSPORT_LABEL[student.transportationMode]
                                : undefined}
                        />
                        <DetailRow
                            icon={BadgeDollarSign} label="Fee Quota"
                            value={FEE_LABEL[student.feeQuota]}
                        />
                        {student.transferCertificateUrl && (
                            <DetailRow
                                icon={ShieldCheck} label="Transfer Certificate"
                                value="View Document"
                                href={student.transferCertificateUrl}
                            />
                        )}
                    </SectionCard>
                </div>

                {/* ── 3. Guardian Details ────────────────────────────────────── */}
                <div className="lg:col-span-2">
                    <SectionCard title="Guardian Details" icon={Users} accent="accent">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4">
                            <DetailRow icon={Users} label="Guardian Name" value={student.guardianName} />
                            <DetailRow icon={ShieldCheck} label="Relationship" value={student.guardianRelationship} />
                            {student.guardianPhone && (
                                <DetailRow
                                    icon={Phone} label="Phone"
                                    value={student.guardianPhone}
                                    href={`tel:${student.guardianPhone}`}
                                />
                            )}
                            {student.guardianEmail && (
                                <DetailRow
                                    icon={Mail} label="Email"
                                    value={student.guardianEmail}
                                    href={`mailto:${student.guardianEmail}`}
                                />
                            )}
                            {student.permanentAddress && (
                                <DetailRow icon={MapPin} label="Permanent Address" value={student.permanentAddress} />
                            )}
                            {student.currentAddress && student.currentAddress !== student.permanentAddress && (
                                <DetailRow icon={MapPin} label="Current Address" value={student.currentAddress} />
                            )}
                        </div>
                    </SectionCard>
                </div>

                {/* ── 4. Emergency & Medical ─────────────────────────────────── */}
                <div className="lg:col-span-1">
                    <SectionCard title="Emergency & Medical" icon={HeartPulse} accent="destructive">
                        {/* Blood group — high-visibility badge */}
                        <div className="flex items-start gap-3 py-2.5 border-b border-border/60">
                            <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                                <Droplets className="h-3.5 w-3.5 text-destructive" />
                            </div>
                            <div className="flex flex-col gap-1">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Blood Group
                                </span>
                                {student.bloodGroup ? (
                                    <Badge
                                        variant="outline"
                                        className={`text-sm font-black w-fit px-3 py-0.5 rounded-lg ${BLOOD_COLORS[student.bloodGroup] ?? "bg-background text-foreground border-border"}`}
                                    >
                                        {student.bloodGroup}
                                    </Badge>
                                ) : (
                                    <span className="text-[13px] text-muted-foreground font-normal italic">
                                        Not recorded
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Medical notes — alert-styled if present */}
                        <div className="flex items-start gap-3 py-2.5">
                            <div className="h-7 w-7 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0 mt-0.5">
                                <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                            </div>
                            <div className="flex flex-col gap-1 flex-1 min-w-0">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                    Medical Notes
                                </span>
                                {student.medicalNotes ? (
                                    <div className="mt-0.5 px-3 py-2 rounded-xl bg-destructive/5
                                                    border border-destructive/20 text-[12px]
                                                    font-medium text-destructive leading-relaxed">
                                        {student.medicalNotes}
                                    </div>
                                ) : (
                                    <span className="text-[13px] text-muted-foreground font-normal italic">
                                        No medical notes on record
                                    </span>
                                )}
                            </div>
                        </div>
                    </SectionCard>
                </div>
            </div>

            {/* ── 5. Permanent Academic History & Progression Timeline ──── */}
            <Card className="border border-primary/20 rounded-2xl overflow-hidden shadow-xs bg-card">
                <div className="px-6 py-4 border-b border-border/60 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-xs shadow-primary/25">
                            <History className="h-4 w-4" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-foreground tracking-tight">Academic History & Progression</h2>
                            <p className="text-xs text-muted-foreground">Permanent verified academic record across classes and academic sessions</p>
                        </div>
                    </div>
                    <Badge variant="outline" className="hidden sm:flex text-xs font-mono font-bold bg-background/80">
                        Append-Only Record
                    </Badge>
                </div>
                <StudentAcademicHistoryTimeline studentId={id as string} />
            </Card>

            {/* ── 6. Published Exam Results ──────────────────────────────── */}
            <Card className="border border-border/60 rounded-2xl overflow-hidden shadow-sm bg-card">
                <div className="px-6 py-4 border-b border-border/60 bg-muted/10 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <BookOpen className="h-4 w-4 text-primary" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">Published Exam Results</h2>
                </div>
                <StudentExamResults studentId={id as string} />
            </Card>

            {/* ── 6. Daily Attendance ──────────────────────────────────────── */}
            <Card className="border border-border/60 rounded-2xl overflow-hidden shadow-sm bg-card">
                <div className="px-6 py-4 border-b border-border/60 bg-muted/10 flex items-center gap-3">
                    <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center shrink-0">
                        <CalendarDays className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <h2 className="text-lg font-bold text-foreground tracking-tight">Daily Attendance</h2>
                </div>
                <StudentAttendanceCard studentId={id as string} />
            </Card>

            {/* ── Edit dialog ─────────────────────────────────────────────── */}
            <AdmissionFormDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                editTarget={student}
                onSuccess={handleEditSuccess}
            />
        </motion.div>
    );
}
