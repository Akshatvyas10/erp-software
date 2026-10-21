import { useState } from "react";
import { Loader2, Hash, ArrowUpDown, Sparkles } from "lucide-react";
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
import api from "@/lib/api";

interface AutoAssignRollNumbersDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    studentCount: number;
    onSuccess: () => void;
}

export function AutoAssignRollNumbersDialog({
    open,
    onOpenChange,
    classroomId,
    studentCount,
    onSuccess,
}: AutoAssignRollNumbersDialogProps) {
    const [sortBy, setSortBy] = useState<"ALPHABETICAL" | "ADMISSION_NO">("ALPHABETICAL");
    const [startFrom, setStartFrom] = useState<number>(1);
    const [prefix, setPrefix] = useState<string>("");
    const [isLoading, setIsLoading] = useState(false);

    const handleAssign = async () => {
        setIsLoading(true);
        try {
            const res = await api.post(`/classrooms/${classroomId}/students/auto-roll-numbers`, {
                sortBy,
                startFrom,
                prefix: prefix.trim(),
            });
            toast.success(res.data?.message || "Roll numbers auto-assigned successfully");
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to auto-assign roll numbers");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[440px] rounded-2xl border-border/80 shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <Hash className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Auto-Assign Roll Numbers
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Automatically re-sequence student roll numbers for this section.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                <div className="p-6 space-y-4">
                    <div className="p-3 rounded-xl bg-primary/5 border border-primary/15 flex items-center gap-2.5 text-xs text-foreground font-medium">
                        <Sparkles className="w-4 h-4 text-primary shrink-0" />
                        <span>
                            Will sequence <strong>{studentCount}</strong> enrolled student{studentCount === 1 ? "" : "s"}.
                        </span>
                    </div>

                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <ArrowUpDown className="w-3.5 h-3.5 text-primary" />
                            Sorting Criterion
                        </Label>
                        <Select
                            value={sortBy}
                            onValueChange={(val) => setSortBy(val as "ALPHABETICAL" | "ADMISSION_NO")}
                        >
                            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-semibold">
                                <SelectValue placeholder="Choose sorting logic" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl border-border/80">
                                <SelectItem value="ALPHABETICAL" className="text-xs font-medium">
                                    Alphabetical by Student Name (A → Z)
                                </SelectItem>
                                <SelectItem value="ADMISSION_NO" className="text-xs font-medium">
                                    By Admission Number (Ascending)
                                </SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Start Sequence At</Label>
                            <Input
                                type="number"
                                min={1}
                                max={999}
                                value={startFrom}
                                onChange={(e) => setStartFrom(Math.max(1, parseInt(e.target.value, 10) || 1))}
                                className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-mono font-bold"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">
                                Prefix <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                            </Label>
                            <Input
                                placeholder="e.g. R-"
                                value={prefix}
                                onChange={(e) => setPrefix(e.target.value)}
                                className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-mono"
                                maxLength={6}
                            />
                        </div>
                    </div>

                    <p className="text-[11px] text-muted-foreground italic">
                        Preview: First student will receive roll number <strong>{prefix}{startFrom}</strong>, followed by <strong>{prefix}{startFrom + 1}</strong>...
                    </p>
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
                        disabled={isLoading || studentCount === 0}
                        className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 shadow-sm"
                    >
                        {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Generate & Assign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
