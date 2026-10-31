import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
    Activity, Search, AlertTriangle, CheckCircle2,
    TrendingDown, Users, ArrowUpDown, Eye
} from "lucide-react";
import api from "@/lib/api";
import type { TeacherWorkload, TeacherWorkloadSummary, WorkloadStatus } from "@/types/erp";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { TeacherScheduleDetailModal } from "@/features/teachers/components/TeacherScheduleDetailModal";
import type { DayOfWeek } from "@/types/erp";

const WORK_DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

export function TeacherWorkloadMatrix() {
    const navigate = useNavigate();
    const [search, setSearch] = useState("");
    const [departmentFilter, setDepartmentFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [sortBy, setSortBy] = useState<"periods-desc" | "periods-asc" | "name">("periods-desc");

    // Detail Modal State
    const [scheduleModal, setScheduleModal] = useState<{
        open: boolean;
        teacher: TeacherWorkload | null;
        initialDay: DayOfWeek;
    }>({
        open: false,
        teacher: null,
        initialDay: 'Monday',
    });

    const { data, isLoading } = useQuery<{
        summary: TeacherWorkloadSummary;
        matrix: TeacherWorkload[];
    }>({
        queryKey: ["teacher-workload-matrix", departmentFilter, search],
        queryFn: async () => {
            const params = new URLSearchParams();
            if (departmentFilter && departmentFilter !== "all") params.set("department", departmentFilter);
            if (search.trim()) params.set("search", search.trim());
            const res = await api.get(`/teachers/workload?${params}`);
            return res.data?.data;
        },
        staleTime: 30_000,
    });

    const summary = data?.summary;
    const matrix = data?.matrix || [];

    // Distinct departments
    const departments = useMemo(() => {
        const set = new Set<string>();
        matrix.forEach((t) => {
            if (t.department) set.add(t.department);
        });
        return Array.from(set).sort();
    }, [matrix]);

    // Filter & Sort
    const filteredMatrix = useMemo(() => {
        let result = [...matrix];

        if (statusFilter !== "all") {
            result = result.filter((t) => t.loadStatus === statusFilter);
        }

        result.sort((a, b) => {
            if (sortBy === "periods-desc") return b.totalPeriods - a.totalPeriods;
            if (sortBy === "periods-asc") return a.totalPeriods - b.totalPeriods;
            return a.name.localeCompare(b.name);
        });

        return result;
    }, [matrix, statusFilter, sortBy]);

    const getStatusBadge = (status: WorkloadStatus) => {
        switch (status) {
            case "OVERLOADED":
                return (
                    <Badge variant="outline" className="bg-rose-500/10 text-rose-700 dark:text-rose-300 border-rose-500/30 gap-1 text-[10px] font-bold">
                        <AlertTriangle className="w-3 h-3 text-rose-600" /> Overloaded
                    </Badge>
                );
            case "BALANCED":
                return (
                    <Badge variant="outline" className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 border-emerald-500/30 gap-1 text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Balanced
                    </Badge>
                );
            case "UNDERLOADED":
                return (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-300 border-amber-500/30 gap-1 text-[10px] font-bold">
                        <TrendingDown className="w-3 h-3 text-amber-600" /> Underloaded
                    </Badge>
                );
        }
    };

    const getCellHeatmapCls = (count: number) => {
        if (count >= 6) return "bg-rose-500/20 text-rose-900 dark:text-rose-100 font-black border-rose-500/40";
        if (count >= 5) return "bg-amber-500/20 text-amber-900 dark:text-amber-100 font-bold border-amber-500/40";
        if (count >= 3) return "bg-emerald-500/15 text-emerald-900 dark:text-emerald-100 font-semibold border-emerald-500/30";
        if (count > 0) return "bg-blue-500/10 text-blue-900 dark:text-blue-200 border-blue-500/20";
        return "bg-muted/20 text-muted-foreground/40 border-border/30";
    };

    return (
        <div className="space-y-5">
            {/* ── Summary Metrics ── */}
            {summary && (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <Card className="rounded-2xl border-border/80 bg-card/60 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                                <Users className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Total Teachers</p>
                                <p className="text-xl font-black text-foreground">{summary.totalTeachers}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-rose-500/30 bg-rose-500/5 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                                <AlertTriangle className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">Overloaded</p>
                                <p className="text-xl font-black text-rose-900 dark:text-rose-100">{summary.overloadedCount}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-emerald-500/30 bg-emerald-500/5 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">Balanced</p>
                                <p className="text-xl font-black text-emerald-900 dark:text-emerald-100">{summary.balancedCount}</p>
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="rounded-2xl border-amber-500/30 bg-amber-500/5 shadow-xs">
                        <CardContent className="p-4 flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                                <TrendingDown className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">Underloaded</p>
                                <p className="text-xl font-black text-amber-900 dark:text-amber-100">{summary.underloadedCount}</p>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}

            {/* ── Filters & Controls ── */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by faculty name or email..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 h-9 rounded-xl text-xs bg-muted/40 border-border/80"
                        />
                    </div>

                    <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                        <SelectTrigger className="w-[160px] h-9 rounded-xl text-xs bg-muted/40 border-border/80">
                            <SelectValue placeholder="Department" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Departments</SelectItem>
                            {departments.map((d) => (
                                <SelectItem key={d} value={d}>{d}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-[150px] h-9 rounded-xl text-xs bg-muted/40 border-border/80">
                            <SelectValue placeholder="Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Statuses</SelectItem>
                            <SelectItem value="OVERLOADED">Overloaded</SelectItem>
                            <SelectItem value="BALANCED">Balanced</SelectItem>
                            <SelectItem value="UNDERLOADED">Underloaded</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
                    <SelectTrigger className="w-[170px] h-9 rounded-xl text-xs bg-muted/40 border-border/80">
                        <ArrowUpDown className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                        <SelectValue placeholder="Sort By" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                        <SelectItem value="periods-desc">Periods (High to Low)</SelectItem>
                        <SelectItem value="periods-asc">Periods (Low to High)</SelectItem>
                        <SelectItem value="name">Teacher Name</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* ── Heatmap & Workload Matrix Table ── */}
            {isLoading ? (
                <div className="space-y-2 p-6 border rounded-2xl bg-card">
                    <Skeleton className="h-6 w-48" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                    <Skeleton className="h-10 w-full" />
                </div>
            ) : filteredMatrix.length === 0 ? (
                <div className="py-16 text-center border border-dashed rounded-2xl border-border bg-muted/20">
                    <Activity className="w-10 h-10 text-muted-foreground/40 mx-auto mb-2" />
                    <p className="text-sm font-bold text-foreground">No teachers match the selected criteria</p>
                    <p className="text-xs text-muted-foreground mt-0.5">Try clearing your filters or search keywords.</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-border overflow-hidden shadow-xs bg-card">
                    <div className="overflow-x-auto custom-scrollbar">
                        <Table className="min-w-[900px] border-collapse">
                            <TableHeader>
                                <TableRow className="bg-muted/40 hover:bg-muted/40 border-b border-border/70">
                                    <TableHead className="pl-5 py-3.5 min-w-[200px] text-xs font-bold text-muted-foreground">
                                        Faculty Member
                                    </TableHead>
                                    <TableHead className="py-3.5 px-3 min-w-[120px] text-xs font-bold text-muted-foreground">
                                        Department
                                    </TableHead>
                                    <TableHead className="py-3.5 px-3 text-center min-w-[130px] text-xs font-bold text-muted-foreground">
                                        Weekly Load
                                    </TableHead>
                                    {WORK_DAYS.map((day) => (
                                        <TableHead key={day} className="py-3.5 px-2 text-center min-w-[65px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                            {day.slice(0, 3)}
                                        </TableHead>
                                    ))}
                                    <TableHead className="py-3.5 px-3 text-center min-w-[110px] text-xs font-bold text-muted-foreground">
                                        Status
                                    </TableHead>
                                    <TableHead className="pr-5 py-3.5 text-right min-w-[70px] text-xs font-bold text-muted-foreground">
                                        Action
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {filteredMatrix.map((t) => (
                                    <TableRow
                                        key={t.id}
                                        className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors"
                                    >
                                        <TableCell
                                            className="pl-5 py-3 cursor-pointer hover:bg-muted/50"
                                            onClick={() => setScheduleModal({ open: true, teacher: t, initialDay: 'Monday' })}
                                        >
                                            <div className="font-bold text-sm text-foreground hover:text-primary transition-colors">{t.name}</div>
                                            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
                                                ID: {t.teacherId} {t.employeeNumber ? `• Emp #${t.employeeNumber}` : ""}
                                            </div>
                                        </TableCell>

                                        <TableCell className="py-3 px-3">
                                            <Badge variant="outline" className="text-[10px] font-medium bg-muted/30">
                                                {t.department}
                                            </Badge>
                                        </TableCell>

                                        <TableCell
                                            className="py-3 px-3 text-center cursor-pointer hover:bg-muted/50"
                                            onClick={() => setScheduleModal({ open: true, teacher: t, initialDay: 'Monday' })}
                                        >
                                            <div className="font-extrabold text-sm font-mono text-foreground">
                                                {t.totalPeriods} <span className="text-[11px] font-normal text-muted-foreground">/ {t.maxPeriodsPerWeek}</span>
                                            </div>
                                            <div className="text-[10px] text-muted-foreground font-medium mt-0.5">
                                                {t.freePeriods} free periods
                                            </div>
                                        </TableCell>

                                        {WORK_DAYS.map((day) => {
                                            const count = t.dailyCounts[day] || 0;
                                            return (
                                                <TableCell key={day} className="py-3 px-2 text-center">
                                                    <button
                                                        type="button"
                                                        onClick={() => setScheduleModal({ open: true, teacher: t, initialDay: day })}
                                                        className={`inline-flex items-center justify-center w-8 h-8 rounded-lg text-xs border transition-all cursor-pointer hover:scale-110 active:scale-95 hover:shadow-sm ${getCellHeatmapCls(count)}`}
                                                        title={`Click to view ${t.name}'s ${day} schedule (${count} periods)`}
                                                    >
                                                        {count}
                                                    </button>
                                                </TableCell>
                                            );
                                        })}

                                        <TableCell className="py-3 px-3 text-center">
                                            {getStatusBadge(t.loadStatus)}
                                        </TableCell>

                                        <TableCell className="pr-5 py-3 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 px-2.5 rounded-lg text-xs font-bold border-border/80 hover:bg-muted gap-1"
                                                    onClick={() => setScheduleModal({ open: true, teacher: t, initialDay: 'Monday' })}
                                                    title="View Full Week Schedule"
                                                >
                                                    Schedule
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-8 px-2.5 rounded-lg text-xs font-bold text-primary hover:bg-primary/10 gap-1"
                                                    onClick={() => navigate(`/dashboard/teachers/${t.id}`)}
                                                    title="View Faculty Profile"
                                                >
                                                    <Eye className="w-3.5 h-3.5" /> View
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            {/* Teacher Schedule Detail Modal */}
            <TeacherScheduleDetailModal
                open={scheduleModal.open}
                onOpenChange={(open) => setScheduleModal((prev) => ({ ...prev, open }))}
                teacher={scheduleModal.teacher}
                initialDay={scheduleModal.initialDay}
            />
        </div>
    );
}
