import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Crown, Loader2, Users } from "lucide-react";
import { toast } from "sonner";

import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import api from "@/lib/api";
import type { ClassroomEnrollment } from "@/types/erp";

interface AssignMonitorsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    classroomName: string;
    enrollments: ClassroomEnrollment[];
    currentMonitor1Id?: string | null;
    currentMonitor2Id?: string | null;
    onSuccess?: () => void;
}

export function AssignMonitorsDialog({
    open,
    onOpenChange,
    classroomId,
    classroomName,
    enrollments,
    currentMonitor1Id,
    currentMonitor2Id,
    onSuccess,
}: AssignMonitorsDialogProps) {
    const qc = useQueryClient();
    const [monitor1Id, setMonitor1Id] = useState<string>(currentMonitor1Id || "NONE");
    const [monitor2Id, setMonitor2Id] = useState<string>(currentMonitor2Id || "NONE");

    useEffect(() => {
        if (open) {
            setMonitor1Id(currentMonitor1Id || "NONE");
            setMonitor2Id(currentMonitor2Id || "NONE");
        }
    }, [open, currentMonitor1Id, currentMonitor2Id]);

    const mutation = useMutation({
        mutationFn: async ({ m1, m2 }: { m1: string | null; m2: string | null }) => {
            const { data } = await api.put(`/classrooms/${classroomId}`, {
                monitorMaleId: m1,
                monitorFemaleId: m2
            });
            return data.data;
        },
        onSuccess: () => {
            toast.success("Class Monitors updated successfully");
            qc.invalidateQueries({ queryKey: ["classroom", classroomId] });
            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["classrooms"] });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || "Failed to assign monitors");
        }
    });

    const handleSave = () => {
        if (monitor1Id !== "NONE" && monitor2Id !== "NONE" && monitor1Id === monitor2Id) {
            toast.error("Monitor 1 and Monitor 2 cannot be the same student");
            return;
        }

        mutation.mutate({
            m1: monitor1Id === "NONE" ? null : monitor1Id,
            m2: monitor2Id === "NONE" ? null : monitor2Id,
        });
    };

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            title="Appoint Class Monitors"
            description={`Select up to 2 student leaders for ${classroomName} from enrolled students.`}
            maxWidth="sm:max-w-md"
        >
            <div className="space-y-4 pt-2">
                {enrollments.length === 0 ? (
                    <div className="py-6 text-center border-2 border-dashed border-border/60 rounded-xl bg-muted/10 p-4">
                        <Users className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
                        <p className="text-xs font-bold text-foreground">No Students Enrolled</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Enroll students in this classroom section before appointing monitors.
                        </p>
                    </div>
                ) : (
                    <>
                        {/* Monitor 1 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Crown className="w-3.5 h-3.5 text-amber-500" /> Class Monitor 1
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-medium">(Primary)</span>
                            </div>
                            <Select value={monitor1Id} onValueChange={setMonitor1Id}>
                                <SelectTrigger className="h-10 text-xs rounded-xl">
                                    <SelectValue placeholder="Select Monitor 1…" />
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                    <SelectItem value="NONE" className="text-muted-foreground italic">
                                        None / Clear Monitor 1
                                    </SelectItem>
                                    {enrollments.filter(e => !!e.student?.id).map(enr => {
                                        const acc = enr.student?.account;
                                        const name = acc ? `${acc.firstName || ""} ${acc.lastName || ""}`.trim() : `Student #${enr.student?.studentId || "—"}`;
                                        return (
                                            <SelectItem key={enr.student!.id} value={enr.student!.id}>
                                                {name} (ID: {enr.student?.studentId || "—"})
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Monitor 2 */}
                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                    <Crown className="w-3.5 h-3.5 text-blue-500" /> Class Monitor 2
                                </Label>
                                <span className="text-[10px] text-muted-foreground font-medium">(Secondary)</span>
                            </div>
                            <Select value={monitor2Id} onValueChange={setMonitor2Id}>
                                <SelectTrigger className="h-10 text-xs rounded-xl">
                                    <SelectValue placeholder="Select Monitor 2…" />
                                </SelectTrigger>
                                <SelectContent className="max-h-56">
                                    <SelectItem value="NONE" className="text-muted-foreground italic">
                                        None / Clear Monitor 2
                                    </SelectItem>
                                    {enrollments.filter(e => !!e.student?.id).map(enr => {
                                        const acc = enr.student?.account;
                                        const name = acc ? `${acc.firstName || ""} ${acc.lastName || ""}`.trim() : `Student #${enr.student?.studentId || "—"}`;
                                        return (
                                            <SelectItem key={enr.student!.id} value={enr.student!.id}>
                                                {name} (ID: {enr.student?.studentId || "—"})
                                            </SelectItem>
                                        );
                                    })}
                                </SelectContent>
                            </Select>
                        </div>

                        <p className="text-[11px] text-muted-foreground bg-muted/40 p-2.5 rounded-xl border border-border/40">
                            Class monitors represent the student council for this section and assist the Class Teacher with daily classroom coordination.
                        </p>
                    </>
                )}

                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl text-xs font-bold"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={mutation.isPending || enrollments.length === 0}
                        className="gap-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    >
                        {mutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <Crown className="w-3.5 h-3.5 text-amber-300" />
                        )}
                        Save Monitors
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
