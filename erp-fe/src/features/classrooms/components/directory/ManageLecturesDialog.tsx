import { useState, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import {
    Clock,
    Sparkles,
    Utensils,
    Coffee,
    AlertTriangle,
    CheckCircle2,
    Loader2,
    Sliders,
    Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";
import {
    calculatePeriods,
    type GeneratedPeriod,
} from "@/features/classrooms/utils/periodGenerator";
import type { ClassroomPeriod } from "@/types/erp";

interface ManageLecturesDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    periods: ClassroomPeriod[];
    onSuccess: () => void;
}

export function ManageLecturesDialog({
    open,
    onOpenChange,
    classroomId,
    periods,
    onSuccess,
}: ManageLecturesDialogProps) {
    // Mode: "auto" (default generator) vs "manual" (fine tuning existing periods)
    const [mode, setMode] = useState<"auto" | "manual">("auto");
    const [showConfirmOverride, setShowConfirmOverride] = useState(false);

    // Form states with sensible school defaults
    const [startTime, setStartTime] = useState("08:00");
    const [numberOfLectures, setNumberOfLectures] = useState(8);
    const [lectureDuration, setLectureDuration] = useState(45);
    const [lunchAfterLecture, setLunchAfterLecture] = useState(4);
    const [lunchDuration, setLunchDuration] = useState(30);

    // Optional short break
    const [hasShortBreak, setHasShortBreak] = useState(false);
    const [shortBreakAfterLecture, setShortBreakAfterLecture] = useState(2);
    const [shortBreakDuration, setShortBreakDuration] = useState(15);

    // Compute live matrix preview instantly
    const previewPeriods: GeneratedPeriod[] = useMemo(() => {
        return calculatePeriods({
            startTime,
            numberOfLectures,
            lectureDuration,
            lunchAfterLecture,
            lunchDuration,
            hasShortBreak,
            shortBreakAfterLecture,
            shortBreakDuration,
        });
    }, [
        startTime,
        numberOfLectures,
        lectureDuration,
        lunchAfterLecture,
        lunchDuration,
        hasShortBreak,
        shortBreakAfterLecture,
        shortBreakDuration,
    ]);

    // Total stats
    const totalInstructionalMinutes = numberOfLectures * lectureDuration;
    const finalEndTime = previewPeriods[previewPeriods.length - 1]?.endTime || startTime;

    // Backend mutation: Generate all periods
    const generateMutation = useMutation({
        mutationFn: (generated: GeneratedPeriod[]) =>
            api.post(`/classrooms/${classroomId}/periods/generate`, {
                periods: generated.map((p) => ({
                    name: p.name,
                    startTime: p.startTime,
                    endTime: p.endTime,
                    order: p.order,
                })),
            }),
        onSuccess: () => {
            toast.success("Timetable lectures & breaks generated successfully!");
            setShowConfirmOverride(false);
            onSuccess();
            onOpenChange(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to generate periods");
        },
    });

    // Backend mutation: Single period deletion (for manual mode)
    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/classrooms/${classroomId}/periods/${id}`),
        onSuccess: () => {
            toast.success("Period deleted");
            onSuccess();
        },
        onError: () => toast.error("Failed to delete period"),
    });

    const handleGenerateClick = () => {
        if (previewPeriods.length === 0) {
            toast.error("Please configure a valid schedule");
            return;
        }

        // If existing periods exist and user is generating, confirm first
        if (periods.length > 0) {
            setShowConfirmOverride(true);
        } else {
            generateMutation.mutate(previewPeriods);
        }
    };

    const inputCls =
        "h-9 bg-muted/40 border-border/80 focus-visible:ring-1 focus-visible:ring-primary rounded-xl text-xs font-semibold";
    const labelCls = "text-[11px] font-bold text-foreground mb-1 block";

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            title="Manage Lectures & Periods"
            description="Configure the daily bell schedule. Automatically calculates all lectures, breaks, and dismissal times."
            maxWidth="sm:max-w-4xl"
        >
            <div className="space-y-4 pt-1">
                {/* Mode Selector Tabs */}
                <div className="flex items-center justify-between p-1.5 rounded-xl bg-muted/50 border border-border/60">
                    <div className="flex items-center gap-1">
                        <Button
                            type="button"
                            variant={mode === "auto" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setMode("auto")}
                            className="h-7 text-xs font-bold rounded-lg gap-1.5"
                        >
                            <Sparkles className="w-3.5 h-3.5" />
                            Auto-Generate Schedule
                        </Button>
                        <Button
                            type="button"
                            variant={mode === "manual" ? "default" : "ghost"}
                            size="sm"
                            onClick={() => setMode("manual")}
                            className="h-7 text-xs font-bold rounded-lg gap-1.5"
                        >
                            <Sliders className="w-3.5 h-3.5" />
                            Current Schedule ({periods.length})
                        </Button>
                    </div>

                    <div className="hidden sm:flex items-center gap-2 text-xs text-muted-foreground pr-2 font-medium">
                        <span>Dismissal:</span>
                        <strong className="text-foreground font-bold">{finalEndTime}</strong>
                    </div>
                </div>

                {mode === "auto" ? (
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                        {/* ── PART A: Configuration Form (Left / 5 cols) ── */}
                        <div className="lg:col-span-5 space-y-3.5 p-4 rounded-2xl border border-border/70 bg-card/50">
                            <h4 className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
                                <Clock className="w-3.5 h-3.5" />
                                Schedule Settings
                            </h4>

                            {/* 1. Start Time & Duration */}
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className={labelCls}>School Start Time</label>
                                    <Input
                                        type="time"
                                        value={startTime}
                                        onChange={(e) => setStartTime(e.target.value)}
                                        className={inputCls}
                                    />
                                </div>
                                <div>
                                    <label className={labelCls}>Lecture Duration (Min)</label>
                                    <Input
                                        type="number"
                                        min={15}
                                        max={120}
                                        value={lectureDuration}
                                        onChange={(e) => setLectureDuration(Number(e.target.value))}
                                        className={inputCls}
                                    />
                                </div>
                            </div>

                            {/* 2. Number of Lectures */}
                            <div>
                                <label className={labelCls}>Number of Daily Lectures</label>
                                <Input
                                    type="number"
                                    min={1}
                                    max={14}
                                    value={numberOfLectures}
                                    onChange={(e) => setNumberOfLectures(Number(e.target.value))}
                                    className={inputCls}
                                />
                            </div>

                            {/* 3. Lunch Settings */}
                            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-2.5">
                                <span className="text-xs font-bold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                                    <Utensils className="w-3.5 h-3.5" />
                                    Lunch Break
                                </span>
                                <div className="grid grid-cols-2 gap-2.5">
                                    <div>
                                        <label className={labelCls}>After Lecture #</label>
                                        <Input
                                            type="number"
                                            min={1}
                                            max={Math.max(1, numberOfLectures - 1)}
                                            value={lunchAfterLecture}
                                            onChange={(e) => setLunchAfterLecture(Number(e.target.value))}
                                            className={inputCls}
                                        />
                                    </div>
                                    <div>
                                        <label className={labelCls}>Lunch Duration (Min)</label>
                                        <Input
                                            type="number"
                                            min={10}
                                            max={90}
                                            value={lunchDuration}
                                            onChange={(e) => setLunchDuration(Number(e.target.value))}
                                            className={inputCls}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* 4. Optional Short Break */}
                            <div className="p-3 rounded-xl bg-blue-500/5 border border-blue-500/20 space-y-2.5">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-bold text-blue-700 dark:text-blue-400 flex items-center gap-1.5">
                                        <Coffee className="w-3.5 h-3.5" />
                                        Include Short Break
                                    </span>
                                    <Switch
                                        checked={hasShortBreak}
                                        onCheckedChange={setHasShortBreak}
                                    />
                                </div>
                                {hasShortBreak && (
                                    <div className="grid grid-cols-2 gap-2.5 pt-1">
                                        <div>
                                            <label className={labelCls}>After Lecture #</label>
                                            <Input
                                                type="number"
                                                min={1}
                                                max={Math.max(1, numberOfLectures - 1)}
                                                value={shortBreakAfterLecture}
                                                onChange={(e) =>
                                                    setShortBreakAfterLecture(Number(e.target.value))
                                                }
                                                className={inputCls}
                                            />
                                        </div>
                                        <div>
                                            <label className={labelCls}>Duration (Min)</label>
                                            <Input
                                                type="number"
                                                min={5}
                                                max={45}
                                                value={shortBreakDuration}
                                                onChange={(e) =>
                                                    setShortBreakDuration(Number(e.target.value))
                                                }
                                                className={inputCls}
                                            />
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Action Buttons */}
                            <div className="pt-2">
                                <Button
                                    type="button"
                                    onClick={handleGenerateClick}
                                    disabled={generateMutation.isPending || previewPeriods.length === 0}
                                    className="w-full gap-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95 shadow-xs"
                                >
                                    {generateMutation.isPending ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                    ) : (
                                        <Sparkles className="w-3.5 h-3.5" />
                                    )}
                                    Generate & Save Schedule
                                </Button>
                            </div>
                        </div>

                        {/* ── PART B: Live Matrix Preview (Right / 7 cols) ── */}
                        <div className="lg:col-span-7 flex flex-col justify-between p-4 rounded-2xl border border-border/70 bg-muted/10">
                            <div>
                                <div className="flex items-center justify-between pb-3 border-b border-border/60 mb-2">
                                    <div>
                                        <h4 className="text-xs font-bold text-foreground">
                                            Live Schedule Matrix Preview
                                        </h4>
                                        <p className="text-[11px] text-muted-foreground">
                                            Updates dynamically as you tweak time parameters
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-1.5">
                                        <Badge variant="outline" className="text-[10px] font-bold">
                                            {previewPeriods.length} Total Periods
                                        </Badge>
                                        <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                                            {totalInstructionalMinutes} Min Teaching
                                        </Badge>
                                    </div>
                                </div>

                                <ScrollArea className="h-[280px] w-full pr-2">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="border-border/60 hover:bg-transparent">
                                                <TableHead className="w-12 text-[10px] font-bold">#</TableHead>
                                                <TableHead className="text-[10px] font-bold">Period Name</TableHead>
                                                <TableHead className="text-[10px] font-bold">Start</TableHead>
                                                <TableHead className="text-[10px] font-bold">End</TableHead>
                                                <TableHead className="text-[10px] font-bold">Type</TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {previewPeriods.map((p) => {
                                                const isLunch = p.type === "LUNCH";
                                                const isBreak = p.type === "BREAK";
                                                return (
                                                    <TableRow
                                                        key={p.order}
                                                        className={`border-border/50 ${
                                                            isLunch
                                                                ? "bg-amber-500/10 hover:bg-amber-500/15"
                                                                : isBreak
                                                                ? "bg-blue-500/10 hover:bg-blue-500/15"
                                                                : "hover:bg-muted/40"
                                                        }`}
                                                    >
                                                        <TableCell className="font-mono text-xs font-bold">
                                                            {p.order}
                                                        </TableCell>
                                                        <TableCell className="font-semibold text-xs text-foreground">
                                                            {p.name}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            {p.startTime}
                                                        </TableCell>
                                                        <TableCell className="font-mono text-xs text-muted-foreground">
                                                            {p.endTime}
                                                        </TableCell>
                                                        <TableCell>
                                                            {isLunch ? (
                                                                <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-none text-[9px] font-bold px-1.5 py-0.5">
                                                                    Lunch Break
                                                                </Badge>
                                                            ) : isBreak ? (
                                                                <Badge className="bg-blue-500/20 text-blue-700 dark:text-blue-300 border-none text-[9px] font-bold px-1.5 py-0.5">
                                                                    Short Break
                                                                </Badge>
                                                            ) : (
                                                                <Badge variant="outline" className="text-[9px] font-medium px-1.5 py-0.5">
                                                                    {p.durationMinutes} min
                                                                </Badge>
                                                            )}
                                                        </TableCell>
                                                    </TableRow>
                                                );
                                            })}
                                        </TableBody>
                                    </Table>
                                </ScrollArea>
                            </div>

                            <div className="pt-3 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                                <span>Day Span: {startTime} → {finalEndTime}</span>
                                <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-bold">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Ready to Apply
                                </span>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* ── MANUAL / CURRENT PERIODS VIEW ── */
                    <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/50">
                        <div className="flex items-center justify-between pb-2 border-b border-border/60">
                            <div>
                                <h4 className="text-xs font-bold text-foreground">Existing Scheduled Periods</h4>
                                <p className="text-[11px] text-muted-foreground">
                                    Currently defined period time-slots for this classroom
                                </p>
                            </div>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => setMode("auto")}
                                className="h-7 text-xs font-bold rounded-lg text-primary"
                            >
                                <Sparkles className="w-3 h-3 mr-1" />
                                Re-generate with Auto Generator
                            </Button>
                        </div>

                        <ScrollArea className="h-[280px] w-full">
                            {periods.length === 0 ? (
                                <div className="h-44 flex flex-col items-center justify-center text-xs text-muted-foreground italic">
                                    No periods defined. Switch to Auto-Generate Schedule to set up periods in seconds.
                                </div>
                            ) : (
                                <div className="space-y-1.5">
                                    {periods.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex items-center justify-between px-3.5 py-2.5 rounded-xl border border-border/60 bg-background/50 hover:bg-muted/40 text-xs"
                                        >
                                            <div className="font-bold text-foreground flex items-center gap-2">
                                                <span className="w-5 h-5 rounded-md bg-primary/10 text-primary flex items-center justify-center text-[10px]">
                                                    {p.order}
                                                </span>
                                                {p.name}
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="font-mono text-muted-foreground text-[11px]">
                                                    {p.startTime.slice(0, 5)} → {p.endTime.slice(0, 5)}
                                                </span>
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={deleteMutation.isPending}
                                                    className="h-6 w-6 text-destructive/70 hover:text-destructive"
                                                    onClick={() => deleteMutation.mutate(p.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                )}
            </div>

            {/* Overwrite Confirmation Dialog */}
            <ResponsiveModal
                open={showConfirmOverride}
                onOpenChange={setShowConfirmOverride}
                title="Regenerate Timetable Periods?"
                description="This will replace all current period boundaries for this classroom"
            >
                <div className="space-y-4 py-2">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold mb-0.5">Warning: Schedule Overwrite</p>
                            <p>
                                This classroom already has <strong>{periods.length} active periods</strong>. Replacing them will update the timetable columns and may require re-slotting existing subjects if lecture timings shift.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-border/70">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowConfirmOverride(false)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={generateMutation.isPending}
                            onClick={() => generateMutation.mutate(previewPeriods)}
                            className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95"
                        >
                            {generateMutation.isPending && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            )}
                            Confirm & Replace Schedule
                        </Button>
                    </div>
                </div>
            </ResponsiveModal>
        </ResponsiveModal>
    );
}
