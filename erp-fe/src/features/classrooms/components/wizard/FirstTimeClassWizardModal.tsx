import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
    Sparkles, Check,
    Loader2, ArrowRight, School,
    GraduationCap, Calendar, Building2, UserCheck
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import api from "@/lib/api";
import { bulkSetupClasses } from "../../api/classApi";
import type { BulkSetupClassItem } from "@/types/erp";
import { cn } from "@/lib/utils";

interface StandardGrade {
    name: string;
    code: string;
    category: "Pre-Primary" | "Primary" | "Middle" | "Secondary" | "Senior Secondary";
    orderIndex: number;
}

const STANDARD_GRADES: StandardGrade[] = [
    { name: "Nursery", code: "NURSERY", category: "Pre-Primary", orderIndex: 1 },
    { name: "KG 1", code: "KG_1", category: "Pre-Primary", orderIndex: 2 },
    { name: "KG 2", code: "KG_2", category: "Pre-Primary", orderIndex: 3 },
    { name: "Class 1", code: "CLASS_01", category: "Primary", orderIndex: 4 },
    { name: "Class 2", code: "CLASS_02", category: "Primary", orderIndex: 5 },
    { name: "Class 3", code: "CLASS_03", category: "Primary", orderIndex: 6 },
    { name: "Class 4", code: "CLASS_04", category: "Primary", orderIndex: 7 },
    { name: "Class 5", code: "CLASS_05", category: "Primary", orderIndex: 8 },
    { name: "Class 6", code: "CLASS_06", category: "Middle", orderIndex: 9 },
    { name: "Class 7", code: "CLASS_07", category: "Middle", orderIndex: 10 },
    { name: "Class 8", code: "CLASS_08", category: "Middle", orderIndex: 11 },
    { name: "Class 9", code: "CLASS_09", category: "Secondary", orderIndex: 12 },
    { name: "Class 10", code: "CLASS_10", category: "Secondary", orderIndex: 13 },
    { name: "Class 11", code: "CLASS_11", category: "Senior Secondary", orderIndex: 14 },
    { name: "Class 12", code: "CLASS_12", category: "Senior Secondary", orderIndex: 15 },
];

const CATEGORY_STYLES: Record<StandardGrade["category"], { border: string; bg: string; text: string; dot: string }> = {
    "Pre-Primary": {
        border: "border-pink-500/30",
        bg: "bg-pink-500/10",
        text: "text-pink-600 dark:text-pink-400",
        dot: "bg-pink-500"
    },
    "Primary": {
        border: "border-emerald-500/30",
        bg: "bg-emerald-500/10",
        text: "text-emerald-600 dark:text-emerald-400",
        dot: "bg-emerald-500"
    },
    "Middle": {
        border: "border-cyan-500/30",
        bg: "bg-cyan-500/10",
        text: "text-cyan-600 dark:text-cyan-400",
        dot: "bg-cyan-500"
    },
    "Secondary": {
        border: "border-violet-500/30",
        bg: "bg-violet-500/10",
        text: "text-violet-600 dark:text-violet-400",
        dot: "bg-violet-500"
    },
    "Senior Secondary": {
        border: "border-amber-500/30",
        bg: "bg-amber-500/10",
        text: "text-amber-600 dark:text-amber-400",
        dot: "bg-amber-500"
    }
};

const CATEGORIES: Array<StandardGrade["category"]> = [
    "Pre-Primary", "Primary", "Middle", "Secondary", "Senior Secondary"
];

interface FirstTimeClassWizardModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function FirstTimeClassWizardModal({ open, onOpenChange, onSuccess }: FirstTimeClassWizardModalProps) {
    const qc = useQueryClient();

    // Selected standard grade names
    const [selectedNames, setSelectedNames] = useState<string[]>([
        "Nursery", "KG 1", "KG 2",
        "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
        "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"
    ]);

