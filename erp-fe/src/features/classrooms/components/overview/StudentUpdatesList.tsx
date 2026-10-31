import { Bell, FileText, MessageSquare, CalendarCheck, Sparkles, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { cn } from "@/lib/utils";

export interface StudentUpdateItem {
    id: string;
    type: "HOMEWORK" | "REMARK" | "LEAVE" | "NOTICE" | string;
    subType?: string;
    title: string;
    message: string;
    author?: string;
    timestamp?: string;
    referenceId?: string;
    linkTab?: string;
}

export interface StudentUpdatesListProps {
    updates: StudentUpdateItem[];
    isLoading?: boolean;
    onNavigateTab?: (tab: string) => void;
}

export function StudentUpdatesList({
    updates,
    isLoading = false,
    onNavigateTab
}: StudentUpdatesListProps) {
    return (
        <Card className="rounded-xl sm:rounded-2xl border-border/70 shadow-xs hover:border-primary/20 transition-all flex flex-col justify-between overflow-hidden">
            <CardHeader className="py-3 px-3.5 sm:px-4 border-b border-border/50 bg-muted/20 flex flex-row items-center justify-between">
                <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-xs sm:text-sm font-bold flex items-center gap-1.5 text-foreground truncate">
                            <Bell className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary shrink-0" /> Latest Updates
                        </CardTitle>
                        <Badge variant="secondary" className="text-[10px] font-bold px-1.5 py-0 rounded-full shrink-0">
                            Feed
                        </Badge>
                    </div>
                    <CardDescription className="text-[11px] sm:text-xs text-muted-foreground truncate">
                        Announcements, teacher feedback, and status notices
                    </CardDescription>
                </div>
            </CardHeader>

            <CardContent className="p-3 sm:p-3.5 flex-1 space-y-2">
                {isLoading ? (
                    <div className="space-y-2">
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <Skeleton className="h-14 w-full rounded-xl" />
                    </div>
                ) : updates.length === 0 ? (
                    <div className="py-8 text-center text-muted-foreground border border-dashed rounded-xl bg-muted/10 space-y-2">
                        <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                            <Bell className="w-4 h-4 opacity-60" />
                        </div>
                        <div>
                            <p className="text-xs font-bold text-foreground">No new updates</p>
                            <p className="text-[11px] text-muted-foreground">Classroom activity logs and remarks will appear here.</p>
                        </div>
                    </div>
                ) : (
                    updates.slice(0, 5).map((up) => {
                        const getTypeIcon = () => {
                            switch (up.type) {
                                case "HOMEWORK":
                                    return <FileText className="w-3.5 h-3.5 text-primary" />;
                                case "REMARK":
                                    return <MessageSquare className="w-3.5 h-3.5 text-amber-500" />;
                                case "LEAVE":
                                    return <CalendarCheck className="w-3.5 h-3.5 text-blue-500" />;
                                default:
                                    return <Sparkles className="w-3.5 h-3.5 text-purple-500" />;
                            }
                        };

                        const getTypeBadge = () => {
                            switch (up.type) {
                                case "HOMEWORK":
                                    return <Badge variant="outline" className="text-[9px] font-bold bg-primary/10 text-primary border-primary/20 py-0 px-1.5">Homework</Badge>;
                                case "REMARK":
                                    return <Badge variant="outline" className="text-[9px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 py-0 px-1.5">{up.subType || "Remark"}</Badge>;
                                case "LEAVE":
                                    return <Badge variant="outline" className="text-[9px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 py-0 px-1.5">Leave</Badge>;
                                default:
                                    return <Badge variant="outline" className="text-[9px] font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 py-0 px-1.5">Notice</Badge>;
                            }
                        };

                        const hasDeepLink = Boolean(up.linkTab && up.linkTab !== "overview" && onNavigateTab);

                        return (
                            <div
                                key={up.id}
                                onClick={() => {
                                    if (hasDeepLink && onNavigateTab && up.linkTab) {
                                        onNavigateTab(up.linkTab);
                                    }
                                }}
                                className={cn(
                                    "p-2.5 sm:p-3 rounded-xl border border-border/70 bg-card transition-all flex items-start gap-2.5 sm:gap-3 text-xs shadow-2xs min-h-[44px]",
                                    hasDeepLink ? "cursor-pointer hover:border-primary/40 hover:bg-muted/20 group" : ""
                                )}
                            >
                                <div className="w-7 h-7 rounded-lg bg-muted/60 border border-border/60 flex items-center justify-center shrink-0 mt-0.5">
                                    {getTypeIcon()}
                                </div>
                                <div className="space-y-0.5 min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-1.5">
                                        <div className="flex items-center gap-1.5 min-w-0 truncate">
                                            {getTypeBadge()}
                                            <span className="font-bold text-foreground truncate text-xs">{up.title}</span>
                                        </div>
                                        <span className="text-[9px] text-muted-foreground font-mono shrink-0">
                                            {up.timestamp ? format(new Date(up.timestamp), "MMM dd · p") : ""}
                                        </span>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed">
                                        {up.message}
                                    </p>
                                    {up.author && (
                                        <p className="text-[10px] text-muted-foreground/80 font-medium">
                                            — By {up.author}
                                        </p>
                                    )}
                                </div>
                                {hasDeepLink && (
                                    <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-60 group-hover:opacity-100 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 self-center" />
                                )}
                            </div>
                        );
                    })
                )}
            </CardContent>
        </Card>
    );
}
