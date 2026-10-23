import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    GraduationCap, Loader2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import api from "@/lib/api";
import { fetchClassrooms } from "@/features/classrooms/api/classroomApi";
import { fetchCurrentAcademicYear } from "@/features/school-config/api/academicYearApi";
import type { Classroom, ClassroomEnrollment } from "@/types/erp";

interface SingleStudentPromotionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    enrollment: ClassroomEnrollment;
    sourceClassroomId: string;
    sourceClassroomName?: string;
    onSuccess: () => void;
}

type PromotionAction = "PROMOTE" | "RETAIN" | "GRADUATE" | "TRANSFER";

export function SingleStudentPromotionDialog({
    open,
    onOpenChange,
    enrollment,
    sourceClassroomId,
    sourceClassroomName,
    onSuccess
}: SingleStudentPromotionDialogProps) {
    const student = enrollment.student;
    const [action, setAction] = useState<PromotionAction>("PROMOTE");
    const [targetAcademicYear, setTargetAcademicYear] = useState("");
    const [targetClassroomId, setTargetClassroomId] = useState("");
    const [isManualOverride, setIsManualOverride] = useState(false);
    const [overrideReason, setOverrideReason] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Fetch active academic year
    const { data: currentYear } = useQuery({
        queryKey: ["currentAcademicYear"],
        queryFn: fetchCurrentAcademicYear,
        staleTime: 60_000,
        enabled: open,
    });

    // Auto-populate targetAcademicYear from active year
    const effectiveYear = currentYear?.name || "";
    const activeTargetYear = targetAcademicYear || effectiveYear;

    // Fetch classroom to find current classId
    const { data: sourceClassroom } = useQuery({
        queryKey: ["source-classroom-single-promotion", sourceClassroomId],
        queryFn: async () => {
            const { data } = await api.get(`/classrooms/${sourceClassroomId}`);
            return data.data.classroom as Classroom;
        },
        enabled: open && Boolean(sourceClassroomId),
    });

    const { data: classrooms = [] } = useQuery({
        queryKey: ["all-classrooms-for-single-promotion"],
        queryFn: () => fetchClassrooms({ status: "ACTIVE" }),
        enabled: open,
    });

    // Fetch deterministic next class based on progression sequence
    const currentClassId = sourceClassroom?.classId || sourceClassroom?.academicClass?.id;
    const { data: nextClassData } = useQuery({
        queryKey: ["next-class-single-promotion", currentClassId],
        queryFn: async () => {
            const { data } = await api.get(`/academic-classes/${currentClassId}/next-class`);
            return data.data as {
                currentClass: { id: string; name: string; orderIndex: number };
                nextClass: { id: string; name: string; orderIndex: number; sections?: Classroom[] } | null;
                isFinalClass: boolean;
            };
        },
        enabled: open && Boolean(currentClassId),
    });

    const isFinalClass = Boolean(nextClassData?.isFinalClass) || (sourceClassroomName || "").toLowerCase().includes("12");

    // Strictly limit sections to the deterministic next class
    const validSections = (nextClassData?.nextClass?.sections || []).length > 0
        ? nextClassData!.nextClass!.sections!
        : classrooms.filter((c: Classroom) => c.classId === nextClassData?.nextClass?.id || c.name === nextClassData?.nextClass?.name);

    const handlePromote = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!student) return;

        if (action === "PROMOTE" && !isFinalClass && !targetClassroomId) {
            toast.error("Please pick a target section for promotion");
            return;
        }

        if (isManualOverride && !overrideReason.trim()) {
            toast.error("Override reason is required when manually overriding");
            return;
        }

        if (!activeTargetYear.trim()) {
            toast.error("Target academic year is required");
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = {
                sourceClassroomId,
                targetAcademicYear: activeTargetYear.trim(),
                promotions: [{
                    studentId: student.id,
                    action: isFinalClass && action === "PROMOTE" ? "GRADUATE" : action,
                    targetClassroomId: (action === "PROMOTE" && !isFinalClass) ? targetClassroomId : (action === "RETAIN" ? sourceClassroomId : null),
                    isManualOverride,
                    overrideReason: isManualOverride ? overrideReason.trim() : null
                }]
            };

            const { data } = await api.post("/classrooms/promotions/bulk", payload);
            toast.success(data.message || `Processed promotion for ${student.account?.firstName}`);
            onSuccess();
            onOpenChange(false);
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
            toast.error(msg || "Failed to process promotion");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!student) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md rounded-2xl border-border/80 shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                        <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Promote Student
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Individual academic promotion and section rollover.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <form onSubmit={handlePromote} className="p-6 space-y-4">
                    {/* Student Info Card */}
                    <div className="p-3.5 rounded-xl bg-muted/30 border border-border/70 flex items-center justify-between text-xs">
                        <div>
                            <span className="font-bold text-foreground block">
                                {student.account?.firstName} {student.account?.lastName}
                            </span>
                            <span className="text-[11px] text-muted-foreground font-mono">
                                Adm: {student.admissionNumber || student.studentId}
                            </span>
                        </div>
                        <Badge variant="outline" className="text-[10px] font-bold">
                            Current: {sourceClassroomName || "Current Class"}
                        </Badge>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground">Action</Label>
                        <Select
                            value={action}
                            onValueChange={(val: PromotionAction) => setAction(val)}
                        >
                            <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="PROMOTE" className="text-xs font-semibold text-emerald-600">
                                    {isFinalClass ? "Graduate (Final Year)" : "Promote to Next Class"}
                                </SelectItem>
                                <SelectItem value="RETAIN" className="text-xs font-semibold text-amber-600">
                                    Retain in Same Class
                                </SelectItem>
                                <SelectItem value="GRADUATE" className="text-xs font-semibold text-sky-600">
                                    Mark Graduated
                                </SelectItem>
                                <SelectItem value="TRANSFER" className="text-xs font-semibold text-destructive">
                                    Transfer / TC Issued
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Next Session</Label>
                            <Input
                                value={activeTargetYear}
                                onChange={(e) => setTargetAcademicYear(e.target.value)}
                                placeholder="e.g. 2026-27"
                                className="h-9 rounded-xl text-xs font-mono font-bold"
                            />
                        </div>

                        {action === "PROMOTE" && !isFinalClass && (
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">Target Section *</Label>
                                <Select value={targetClassroomId} onValueChange={setTargetClassroomId}>
                                    <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/20">
                                        <SelectValue placeholder="Select section" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl max-h-48">
                                        {validSections
                                            .filter((c: Classroom) => c.id !== sourceClassroomId)
                                            .map((c: Classroom) => (
                                                <SelectItem key={c.id} value={c.id} className="text-xs">
                                                    {c.name} - Section {c.section}
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}
                    </div>

                    {/* Manual override toggle */}
                    <div className="p-3 rounded-xl bg-muted/20 border border-border/70 space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold text-foreground cursor-pointer" htmlFor="override-check">
                                Manual Discretion Override
                            </Label>
                            <input
                                id="override-check"
                                type="checkbox"
                                checked={isManualOverride}
                                onChange={(e) => setIsManualOverride(e.target.checked)}
                                className="rounded text-primary focus:ring-primary w-4 h-4"
                            />
                        </div>
                        {isManualOverride && (
                            <Input
                                value={overrideReason}
                                onChange={(e) => setOverrideReason(e.target.value)}
                                placeholder="Enter reason (e.g. Approved on medical grounds)"
                                className="h-8 rounded-lg text-xs"
                                required
                            />
                        )}
                    </div>

                    <DialogFooter className="gap-2 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl text-xs h-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={isSubmitting}
                            className="rounded-xl text-xs h-8 font-bold bg-primary text-primary-foreground gap-1.5 shadow-sm"
                        >
                            {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Confirm Promotion
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
