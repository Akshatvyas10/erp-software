import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    Loader2, GraduationCap, ChevronRight, CheckCircle2,
    XCircle, AlertTriangle, ShieldCheck
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import api from "@/lib/api";
import {
    fetchClassrooms, evaluatePromotionCandidates
} from "@/features/classrooms/api/classroomApi";
import type { Classroom, ClassroomEnrollment } from "@/types/erp";

interface BulkPromotionWizardDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    sourceClassroom: Classroom | null;
    enrollments?: ClassroomEnrollment[];
    onSuccess: () => void;
}

type PromotionAction = "PROMOTE" | "RETAIN" | "GRADUATE" | "TRANSFER";

interface StudentPromotionPlan {
    studentId: string;
    studentName: string;
    admissionNumber: string;
    rollNumber?: number | null;
    action: PromotionAction;
    targetClassroomId?: string;
    isManualOverride: boolean;
    overrideReason?: string;
    overallPercentage?: number | null;
    failedSubjects?: Array<{ subjectName: string; marksObtained: number; maxMarks: number; percentage: number }>;
    failureReasons?: string[];
}

export function BulkPromotionWizardDialog({
    open,
    onOpenChange,
    sourceClassroom,
    onSuccess,
}: BulkPromotionWizardDialogProps) {
    const [step, setStep] = useState<1 | 2 | 3>(1);
    const [selectedSourceSectionId, setSelectedSourceSectionId] = useState<string>("");
    const [targetAcademicYear, setTargetAcademicYear] = useState("2026-2027");
    const [defaultTargetClassroomId, setDefaultTargetClassroomId] = useState("");
    const [promotionPlans, setPromotionPlans] = useState<Record<string, StudentPromotionPlan>>({});
    const [overrideDialogStudent, setOverrideDialogStudent] = useState<StudentPromotionPlan | null>(null);
    const [overrideReasonInput, setOverrideReasonInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [resultSummary, setResultSummary] = useState<{
        promotedCount: number;
        retainedCount: number;
        graduatedCount: number;
        transferredCount: number;
    } | null>(null);

    // Fetch active classrooms for selection
    const { data: classrooms = [] } = useQuery({
        queryKey: ["all-classrooms-for-promotions"],
        queryFn: () => fetchClassrooms({ status: "ACTIVE" }),
        enabled: open,
        staleTime: 60_000,
    });

    useEffect(() => {
        if (sourceClassroom?.id) {
            setSelectedSourceSectionId(sourceClassroom.id);
        } else if (!selectedSourceSectionId && classrooms.length > 0) {
            setSelectedSourceSectionId(classrooms[0].id);
        }
    }, [sourceClassroom, classrooms, selectedSourceSectionId]);

    const effectiveSourceId = sourceClassroom?.id || selectedSourceSectionId;
    const effectiveClassroom = sourceClassroom || classrooms.find((c: Classroom) => c.id === effectiveSourceId);

    // Run rule evaluation on the source classroom
    const {
        data: evaluationData,
        isLoading: isEvaluationLoading,
    } = useQuery({
        queryKey: ["promotion-evaluation", effectiveSourceId],
        queryFn: () => evaluatePromotionCandidates(effectiveSourceId),
        enabled: open && Boolean(effectiveSourceId),
        staleTime: 5_000,
    });

    // Fetch deterministic next class based on school progression sequence
    const currentClassId = effectiveClassroom?.academicClass?.id || effectiveClassroom?.classId;
    const { data: nextClassData } = useQuery({
        queryKey: ["next-academic-class", currentClassId],
        queryFn: async () => {
            const { data } = await api.get(`/academic-classes/${currentClassId}/next-class`);
            return data.data as {
                currentClass: { id: string; name: string; orderIndex: number };
                nextClass: { id: string; name: string; orderIndex: number; sections?: Classroom[] } | null;
                isFinalClass: boolean;
            };
        },
        enabled: open && Boolean(currentClassId),
        staleTime: 60_000,
    });

    const isFinalClass = Boolean(nextClassData?.isFinalClass) || (effectiveClassroom?.name || "").toLowerCase().includes("12");

    // Filter available target classrooms: strictly sections belonging to nextClass!
    const validTargetSections = useMemo(() => {
        if (!nextClassData?.nextClass?.id) return [];
        return classrooms.filter((c: Classroom) => c.classId === nextClassData.nextClass?.id || c.name === nextClassData.nextClass?.name);
    }, [classrooms, nextClassData]);

    // Automatically set default target classroom to Section A of the next class
    useEffect(() => {
        if (validTargetSections.length > 0 && !defaultTargetClassroomId) {
            setDefaultTargetClassroomId(validTargetSections[0].id);
        }
    }, [validTargetSections, defaultTargetClassroomId]);
    useEffect(() => {
        if (!evaluationData) return;
        const plans: Record<string, StudentPromotionPlan> = {};

        // Eligible students -> default action is PROMOTE (or GRADUATE if final class)
        for (const s of evaluationData.eligibleStudents) {
            plans[s.studentId] = {
                studentId: s.studentId,
                studentName: s.name,
                admissionNumber: s.admissionNumber,
                rollNumber: s.rollNumber,
                action: isFinalClass ? "GRADUATE" : "PROMOTE",
                targetClassroomId: isFinalClass ? undefined : (defaultTargetClassroomId || undefined),
                isManualOverride: false,
                overallPercentage: s.overallPercentage,
                failedSubjects: s.failedSubjects
            };
        }

        // Failing students -> default action is RETAIN
        for (const s of evaluationData.failingStudents) {
            plans[s.studentId] = {
                studentId: s.studentId,
                studentName: s.name,
                admissionNumber: s.admissionNumber,
                rollNumber: s.rollNumber,
                action: "RETAIN",
                targetClassroomId: effectiveClassroom?.id,
                isManualOverride: false,
                overallPercentage: s.overallPercentage,
                failedSubjects: s.failedSubjects,
                failureReasons: s.failureReasons
            };
        }

        setPromotionPlans(plans);
    }, [evaluationData, isFinalClass, defaultTargetClassroomId, effectiveClassroom]);

    const updateStudentAction = (studentId: string, action: PromotionAction) => {
        setPromotionPlans((prev) => {
            const current = prev[studentId];
            if (!current) return prev;
            return {
                ...prev,
                [studentId]: {
                    ...current,
                    action,
                    targetClassroomId: action === "PROMOTE"
                        ? (current.targetClassroomId || defaultTargetClassroomId)
                        : (action === "RETAIN" ? effectiveClassroom?.id : undefined)
                }
            };
        });
    };

    const handleApplyOverride = () => {
        if (!overrideDialogStudent) return;
        if (!overrideReasonInput.trim()) {
            toast.error("Please enter a reason for manual override");
            return;
        }

        setPromotionPlans((prev) => ({
            ...prev,
            [overrideDialogStudent.studentId]: {
                ...prev[overrideDialogStudent.studentId],
                action: "PROMOTE",
                isManualOverride: true,
                overrideReason: overrideReasonInput.trim(),
                targetClassroomId: prev[overrideDialogStudent.studentId]?.targetClassroomId || defaultTargetClassroomId
            }
        }));

        toast.success(`Override applied for ${overrideDialogStudent.studentName}`);
        setOverrideDialogStudent(null);
        setOverrideReasonInput("");
    };

    const handleBulkPromote = async () => {
        if (!effectiveClassroom) {
            toast.error("Source classroom is missing.");
            return;
        }

        const plansList = Object.values(promotionPlans);
        if (plansList.length === 0) {
            toast.error("No students to promote.");
            return;
        }

        // Validate promoted students have a target classroom
        for (const p of plansList) {
            if (p.action === "PROMOTE" && !p.targetClassroomId) {
                toast.error(`Please select a target classroom for ${p.studentName}.`);
                return;
            }
        }

        setIsLoading(true);
        try {
            const payload = {
                sourceClassroomId: effectiveClassroom.id,
                targetAcademicYear: targetAcademicYear.trim(),
                ruleId: evaluationData?.rule?.id,
                promotions: plansList.map((p) => ({
                    studentId: p.studentId,
                    action: p.action,
                    rollNumber: p.rollNumber,
                    targetClassroomId: p.action === "PROMOTE" || p.action === "RETAIN" ? p.targetClassroomId : null,
                    isManualOverride: p.isManualOverride,
                    overrideReason: p.overrideReason || null,
                    evaluationSummary: {
                        overallPercentage: p.overallPercentage,
                        failedSubjects: p.failedSubjects || []
                    }
                }))
            };

            const { data } = await api.post("/classrooms/promotions/bulk", payload);
            setResultSummary(data.data.summary);
            setStep(3);
            toast.success(data.message || "Bulk promotion completed successfully!");
            onSuccess();
        } catch (err: unknown) {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
            toast.error(msg || "Failed to complete promotion process.");
        } finally {
            setIsLoading(false);
        }
    };

    const eligibleList = useMemo(() => {
        return Object.values(promotionPlans).filter((p) => !p.failureReasons || p.failureReasons.length === 0);
    }, [promotionPlans]);

    const failingList = useMemo(() => {
        return Object.values(promotionPlans).filter((p) => p.failureReasons && p.failureReasons.length > 0);
    }, [promotionPlans]);

    const promotedCount = Object.values(promotionPlans).filter((p) => p.action === "PROMOTE").length;
    const retainedCount = Object.values(promotionPlans).filter((p) => p.action === "RETAIN").length;
    const graduatedCount = Object.values(promotionPlans).filter((p) => p.action === "GRADUATE").length;
    const transferredCount = Object.values(promotionPlans).filter((p) => p.action === "TRANSFER").length;

    return (
        <>
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl">
                    <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/70">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                <GraduationCap className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    Student Year-End Promotion & Rollover
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Rule-based evaluation, pass/fail classification, and safe section progression.
                                </DialogDescription>
                            </div>
                        </div>

                        {/* Step indicator */}
                        <div className="flex items-center gap-1.5 pt-3">
                            <Badge variant={step === 1 ? "default" : "outline"} className="text-[11px] font-bold">
                                1. Source & Next Class
                            </Badge>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <Badge variant={step === 2 ? "default" : "outline"} className="text-[11px] font-bold">
                                2. Rule Evaluation
                            </Badge>
                            <ChevronRight className="w-3 h-3 text-muted-foreground" />
                            <Badge variant={step === 3 ? "default" : "outline"} className="text-[11px] font-bold">
                                3. Final Summary
                            </Badge>
                        </div>
                    </DialogHeader>

                    {step === 1 && (
                        <div className="p-6 space-y-4">
                            {!sourceClassroom && (
                                <div className="space-y-1.5">
                                    <Label className="text-xs font-bold text-foreground">Select Source Class & Section</Label>
                                    <Select
                                        value={selectedSourceSectionId}
                                        onValueChange={setSelectedSourceSectionId}
                                    >
                                        <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-bold">
                                            <SelectValue placeholder="Select class section to promote" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl border-border/80 max-h-56">
                                            {classrooms.map((c) => (
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
                                        Rule Evaluation Roster
                                    </span>
                                    <span className="font-bold text-foreground text-sm">
                                        {isEvaluationLoading ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin inline-block text-primary" />
                                        ) : (
                                            `${(evaluationData?.eligibleStudents?.length || 0) + (evaluationData?.failingStudents?.length || 0)} Students`
                                        )}
                                    </span>
                                    <p className="text-muted-foreground mt-0.5">
                                        Applied Rule: <strong>{evaluationData?.rule?.name || "Standard Default"}</strong>
                                    </p>
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
                                        Deterministic Next Class {isFinalClass ? "(Graduation Mode)" : "*"}
                                    </Label>
                                    {isFinalClass ? (
                                        <div className="h-10 px-3 rounded-xl bg-sky-500/10 border border-sky-500/20 text-sky-700 dark:text-sky-300 text-xs font-bold flex items-center">
                                            Final Class → Students will be marked GRADUATED
                                        </div>
                                    ) : (
                                        <Select
                                            value={defaultTargetClassroomId}
                                            onValueChange={setDefaultTargetClassroomId}
                                        >
                                            <SelectTrigger className="h-10 rounded-xl bg-muted/30 border-border/70 text-xs font-semibold">
                                                <SelectValue placeholder={nextClassData?.nextClass ? `Select Section of ${nextClassData.nextClass.name}` : "Select target section"} />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl border-border/80 max-h-56">
                                                {validTargetSections.length > 0 ? (
                                                    validTargetSections.map((c: Classroom) => (
                                                        <SelectItem key={c.id} value={c.id} className="text-xs">
                                                            {c.name} - Section {c.section} (Next in sequence)
                                                        </SelectItem>
                                                    ))
                                                ) : (
                                                    <SelectItem value="none" disabled className="text-xs text-muted-foreground">
                                                        No sections exist in {nextClassData?.nextClass?.name || "next class"}
                                                    </SelectItem>
                                                )}
                                            </SelectContent>
                                        </Select>
                                    )}
                                    {nextClassData?.nextClass && (
                                        <p className="text-[10px] text-muted-foreground">
                                            Fixed sequence: <strong>{effectiveClassroom?.name}</strong> → <strong>{nextClassData.nextClass.name}</strong>
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-900 dark:text-blue-200">
                                <strong>Rule-based Promotion:</strong> In Step 2, the system automatically checks student exam results against the promotion rule. Eligible students are set to Promote, while failing students are flagged with reasons and set to Retain (with manual override option).
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="p-6 space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold text-foreground">Promotion Candidates</span>
                                    <Badge variant="outline" className="text-[10px]">
                                        Rule: {evaluationData?.rule?.name} (Min {evaluationData?.rule?.minOverallPercentage}%)
                                    </Badge>
                                </div>
                                <div className="flex items-center gap-1.5 text-[11px]">
                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold border-emerald-500/30">
                                        {promotedCount} Promote
                                    </Badge>
                                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-300 font-bold border-amber-500/30">
                                        {retainedCount} Retain
                                    </Badge>
                                    <Badge className="bg-sky-500/15 text-sky-700 dark:text-sky-300 font-bold border-sky-500/30">
                                        {graduatedCount} Graduate
                                    </Badge>
                                </div>
                            </div>

                            <Tabs defaultValue="eligible" className="w-full">
                                <TabsList className="grid w-full grid-cols-2 rounded-xl h-9 bg-muted/60 p-1">
                                    <TabsTrigger value="eligible" className="text-xs font-bold rounded-lg gap-1.5">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                        Passing / Eligible ({eligibleList.length})
                                    </TabsTrigger>
                                    <TabsTrigger value="failing" className="text-xs font-bold rounded-lg gap-1.5">
                                        <XCircle className="w-3.5 h-3.5 text-destructive" />
                                        Failing / Ineligible ({failingList.length})
                                    </TabsTrigger>
                                </TabsList>

                                {/* Eligible Tab */}
                                <TabsContent value="eligible" className="mt-3">
                                    <ScrollArea className="h-64 rounded-xl border border-border/80 p-3 bg-muted/20">
                                        {eligibleList.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-10">No students in this list.</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {eligibleList.map((p) => (
                                                    <div
                                                        key={p.studentId}
                                                        className="flex items-center justify-between p-2.5 rounded-xl bg-background border border-border/70 text-xs gap-3 shadow-2xs"
                                                    >
                                                        <div className="min-w-0 flex-1">
                                                            <div className="flex items-center gap-2">
                                                                <span className="font-bold text-foreground truncate block">
                                                                    {p.studentName}
                                                                </span>
                                                                {p.overallPercentage !== null && (
                                                                    <Badge className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[10px] font-mono border-emerald-500/20">
                                                                        {p.overallPercentage}%
                                                                    </Badge>
                                                                )}
                                                            </div>
                                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                                Adm: {p.admissionNumber}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <Select
                                                                value={p.action}
                                                                onValueChange={(val: PromotionAction) => updateStudentAction(p.studentId, val)}
                                                            >
                                                                <SelectTrigger className="h-8 w-28 text-[11px] font-bold rounded-lg">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent className="rounded-xl">
                                                                    <SelectItem value="PROMOTE" className="text-xs font-semibold text-emerald-600">
                                                                        Promote
                                                                    </SelectItem>
                                                                    <SelectItem value="RETAIN" className="text-xs font-semibold text-amber-600">
                                                                        Retain
                                                                    </SelectItem>
                                                                    <SelectItem value="GRADUATE" className="text-xs font-semibold text-sky-600">
                                                                        Graduate
                                                                    </SelectItem>
                                                                    <SelectItem value="TRANSFER" className="text-xs font-semibold text-destructive">
                                                                        Transfer
                                                                    </SelectItem>
                                                                </SelectContent>
                                                            </Select>

                                                            {p.action === "PROMOTE" && !isFinalClass && (
                                                                <Select
                                                                    value={p.targetClassroomId || defaultTargetClassroomId}
                                                                    onValueChange={(val) => {
                                                                        setPromotionPlans(prev => ({
                                                                            ...prev,
                                                                            [p.studentId]: { ...prev[p.studentId], targetClassroomId: val }
                                                                        }));
                                                                    }}
                                                                >
                                                                    <SelectTrigger className="h-8 w-36 text-[11px] font-bold rounded-lg">
                                                                        <SelectValue placeholder="Target" />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-xl max-h-48">
                                                                        {validTargetSections.map((c: Classroom) => (
                                                                            <SelectItem key={c.id} value={c.id} className="text-xs">
                                                                                {c.name}-{c.section}
                                                                            </SelectItem>
                                                                        ))}
                                                                    </SelectContent>
                                                                </Select>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>

                                {/* Failing Tab */}
                                <TabsContent value="failing" className="mt-3">
                                    <ScrollArea className="h-64 rounded-xl border border-border/80 p-3 bg-muted/20">
                                        {failingList.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-10">No failing students!</p>
                                        ) : (
                                            <div className="space-y-2">
                                                {failingList.map((p) => (
                                                    <div
                                                        key={p.studentId}
                                                        className="p-2.5 rounded-xl bg-background border border-destructive/30 text-xs space-y-2 shadow-2xs"
                                                    >
                                                        <div className="flex items-center justify-between gap-3">
                                                            <div className="min-w-0 flex-1">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="font-bold text-foreground">
                                                                        {p.studentName}
                                                                    </span>
                                                                    {p.overallPercentage !== null && (
                                                                        <Badge className="bg-destructive/10 text-destructive text-[10px] font-mono border-destructive/20">
                                                                            {p.overallPercentage}%
                                                                        </Badge>
                                                                    )}
                                                                    {p.isManualOverride && (
                                                                        <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-300 text-[10px] font-bold border-amber-500/20">
                                                                            <ShieldCheck className="w-2.5 h-2.5 mr-1" /> Overridden
                                                                        </Badge>
                                                                    )}
                                                                </div>
                                                                <span className="text-[10px] text-muted-foreground font-mono">
                                                                    Adm: {p.admissionNumber}
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center gap-2 shrink-0">
                                                                <Select
                                                                    value={p.action}
                                                                    onValueChange={(val: PromotionAction) => updateStudentAction(p.studentId, val)}
                                                                >
                                                                    <SelectTrigger className="h-8 w-28 text-[11px] font-bold rounded-lg border-amber-500/40">
                                                                        <SelectValue />
                                                                    </SelectTrigger>
                                                                    <SelectContent className="rounded-xl">
                                                                        <SelectItem value="RETAIN" className="text-xs font-semibold text-amber-600">
                                                                            Retain (Default)
                                                                        </SelectItem>
                                                                        <SelectItem value="PROMOTE" className="text-xs font-semibold text-emerald-600">
                                                                            Promote
                                                                        </SelectItem>
                                                                        <SelectItem value="TRANSFER" className="text-xs font-semibold text-destructive">
                                                                            Transfer
                                                                        </SelectItem>
                                                                    </SelectContent>
                                                                </Select>

                                                                {p.action !== "PROMOTE" && (
                                                                    <Button
                                                                        size="sm"
                                                                        variant="outline"
                                                                        onClick={() => {
                                                                            setOverrideDialogStudent(p);
                                                                            setOverrideReasonInput("Principal discretion after academic review");
                                                                        }}
                                                                        className="h-8 text-[11px] font-bold rounded-lg border-amber-500/30 text-amber-700 dark:text-amber-300 hover:bg-amber-500/10"
                                                                    >
                                                                        Override & Promote
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>

                                                        {/* Diagnostic Failure Reasons */}
                                                        {p.failureReasons && p.failureReasons.length > 0 && (
                                                            <div className="p-2 rounded-lg bg-destructive/5 border border-destructive/15 text-[11px] text-destructive space-y-0.5">
                                                                {p.failureReasons.map((r, i) => (
                                                                    <div key={i} className="flex items-center gap-1.5">
                                                                        <AlertTriangle className="w-3 h-3 shrink-0" />
                                                                        <span>{r}</span>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </ScrollArea>
                                </TabsContent>
                            </Tabs>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="p-6 space-y-4">
                            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center space-y-2">
                                <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
                                <h3 className="text-sm font-bold text-foreground">Promotion Completed Successfully!</h3>
                                <p className="text-xs text-muted-foreground">
                                    All students have been processed according to academic promotion rules.
                                </p>
                            </div>

                            <div className="grid grid-cols-4 gap-3 text-center">
                                <div className="p-3 rounded-xl bg-muted/40 border border-border/70">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Promoted</span>
                                    <span className="text-lg font-bold text-emerald-600">{resultSummary?.promotedCount ?? promotedCount}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/40 border border-border/70">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Retained</span>
                                    <span className="text-lg font-bold text-amber-600">{resultSummary?.retainedCount ?? retainedCount}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/40 border border-border/70">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Graduated</span>
                                    <span className="text-lg font-bold text-sky-600">{resultSummary?.graduatedCount ?? graduatedCount}</span>
                                </div>
                                <div className="p-3 rounded-xl bg-muted/40 border border-border/70">
                                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Transferred</span>
                                    <span className="text-lg font-bold text-destructive">{resultSummary?.transferredCount ?? transferredCount}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="px-6 py-4 bg-muted/30 border-t border-border/70 flex justify-between gap-2">
                        {step === 2 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setStep(1)}
                                className="rounded-xl text-xs font-bold h-9"
                            >
                                Back
                            </Button>
                        )}

                        {step !== 2 && (
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => onOpenChange(false)}
                                className="rounded-xl text-xs font-bold h-9"
                            >
                                {step === 3 ? "Close" : "Cancel"}
                            </Button>
                        )}

                        {step === 1 && (
                            <Button
                                type="button"
                                onClick={() => {
                                    if (!effectiveClassroom) {
                                        toast.error("Please pick a source section.");
                                        return;
                                    }
                                    if (!isFinalClass && !defaultTargetClassroomId) {
                                        toast.error("Please pick a default target section for promotions.");
                                        return;
                                    }
                                    setStep(2);
                                }}
                                disabled={isEvaluationLoading}
                                className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 h-9 gap-1.5 shadow-sm"
                            >
                                Next: Review Rule Evaluation <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                        )}

                        {step === 2 && (
                            <Button
                                type="button"
                                onClick={handleBulkPromote}
                                disabled={isLoading}
                                className="rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 h-9 gap-1.5 shadow-sm"
                            >
                                {isLoading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                Confirm & Execute Promotions ({Object.keys(promotionPlans).length})
                            </Button>
                        )}
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Manual Override Reason Dialog */}
            <Dialog open={Boolean(overrideDialogStudent)} onOpenChange={(o) => !o && setOverrideDialogStudent(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-sm font-bold flex items-center gap-2">
                            <ShieldCheck className="w-4 h-4 text-amber-600" />
                            Manual Promotion Override
                        </DialogTitle>
                        <DialogDescription className="text-xs">
                            Student {overrideDialogStudent?.studentName} did not meet the standard promotion rule. Enter a reason to override and promote them.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-3 py-2">
                        <Label className="text-xs font-bold">Override Reason / Authorization *</Label>
                        <Input
                            value={overrideReasonInput}
                            onChange={(e) => setOverrideReasonInput(e.target.value)}
                            placeholder="e.g. Approved by Principal on medical grounds"
                            className="h-9 rounded-xl text-xs"
                        />
                    </div>

                    <DialogFooter className="gap-2">
                        <Button
                            variant="outline"
                            onClick={() => setOverrideDialogStudent(null)}
                            className="rounded-xl text-xs h-8"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleApplyOverride}
                            className="rounded-xl text-xs h-8 font-bold bg-amber-600 text-white hover:bg-amber-700"
                        >
                            Confirm Override
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
