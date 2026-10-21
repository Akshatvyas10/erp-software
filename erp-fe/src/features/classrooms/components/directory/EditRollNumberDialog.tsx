import { useState, useEffect } from "react";
import { Loader2, Hash } from "lucide-react";
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
import api from "@/lib/api";
import type { ClassroomEnrollment } from "@/types/erp";

interface EditRollNumberDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    enrollment: ClassroomEnrollment | null;
    classroomId: string;
    onSuccess: () => void;
}

export function EditRollNumberDialog({
    open,
    onOpenChange,
    enrollment,
    classroomId,
    onSuccess,
}: EditRollNumberDialogProps) {
    const [rollNumber, setRollNumber] = useState("");
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (enrollment) {
            setRollNumber(enrollment.rollNumber || "");
        }
    }, [enrollment]);

    const handleSave = async () => {
        const studentId = enrollment?.student?.id;
        if (!studentId) return;

        setIsLoading(true);
        try {
            const res = await api.put(
                `/classrooms/${classroomId}/students/${studentId}/roll-number`,
                { rollNumber: rollNumber.trim() || null }
            );
            toast.success(res.data?.message || "Roll number updated successfully");
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to update roll number");
        } finally {
            setIsLoading(false);
        }
    };

    const acc = enrollment?.student?.account;
    const studentName = acc
        ? `${acc.firstName} ${acc.lastName}`
        : enrollment?.student?.studentId
            ? `Student #${enrollment.student.studentId}`
            : "Student";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[380px] rounded-2xl border-border/80 shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Hash className="w-4 h-4" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Edit Roll Number
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Set or update roll number for {studentName}.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Roll Number</Label>
                        <Input
                            placeholder="e.g. 01, R-15"
                            value={rollNumber}
                            onChange={(e) => setRollNumber(e.target.value)}
                            className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-mono font-bold"
                            maxLength={15}
                            autoFocus
                        />
                        <p className="text-[11px] text-muted-foreground">
                            Leave empty to unassign roll number.
                        </p>
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
                        onClick={handleSave}
                        disabled={isLoading}
                        className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 shadow-sm"
                    >
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Save Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
