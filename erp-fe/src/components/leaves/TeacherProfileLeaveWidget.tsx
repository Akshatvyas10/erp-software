import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import type { TeacherLeaveBalance } from "@/types/erp";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Calendar, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface TeacherProfileLeaveWidgetProps {
    teacherId: string;
}

export function TeacherProfileLeaveWidget({ teacherId }: TeacherProfileLeaveWidgetProps) {
    const navigate = useNavigate();

    const { data: balances, isLoading } = useQuery({
        queryKey: ["teacher-leave-balances", teacherId],
        queryFn: async () => {
            const { data } = await api.get(`/teacher-leaves/balances/${teacherId}`);
            return data.data.balances as TeacherLeaveBalance[];
        },
        enabled: !!teacherId,
    });

    if (isLoading) {
        return (
            <Card className="p-4 rounded-2xl border-border/60 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-10 w-full" />
            </Card>
        );
    }

    if (!balances || balances.length === 0) {
        return null;
    }

    return (
        <Card className="p-4 rounded-2xl border-border/60 bg-card space-y-3">
            <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-primary" />
                    Annual Leave Balances
                </span>
                <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 text-xs text-primary gap-1 px-2"
                    onClick={() => navigate("/dashboard/leaves/approvals")}
                >
                    Review <ArrowRight className="h-3 w-3" />
                </Button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {balances.map((b) => {
                    const opening = Number(b.openingBalance) || 0;
                    const consumed = Number(b.consumedDays) || 0;
                    const remaining = b.remainingDays !== undefined ? b.remainingDays : Math.max(0, opening - consumed);

                    return (
                        <div
                            key={b.id}
                            className="p-2.5 rounded-xl border border-border/60 bg-muted/20 text-center"
                        >
                            <p className="text-[11px] font-bold text-muted-foreground uppercase truncate">
                                {b.leaveType?.code || "LEAVE"}
                            </p>
                            <p className="text-lg font-black text-foreground mt-0.5">
                                {remaining}
                            </p>
                            <p className="text-[10px] text-muted-foreground">
                                of {opening} days
                            </p>
                        </div>
                    );
                })}
            </div>
        </Card>
    );
}
