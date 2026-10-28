import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, UserCheck, Calendar as CalendarIcon, AlertCircle, CheckCircle2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import type { TimetableSlot, ClassroomSubject, DayOfWeek } from "@/types/erp";

interface AssignSubstituteTeacherDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    slot: TimetableSlot | null;
    subject: ClassroomSubject | null;
    initialDate?: string | Date | null;
    onSuccess: () => void;
}

interface TeacherCandidate {
    id: string;
    teacherId: string;
    name: string;
    email: string | null;
    department: string | null;
    designationName: string | null;
    isFree: boolean;
    matchScore?: number;
    matchBadges?: string[];
    proxiesThisWeek?: number;
    isTopSuggestion?: boolean;
    conflicts: Array<{ type: string; message: string; details?: any }>;
    primaryConflict: { type: string; message: string } | null;
}

const DAY_MAP: Record<DayOfWeek, number> = {
    Sunday: 0,
    Monday: 1,
    Tuesday: 2,
    Wednesday: 3,
    Thursday: 4,
    Friday: 5,
    Saturday: 6,
};

function parseOrComputeDate(initialDate?: string | Date | null, dayName?: string): Date {
    if (initialDate) {
        if (typeof initialDate === 'string') {
            const [y, m, d] = initialDate.split('-').map(Number);
            if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                return new Date(y, m - 1, d, 12, 0, 0);
            }
        } else if (initialDate instanceof Date && !isNaN(initialDate.getTime())) {
            return initialDate;
        }
    }

    const now = new Date();
    if (!dayName || DAY_MAP[dayName as DayOfWeek] === undefined) return now;
    const targetDay = DAY_MAP[dayName as DayOfWeek];
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    const result = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0);
    result.setDate(result.getDate() + diff);
    return result;
}

