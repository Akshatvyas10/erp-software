import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Sparkles,
    CalendarCheck,
    BookOpen,
    Loader2,
    Layers,
    RotateCcw,
} from "lucide-react";
import { toast } from "sonner";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import api from "@/lib/api";

interface PreviewSubjectPaper {
    subjectId: string;
    subjectName: string;
    subjectCode: string;
    date: string;
    maxMarks: number;
}

interface PreviewScheduleItem {
    name: string;
    type: string;
    plannedStartDate: string;
    plannedEndDate: string;
    paperCount: number;
    status: string;
    subjects: PreviewSubjectPaper[];
}

interface AutoSchedulePreviewResponse {
    classroom: {
        id: string;
        name: string;
        section: string;
        departmentName: string;
        academicYear: string;
        assignedSubjectsCount: number;
    };
    rule: {
        totalExamsPerYear: number;
        totalTestsPerYear: number;
        description: string;
    };
    previewSchedules: PreviewScheduleItem[];
    existingSchedules: Array<{
        id: string;
        name: string;
        type: string;
        status: string;
    }>;
}

interface AutoGenerateExamScheduleDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    onSuccess?: () => void;
}

export function AutoGenerateExamScheduleDialog({
    open,
    onOpenChange,
    classroomId,
    onSuccess,
}: AutoGenerateExamScheduleDialogProps) {
    const qc = useQueryClient();

    // Generation options
    const [includeMajorExams, setIncludeMajorExams] = useState(true);
    const [includeUnitTests, setIncludeUnitTests] = useState(true);
    const [overwriteDrafts, setOverwriteDrafts] = useState(true);

    // Fetch dynamic preview from department rules
    const {
        data: previewData,
        isLoading,
        isError,
        error,
        refetch,
    } = useQuery<AutoSchedulePreviewResponse>({
        queryKey: [
            "exam-schedules-preview",
            classroomId,
            includeMajorExams,
            includeUnitTests,
        ],
        queryFn: async () => {
            const res = await api.get(
                `/exams/schedules/preview?classroomId=${classroomId}&includeMajorExams=${includeMajorExams}&includeUnitTests=${includeUnitTests}`
            );
            return res.data.data;
        },
        enabled: open && !!classroomId,
    });

    // Mutation: Generate schedules & papers
    const generateMutation = useMutation({
        mutationFn: async () => {
            const res = await api.post("/exams/schedules/auto-generate", {
                classroomId,
                includeMajorExams,
                includeUnitTests,
                overwriteDrafts,
            });
            return res.data.data;
        },
        onSuccess: (data) => {
            toast.success(
                `Generated ${data.schedulesCount} schedules and ${data.papersCount} exam papers!`
            );
            qc.invalidateQueries({ queryKey: ["exam-schedules", classroomId] });
            qc.invalidateQueries({ queryKey: ["calendar-events"] });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            toast.error(
                err?.response?.data?.message || "Failed to generate exam schedules."
            );
        },
    });

    const previewList = previewData?.previewSchedules || [];

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            title="Auto-Generate Exam Schedules"
            description="Automatically generate major exams, periodic unit tests, and subject papers from Department Evaluation Rules."
            maxWidth="sm:max-w-3xl"
        >
            <div className="space-y-5 pt-1">
                {/* ── 1. Department Rule Context Banner ─────────────────────── */}
                <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 border border-purple-500/20 space-y-2">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                            <span className="p-1.5 rounded-lg bg-purple-600 text-white shadow-xs">
                                <Sparkles className="w-4 h-4" />
                            </span>
                            <div>
                                <h4 className="text-sm font-bold text-foreground">
                                    {previewData?.classroom.departmentName || "Department"} Evaluation Rules
                                </h4>
                                <p className="text-xs text-muted-foreground">
                                    {previewData?.rule.description || "Loading aligned department rules..."}
                                </p>
                            </div>
                        </div>

                        {previewData?.classroom && (
                            <div className="flex items-center gap-1.5">
                                <Badge variant="outline" className="font-bold text-[11px] bg-background">
                                    Session {previewData.classroom.academicYear}
                                </Badge>
                                <Badge variant="secondary" className="font-bold text-[11px]">
                                    {previewData.classroom.assignedSubjectsCount} Subjects Assigned
                                </Badge>
                            </div>
                        )}
                    </div>
                </div>

                {/* ── 2. Generation Options Control Strip ───────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 rounded-xl border border-border/70 bg-card/50">
                    <div className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="space-y-0.5">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                                <CalendarCheck className="w-3.5 h-3.5 text-purple-600" />
                                Major Exams
                            </label>
                            <p className="text-[10px] text-muted-foreground">Quarterly / Term / Final</p>
                        </div>
                        <Switch
                            checked={includeMajorExams}
                            onCheckedChange={setIncludeMajorExams}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="space-y-0.5">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                                <BookOpen className="w-3.5 h-3.5 text-blue-600" />
                                Periodic Tests
                            </label>
                            <p className="text-[10px] text-muted-foreground">Monthly / Unit Tests</p>
                        </div>
                        <Switch
                            checked={includeUnitTests}
                            onCheckedChange={setIncludeUnitTests}
                        />
                    </div>

                    <div className="flex items-center justify-between gap-3 p-2 rounded-lg hover:bg-muted/40 transition-colors">
                        <div className="space-y-0.5">
                            <label className="text-xs font-bold text-foreground flex items-center gap-1.5 cursor-pointer">
                                <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                Overwrite Drafts
                            </label>
                            <p className="text-[10px] text-muted-foreground">Keeps Published safe</p>
                        </div>
                        <Switch
                            checked={overwriteDrafts}
                            onCheckedChange={setOverwriteDrafts}
                        />
                    </div>
                </div>

                {/* ── 3. Live Preview Matrix ─────────────────────────────────── */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5" />
                            Planned Schedules Matrix ({previewList.length} items)
                        </h4>
                        <span className="text-[11px] text-muted-foreground">
                            Subject papers generated automatically
                        </span>
                    </div>

                    {isLoading ? (
                        <div className="py-12 flex flex-col items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                            <p className="text-xs font-medium">Calculating schedule dates from Department Rules...</p>
                        </div>
                    ) : isError ? (
                        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/5 text-destructive text-xs space-y-1">
                            <p className="font-bold">Cannot Preview Schedules</p>
                            <p>{(error as any)?.response?.data?.message || (error as any)?.message || "Failed to load preview."}</p>
                            <Button size="sm" variant="outline" onClick={() => refetch()} className="mt-2 text-xs h-7">
                                Try Again
                            </Button>
                        </div>
                    ) : previewList.length === 0 ? (
                        <div className="py-8 text-center border border-dashed rounded-xl text-muted-foreground text-xs">
                            No schedules selected. Please enable Major Exams or Periodic Tests.
                        </div>
                    ) : (
                        <div className="border border-border/80 rounded-xl overflow-hidden shadow-2xs max-h-64 overflow-y-auto">
                            <Table>
                                <TableHeader className="bg-muted/50 sticky top-0 backdrop-blur-sm z-10">
                                    <TableRow>
                                        <TableHead className="font-bold text-xs">Schedule Name</TableHead>
                                        <TableHead className="font-bold text-xs">Type</TableHead>
                                        <TableHead className="font-bold text-xs">Target Window</TableHead>
                                        <TableHead className="font-bold text-xs text-center">Subject Papers</TableHead>
                                        <TableHead className="font-bold text-xs text-right">Status</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewList.map((sch, i) => (
                                        <TableRow key={i} className="hover:bg-muted/30">
                                            <TableCell className="font-bold text-xs text-foreground py-2.5">
                                                {sch.name}
                                            </TableCell>
                                            <TableCell className="py-2.5">
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] font-bold ${
                                                        sch.type === "UNIT_TEST"
                                                            ? "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20"
                                                            : "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20"
                                                    }`}
                                                >
                                                    {sch.type}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-muted-foreground font-mono py-2.5">
                                                {sch.plannedStartDate} &rarr; {sch.plannedEndDate}
                                            </TableCell>
                                            <TableCell className="text-xs font-semibold text-center py-2.5">
                                                <span className="px-2 py-0.5 rounded-md bg-muted font-mono">
                                                    {sch.paperCount} Papers
                                                </span>
                                            </TableCell>
                                            <TableCell className="text-right py-2.5">
                                                <Badge variant="secondary" className="text-[10px] font-semibold">
                                                    DRAFT
                                                </Badge>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </div>

                {/* ── 4. Action Buttons ───────────────────────────────────────── */}
                <div className="flex items-center justify-between pt-3 border-t border-border/80">
                    <p className="text-[11px] text-muted-foreground">
                        All papers will be created in <strong className="text-foreground">DRAFT</strong> mode and can be fine-tuned before publishing.
                    </p>
                    <div className="flex items-center gap-2">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            disabled={
                                generateMutation.isPending ||
                                isLoading ||
                                previewList.length === 0
                            }
                            onClick={() => generateMutation.mutate()}
                            className="rounded-xl font-bold text-xs bg-purple-600 hover:bg-purple-700 text-white gap-2 shadow-sm"
                        >
                            {generateMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Sparkles className="w-3.5 h-3.5" />
                            )}
                            Confirm &amp; Generate Schedules
                        </Button>
                    </div>
                </div>
            </div>
        </ResponsiveModal>
    );
}
