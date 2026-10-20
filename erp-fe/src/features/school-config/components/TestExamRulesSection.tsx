import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck, Clock, Save, Loader2, Sparkles, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getTestExamRules,
    upsertTestExamRule,
    type TestExamConfig
} from "../api/classroomConfigApi";

interface Department {
    id: string;
    name: string;
}

export function TestExamRulesSection() {
    const queryClient = useQueryClient();
    const [selectedDeptId, setSelectedDeptId] = useState<string>("");
    const [academicYear, setAcademicYear] = useState<string>("2026-2027");

    // Form state
    const [totalTests, setTotalTests] = useState<number>(6);
    const [totalExams, setTotalExams] = useState<number>(3);
    const [testFrequency, setTestFrequency] = useState<'MONTHLY' | 'BI_MONTHLY' | 'QUARTERLY' | 'CUSTOM'>("MONTHLY");
    const [examFrequency, setExamFrequency] = useState<'QUARTERLY' | 'TERM_WISE' | 'SEMESTER_WISE' | 'ANNUAL' | 'CUSTOM'>("QUARTERLY");
    const [rulesDescription, setRulesDescription] = useState<string>("");

    // Fetch departments
    const { data: departments = [], isLoading: isLoadingDepts } = useQuery({
        queryKey: ["departments"],
        queryFn: async () => {
            const res = await api.get("/departments");
            return res.data.data.departments as Department[];
        }
    });

    // Auto-select first department
    useEffect(() => {
        if (departments.length > 0 && !selectedDeptId) {
            setSelectedDeptId(departments[0].id);
        }
    }, [departments, selectedDeptId]);

    // Fetch existing rule for selected department
    const { data: rules = [], isLoading: isLoadingRules } = useQuery({
        queryKey: ["test-exam-rules", selectedDeptId, academicYear],
        queryFn: () => getTestExamRules(selectedDeptId, academicYear),
        enabled: !!selectedDeptId,
    });

    const activeRule: TestExamConfig | undefined = rules[0];

    // Populate form when active rule loads or changes
    useEffect(() => {
        if (activeRule) {
            setTotalTests(activeRule.totalTestsPerYear);
            setTotalExams(activeRule.totalExamsPerYear);
            setTestFrequency(activeRule.testFrequency);
            setExamFrequency(activeRule.examFrequency);
            setRulesDescription(activeRule.rulesDescription || "");
        } else {
            // Default preset
            setTotalTests(6);
            setTotalExams(3);
            setTestFrequency("MONTHLY");
            setExamFrequency("QUARTERLY");
            setRulesDescription("");
        }
    }, [activeRule, selectedDeptId]);

    const saveMutation = useMutation({
        mutationFn: async () => {
            // Generate template slots based on numbers
            const testTemplates = Array.from({ length: totalTests }, (_, i) => ({
                name: `Unit Test ${i + 1}`,
                monthOffset: i + 1,
                durationDays: 2,
            }));

            const examTemplates = Array.from({ length: totalExams }, (_, i) => {
                let name = `Exam ${i + 1}`;
                if (totalExams === 2) {
                    name = i === 0 ? "Mid-Term Examination" : "Annual Final Examination";
                } else if (totalExams === 3) {
                    name = i === 0 ? "Quarterly Examination" : i === 1 ? "Half-Yearly Examination" : "Annual Final Examination";
                } else if (totalExams === 4) {
                    name = i === 0 ? "Quarterly 1 Exam" : i === 1 ? "Half-Yearly Exam" : i === 2 ? "Quarterly 2 Exam" : "Annual Final Exam";
                }
                return {
                    name,
                    monthOffset: (i + 1) * Math.floor(12 / (totalExams + 1)),
                    durationDays: 5,
                };
            });

            return await upsertTestExamRule({
                departmentId: selectedDeptId,
                academicYear,
                totalTestsPerYear: totalTests,
                totalExamsPerYear: totalExams,
                testFrequency,
                examFrequency,
                testTemplates,
                examTemplates,
                rulesDescription,
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["test-exam-rules"] });
            toast.success("Test & Exam configuration saved for department!");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to save configuration");
        }
    });

    const selectedDeptName = departments.find(d => d.id === selectedDeptId)?.name || "Department";

    return (
        <Card className="border-border/60 shadow-sm">
            <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <CalendarCheck className="w-5 h-5 text-primary" />
                            Test & Exam Rules (Per Department)
                        </CardTitle>
                        <CardDescription>
                            Configure academic milestones (e.g. Monthly Unit Tests, Quarterly / Term Exams) that will be scheduled automatically when classrooms are created.
                        </CardDescription>
                    </div>

                    <div className="flex items-center gap-3">
                        <Select value={academicYear} onValueChange={setAcademicYear}>
                            <SelectTrigger className="w-[140px] h-9">
                                <SelectValue placeholder="Academic Year" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="2025-2026">2025-2026</SelectItem>
                                <SelectItem value="2026-2027">2026-2027</SelectItem>
                                <SelectItem value="2027-2028">2027-2028</SelectItem>
                            </SelectContent>
                        </Select>
                        <Button
                            onClick={() => saveMutation.mutate()}
                            disabled={!selectedDeptId || saveMutation.isPending}
                            className="gap-2 h-9"
                        >
                            {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Save Rules
                        </Button>
                    </div>
                </div>

                {/* Department Selection Pills */}
                {isLoadingDepts ? (
                    <div className="flex gap-2 pt-4">
                        <Skeleton className="h-9 w-24 rounded-full" />
                        <Skeleton className="h-9 w-28 rounded-full" />
                    </div>
                ) : departments.length === 0 ? (
                    <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 mt-4">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>Please create at least one Department in the "Departments" tab first.</span>
                    </div>
                ) : (
                    <div className="flex flex-wrap items-center gap-2 pt-4">
                        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground mr-1">Select Department:</span>
                        {departments.map((d) => {
                            const isSelected = d.id === selectedDeptId;
                            return (
                                <button
                                    key={d.id}
                                    type="button"
                                    onClick={() => setSelectedDeptId(d.id)}
                                    className={`px-3.5 py-1.5 rounded-full text-xs font-bold transition-all border ${isSelected
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs"
                                        : "bg-muted/40 text-muted-foreground hover:bg-muted border-border/80"
                                        }`}
                                >
                                    {d.name}
                                </button>
                            );
                        })}
                    </div>
                )}
            </CardHeader>

            <CardContent className="space-y-6">
                {isLoadingRules ? (
                    <div className="space-y-4">
                        <Skeleton className="h-28 w-full rounded-2xl" />
                        <Skeleton className="h-40 w-full rounded-2xl" />
                    </div>
                ) : !selectedDeptId ? null : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Tests Configuration Card */}
                            <div className="p-5 rounded-2xl border border-border/70 bg-card/60 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                                            T
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">Unit Tests Configuration</h4>
                                            <p className="text-xs text-muted-foreground">Short periodic evaluations</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs font-semibold">
                                        {totalTests} Tests / Year
                                    </Badge>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Tests in a Year</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="24"
                                            value={totalTests}
                                            onChange={(e) => setTotalTests(parseInt(e.target.value, 10) || 0)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Frequency Rule</label>
                                        <Select value={testFrequency} onValueChange={(v: any) => setTestFrequency(v)}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="MONTHLY">Every Month (Monthly Tests)</SelectItem>
                                                <SelectItem value="BI_MONTHLY">Every 2 Months (Bi-Monthly)</SelectItem>
                                                <SelectItem value="QUARTERLY">Every 3 Months (Quarterly Tests)</SelectItem>
                                                <SelectItem value="CUSTOM">Custom Interval</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>

                            {/* Exams Configuration Card */}
                            <div className="p-5 rounded-2xl border border-border/70 bg-card/60 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                                            E
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-sm text-foreground">Term Examination Rules</h4>
                                            <p className="text-xs text-muted-foreground">Comprehensive academic assessments</p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="text-xs font-semibold">
                                        {totalExams} Exams / Year
                                    </Badge>
                                </div>

                                <div className="space-y-3 pt-2">
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Total Exams in a Year</label>
                                        <Input
                                            type="number"
                                            min="0"
                                            max="12"
                                            value={totalExams}
                                            onChange={(e) => setTotalExams(parseInt(e.target.value, 10) || 0)}
                                            className="mt-1"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Exam Cadence Pattern</label>
                                        <Select value={examFrequency} onValueChange={(v: any) => setExamFrequency(v)}>
                                            <SelectTrigger className="mt-1">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="QUARTERLY">Every 3rd Month (Quarterly / Half-Yearly / Final)</SelectItem>
                                                <SelectItem value="TERM_WISE">Term Based (Mid-Term & Final)</SelectItem>
                                                <SelectItem value="SEMESTER_WISE">Semester Wise (Semester 1 & 2)</SelectItem>
                                                <SelectItem value="ANNUAL">Annual Only</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Generated Schedule Preview */}
                        <div className="p-5 rounded-2xl bg-muted/30 border border-border/60 space-y-3">
                            <div className="flex items-center justify-between">
                                <h4 className="font-bold text-sm flex items-center gap-2 text-foreground">
                                    <Sparkles className="w-4 h-4 text-primary" />
                                    Dynamic Evaluation Milestones Preview for {selectedDeptName}
                                </h4>
                                <span className="text-xs text-muted-foreground">
                                    Classrooms under {selectedDeptName} will populate these test/exam milestones automatically.
                                </span>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5 pt-2">
                                {Array.from({ length: totalTests }).map((_, i) => (
                                    <div key={`test-${i}`} className="p-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 flex flex-col items-center text-center">
                                        <Clock className="w-3.5 h-3.5 text-blue-500 mb-1" />
                                        <span className="text-xs font-bold text-foreground">Unit Test {i + 1}</span>
                                        <span className="text-[10px] text-muted-foreground">Month {i + 1}</span>
                                    </div>
                                ))}

                                {Array.from({ length: totalExams }).map((_, i) => {
                                    let examName = `Exam ${i + 1}`;
                                    if (totalExams === 2) examName = i === 0 ? "Mid-Term" : "Annual Final";
                                    if (totalExams === 3) examName = i === 0 ? "Quarterly" : i === 1 ? "Half-Yearly" : "Annual Final";
                                    return (
                                        <div key={`exam-${i}`} className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col items-center text-center">
                                            <CalendarCheck className="w-3.5 h-3.5 text-purple-600 mb-1" />
                                            <span className="text-xs font-bold text-foreground">{examName}</span>
                                            <span className="text-[10px] text-muted-foreground font-semibold">Term Exam</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
