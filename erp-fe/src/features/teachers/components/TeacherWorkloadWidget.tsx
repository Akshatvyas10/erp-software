import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Clock, AlertTriangle, CheckCircle2, TrendingDown, BookOpen, Layers, ChevronRight } from "lucide-react";
import api from "@/lib/api";
import type { TeacherWorkload, DayOfWeek } from "@/types/erp";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { TeacherScheduleDetailModal } from "@/features/teachers/components/TeacherScheduleDetailModal";

interface TeacherWorkloadWidgetProps {
    teacherId: string;
}

export function TeacherWorkloadWidget({ teacherId }: TeacherWorkloadWidgetProps) {
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedDay, setSelectedDay] = useState<DayOfWeek>('Monday');

    const { data: workload, isLoading } = useQuery<TeacherWorkload>({
        queryKey: ["teacher-workload", teacherId],
        queryFn: async () => {
            const res = await api.get(`/teachers/${teacherId}/workload`);
            return res.data?.data?.workload;
        },
        staleTime: 60_000,
    });

    if (isLoading) {
        return (
            <div className="p-4 rounded-2xl border border-border/80 bg-muted/20 space-y-3">
                <Skeleton className="h-4 w-36 rounded-md" />
                <Skeleton className="h-3 w-full rounded-md" />
                <Skeleton className="h-10 w-full rounded-md" />
            </div>
        );
    }

    if (!workload) return null;

    const {
        totalPeriods,
        maxPeriodsPerWeek,
        percentage,
        loadStatus,
        dailyCounts,
        subjectsTaught,
        classroomsTaught,
    } = workload;

    const statusBadgeConfig = {
        OVERLOADED: {
            label: "Overloaded",
            className: "bg-rose-500/15 text-rose-700 dark:text-rose-300 border-rose-500/30",
            icon: AlertTriangle,
            progressColor: "bg-rose-500",
        },
        BALANCED: {
            label: "Balanced",
            className: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
            icon: CheckCircle2,
            progressColor: "bg-emerald-500",
        },
        UNDERLOADED: {
            label: "Underloaded",
            className: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
            icon: TrendingDown,
            progressColor: "bg-amber-500",
        },
    }[loadStatus];

    const StatusIcon = statusBadgeConfig.icon;

    const handleDayClick = (day: DayOfWeek) => {
        setSelectedDay(day);
        setDetailOpen(true);
    };

    return (
        <div className="p-4 rounded-2xl border border-border/80 bg-card/60 shadow-xs space-y-4">
            {/* Header info */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                        <Clock className="w-4 h-4" />
                    </div>
                    <div>
                        <h4 className="text-xs font-bold text-foreground">Weekly Period Workload</h4>
                        <p className="text-[10px] text-muted-foreground">Standard capacity: {maxPeriodsPerWeek} periods/week</p>
                    </div>
                </div>
                <Badge variant="outline" className={`gap-1 text-[10px] font-bold ${statusBadgeConfig.className}`}>
                    <StatusIcon className="w-3 h-3" />
                    {statusBadgeConfig.label}
                </Badge>
            </div>

            {/* Progress metric */}
            <div className="space-y-1.5">
                <div className="flex items-baseline justify-between text-xs">
                    <span className="font-extrabold text-foreground text-sm font-mono">
                        {totalPeriods} <span className="text-xs text-muted-foreground font-normal">/ {maxPeriodsPerWeek} periods</span>
                    </span>
                    <span className="font-bold text-[11px] text-muted-foreground font-mono">{percentage}%</span>
                </div>
                <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                        className={`h-full transition-all duration-500 ${statusBadgeConfig.progressColor}`}
                        style={{ width: `${Math.min(100, percentage)}%` }}
                    />
                </div>
            </div>

            {/* Daily counts mini-heatmap (clickable to open period detail list) */}
            <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="font-semibold uppercase tracking-wider">Day Breakdown</span>
                    <span>Click day for lecture list</span>
                </div>
                <div className="grid grid-cols-6 gap-1 pt-0.5">
                    {(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const).map(day => {
                        const count = dailyCounts[day] || 0;
                        return (
                            <button
                                key={day}
                                type="button"
                                onClick={() => handleDayClick(day)}
                                className={`p-1.5 rounded-lg border text-center transition-all cursor-pointer hover:scale-105 active:scale-95 ${
                                    count >= 6
                                        ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300 hover:bg-rose-500/20"
                                        : count >= 4
                                        ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20"
                                        : count > 0
                                        ? "bg-blue-500/10 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/20"
                                        : "bg-muted/30 border-border/40 text-muted-foreground/60 hover:bg-muted/50"
                                }`}
                                title={`Click to view ${day} periods`}
                            >
                                <span className="text-[9px] font-bold block uppercase">{day.slice(0, 3)}</span>
                                <span className="text-xs font-black font-mono">{count}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Subjects and Classrooms taught tags + View schedule trigger */}
            <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-muted-foreground">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <BookOpen className="w-3.5 h-3.5 text-primary" />
                        <span>{subjectsTaught.length} Subject{subjectsTaught.length !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-primary" />
                        <span>{classroomsTaught.length} Section{classroomsTaught.length !== 1 ? 's' : ''}</span>
                    </div>
                </div>

                <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-1.5 text-[10px] font-bold text-primary hover:bg-primary/10 gap-0.5"
                    onClick={() => {
                        setSelectedDay('Monday');
                        setDetailOpen(true);
                    }}
                >
                    Full Schedule <ChevronRight className="w-3 h-3" />
                </Button>
            </div>

            {/* Schedule details modal */}
            <TeacherScheduleDetailModal
                open={detailOpen}
                onOpenChange={setDetailOpen}
                teacher={workload}
                initialDay={selectedDay}
            />
        </div>
    );
}
