import {
    Clock, MapPin, Layers,
    Calendar, Info
} from "lucide-react";
import type { WorkloadPeriodSlot, DayOfWeek } from "@/types/erp";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";

const WEEKDAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;

interface TeacherScheduleDetailModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    teacher: {
        id: string;
        name: string;
        teacherId: string;
        department: string;
        designation: string;
        dailyDistribution: Record<string, WorkloadPeriodSlot[]>;
        totalPeriods: number;
        maxPeriodsPerWeek: number;
    } | null;
    initialDay?: DayOfWeek;
}

export function TeacherScheduleDetailModal({
    open,
    onOpenChange,
    teacher,
    initialDay = 'Monday',
}: TeacherScheduleDetailModalProps) {
    if (!teacher) return null;

    const totalDaysCount = WEEKDAYS.reduce((acc, day) => acc + (teacher.dailyDistribution[day]?.length || 0), 0);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl max-h-[85vh] p-0 rounded-2xl border-border/80 shadow-2xl flex flex-col overflow-hidden bg-card">
                {/* Header */}
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/70 shrink-0">
                    <div className="flex items-center justify-between gap-3">
                        <div>
                            <div className="flex items-center gap-2">
                                <DialogTitle className="text-lg font-black text-foreground">
                                    {teacher.name}
                                </DialogTitle>
                                <Badge variant="outline" className="text-[10px] font-mono">
                                    {teacher.teacherId}
                                </Badge>
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                {teacher.designation} • {teacher.department} • <strong className="text-foreground">{totalDaysCount} periods/week</strong> (Max: {teacher.maxPeriodsPerWeek})
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* Day Tabs */}
                <Tabs defaultValue={initialDay} className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 pt-3 pb-2 border-b border-border/60 bg-muted/10 shrink-0">
                        <TabsList className="grid grid-cols-6 h-9 p-1 bg-muted/60 rounded-xl">
                            {WEEKDAYS.map((day) => {
                                const periodsCount = teacher.dailyDistribution[day]?.length || 0;
                                return (
                                    <TabsTrigger
                                        key={day}
                                        value={day}
                                        className="rounded-lg text-xs font-bold gap-1 data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:shadow-xs"
                                    >
                                        <span>{day.slice(0, 3)}</span>
                                        <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                                            periodsCount > 0 ? "bg-primary/10 text-primary" : "text-muted-foreground"
                                        }`}>
                                            {periodsCount}
                                        </span>
                                    </TabsTrigger>
                                );
                            })}
                        </TabsList>
                    </div>

                    <ScrollArea className="flex-1 p-6">
                        {WEEKDAYS.map((day) => {
                            const periods = teacher.dailyDistribution[day] || [];

                            return (
                                <TabsContent key={day} value={day} className="m-0 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5 text-primary" />
                                            {day}'s Lectures Schedule
                                        </h4>
                                        <span className="text-xs font-mono font-bold text-foreground">
                                            {periods.length} lecture{periods.length !== 1 ? 's' : ''} assigned
                                        </span>
                                    </div>

                                    {periods.length === 0 ? (
                                        <div className="py-12 border border-dashed rounded-2xl border-border bg-muted/10 text-center space-y-2">
                                            <Info className="w-8 h-8 text-muted-foreground/40 mx-auto" />
                                            <p className="text-sm font-bold text-foreground">No Lectures Assigned</p>
                                            <p className="text-xs text-muted-foreground">This teacher has free periods throughout {day}.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2.5">
                                            {periods.map((period, idx) => {
                                                const isProxy = period.type === 'SUBSTITUTE';

                                                return (
                                                    <div
                                                        key={`${period.slotId}-${idx}`}
                                                        className={`p-3.5 rounded-xl border transition-all ${
                                                            isProxy
                                                                ? "bg-amber-500/5 border-amber-500/30 hover:border-amber-500/50"
                                                                : "bg-muted/20 border-border/70 hover:border-border"
                                                        }`}
                                                    >
                                                        <div className="flex items-start justify-between gap-3">
                                                            <div className="flex items-start gap-3">
                                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs shrink-0 ${
                                                                    isProxy
                                                                        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300"
                                                                        : "bg-primary/10 text-primary"
                                                                }`}>
                                                                    {idx + 1}
                                                                </div>

                                                                <div className="space-y-1">
                                                                    <div className="flex items-center gap-2 flex-wrap">
                                                                        <span className="font-extrabold text-sm text-foreground">
                                                                            {period.subjectName}
                                                                        </span>
                                                                        {period.subjectCode && (
                                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                                ({period.subjectCode})
                                                                            </span>
                                                                        )}
                                                                        {isProxy && (
                                                                            <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 text-[9px] font-black">
                                                                                Proxy Duty
                                                                            </Badge>
                                                                        )}
                                                                    </div>

                                                                    <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                                                                        <div className="flex items-center gap-1 font-semibold text-foreground">
                                                                            <Layers className="w-3.5 h-3.5 text-primary" />
                                                                            <span>{period.classroomName} {period.section ? `- Sec ${period.section}` : ''}</span>
                                                                        </div>

                                                                        {period.roomNumber && (
                                                                            <div className="flex items-center gap-1">
                                                                                <MapPin className="w-3.5 h-3.5 text-muted-foreground" />
                                                                                <span>Room {period.roomNumber} {period.buildingBlock ? `(${period.buildingBlock})` : ''}</span>
                                                                            </div>
                                                                        )}
                                                                    </div>

                                                                    {isProxy && period.reason && (
                                                                        <p className="text-[10px] text-amber-800 dark:text-amber-200 bg-amber-500/10 px-2 py-0.5 rounded font-medium inline-block mt-1">
                                                                            Reason: {period.reason}
                                                                        </p>
                                                                    )}
                                                                </div>
                                                            </div>

                                                            {/* Time range & Period name badge */}
                                                            <div className="text-right shrink-0">
                                                                <Badge variant="outline" className="text-[10px] font-bold bg-card border-border/80">
                                                                    {period.periodName}
                                                                </Badge>
                                                                <div className="flex items-center justify-end gap-1 text-xs font-mono font-bold text-foreground mt-1">
                                                                    <Clock className="w-3 h-3 text-muted-foreground" />
                                                                    <span>{period.startTime} - {period.endTime}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </TabsContent>
                            );
                        })}
                    </ScrollArea>
                </Tabs>
            </DialogContent>
        </Dialog>
    );
}
