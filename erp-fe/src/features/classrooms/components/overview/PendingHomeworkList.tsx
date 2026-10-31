import { FileText, Clock3, AlertCircle, CheckCircle, ChevronRight, Calendar } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface PendingHomeworkItem {
    id: string;
    title: string;
    description?: string;
    dueDate?: string;
    subject?: {
        id?: string;
        name: string;
        code?: string;
    };
    teacher?: {
        firstName?: string;
        lastName?: string;
    };
    submissions?: Array<{
        status?: string;
        feedback?: string;
        submittedAt?: string;
    }>;
    remarks?: Array<{
        id: string;
        remark: string;
        teacherName?: string;
        createdAt?: string;
    }>;
}

export interface PendingHomeworkListProps {
    homeworks: PendingHomeworkItem[];
    totalCount?: number;
    isLoading?: boolean;
    onSelectHomework: (hw: PendingHomeworkItem) => void;
    onViewAll: () => void;
}

export function PendingHomeworkList({
    homeworks,
    totalCount = 0,
    isLoading = false,
    onSelectHomework,
    onViewAll
}: PendingHomeworkListProps) {
    return (
        <Card className="rounded-xl sm:rounded-2xl border-border/70 shadow-xs hover:border-primary/20 transition-all flex flex-col justify-between overflow-hidden">
            <CardHeader className="py-3 px-3.5 sm:px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground truncate">
                            <FileText className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-amber-500 shrink-0" /> Pending Homework
                        </CardTitle>
                        <Badge
                            variant="outline"
                            className={cn(
                                "text-[10px] font-black px-1.5 py-0 rounded-full shrink-0",
                                homeworks.length > 0
                                    ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30"
                                    : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
                            )}
                        >
                            {homeworks.length} Due
                        </Badge>
                    </div>
                    <CardDescription className="text-[11px] sm:text-xs text-muted-foreground truncate">
                        Awaiting your submission or revisions
                    </CardDescription>
                </div>
                <button
                    type="button"
                    onClick={onViewAll}
                    className="text-xs text-primary font-bold hover:underline flex items-center gap-0.5 shrink-0 ml-2"
                >
                    View All {totalCount > 0 ? `(${totalCount})` : ""} <ChevronRight className="w-3.5 h-3.5" />
                </button>
            </CardHeader>

            <CardContent className="p-3 sm:p-3.5 flex-1 space-y-2">
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <Skeleton className="h-14 w-full rounded-xl" />
                    </div>
                ) : homeworks.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/10 space-y-2">
                        <div className="w-9 h-9 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                            <CheckCircle className="w-4 h-4" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-foreground">No pending homework</p>
                            <p className="text-[11px] text-muted-foreground">All assignments are submitted and up to date.</p>
                        </div>
                    </div>
                ) : (
                    homeworks.slice(0, 5).map((hw) => {
                        const sub = hw.submissions?.[0];
                        const isRevision = sub?.status === "NOT_COMPLETED";
                        const isDueSoon = hw.dueDate && new Date(hw.dueDate).getTime() - Date.now() < 24 * 60 * 60 * 1000 * 2;

                        return (
                            <div
                                key={hw.id}
                                onClick={() => onSelectHomework(hw)}
                                className="group p-2.5 sm:p-3 rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:bg-muted/20 cursor-pointer transition-all flex items-center justify-between gap-2.5 shadow-2xs hover:shadow-xs min-h-[44px]"
                            >
                                <div className="space-y-1 min-w-0 flex-1">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20 py-0 px-1.5">
                                            {hw.subject?.name || "General"}
                                        </Badge>
                                        {isRevision ? (
                                            <Badge variant="outline" className="text-[9px] font-bold bg-destructive/10 text-destructive border-destructive/30 py-0 px-1.5 gap-1">
                                                <AlertCircle className="w-2.5 h-2.5" /> Needs Revision
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 py-0 px-1.5 gap-1">
                                                <Clock3 className="w-2.5 h-2.5" /> Pending
                                            </Badge>
                                        )}
                                    </div>
                                    <p className="font-bold text-foreground text-xs group-hover:text-primary transition-colors truncate">
                                        {hw.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium truncate">
                                        <span className={cn("flex items-center gap-1", isDueSoon ? "text-amber-600 dark:text-amber-400 font-bold" : "")}>
                                            <Calendar className="w-3 h-3 opacity-60" />
                                            Due: {hw.dueDate ? format(new Date(hw.dueDate), "MMM dd, yyyy") : "Open"}
                                        </span>
                                        {hw.teacher?.firstName && (
                                            <span>• {hw.teacher.firstName} {hw.teacher.lastName || ""}</span>
                                        )}
                                    </div>
                                </div>

                                <div className="flex items-center gap-0.5 text-primary shrink-0 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                                    <span className="text-[11px] font-bold hidden sm:inline">Details</span>
                                    <ChevronRight className="w-3.5 h-3.5" />
                                </div>
                            </div>
                        );
                    })
                )}
            </CardContent>

            {homeworks.length > 5 && (
                <div className="p-2 border-t border-border/50 text-center bg-muted/10">
                    <button
                        type="button"
                        onClick={onViewAll}
                        className="text-xs text-primary font-bold hover:underline"
                    >
                        + {homeworks.length - 5} more pending assignments
                    </button>
                </div>
            )}
        </Card>
    );
}
