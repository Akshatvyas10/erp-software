import { Badge } from "@/components/ui/badge";
import type { LeaveRequestStatus } from "@/types/erp";

interface LeaveStatusBadgeProps {
    status: LeaveRequestStatus | string;
    className?: string;
}

export function LeaveStatusBadge({ status, className = "" }: LeaveStatusBadgeProps) {
    switch (status) {
        case "APPROVED":
            return (
                <Badge
                    variant="outline"
                    className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 ${className}`}
                >
                    Approved
                </Badge>
            );
        case "PENDING":
            return (
                <Badge
                    variant="outline"
                    className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 ${className}`}
                >
                    Pending Review
                </Badge>
            );
        case "REJECTED":
            return (
                <Badge
                    variant="outline"
                    className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-destructive/10 text-destructive border-destructive/20 ${className}`}
                >
                    Rejected
                </Badge>
            );
        case "CANCELLED":
            return (
                <Badge
                    variant="outline"
                    className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-full bg-muted/60 text-muted-foreground border-border ${className}`}
                >
                    Cancelled
                </Badge>
            );
        default:
            return (
                <Badge variant="outline" className={`text-[11px] ${className}`}>
                    {status}
                </Badge>
            );
    }
}
