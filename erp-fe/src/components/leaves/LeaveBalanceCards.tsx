import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import type { TeacherLeaveBalance } from "@/types/erp";
import { Calendar } from "lucide-react";

interface LeaveBalanceCardsProps {
    balances: TeacherLeaveBalance[];
    isLoading?: boolean;
}

export function LeaveBalanceCards({ balances, isLoading }: LeaveBalanceCardsProps) {
    if (isLoading) {
        return (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((i) => (
                    <Card key={i} className="p-4 rounded-2xl border-border/60 space-y-3">
                        <Skeleton className="h-4 w-24 rounded-lg" />
                        <Skeleton className="h-8 w-16 rounded-lg" />
                        <Skeleton className="h-2 w-full rounded-full" />
                    </Card>
                ))}
            </div>
        );
    }

    if (!balances || balances.length === 0) {
        return (
            <Card className="p-5 border-border/60 bg-muted/20 rounded-2xl text-center text-sm text-muted-foreground">
                No active leave allocations found for current academic session.
            </Card>
        );
    }

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {balances.map((b) => {
                const opening = Number(b.openingBalance) || 0;
                const consumed = Number(b.consumedDays) || 0;
                const remaining = b.remainingDays !== undefined ? b.remainingDays : Math.max(0, opening - consumed);
                const percentUsed = opening > 0 ? Math.min(100, Math.round((consumed / opening) * 100)) : 0;
                const isPaid = b.leaveType?.isPaid ?? true;

                return (
                    <Card
                        key={b.id}
                        className="p-4.5 rounded-2xl border-border/60 bg-card hover:shadow-md transition-shadow relative overflow-hidden"
                    >
                        <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-primary" />
                                {b.leaveType?.name || b.leaveTypeId}
                            </span>
                            <span
                                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${
                                    isPaid
                                        ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                        : "bg-amber-500/10 text-amber-600 border-amber-500/20"
                                }`}
                            >
                                {isPaid ? "Paid" : "Unpaid"}
                            </span>
                        </div>

                        <div className="mt-3 flex items-baseline justify-between">
                            <div>
                                <span className="text-3xl font-black text-foreground tracking-tight">
                                    {remaining}
                                </span>
                                <span className="text-xs text-muted-foreground ml-1">days left</span>
                            </div>
                            <span className="text-xs font-medium text-muted-foreground">
                                {consumed} / {opening} used
                            </span>
                        </div>

                        <div className="mt-3">
                            <Progress value={percentUsed} className="h-1.5 bg-muted/60" />
                        </div>
                    </Card>
                );
            })}
        </div>
    );
}
