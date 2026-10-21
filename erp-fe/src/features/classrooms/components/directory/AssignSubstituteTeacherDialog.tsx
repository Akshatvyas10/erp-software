import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Loader2, UserCheck, Calendar as CalendarIcon, AlertCircle } from "lucide-react";
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
import api from "@/lib/api";
import { fetchAllTeachers } from "@/features/classrooms/api/classroomApi";
import type { TimetableSlot, ClassroomSubject, DayOfWeek } from "@/types/erp";

interface AssignSubstituteTeacherDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    slot: TimetableSlot | null;
    subject: ClassroomSubject | null;
    onSuccess: () => void;
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

function getNextDateForDay(dayName?: string): Date {
    const now = new Date();
    if (!dayName || DAY_MAP[dayName as DayOfWeek] === undefined) return now;
    const targetDay = DAY_MAP[dayName as DayOfWeek];
    const currentDay = now.getDay();
    let diff = targetDay - currentDay;
    if (diff < 0) diff += 7;
    const result = new Date(now);
    result.setDate(now.getDate() + diff);
    return result;
}

export function AssignSubstituteTeacherDialog({
    open,
    onOpenChange,
    classroomId,
    slot,
    subject,
    onSuccess,
}: AssignSubstituteTeacherDialogProps) {
    const [substituteTeacherId, setSubstituteTeacherId] = useState("");
    const [selectedDate, setSelectedDate] = useState<Date>(() => getNextDateForDay(slot?.dayOfWeek));
    const [reason, setReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [conflictError, setConflictError] = useState<string | null>(null);

    // Whenever dialog opens or slot changes, snap selectedDate to the slot's day
    useEffect(() => {
        if (open && slot?.dayOfWeek) {
            setSelectedDate(getNextDateForDay(slot.dayOfWeek));
            setConflictError(null);
        }
    }, [open, slot?.dayOfWeek]);

    const { data: teachers = [], isLoading: teachersLoading } = useQuery({
        queryKey: ["teachers-all"],
        queryFn: fetchAllTeachers,
        enabled: open,
        staleTime: 60_000,
    });

    // Exclude original teacher from substitute dropdown
    const availableTeachers = teachers.filter((t) => t.id !== subject?.teacherId);

    const handleAssign = async () => {
        if (!slot || !substituteTeacherId) {
            toast.error("Please select a substitute teacher");
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
            const isConflict = status === 409 || message.toLowerCase().includes("conflict") || message.toLowerCase().includes("already") || message.toLowerCase().includes("clash");

            if (isConflict) {
                // Show conflict error inside the dialog, not in toaster
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

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[460px] rounded-2xl border-border/80 shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                            <UserCheck className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Assign Substitute Teacher
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
                                        }
                                    }}
                                />
                            </PopoverContent>
                        </Popover>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                            Substitute Teacher <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={substituteTeacherId}
                            onValueChange={(val) => {
                                setSubstituteTeacherId(val);
                                setConflictError(null);
                            }}
                            disabled={teachersLoading}
                        >
                            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-semibold">
                                <SelectValue placeholder={teachersLoading ? "Loading faculty..." : "Select available teacher"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/80 max-h-56">
                                {availableTeachers.map((t) => (
                                    <SelectItem key={t.id} value={t.id} className="text-xs py-2">
                                        <span className="font-semibold text-foreground">
                                            {t.account?.firstName} {t.account?.lastName} ({t.teacherId})
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
                                The system will automatically verify whether the selected substitute teacher is free from other lecture duties at this time.
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
                        disabled={isLoading || !substituteTeacherId}
                        className="rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white h-9 gap-1.5 shadow-sm"
                    >
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Appoint Substitute
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
