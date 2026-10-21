import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Copy } from "lucide-react";
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
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import api from "@/lib/api";
import { fetchClassrooms } from "@/features/classrooms/api/classroomApi";
import type { Classroom } from "@/types/erp";

interface CloneStructureDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sourceClassroomId: string;
    sourceClassroomName?: string;
    onSuccess: () => void;
}

export function CloneStructureDialog({
    open,
    onOpenChange,
    sourceClassroomId,
    sourceClassroomName,
    onSuccess,
}: CloneStructureDialogProps) {
    const [targetClassroomId, setTargetClassroomId] = useState("");
    const [copyPeriods, setCopyPeriods] = useState(true);
    const [copySubjects, setCopySubjects] = useState(true);
    const [copyTimetable, setCopyTimetable] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const { data: classrooms = [], isLoading: classroomsLoading } = useQuery({
        queryKey: ["classrooms-for-clone"],
        queryFn: () => fetchClassrooms({ status: "ACTIVE" }),
        enabled: open,
        staleTime: 60_000,
    });

    const candidateTargets = (classrooms as Classroom[]).filter((c: Classroom) => c.id !== sourceClassroomId);

    const handleClone = async () => {
        if (!targetClassroomId) {
            toast.error("Please select a target section");
            return;
        }

        setIsLoading(true);
        try {
            const res = await api.post(`/classrooms/${sourceClassroomId}/clone-structure`, {
                targetClassroomId,
                copyPeriods,
                copySubjects,
                copyTimetable,
            });
            toast.success(res.data?.message || "Classroom structure cloned successfully");
            onSuccess();
            onOpenChange(false);
            setTargetClassroomId("");
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to clone structure");
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
                            <Copy className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Duplicate Section Structure
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Copy periods, subjects & schedule to another section without students.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="p-3 rounded-xl bg-muted/40 border border-border/70 flex items-center justify-between">
                        <div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                Source Section
                            </span>
                            <span className="text-sm font-bold text-foreground">
                                {sourceClassroomName || "Current Section"}
                            </span>
                        </div>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                            Source
                        </span>
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
                                <SelectValue placeholder={classroomsLoading ? "Loading sections..." : "Choose section to copy structure into"} />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/80 max-h-56">
                                {candidateTargets.map((c: Classroom) => (
                                    <SelectItem key={c.id} value={c.id} className="text-xs py-2">
                                        <span className="font-semibold text-foreground">
                                            {c.name} - Section {c.section} ({c.academicYear})
                                        </span>
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3 pt-2">
                        <Label className="text-xs font-bold text-foreground block">Select Elements to Copy</Label>

                        <div className="space-y-2.5">
                            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card hover:bg-muted/30 cursor-pointer transition-colors">
                                <Checkbox
                                    checked={copyPeriods}
                                    onCheckedChange={(c) => setCopyPeriods(!!c)}
                                    className="mt-0.5"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-foreground block">Period & Bell Timings</span>
                                    <span className="text-muted-foreground text-[11px]">
                                        Copies all lecture periods, break intervals, and order indices.
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card hover:bg-muted/30 cursor-pointer transition-colors">
                                <Checkbox
                                    checked={copySubjects}
                                    onCheckedChange={(c) => setCopySubjects(!!c)}
                                    className="mt-0.5"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-foreground block">Subject Catalog</span>
                                    <span className="text-muted-foreground text-[11px]">
                                        Links the same curricular subjects (faculty can be assigned later).
                                    </span>
                                </div>
                            </label>

                            <label className="flex items-start gap-2.5 p-2.5 rounded-xl border border-border/70 bg-card hover:bg-muted/30 cursor-pointer transition-colors">
                                <Checkbox
                                    checked={copyTimetable}
                                    onCheckedChange={(c) => setCopyTimetable(!!c)}
                                    className="mt-0.5"
                                />
                                <div className="text-xs">
                                    <span className="font-bold text-foreground block">Weekly Timetable Grid Slots</span>
                                    <span className="text-muted-foreground text-[11px]">
                                        Replicates the day-wise lecture layout for identical section scheduling.
                                    </span>
                                </div>
                            </label>
                        </div>
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
                        onClick={handleClone}
                        disabled={isLoading || !targetClassroomId || (!copyPeriods && !copySubjects && !copyTimetable)}
                        className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 shadow-sm"
                    >
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Clone Structure
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
