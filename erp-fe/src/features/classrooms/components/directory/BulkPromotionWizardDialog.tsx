import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Loader2, GraduationCap, ChevronRight
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
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
import { ScrollArea } from "@/components/ui/scroll-area";
import api from "@/lib/api";
import { fetchClassrooms } from "@/features/classrooms/api/classroomApi";
import type { ClassroomEnrollment, Classroom } from "@/types/erp";

interface BulkPromotionWizardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sourceClassroom: Classroom | null;
    enrollments?: ClassroomEnrollment[];
    onSuccess: () => void;
}

type PromotionAction = "PROMOTE" | "RETAIN" | "TC";

interface StudentPromotionPlan {
    studentId: string;
    studentName: string;
    admissionNumber: string;
    action: PromotionAction;
    targetClassroomId?: string;
}

export function BulkPromotionWizardDialog({
    open,
    onOpenChange,
    sourceClassroom,
    enrollments: initialEnrollments = [],
    onSuccess,
}: BulkPromotionWizardDialogProps) {
    const [step, setStep] = useState<1 | 2>(1);
    const [selectedSourceSectionId, setSelectedSourceSectionId] = useState<string>("");
    const [targetAcademicYear, setTargetAcademicYear] = useState("2026-2027");
    const [defaultTargetClassroomId, setDefaultTargetClassroomId] = useState("");
    const [promotionPlans, setPromotionPlans] = useState<Record<string, StudentPromotionPlan>>({});
    const [isLoading, setIsLoading] = useState(false);

    // Fetch active classrooms for selection and target selection
    const { data: classrooms = [] } = useQuery({
        queryKey: ["all-classrooms-for-promotions"],
        queryFn: () => fetchClassrooms({ status: "ACTIVE" }),
        enabled: open,
        staleTime: 60_000,
    });

    // Determine effective source classroom
    useEffect(() => {
        if (sourceClassroom?.id) {
            setSelectedSourceSectionId(sourceClassroom.id);
        } else if (!selectedSourceSectionId && classrooms.length > 0) {
            setSelectedSourceSectionId(classrooms[0].id);
        }
    }, [sourceClassroom, classrooms, selectedSourceSectionId]);

    const effectiveSourceId = sourceClassroom?.id || selectedSourceSectionId;

    // Fetch detailed section & enrollments if opened generically with no sourceClassroom
    const { data: dynamicSourceClassroom, isLoading: isRosterLoading } = useQuery({
        queryKey: ["classroom-for-promotion", effectiveSourceId],
        queryFn: async () => {
            const { data } = await api.get(`/classrooms/${effectiveSourceId}`);
            return data.data.classroom as Classroom;
        },
        enabled: open && Boolean(effectiveSourceId) && (!sourceClassroom || !initialEnrollments.length),
        staleTime: 10_000,
    });

    const effectiveClassroom = sourceClassroom || dynamicSourceClassroom;
    const activeEnrollments = initialEnrollments.length > 0
        ? initialEnrollments
        : (dynamicSourceClassroom?.enrollments || []);

    // Initialize promotion plans whenever dialog opens or roster changes
    useEffect(() => {
        if (!open) return;
        const plans: Record<string, StudentPromotionPlan> = {};
        (activeEnrollments || []).forEach((e) => {
            if (!e.student) return;
            const acc = e.student.account;
            plans[e.student.id] = {
                studentId: e.student.id,
                studentName: `${acc?.firstName || "Student"} ${acc?.lastName || ""}`.trim(),
                admissionNumber: e.student.admissionNumber || e.student.studentId || "—",
                action: "PROMOTE",
                targetClassroomId: defaultTargetClassroomId || undefined,
            };
        });
        setPromotionPlans(plans);
    }, [open, activeEnrollments, defaultTargetClassroomId]);

    const updateStudentAction = (studentId: string, action: PromotionAction) => {
        setPromotionPlans((prev) => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                action,
                targetClassroomId: action === "PROMOTE" ? (prev[studentId]?.targetClassroomId || defaultTargetClassroomId) : undefined,
            },
        }));
    };

    const updateStudentTarget = (studentId: string, targetClassroomId: string) => {
        setPromotionPlans((prev) => ({
            ...prev,
            [studentId]: {
                ...prev[studentId],
                targetClassroomId,
            },
        }));
    };

    const handleBulkPromote = async () => {
        if (!effectiveClassroom) {
            toast.error("Source classroom is missing.");
            return;
        }

        const plansList = Object.values(promotionPlans);
        if (plansList.length === 0) {
            toast.error("No enrolled students found to promote.");
            return;
        }

        const hasUnassignedPromoted = plansList.some(
            (p) => p.action === "PROMOTE" && !p.targetClassroomId
        );

        if (hasUnassignedPromoted) {
            toast.error("Please specify a target classroom for all promoted students.");
            return;
        }

        setIsLoading(true);
        try {
            const payload = {
                sourceClassroomId: effectiveClassroom.id,
                targetAcademicYear,
                promotions: plansList.map((p) => ({
                    studentId: p.studentId,
                    action: p.action,
                    targetClassroomId: p.targetClassroomId,
                })),
            };

            const res = await api.post("/classrooms/promotions/bulk", payload);
            toast.success(res.data?.message || "Students promoted successfully");
            onSuccess();
            onOpenChange(false);
            setStep(1);
        } catch (err: unknown) {
            let msg = "Failed to process promotions";
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || msg;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const promotedCount = Object.values(promotionPlans).filter((p) => p.action === "PROMOTE").length;
    const retainedCount = Object.values(promotionPlans).filter((p) => p.action === "RETAIN").length;
    const tcCount = Object.values(promotionPlans).filter((p) => p.action === "TC").length;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] rounded-2xl border-border/80 shadow-2xl p-0 overflow-hidden">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/70">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                            <GraduationCap className="w-5 h-5" />
                        </div>
                        <div>
                            <DialogTitle className="text-base font-bold text-foreground">
                                Year-End Promotion & Rollover Wizard
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                                Advance {effectiveClassroom?.name || "Section"} - Section {effectiveClassroom?.section || "A"} to the next academic cycle.
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {step === 1 ? (
                    <div className="p-6 space-y-4">
                        {/* Source Section Selection (Shown if opened generically) */}
                        {!sourceClassroom && (
                            <div className="space-y-1.5 p-3.5 rounded-xl bg-muted/50 border border-border/70">
                                <Label className="text-xs font-bold text-foreground">
                                    Select Source Section to Promote <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={selectedSourceSectionId}
                                    onValueChange={(val) => {
                                        setSelectedSourceSectionId(val);
                                        setDefaultTargetClassroomId("");
                                    }}
                                >
                                    <SelectTrigger className="h-10 rounded-xl bg-background border-border/70 text-xs font-semibold">
                                        <SelectValue placeholder="Choose source section" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/80 max-h-56">
                                        {classrooms.map((c: Classroom) => (
                                            <SelectItem key={c.id} value={c.id} className="text-xs">
                                                {c.name} - Section {c.section} ({c.academicYear})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        )}

                        <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/40 border border-border/70 text-xs">
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                    Current Section
                                </span>
                                <span className="font-bold text-foreground text-sm">
                                    {effectiveClassroom ? `${effectiveClassroom.name} - Section ${effectiveClassroom.section}` : "Select Section"}
                                </span>
                                <p className="text-muted-foreground mt-0.5">
                                    Session: {effectiveClassroom?.academicYear || "—"}
                                </p>
                            </div>
                            <div>
                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block">
                                    Roster Size
                                </span>
                                <span className="font-bold text-foreground text-sm">
                                    {isRosterLoading ? (
                                        <Loader2 className="w-3.5 h-3.5 animate-spin inline-block text-primary" />
                                    ) : (
                                        `${activeEnrollments.length} Students`
                                    )}
                                </span>
                                <p className="text-muted-foreground mt-0.5">Ready for year-end rollover</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">Next Academic Session</Label>
                                <Input
                                    value={targetAcademicYear}
                                    onChange={(e) => setTargetAcademicYear(e.target.value)}
                                    placeholder="e.g. 2026-2027"
                                    className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-mono font-bold"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">
                                    Default Target Section <span className="text-destructive">*</span>
                                </Label>
                                <Select
                                    value={defaultTargetClassroomId}
                                    onValueChange={setDefaultTargetClassroomId}
                                >
                                    <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-semibold">
                                        <SelectValue placeholder="Select target classroom" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl border-border/80 max-h-56">
                                        {classrooms
                                            .filter((c: Classroom) => c.id !== effectiveClassroom?.id)
                                            .map((c: Classroom) => (
                                                <SelectItem key={c.id} value={c.id} className="text-xs">
                                                    {c.name} - Section {c.section} ({c.academicYear})
                                                </SelectItem>
                                            ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200">
                            <strong>How this works:</strong> In the next step, you can review each student individually. By default, all students will be promoted to the selected section, but you can retain or mark transfer certificate (TC) for any student.
                        </div>
                    </div>
                ) : (
                    <div className="p-6 space-y-4">
                        <div className="flex items-center justify-between text-xs font-bold">
                            <span className="text-foreground">Student Promotion Roster ({activeEnrollments.length})</span>
                            <div className="flex items-center gap-2 text-[11px]">
                                <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border-emerald-500/30">
                                    {promotedCount} Promoted
                                </Badge>
                                <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border-amber-500/30">
                                    {retainedCount} Retained
                                </Badge>
                                <Badge className="bg-destructive/15 text-destructive font-bold border-destructive/30">
                                    {tcCount} TC/Left
                                </Badge>
                            </div>
                        </div>

                        <ScrollArea className="h-64 rounded-xl border border-border/80 p-3 bg-muted/20">
                            <div className="space-y-2">
                                {Object.values(promotionPlans).map((p) => (
                                    <div
                                        key={p.studentId}
                                        className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/70 text-xs gap-3 shadow-2xs"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <span className="font-bold text-foreground truncate block">
                                                {p.studentName}
                                            </span>
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                Adm: {p.admissionNumber}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2 shrink-0">
                                            <Select
                                                value={p.action}
                                                onValueChange={(val: PromotionAction) => updateStudentAction(p.studentId, val)}
                                            >
                                                <SelectTrigger className="h-8 w-28 text-[11px] font-bold rounded-lg border-border/70">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-border/80">
                                                    <SelectItem value="PROMOTE" className="text-xs font-semibold text-emerald-600">
                                                        Promote
                                                    </SelectItem>
                                                    <SelectItem value="RETAIN" className="text-xs font-semibold text-amber-600">
                                                        Retain
                                                    </SelectItem>
                                                    <SelectItem value="TC" className="text-xs font-semibold text-destructive">
                                                        TC / Left
                                                    </SelectItem>
                                                </SelectContent>
                                            </Select>

                                            {p.action === "PROMOTE" && (
                                                <Select
                                                    value={p.targetClassroomId || ""}
                                                    onValueChange={(val) => updateStudentTarget(p.studentId, val)}
                                                >
                                                    <SelectTrigger className="h-8 w-36 text-[10px] rounded-lg border-border/70 font-semibold truncate">
                                                        <SelectValue placeholder="Target Section" />
                                                    </SelectTrigger>
                                                    <SelectContent className="rounded-xl border-border/80 max-h-48">
                                                        {classrooms
                                                            .filter((c: Classroom) => c.id !== effectiveClassroom?.id)
                                                            .map((c: Classroom) => (
                                                                <SelectItem key={c.id} value={c.id} className="text-xs">
                                                                    {c.name} - Sec {c.section}
                                                                </SelectItem>
                                                            ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </div>
                )}

                <DialogFooter className="px-6 py-4 bg-muted/30 border-t border-border/70 flex justify-between gap-2">
                    {step === 2 ? (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => setStep(1)}
                            className="rounded-xl text-xs font-bold h-9"
                        >
                            Back
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl text-xs font-bold h-9"
                        >
                            Cancel
                        </Button>
                    )}

                    {step === 1 ? (
                        <Button
                            type="button"
                            onClick={() => {
                                if (!effectiveClassroom) {
                                    toast.error("Please pick a source section.");
                                    return;
                                }
                                if (activeEnrollments.length === 0) {
                                    toast.error("The selected section has 0 enrolled students.");
                                    return;
                                }
                                if (!defaultTargetClassroomId) {
                                    toast.error("Please pick a default target section for promotions.");
                                    return;
                                }
                                setStep(2);
                            }}
                            disabled={isRosterLoading}
                            className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 shadow-sm"
                        >
                            Next: Review Roster <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            onClick={handleBulkPromote}
                            disabled={isLoading}
                            className="rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white h-9 gap-1.5 shadow-sm"
                        >
                            {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            Execute Year-End Rollover
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
