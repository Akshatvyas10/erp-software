import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, Building2, Trash2, Edit3, Loader2, Users, Layers,
    CalendarCheck, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    getTestExamRules,
    upsertTestExamRule,
} from "../api/classroomConfigApi";
import { fetchCurrentAcademicYear } from "../api/academicYearApi";

interface Department {
    id: string;
    name: string;
    headId?: string | null;
    head?: {
        id: string;
        teacherId: string;
        account?: {
            firstName: string;
            lastName: string;
            email: string;
        };
    };
}

export interface ExamOptionDefinition {
    count: number;
    title: string;
    description: string;
    frequency: 'ANNUAL' | 'TERM_WISE' | 'QUARTERLY' | 'CUSTOM';
    examNames: string[];
    // Dynamic contextual test options strictly matching this exam setup
    testOptions: {
        id: string;
        count: number;
        label: string;
        description: string;
        testNames: string[];
    }[];
}

export const EXAM_ACADEMIC_SYSTEMS: Record<number, ExamOptionDefinition> = {
    // ── 1 Exam Model ────────────────────────────────────────────────────────
    1: {
        count: 1,
        title: "1 Exam (Annual System)",
        description: "One comprehensive Annual Final Examination at the end of the academic year.",
        frequency: "ANNUAL",
        examNames: ["Annual Final Examination"],
        testOptions: [
            {
                id: "monthly_10",
                count: 10,
                label: "Monthly Tests (10 Tests — Every Month before Annual Exam)",
                description: "Unit Test 1 to Unit Test 10 conducted each academic month leading to the Final Exam.",
                testNames: Array.from({ length: 10 }, (_, i) => `Unit Test ${i + 1}`)
            },
            {
                id: "bimonthly_5",
                count: 5,
                label: "Bi-Monthly Tests (5 Tests — Every 2 Months before Annual)",
                description: "Periodic tests scheduled every 2 months throughout the session.",
                testNames: Array.from({ length: 5 }, (_, i) => `Periodic Test ${i + 1}`)
            },
            {
                id: "quarterly_3",
                count: 3,
                label: "Quarterly Pre-Tests (3 Diagnostic Tests)",
                description: "Terminal assessments held at month 3, 6, and 9.",
                testNames: ["Diagnostic Test 1", "Diagnostic Test 2", "Pre-Board Test"]
            }
        ]
    },

    // ── 2 Exams Model (Term / Semester) ──────────────────────────────────────
    2: {
        count: 2,
        title: "2 Exams (Mid-Term & Annual Final)",
        description: "Two-term structure: Term 1 (Mid-Term Exam) and Term 2 (Annual Final Exam).",
        frequency: "TERM_WISE",
        examNames: ["Mid-Term Examination", "Annual Final Examination"],
        testOptions: [
            {
                id: "monthly_8",
                count: 8,
                label: "Monthly Tests (4 Tests before Mid-Term + 4 Tests before Final)",
                description: "4 monthly unit tests in Term 1 and 4 monthly unit tests in Term 2.",
                testNames: [
                    "Term 1 - Unit Test 1", "Term 1 - Unit Test 2", "Term 1 - Unit Test 3", "Term 1 - Pre-Mid Test",
                    "Term 2 - Unit Test 1", "Term 2 - Unit Test 2", "Term 2 - Unit Test 3", "Term 2 - Pre-Final Test"
                ]
            },
            {
                id: "periodic_4",
                count: 4,
                label: "Periodic Tests (2 Tests before Mid-Term + 2 Tests before Final)",
                description: "Periodic Assessment 1 & 2 before Mid-Term, Assessment 3 & 4 before Final.",
                testNames: ["Periodic Test 1", "Periodic Test 2", "Periodic Test 3", "Periodic Test 4"]
            },
            {
                id: "mid_final_2",
                count: 2,
                label: "Pre-Exam Mocks (1 Mock Test before each Exam)",
                description: "One comprehensive mock paper before Mid-Term and one before Annual Final.",
                testNames: ["Mid-Term Preparatory Test", "Final Preparatory Test"]
            }
        ]
    },

    // ── 3 Exams Model (Quarterly / Trimester) ─────────────────────────────────
    3: {
        count: 3,
        title: "3 Exams (Quarterly, Half-Yearly & Annual Final)",
        description: "Three major milestones: Quarterly Exam, Half-Yearly (Mid-Session) Exam, and Annual Final Exam.",
        frequency: "QUARTERLY",
        examNames: ["Quarterly Examination", "Half-Yearly Examination", "Annual Final Examination"],
        testOptions: [
            {
                id: "monthly_6",
                count: 6,
                label: "Monthly Tests (2 Tests before each Exam)",
                description: "2 Unit Tests prior to Quarterly, 2 prior to Half-Yearly, and 2 prior to Annual.",
                testNames: [
                    "Pre-Quarterly Test 1", "Pre-Quarterly Test 2",
                    "Pre-Half-Yearly Test 1", "Pre-Half-Yearly Test 2",
                    "Pre-Annual Test 1", "Pre-Annual Test 2"
                ]
            },
            {
                id: "monthly_9",
                count: 9,
                label: "Intensive Monthly Tests (3 Tests before each Exam)",
                description: "Regular monthly unit testing across all three academic terms.",
                testNames: [
                    "Unit Test 1", "Unit Test 2", "Revision Test 1",
                    "Unit Test 3", "Unit Test 4", "Revision Test 2",
                    "Unit Test 5", "Unit Test 6", "Revision Test 3"
                ]
            },
            {
                id: "unit_3",
                count: 3,
                label: "Unit Tests (1 Unit Test before each Exam)",
                description: "One progress test before each major examination.",
                testNames: ["Unit Test 1 (Pre-Quarterly)", "Unit Test 2 (Pre-Half-Yearly)", "Unit Test 3 (Pre-Annual)"]
            }
        ]
    },

    // ── 4 Exams Model (4 Quarters / Cycles) ──────────────────────────────────
    4: {
        count: 4,
        title: "4 Exams (Quarter 1, Half-Yearly, Quarter 3 & Final)",
        description: "Quarterly examination cadence covering 4 academic terms.",
        frequency: "QUARTERLY",
        examNames: ["Quarter 1 Examination", "Half-Yearly Examination", "Quarter 3 Examination", "Annual Final Examination"],
        testOptions: [
            {
                id: "quarterly_4",
                count: 4,
                label: "1 Unit Test before each of the 4 Exams",
                description: "Evaluation test prior to Quarter 1, Half-Yearly, Quarter 3, and Annual Exam.",
                testNames: [
                    "Unit Test 1 (before Q1)",
                    "Unit Test 2 (before Half-Yearly)",
                    "Unit Test 3 (before Q3)",
                    "Unit Test 4 (before Final)"
                ]
            },
            {
                id: "quarterly_8",
                count: 8,
                label: "2 Tests before each of the 4 Exams (8 Total)",
                description: "Fortnightly/monthly preparation before every quarter exam.",
                testNames: [
                    "Q1 Test A", "Q1 Test B",
                    "Half-Yearly Test A", "Half-Yearly Test B",
                    "Q3 Test A", "Q3 Test B",
                    "Final Revision Test A", "Final Revision Test B"
                ]
            }
        ]
    }
};