    // Department Incharges (head teacher) selected for each department
    const [deptIncharges, setDeptIncharges] = useState<Record<string, string>>({
        "Pre-Primary": "",
        "Primary": "",
        "Middle": "",
        "Secondary": "",
        "Senior Secondary": ""
    });

    const [academicYear, setAcademicYear] = useState("2026-2027");

    // Fetch teachers for Incharge selection
    const { data: teachers = [] } = useQuery({
        queryKey: ["teachers-select"],
        queryFn: async () => {
            const res = await api.get("/teachers?limit=100");
            return res.data.data.teachers || [];
        },
        enabled: open,
    });

    const toggleGrade = (name: string) => {
        setSelectedNames(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const selectPreset = (type: "all" | "senior_12" | "secondary_10" | "middle_8" | "primary_5" | "clear") => {
        if (type === "all") setSelectedNames(STANDARD_GRADES.map(g => g.name));
        if (type === "senior_12") setSelectedNames(["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10", "Class 11", "Class 12"]);
        if (type === "secondary_10") setSelectedNames(["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"]);
        if (type === "middle_8") setSelectedNames(["Class 1", "Class 2", "Class 3", "Class 4", "Class 5", "Class 6", "Class 7", "Class 8"]);
        if (type === "primary_5") setSelectedNames(["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]);
        if (type === "clear") {
            setSelectedNames([]);
        }
    };

    const handleInchargeChange = (category: string, teacherId: string) => {
        setDeptIncharges(prev => ({
            ...prev,
            [category]: teacherId === "__NONE__" ? "" : teacherId
        }));
    };

    // Which categories are active based on selected grades
    const activeCategories = CATEGORIES.filter(cat =>
        STANDARD_GRADES.some(g => g.category === cat && selectedNames.includes(g.name))
    );

    const mutation = useMutation({
        mutationFn: async () => {
            const classesPayload: BulkSetupClassItem[] = [];

            // Add selected standard grades preserving sequence order
            STANDARD_GRADES.forEach(g => {
                if (selectedNames.includes(g.name)) {
                    classesPayload.push({
                        name: g.name,
                        code: g.code,
                        category: g.category,
                        orderIndex: g.orderIndex,
                        sections: [] // NO automatic sections; created manually later in Classroom module
                    });
                }
            });

            if (classesPayload.length === 0) {
                throw new Error("Please select at least one standard grade for your institution.");
            }

            // Build departments map with Incharge IDs
            const departmentsPayload: Record<string, { inchargeId?: string | null }> = {};
            activeCategories.forEach(cat => {
                departmentsPayload[cat] = {
                    inchargeId: deptIncharges[cat] || null
                };
            });

            return bulkSetupClasses({
                classes: classesPayload,
                defaultSections: [], // No forced section streams
                departments: departmentsPayload,
                academicYear
            });
        },
        onSuccess: (data) => {
            toast.success(`Successfully provisioned ${data.classesCount} Classes with Department Incharges!`);
            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["classrooms"] });
            qc.invalidateQueries({ queryKey: ["departments"] });
            qc.invalidateQueries({ queryKey: ["departmentsList"] });
            qc.invalidateQueries({ queryKey: ["classSetupStatus"] });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (err: unknown) => {
            let msg = "Failed to configure classes";
            if (axios.isAxiosError(err)) {
                msg = err.response?.data?.message || msg;
            } else if (err instanceof Error) {
                msg = err.message;
            }
            toast.error(msg);
        }
    });

    const totalSelectedCount = selectedNames.length;

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            title=""
            description=""
            maxWidth="sm:max-w-4xl"
        >
            <div className="space-y-5 pt-1 text-foreground">
                {/* ── 1. Executive Hero Banner ─────────────────────────────────────── */}
                <div className="relative rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/15 via-violet-500/10 to-indigo-600/15 p-5 shadow-xs overflow-hidden">
                    <School className="absolute -right-4 -bottom-4 w-32 h-32 text-primary/[0.04] pointer-events-none" />

                    <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div className="flex items-center gap-3.5">
                            <div className="w-12 h-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center shadow-md shadow-primary/25 shrink-0">
                                <Sparkles className="w-6 h-6 animate-pulse" />
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h3 className="text-lg font-black tracking-tight text-foreground">
                                        Institutional Classroom Architect
                                    </h3>
                                    <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px] font-bold py-0 px-2 rounded-full">
                                        Departments & Classes Setup
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Define your institutional grades by Department (Pre-Primary, Primary, etc.) and assign Department Incharges in the same flow.
                                </p>
                            </div>
                        </div>

                        {/* Real-time Counter Badge */}
                        <div className="bg-background/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border/70 shadow-2xs shrink-0 text-right self-stretch sm:self-auto flex sm:flex-col justify-between items-center sm:items-end">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Selected Plan</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-base font-black text-primary">{totalSelectedCount}</span>
                                <span className="text-xs text-muted-foreground font-semibold">Grades</span>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="text-base font-black text-violet-600 dark:text-violet-400">{activeCategories.length}</span>
                                <span className="text-xs text-muted-foreground font-semibold">Departments</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 2. Quick Preset Navigation Bar ──────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        <span>Institutional Grade Presets:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => selectPreset("all")}
                            className="h-7 text-xs font-bold rounded-lg border-primary/30 hover:bg-primary/10 hover:text-primary transition-all"
                        >
                            Complete K-12
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => selectPreset("senior_12")}
                            className="h-7 text-xs font-bold rounded-lg hover:bg-muted"
                        >
                            10+2 (1 to 12)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => selectPreset("secondary_10")}
                            className="h-7 text-xs font-bold rounded-lg hover:bg-muted"
                        >
                            Secondary (1 to 10)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => selectPreset("middle_8")}
                            className="h-7 text-xs font-bold rounded-lg hover:bg-muted"
                        >
                            Middle (1 to 8)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => selectPreset("primary_5")}
                            className="h-7 text-xs font-bold rounded-lg hover:bg-muted"
                        >
                            Primary (1 to 5)
                        </Button>
                        <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            onClick={() => selectPreset("clear")}
                            className="h-7 text-xs font-bold text-muted-foreground hover:text-destructive transition-colors"
                        >
                            Clear
                        </Button>
                    </div>
                </div>

                {/* ── 3. Departments & Incharge with Embedded Standard Grades ──────── */}
                <div className="space-y-3.5 max-h-[380px] overflow-y-auto pr-1">
                    {CATEGORIES.map(cat => {
                        const gradesInCat = STANDARD_GRADES.filter(g => g.category === cat);
                        const style = CATEGORY_STYLES[cat];
                        const countSelectedInCat = gradesInCat.filter(g => selectedNames.includes(g.name)).length;
                        const isCatActive = countSelectedInCat > 0;

                        return (
                            <div
                                key={cat}
                                className={cn(
                                    "space-y-3 p-3.5 rounded-2xl border transition-all shadow-2xs",
                                    isCatActive ? "bg-card border-border/80" : "bg-muted/15 border-border/40 opacity-75"
                                )}
                            >
                                {/* Department Header & Incharge Selector */}
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-2 border-b border-border/60">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("w-2.5 h-2.5 rounded-full", style.dot)} />
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-black tracking-tight text-foreground flex items-center gap-1.5">
                                                <Building2 className="w-3.5 h-3.5 text-primary" />
                                                {cat} Department
                                            </span>
                                            <Badge variant="outline" className={cn("text-[10px] font-bold py-0 px-2 rounded-full", style.text, style.border)}>
                                                {countSelectedInCat} / {gradesInCat.length} Selected
                                            </Badge>
                                        </div>
                                    </div>

                                    {/* Department Incharge (Head Teacher) Selector */}
                                    <div className="flex items-center gap-2 min-w-[240px]">
                                        <span className="text-[11px] font-bold text-muted-foreground whitespace-nowrap flex items-center gap-1">
                                            <UserCheck className="w-3 h-3 text-primary" /> Incharge:
                                        </span>
                                        <Select
                                            value={deptIncharges[cat] || "__NONE__"}
                                            onValueChange={(val) => handleInchargeChange(cat, val)}
                                        >
                                            <SelectTrigger className="h-8 text-xs font-semibold rounded-xl bg-background border-border/80">
                                                <SelectValue placeholder="Assign Incharge..." />
                                            </SelectTrigger>
                                            <SelectContent className="max-h-56">
                                                <SelectItem value="__NONE__" className="text-xs">
                                                    -- No Incharge --
                                                </SelectItem>
                                                {teachers.map((t: any) => {
                                                    const teacherName = t.account
                                                        ? `${t.account.firstName} ${t.account.lastName}`
                                                        : t.teacherId || "Teacher";
                                                    return (
                                                        <SelectItem key={t.id} value={t.id} className="text-xs font-medium">
                                                            {teacherName} {t.employeeNumber ? `(${t.employeeNumber})` : ""}
                                                        </SelectItem>
                                                    );
                                                })}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {/* Standard Predefined Grades in this Department */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {gradesInCat.map(grade => {
                                        const isSelected = selectedNames.includes(grade.name);
                                        return (
                                            <button
                                                key={grade.name}
                                                type="button"
                                                onClick={() => toggleGrade(grade.name)}
                                                className={cn(
                                                    "group relative flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold transition-all text-left",
                                                    isSelected
                                                        ? "border-primary bg-primary/10 text-primary shadow-xs ring-1 ring-primary/20"
                                                        : "border-border/70 bg-background text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
                                                )}
                                            >
                                                <span className="truncate">{grade.name}</span>
                                                {isSelected ? (
                                                    <div className="w-4 h-4 rounded-full bg-primary text-primary-foreground flex items-center justify-center shrink-0 shadow-2xs">
                                                        <Check className="w-2.5 h-2.5 stroke-[3]" />
                                                    </div>
                                                ) : (
                                                    <div className="w-4 h-4 rounded-full border border-border group-hover:border-primary/50 shrink-0" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* ── 4. Active Session Setting ────────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 rounded-2xl bg-muted/30 border border-border/70">
                    <div className="flex items-center gap-2">
                        <Calendar className="w-4 h-4 text-primary shrink-0" />
                        <div>
                            <span className="text-xs font-bold text-foreground">Active Academic Session</span>
                            <p className="text-[11px] text-muted-foreground">
                                Sections (A, B, C...) are created manually later in Classroom module as needed.
                            </p>
                        </div>
                    </div>
                    <div className="w-full sm:w-44">
                        <Input
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            placeholder="e.g. 2026-2027"
                            className="h-8 text-xs font-bold rounded-xl bg-background"
                        />
                    </div>
                </div>

                {/* ── 5. Sticky Footer Action Bar ──────────────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/70">
                    <div className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Ready to initialize:</span>
                        <strong className="text-foreground font-bold">{totalSelectedCount} Standard Grades</strong>
                        <span>across</span>
                        <strong className="text-primary font-bold">{activeCategories.length} Departments</strong>
                    </div>

                    <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="rounded-xl text-xs font-bold h-9 px-4"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={totalSelectedCount === 0 || mutation.isPending}
                            onClick={() => mutation.mutate()}
                            className="h-10 px-5 gap-2 rounded-xl font-bold text-xs shadow-md shadow-primary/20 bg-primary text-primary-foreground hover:bg-primary/95 transition-all hover:scale-[1.02] active:scale-[0.98]"
                        >
                            {mutation.isPending ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" /> Provisioning Architecture...
                                </>
                            ) : (
                                <>
                                    <Sparkles className="w-4 h-4" /> Provision Architecture <ArrowRight className="w-4 h-4" />
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </ResponsiveModal>
    );
}
