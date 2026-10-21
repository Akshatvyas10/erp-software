import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, ArrowRightLeft, ShieldAlert } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { fetchClassrooms } from "@/features/classrooms/api/classroomApi";
import type { ClassroomEnrollment, Classroom } from "@/types/erp";

interface TransferSectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    enrollment: ClassroomEnrollment | null;
    currentClassroomId: string;
    onSuccess: () => void;
}

export function TransferSectionDialog({
    open,
    onOpenChange,
    enrollment,
    currentClassroomId,
    onSuccess,
}: TransferSectionDialogProps) {
    const [targetClassroomId, setTargetClassroomId] = useState("");
    const [reason, setReason] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    const { data: classrooms = [], isLoading: classroomsLoading } = useQuery({
        queryKey: ["classrooms-for-transfer"],
        queryFn: () => fetchClassrooms({ status: "ACTIVE" }),
        enabled: open,
        staleTime: 60_000,
    });

    const studentName = enrollment?.student?.account
        ? `${enrollment.student.account.firstName} ${enrollment.student.account.lastName}`.trim()
        : "Student";

    // Filter candidate target classrooms: exclude current classroom
    const availableTargets = (classrooms as Classroom[]).filter((c: Classroom) => c.id !== currentClassroomId);

    const handleTransfer = async () => {
        const studentId = enrollment?.student?.id;
        if (!studentId || !targetClassroomId) {
            toast.error("Please select a target section");
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.post(
                `/classrooms/${currentClassroomId}/students/${studentId}/transfer`,
                {
                    targetClassroomId,
                    reason: reason.trim() || undefined,
                }
            );
            toast.success(res.data?.message || "Student transferred successfully");
            onSuccess();
            onOpenChange(false);
            setTargetClassroomId("");
            setReason("");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to transfer student");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[480px] rounded-2xl border-border/80 shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <ArrowRightLeft className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Transfer Student Section
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Safely move student to another section without losing attendance or grades.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Student Name
                            </span>
                            <span className="text-sm font-bold text-foreground">{studentName}</span>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs">
                            ID: {enrollment?.student.admissionNumber || enrollment?.student.studentId}
                        </Badge>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                            Target Section <span className="text-destructive">*</span>
                        </Label>
                        <Select
                            value={targetClassroomId}
                            onValueChange={setTargetClassroomId}
                            disabled={classroomsLoading}
                        >
                            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-semibold">
                                <SelectValue placeholder={classroomsLoading ? "Loading sections..." : "Choose target classroom & section"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/80 max-h-56">
                                {availableTargets.map((c: Classroom) => {
                                    const enrolled = c.enrollments?.length ?? 0;
                                    const maxCap = c.maxCapacity || 40;
                                    const isFull = enrolled >= maxCap;

                                    return (
                                        <SelectItem
                                            key={c.id}
                                            value={c.id}
                                            disabled={isFull}
                                            className="text-xs py-2"
                                        >
                                            <div className="flex items-center justify-between gap-3 w-full">
                                                <span className="font-semibold text-foreground">
                                                    {c.name} - Section {c.section} ({c.academicYear})
                                                </span>
                                                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${isFull ? 'bg-destructive/15 text-destructive' : 'bg-primary/10 text-primary'}`}>
                                                    {enrolled}/{maxCap} Seats {isFull ? '(Full)' : ''}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">
                            Transfer Reason <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                        </Label>
                        <Input
                            placeholder="e.g. Elective subject adjustment, parent request"
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs"
                            maxLength={150}
                        />
                    </div>

                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-2 text-xs text-amber-800 dark:text-amber-300">
                        <ShieldAlert className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                            All previous attendance records, test marks, and completed homework submissions will remain linked to this student.
                        </span>
                    </div>
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
                        onClick={handleTransfer}
                        disabled={isLoading || !targetClassroomId}
                        className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 shadow-sm"
                    >
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Transfer Student
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
