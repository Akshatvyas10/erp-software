import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Classroom } from "@/types/erp";

export interface OverviewStats {
    pendingHwCount: number;
    attendancePercent: number;
    remarksCount: number;
}

export interface OverviewSummaryCardsProps {
    classroom: Classroom;
    stats?: OverviewStats;
    studentCount?: number;
    isLoading?: boolean;
}

export function OverviewSummaryCards({
    classroom: _classroom,
    stats,
    studentCount: _studentCount = 0,
    isLoading = false
}: OverviewSummaryCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
                {[1, 2, 3, 4].map(i => (
                    <Skeleton key={i} className="h-20 sm:h-24 rounded-xl sm:rounded-2xl" />
                ))}
            </div>
        );
    }



    return (
        <div className="space-y-3 sm:space-y-4">

            {/* Quick KPI Stats Pills (Student Scoped) */}
            {stats && (
                <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="p-2 sm:p-2.5 rounded-xl border border-amber-500/20 bg-amber-500/[0.04] flex items-center justify-between text-xs">
                        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate">
                            Pending Tasks
                        </span>
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-black bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 px-1.5 py-0">
                            {stats.pendingHwCount} Due
                        </Badge>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-xl border border-emerald-500/20 bg-emerald-500/[0.04] flex items-center justify-between text-xs">
                        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate">
                            Attendance
                        </span>
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-black bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 px-1.5 py-0">
                            {stats.attendancePercent}%
                        </Badge>
                    </div>

                    <div className="p-2 sm:p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/[0.04] flex items-center justify-between text-xs">
                        <span className="text-[10px] sm:text-xs font-semibold text-muted-foreground truncate">
                            Remarks
                        </span>
                        <Badge variant="outline" className="text-[10px] sm:text-xs font-black bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30 px-1.5 py-0">
                            {stats.remarksCount} Given
                        </Badge>
                    </div>
                </div>
            )}
        </div>
    );
}