export function AssignSubstituteTeacherDialog({
    open,
    onOpenChange,
    classroomId,
    slot,
    subject,
    initialDate,
    onSuccess,
}: AssignSubstituteTeacherDialogProps) {
    const [substituteTeacherId, setSubstituteTeacherId] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date>(() => parseOrComputeDate(initialDate, slot?.dayOfWeek));
    const [reason, setReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conflictError, setConflictError] = useState<string | null>(null);

    // Whenever dialog opens or slot/initialDate changes, initialize selectedDate cleanly
    useEffect(() => {
        if (open) {
            setSelectedDate(parseOrComputeDate(initialDate, slot?.dayOfWeek));
            setConflictError(null);
            setSubstituteTeacherId("");
        }
    }, [open, slot?.dayOfWeek, initialDate]);

    const formattedDate = format(selectedDate, "yyyy-MM-dd");

    // Fetch live candidate availability with smart scoring for this date & slot time
    const {
        data: candidates = [],
        isLoading: candidatesLoading,
    } = useQuery({
        queryKey: ["substitute-candidates", classroomId, slot?.id, formattedDate, slot?.startTime, slot?.endTime, subject?.subjectId],
        queryFn: async () => {
            if (!slot?.startTime || !slot?.endTime) return [];
            const params = new URLSearchParams({
                date: formattedDate,
                startTime: slot.startTime,
                endTime: slot.endTime,
                excludeTeacherId: subject?.teacherId || "",
                subjectId: subject?.subjectId || "",
                subjectName: subject?.subject?.name || "",
            });
            const res = await api.get(`/classrooms/${classroomId}/substitutes/candidates?${params}`);
            return (res.data?.data?.candidates || []) as TeacherCandidate[];
        },
        enabled: open && !!slot?.startTime && !!slot?.endTime,
        staleTime: 5_000,
    });

    const selectedCandidate = candidates.find((c) => c.id === substituteTeacherId);
    const topSuggestions = candidates.filter((c) => c.isFree && ((c.matchScore && c.matchScore >= 40) || c.isTopSuggestion));

    const handleAssign = async () => {
        if (!slot || !substituteTeacherId) {
            toast.error("Please select a substitute teacher");
            return;
        }

        // Client-side block if already marked busy
        if (selectedCandidate && !selectedCandidate.isFree) {
            setConflictError(
                selectedCandidate.primaryConflict?.message ||
                "Selected teacher is busy with another commitment at this time."
            );
            return;
        }

        setIsLoading(true);
        setConflictError(null);
        try {
            const dateStr = format(selectedDate, "yyyy-MM-dd");
            const res = await api.post(`/classrooms/${classroomId}/substitutes`, {
                timetableId: slot.id,
                substituteTeacherId,
                date: dateStr,
                reason: reason.trim() || undefined,
            });
            toast.success(res.data?.message || "Substitute teacher assigned successfully");
            onSuccess();
            onOpenChange(false);
            setSubstituteTeacherId("");
            setReason("");
            setConflictError(null);
        } catch (err: any) {
            const status = err?.response?.status;
            const message = err?.response?.data?.message || "Failed to assign substitute teacher";
            const isConflict = status === 409 || message.toLowerCase().includes("conflict") || message.toLowerCase().includes("already") || message.toLowerCase().includes("clash") || message.toLowerCase().includes("cannot assign");

            if (isConflict) {
                setConflictError(message);
            } else {
                toast.error(message);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!slot || !subject) return null;

    const originalTeacherName = subject.teacher?.account
        ? `${subject.teacher.account.firstName} ${subject.teacher.account.lastName}`
        : "Unassigned Faculty";

    const freeCandidatesCount = candidates.filter((c) => c.isFree).length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl border-border/80 shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Assign Substitute for {format(selectedDate, "EEEE, dd MMM yyyy")}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Appoint an arrangement faculty for {slot.dayOfWeek} ({slot.startTime?.slice(0, 5) || "--:--"} - {slot.endTime?.slice(0, 5) || "--:--"}).
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/70 grid grid-cols-2 gap-2 text-xs">
                        <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block">Subject</span>
                            <span className="font-bold text-foreground">{subject.subject?.name}</span>
                        </div>
                        <div>
                            <span className="text-[10px] font-bold uppercase text-muted-foreground block">Regular Teacher</span>
                            <span className="font-bold text-foreground">{originalTeacherName}</span>
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-foreground">Date of Proxy Duty</Label>
                            {slot.dayOfWeek && (
                                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-semibold">
                                    Must be a {slot.dayOfWeek}
                                </span>
                            )}
                        </div>
                        <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                    variant="outline"
                                    className="w-full justify-start text-left font-normal rounded-xl h-10 border-border/70 bg-muted/30 text-xs"
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                    {format(selectedDate, "PPP")} ({format(selectedDate, "EEEE")})
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0 rounded-2xl border-border/80 shadow-xl" align="start">
                                <Calendar
                                    mode="single"
                                    selected={selectedDate}
                                    disabled={(d) => {
                                        if (!slot.dayOfWeek || DAY_MAP[slot.dayOfWeek as DayOfWeek] === undefined) return false;
                                        return d.getDay() !== DAY_MAP[slot.dayOfWeek as DayOfWeek];
                                    }}
                                    onSelect={(d) => {
                                        if (d) {
                                            setSelectedDate(d);
                                            setConflictError(null);
                                            setSubstituteTeacherId("");
                                        }
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    {/* ── Smart Recommendations Panel ── */}
                    {!candidatesLoading && topSuggestions.length > 0 && (
                        <div className="space-y-2 pt-1">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <span className="text-amber-500">⚡</span> Smart Suggestions
                                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 font-bold border border-amber-500/20">
                                        Best Fit
                                    </span>
                                </Label>
                                <span className="text-[10px] text-muted-foreground">
                                    Ranked by subject match & low proxy load
                                </span>
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                {topSuggestions.slice(0, 4).map((c) => {
                                    const isSelected = substituteTeacherId === c.id;
                                    return (
                                        <button
                                            key={c.id}
                                            type="button"
                                            onClick={() => {
                                                setSubstituteTeacherId(c.id);
                                                setConflictError(null);
                                            }}
                                            className={`p-2.5 rounded-xl border text-left transition-all ${
                                                isSelected
                                                    ? "bg-primary/10 border-primary shadow-sm"
                                                    : "bg-muted/30 hover:bg-muted/50 border-border/70"
                                            }`}
                                        >
                                            <div className="flex items-start justify-between gap-1">
                                                <div className="font-bold text-xs text-foreground line-clamp-1">
                                                    {c.name}
                                                </div>
                                                {c.matchScore !== undefined && (
                                                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-extrabold shrink-0">
                                                        {c.matchScore} pts
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5">
                                                {c.teacherId} {c.department ? `• ${c.department}` : ""}
                                            </div>
                                            {c.matchBadges && c.matchBadges.length > 0 && (
                                                <div className="flex flex-wrap gap-1 mt-1.5">
                                                    {c.matchBadges.map((badge, idx) => (
                                                        <span
                                                            key={idx}
                                                            className="text-[9px] px-1.5 py-0.2 rounded bg-background/80 text-foreground/80 border border-border/60 font-medium"
                                                        >
                                                            {badge}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-foreground">
                                Substitute Teacher <span className="text-destructive">*</span>
                            </Label>
                            {!candidatesLoading && (
                                <span className="text-[10px] text-muted-foreground font-semibold flex items-center gap-1">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                                    {freeCandidatesCount} available
                                </span>
                            )}
                        </div>
                        <Select
                            value={substituteTeacherId}
                            onValueChange={(val) => {
                                setSubstituteTeacherId(val);
                                setConflictError(null);
                            }}
                            disabled={candidatesLoading}
                        >
                            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-semibold">
                                <SelectValue placeholder={candidatesLoading ? "Verifying faculty availability..." : "Select available teacher"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/80 max-h-60">
                                {candidates.map((c) => (
                                    <SelectItem
                                        key={c.id}
                                        value={c.id}
                                        disabled={!c.isFree}
                                        className="text-xs py-2"
                                    >
                                        <div className="flex items-center justify-between gap-3 w-full">
                                            <span className="font-semibold text-foreground">
                                                {c.name} ({c.teacherId})
                                            </span>
                                            {c.isFree ? (
                                                <div className="flex items-center gap-1.5">
                                                    {c.matchScore && c.matchScore >= 40 && (
                                                        <Badge variant="outline" className="h-5 px-1.5 text-[9px] bg-amber-500/10 text-amber-600 border-amber-500/30 font-bold">
                                                            ★ {c.matchScore} pts
                                                        </Badge>
                                                    )}
                                                    <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 gap-1 font-bold">
                                                        <CheckCircle2 className="w-2.5 h-2.5" /> Free
                                                    </Badge>
                                                </div>
                                            ) : (
                                                <Badge variant="outline" className="h-5 px-1.5 text-[10px] bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30 gap-1 font-bold">
                                                    <AlertTriangle className="w-2.5 h-2.5" />
                                                    {c.primaryConflict?.type === "LEAVE"
                                                        ? "On Leave"
                                                        : c.primaryConflict?.type === "SUBSTITUTE_DUTY"
                                                            ? "Busy (Proxy)"
                                                            : "Busy (Lecture)"}
                                                </Badge>
                                            )}
                                        </div>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        {selectedCandidate && !selectedCandidate.isFree && (
                            <p className="text-[11px] text-destructive font-medium flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                                {selectedCandidate.primaryConflict?.message}
                            </p>
                        )}
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                            Arrangement Reason <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                        </Label>
                        <Input
                            placeholder="e.g. On Medical Leave, Examination Invigilation"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs"
                            maxLength={150}
                        />
                    </div>

                    {/* Teacher Conflict Alert Box in Dialog */}
                    {conflictError ? (
                        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-800 dark:text-rose-300 space-y-1.5 animate-in fade-in duration-200">
                            <div className="flex items-center gap-2 font-bold text-xs">
                                <AlertCircle className="w-4 h-4 text-rose-600 dark:text-rose-400 shrink-0" />
                                <span>Teacher Schedule Conflict Detected</span>
                            </div>
                            <p className="text-xs leading-relaxed pl-6">
                                {conflictError}
                            </p>
                        </div>
                    ) : (
                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-start gap-2 text-xs text-blue-800 dark:text-blue-300">
                            <AlertCircle className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                            <span>
                                Live verification active: Teachers on approved leave, teaching lectures, or on proxy duty at this hour are flagged and blocked.
                            </span>
                        </div>
                    )}
                </div>

                <DialogFooter className="px-6 py-4 bg-muted/30 border-t border-border/70 flex justify-end gap-2">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl text-xs font-bold h-9"
                        disabled={isLoading}
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleAssign}
                        disabled={isLoading || !substituteTeacherId || (selectedCandidate && !selectedCandidate.isFree)}
                        className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white h-9 gap-1.5 shadow-sm disabled:opacity-50"
                    >
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Appoint Substitute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