export function DepartmentsConfigSection() {
    const queryClient = useQueryClient();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingDept, setEditingDept] = useState<Department | null>(null);

    // Basic Department fields
    const [deptName, setDeptName] = useState("");
    const [headId, setHeadId] = useState("");

    // Embedded Test & Exam Configuration fields
    const { data: currentYear } = useQuery({
        queryKey: ["currentAcademicYear"],
        queryFn: fetchCurrentAcademicYear,
        staleTime: 60_000,
    });
    const academicYear = currentYear?.name || "2026-2027";
    const [totalExams, setTotalExams] = useState<number>(3);
    const [selectedTestOptionId, setSelectedTestOptionId] = useState<string>("monthly_6");

    // Fetch departments
    const { data: departments = [], isLoading: isLoadingDepts } = useQuery({
        queryKey: ["departments"],
        queryFn: async () => {
            const res = await api.get("/departments");
            return res.data.data.departments as Department[];
        }
    });

    // Fetch teachers for HOD
    const { data: teachers = [] } = useQuery({
        queryKey: ["teachers-select"],
        queryFn: async () => {
            const res = await api.get("/teachers");
            return res.data.data.teachers || [];
        }
    });

    // Fetch existing rules for all departments
    const { data: allRules = [] } = useQuery({
        queryKey: ["test-exam-rules", "all", academicYear],
        queryFn: () => getTestExamRules(undefined, academicYear),
    });

    // Current Exam system definition
    const activeExamSystem = EXAM_ACADEMIC_SYSTEMS[totalExams] || EXAM_ACADEMIC_SYSTEMS[3];

    // Current active test configuration option
    const activeTestOption = activeExamSystem.testOptions.find(o => o.id === selectedTestOptionId)
        || activeExamSystem.testOptions[0];

    // When totalExams changes, auto-select first compatible test option
    const handleExamCountChange = (count: number) => {
        setTotalExams(count);
        const newSystem = EXAM_ACADEMIC_SYSTEMS[count] || EXAM_ACADEMIC_SYSTEMS[3];
        setSelectedTestOptionId(newSystem.testOptions[0].id);
    };

    // Save Department + Aligned Test & Exam Rules
    const saveMutation = useMutation({
        mutationFn: async () => {
            let deptId = editingDept?.id;

            // 1. Create or update Department
            if (editingDept) {
                await api.put(`/departments/${editingDept.id}`, {
                    name: deptName,
                    headId: headId || null
                });
            } else {
                const res = await api.post("/departments", {
                    name: deptName,
                    headId: headId || null
                });
                deptId = res.data.data.department.id;
            }

            // 2. Build aligned exam templates
            const examTemplates = activeExamSystem.examNames.map((name, i) => ({
                name,
                monthOffset: (i + 1) * Math.floor(12 / (totalExams + 1)),
                durationDays: 5
            }));

            // 3. Build aligned test templates
            const testTemplates = activeTestOption.testNames.map((name, i) => ({
                name,
                monthOffset: i + 1,
                durationDays: 2
            }));

            // 4. Save aligned test & exam rule for this department
            if (deptId) {
                await upsertTestExamRule({
                    departmentId: deptId,
                    academicYear,
                    totalTestsPerYear: activeTestOption.count,
                    totalExamsPerYear: totalExams,
                    testFrequency: activeTestOption.count >= 8 ? "MONTHLY" : "BI_MONTHLY",
                    examFrequency: activeExamSystem.frequency,
                    testTemplates,
                    examTemplates,
                    rulesDescription: `${activeExamSystem.title} — ${activeTestOption.label}`,
                    isActive: true,
                });
            }
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            queryClient.invalidateQueries({ queryKey: ["test-exam-rules"] });
            toast.success(editingDept ? "Department and academic rules updated" : "Department and academic rules created");
            setIsDialogOpen(false);
            setEditingDept(null);
            setDeptName("");
            setHeadId("");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to save department configuration");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return await api.delete(`/departments/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["departments"] });
            queryClient.invalidateQueries({ queryKey: ["test-exam-rules"] });
            toast.success("Department deleted");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete department");
        }
    });

    const handleOpenDialog = (dept?: Department) => {
        if (dept) {
            setEditingDept(dept);
            setDeptName(dept.name);
            setHeadId(dept.headId || "");

            // Look up existing rule for this department
            const existingRule = allRules.find(r => r.departmentId === dept.id);
            if (existingRule) {
                const count = existingRule.totalExamsPerYear || 3;
                setTotalExams(count);
                const sys = EXAM_ACADEMIC_SYSTEMS[count] || EXAM_ACADEMIC_SYSTEMS[3];
                // Match existing test count if possible
                const matchedOption = sys.testOptions.find(o => o.count === existingRule.totalTestsPerYear) || sys.testOptions[0];
                setSelectedTestOptionId(matchedOption.id);
            } else {
                setTotalExams(3);
                setSelectedTestOptionId("monthly_6");
            }
        } else {
            setEditingDept(null);
            setDeptName("");
            setHeadId("");
            setTotalExams(3);
            setSelectedTestOptionId("monthly_6");
        }
        setIsDialogOpen(true);
    };

    return (
        <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-primary" />
                        Academic Departments & Evaluation Rules
                    </CardTitle>
                    <CardDescription>
                        Define school departments (e.g., Primary, Mid, High Secondary School) along with their exam structure and aligned periodic test rules.
                    </CardDescription>
                </div>
                <Button onClick={() => handleOpenDialog()} className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" />
                    New Department
                </Button>
            </CardHeader>
            <CardContent>
                {isLoadingDepts ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : departments.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                        <Layers className="w-10 h-10 mb-2 opacity-30" />
                        <p className="font-semibold text-base">No departments configured yet</p>
                        <p className="text-sm">Create standard departments like Primary, Middle, or High Secondary to configure classrooms.</p>
                        <Button variant="outline" size="sm" className="mt-4 gap-2" onClick={() => handleOpenDialog()}>
                            <Plus className="w-4 h-4" /> Add First Department
                        </Button>
                    </div>
                ) : (
                    <div className="border border-border/60 rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="font-bold">Department Name</TableHead>
                                    <TableHead className="font-bold">Incharge (Head of Department)</TableHead>
                                    <TableHead className="font-bold">Evaluation System</TableHead>
                                    <TableHead className="font-bold text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {departments.map((d) => {
                                    const rule = allRules.find(r => r.departmentId === d.id);
                                    return (
                                        <TableRow key={d.id} className="hover:bg-muted/30">
                                            <TableCell className="font-semibold text-foreground">
                                                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold">
                                                    {d.name}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {d.head?.account ? (
                                                    <div className="flex items-center gap-1.5">
                                                        <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                                        <span>{d.head.account.firstName} {d.head.account.lastName}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-xs italic text-muted-foreground/60">Not Assigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {rule ? (
                                                    <div className="flex flex-col gap-1">
                                                        <div className="flex items-center gap-2">
                                                            <Badge variant="outline" className="text-xs font-bold border-purple-500/30 text-purple-600 bg-purple-500/5">
                                                                {rule.totalExamsPerYear} Exams ({rule.examFrequency})
                                                            </Badge>
                                                            <Badge variant="secondary" className="text-xs font-semibold">
                                                                {rule.totalTestsPerYear} Tests
                                                            </Badge>
                                                        </div>
                                                        {rule.rulesDescription && (
                                                            <span className="text-[11px] text-muted-foreground line-clamp-1">{rule.rulesDescription}</span>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground italic">3 Exams &bull; 6 Tests (Quarterly)</span>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex items-center justify-end gap-1">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-foreground"
                                                        onClick={() => handleOpenDialog(d)}
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => {
                                                            if (confirm(`Are you sure you want to delete ${d.name}?`)) {
                                                                deleteMutation.mutate(d.id);
                                                            }
                                                        }}
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}

                {/* Create/Edit Department Modal with Aligned Exam-First Configuration */}
                <ResponsiveModal
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    title={editingDept ? "Edit Department & Academic Rules" : "Create Department & Evaluation Rules"}
                    description="Configure department identity and its academic evaluation system."
                    maxWidth="sm:max-w-xl"
                >
                    <div className="space-y-5">
                        {/* Section 1: Department Information */}
                        <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/60">
                            <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                                <Building2 className="w-4 h-4 text-primary" />
                                <span>1. Department Details</span>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Department Name *</label>
                                    <Input
                                        placeholder="e.g. Primary, Mid, High Secondary School"
                                        value={deptName}
                                        onChange={(e) => setDeptName(e.target.value)}
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Incharge (Head of Department)</label>
                                    <Select value={headId} onValueChange={setHeadId}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select Incharge (Optional)" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="">-- None / Unassigned --</SelectItem>
                                            {teachers.map((t: any) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.account?.firstName} {t.account?.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>
                        </div>

                        {/* Section 2: Step 1 - Choose Examination System First */}
                        <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/60">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                                    <CalendarCheck className="w-4 h-4 text-purple-600" />
                                    <span>2. Step 1: Select Total Examinations in a Year</span>
                                </div>
                                <Badge variant="outline" className="text-xs font-semibold">
                                    Academic Year {academicYear}
                                </Badge>
                            </div>

                            <div className="space-y-2">
                                <Select
                                    value={totalExams.toString()}
                                    onValueChange={(val) => handleExamCountChange(parseInt(val, 10))}
                                >
                                    <SelectTrigger className="font-semibold text-sm h-10">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="1">1 Exam &mdash; Annual System (Final Exam at year end)</SelectItem>
                                        <SelectItem value="2">2 Exams &mdash; Term / Semester System (Mid-Term & Annual Final)</SelectItem>
                                        <SelectItem value="3">3 Exams &mdash; Trimester / Quarterly System (Quarterly, Half-Yearly & Final)</SelectItem>
                                        <SelectItem value="4">4 Exams &mdash; Four-Quarter System (Q1, Half-Yearly, Q3 & Final)</SelectItem>
                                    </SelectContent>
                                </Select>

                                <div className="p-2.5 rounded-xl bg-purple-500/5 border border-purple-500/20 text-xs text-foreground space-y-1">
                                    <p className="font-bold text-purple-700 dark:text-purple-400">{activeExamSystem.title}</p>
                                    <p className="text-muted-foreground">{activeExamSystem.description}</p>
                                    <div className="flex flex-wrap gap-1.5 pt-1">
                                        {activeExamSystem.examNames.map((en, i) => (
                                            <span key={i} className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-700 dark:text-purple-300 font-bold text-[10px]">
                                                {en}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Section 3: Step 2 - Dependent Unit Tests Rule According to Exam System */}
                        <div className="space-y-3 p-4 rounded-2xl border border-border/70 bg-card/60">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-foreground font-bold text-sm">
                                    <Sparkles className="w-4 h-4 text-blue-600" />
                                    <span>3. Step 2: Choose Test Cadence for this Exam Structure</span>
                                </div>
                                <Badge variant="secondary" className="text-[11px] font-bold">
                                    Tailored for {totalExams} Exam{totalExams > 1 ? "s" : ""}
                                </Badge>
                            </div>

                            <p className="text-xs text-muted-foreground">
                                These testing options are automatically tailored to match your {activeExamSystem.title}.
                            </p>

                            <div className="space-y-2.5 pt-1">
                                {activeExamSystem.testOptions.map((opt) => {
                                    const isSelected = opt.id === activeTestOption.id;
                                    return (
                                        <div
                                            key={opt.id}
                                            onClick={() => setSelectedTestOptionId(opt.id)}
                                            className={`p-3 rounded-xl border cursor-pointer transition-all ${isSelected
                                                ? "border-blue-500 bg-blue-500/10 shadow-xs"
                                                : "border-border/80 hover:bg-muted/40"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <input
                                                            type="radio"
                                                            checked={isSelected}
                                                            onChange={() => setSelectedTestOptionId(opt.id)}
                                                            className="text-blue-600 focus:ring-blue-500"
                                                        />
                                                        <span className="font-bold text-xs text-foreground">{opt.label}</span>
                                                    </div>
                                                    <p className="text-[11px] text-muted-foreground pl-5">{opt.description}</p>
                                                </div>
                                                <Badge variant="outline" className="text-[10px] font-bold">
                                                    {opt.count} Tests
                                                </Badge>
                                            </div>

                                            {isSelected && (
                                                <div className="mt-2.5 pl-5 pt-2 border-t border-blue-500/20 flex flex-wrap gap-1">
                                                    {opt.testNames.map((tn, idx) => (
                                                        <span key={idx} className="px-1.5 py-0.5 rounded bg-blue-500/15 text-blue-700 dark:text-blue-300 font-semibold text-[10px]">
                                                            {tn}
                                                        </span>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Section 4: Live Summary Card */}
                        <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/80 space-y-2">
                            <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-primary" />
                                Final Academic Cadence for {deptName || "this Department"}:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                                {activeTestOption.testNames.map((tn, i) => (
                                    <span key={`test-${i}`} className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 border border-blue-500/20 text-[10px] font-bold">
                                        {tn}
                                    </span>
                                ))}
                                {activeExamSystem.examNames.map((en, i) => (
                                    <span key={`exam-${i}`} className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-600 border border-purple-500/20 text-[10px] font-bold">
                                        {en}
                                    </span>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
                            <Button
                                onClick={() => saveMutation.mutate()}
                                disabled={!deptName.trim() || saveMutation.isPending}
                            >
                                {saveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                                {editingDept ? "Save Department & Rules" : "Create Department & Rules"}
                            </Button>
                        </div>
                    </div>
                </ResponsiveModal>
            </CardContent>
        </Card>
    );
}
