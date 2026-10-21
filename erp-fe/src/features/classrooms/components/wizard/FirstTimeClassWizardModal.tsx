import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Sparkles, Check, Plus, Trash2,
    Loader2, ArrowRight, School,
    GraduationCap, Layers, Calendar, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
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

interface FirstTimeClassWizardModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
}

export function FirstTimeClassWizardModal({ open, onOpenChange, onSuccess }: FirstTimeClassWizardModalProps) {
    const qc = useQueryClient();

    // Selected standard grade names
    const [selectedNames, setSelectedNames] = useState<string[]>([
        "Class 1", "Class 2", "Class 3", "Class 4", "Class 5",
        "Class 6", "Class 7", "Class 8", "Class 9", "Class 10"
    ]);

    // Custom classes added by admin
    const [customClasses, setCustomClasses] = useState<string[]>([]);
    const [customInput, setCustomInput] = useState("");

    // Section options
    const [sectionPreset, setSectionPreset] = useState<"A" | "AB" | "ABC">("A");
    const [academicYear, setAcademicYear] = useState("2026-2027");

    const toggleGrade = (name: string) => {
        setSelectedNames(prev =>
            prev.includes(name) ? prev.filter(n => n !== name) : [...prev, name]
        );
    };

    const handleAddCustom = () => {
        const val = customInput.trim();
        if (!val) return;
        if (selectedNames.includes(val) || customClasses.includes(val)) {
            toast.error("Class with this name already added");
            return;
        }
        setCustomClasses(prev => [...prev, val]);
        setCustomInput("");
    };

    const handleRemoveCustom = (val: string) => {
        setCustomClasses(prev => prev.filter(c => c !== val));
    };

    const selectPreset = (type: "all" | "primary" | "k10" | "clear") => {
        if (type === "all") setSelectedNames(STANDARD_GRADES.map(g => g.name));
        if (type === "primary") setSelectedNames(["Class 1", "Class 2", "Class 3", "Class 4", "Class 5"]);
        if (type === "k10") setSelectedNames(STANDARD_GRADES.slice(0, 13).map(g => g.name));
        if (type === "clear") {
            setSelectedNames([]);
            setCustomClasses([]);
        }
    };

    const getSectionsArray = (): string[] => {
        if (sectionPreset === "ABC") return ["A", "B", "C"];
        if (sectionPreset === "AB") return ["A", "B"];
        return ["A"];
    };

    const mutation = useMutation({
        mutationFn: async () => {
            const defaultSecs = getSectionsArray();
            const classesPayload: BulkSetupClassItem[] = [];

            // Add selected standard grades preserving order
            STANDARD_GRADES.forEach(g => {
                if (selectedNames.includes(g.name)) {
                    classesPayload.push({
                        name: g.name,
                        code: g.code,
                        orderIndex: g.orderIndex,
                        sections: defaultSecs
                    });
                }
            });

            // Add custom classes
            customClasses.forEach((name, idx) => {
                classesPayload.push({
                    name,
                    code: name.toUpperCase().replace(/[^A-Z0-9]/g, '_').slice(0, 30),
                    orderIndex: STANDARD_GRADES.length + idx + 1,
                    sections: defaultSecs
                });
            });

            if (classesPayload.length === 0) {
                throw new Error("Please select at least one class for your institution.");
            }

            return bulkSetupClasses({
                classes: classesPayload,
                defaultSections: defaultSecs,
                academicYear
            });
        },
        onSuccess: (data) => {
            toast.success(`Successfully configured ${data.classesCount} Classes and ${data.sectionsCount} Sections!`);
            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["classrooms"] });
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

    const totalSelectedCount = selectedNames.length + customClasses.length;
    const totalSectionsToCreate = totalSelectedCount * getSectionsArray().length;
    const categories: Array<StandardGrade["category"]> = ["Pre-Primary", "Primary", "Middle", "Secondary", "Senior Secondary"];

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            title=""
            description=""
            maxWidth="sm:max-w-3xl"
        >
            <div className="space-y-6 pt-1 text-foreground">
                {/* ── 1. High-Impact Executive Hero Banner ─────────────────────────── */}
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
                                        Smart Setup
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground mt-0.5">
                                    Select the grades offered by your school to automatically provision classes and operational sections.
                                </p>
                            </div>
                        </div>

                        {/* Real-time Counter Badge */}
                        <div className="bg-background/80 backdrop-blur-md px-3.5 py-2 rounded-xl border border-border/70 shadow-2xs shrink-0 text-right self-stretch sm:self-auto flex sm:flex-col justify-between items-center sm:items-end">
                            <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">Architected Plan</span>
                            <div className="flex items-center gap-1.5 mt-0.5">
                                <span className="text-base font-black text-primary">{totalSelectedCount}</span>
                                <span className="text-xs text-muted-foreground font-semibold">Classes</span>
                                <span className="text-muted-foreground/40">•</span>
                                <span className="text-base font-black text-indigo-600 dark:text-indigo-400">{totalSectionsToCreate}</span>
                                <span className="text-xs text-muted-foreground font-semibold">Sections</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── 2. Quick Preset Navigation Bar ──────────────────────────────── */}
                <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-xl bg-muted/40 border border-border/60">
                    <div className="flex items-center gap-1.5 text-xs font-bold text-muted-foreground">
                        <GraduationCap className="w-4 h-4 text-primary" />
                        <span>Instant Presets:</span>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => selectPreset("all")}
                            className="h-7 text-xs font-bold rounded-lg border-primary/30 hover:bg-primary/10 hover:text-primary transition-all"
                        >
                            Complete K-12 (All)
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => selectPreset("k10")}
                            className="h-7 text-xs font-bold rounded-lg hover:bg-muted"
                        >
                            K through 10
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            onClick={() => selectPreset("primary")}
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

                {/* ── 3. Interactive Grade Cards by Academic Category ─────────────── */}
                <div className="space-y-4 max-h-[290px] overflow-y-auto pr-1">
                    {categories.map(cat => {
                        const gradesInCat = STANDARD_GRADES.filter(g => g.category === cat);
                        const style = CATEGORY_STYLES[cat];
                        const countSelectedInCat = gradesInCat.filter(g => selectedNames.includes(g.name)).length;

                        return (
                            <div key={cat} className="space-y-2 p-3 rounded-xl bg-card border border-border/70 shadow-2xs">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className={cn("w-2 h-2 rounded-full", style.dot)} />
                                        <span className="text-xs font-bold uppercase tracking-wider text-foreground">
                                            {cat}
                                        </span>
                                    </div>
                                    <span className="text-[11px] font-semibold text-muted-foreground">
                                        {countSelectedInCat} / {gradesInCat.length} Active
                                    </span>
                                </div>

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
                                                        : "border-border/70 bg-muted/20 text-muted-foreground hover:border-border hover:bg-muted/40 hover:text-foreground"
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

                    {/* Custom Classes Showcase */}
                    {customClasses.length > 0 && (
                        <div className="space-y-2 p-3 rounded-xl bg-card border border-border/70 shadow-2xs">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Custom Institution Classes ({customClasses.length})
                            </span>
                            <div className="flex flex-wrap gap-2">
                                {customClasses.map(c => (
                                    <Badge key={c} variant="secondary" className="gap-1.5 py-1 px-3 rounded-lg text-xs font-bold bg-primary/15 text-primary border border-primary/25">
                                        <CheckCircle2 className="w-3 h-3 text-primary" />
                                        {c}
                                        <button
                                            type="button"
                                            onClick={() => handleRemoveCustom(c)}
                                            className="hover:text-destructive ml-1 text-muted-foreground transition-colors"
                                            title="Remove Class"
                                        >
                                            <Trash2 className="w-3 h-3" />
                                        </button>
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* ── 4. Add Custom Grade Input ───────────────────────────────────── */}
                <div className="flex items-center gap-2 p-2 rounded-xl bg-muted/20 border border-border/60">
                    <Input
                        placeholder="Add special or vocational grade (e.g., Playgroup, Montessori-1, Pre-KG)..."
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleAddCustom(); } }}
                        className="h-9 text-xs rounded-xl bg-background border-border/80"
                    />
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddCustom}
                        className="h-9 gap-1.5 rounded-xl font-bold text-xs shrink-0 hover:bg-primary/10 hover:text-primary transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Custom
                    </Button>
                </div>

                {/* ── 5. Section Stream & Session Engine ──────────────────────────── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-muted/30 p-4 rounded-2xl border border-border/70 shadow-2xs">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Layers className="w-3.5 h-3.5 text-primary" /> Initial Stream Configuration
                        </label>
                        <div className="grid grid-cols-3 gap-2">
                            <button
                                type="button"
                                onClick={() => setSectionPreset("A")}
                                className={cn(
                                    "p-2.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5",
                                    sectionPreset === "A"
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary/30"
                                        : "bg-background border-border/80 text-foreground hover:bg-muted/60"
                                )}
                            >
                                <span className="font-black text-sm">Section A</span>
                                <span className="text-[10px] opacity-80">Single Stream</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSectionPreset("AB")}
                                className={cn(
                                    "p-2.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5",
                                    sectionPreset === "AB"
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary/30"
                                        : "bg-background border-border/80 text-foreground hover:bg-muted/60"
                                )}
                            >
                                <span className="font-black text-sm">A & B</span>
                                <span className="text-[10px] opacity-80">Dual Stream</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSectionPreset("ABC")}
                                className={cn(
                                    "p-2.5 rounded-xl text-xs font-bold border transition-all text-center flex flex-col items-center justify-center gap-0.5",
                                    sectionPreset === "ABC"
                                        ? "bg-primary text-primary-foreground border-primary shadow-xs ring-1 ring-primary/30"
                                        : "bg-background border-border/80 text-foreground hover:bg-muted/60"
                                )}
                            >
                                <span className="font-black text-sm">A, B & C</span>
                                <span className="text-[10px] opacity-80">Triple Stream</span>
                            </button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">Each section will have its own independent roster & timetable.</p>
                    </div>

                    <div className="space-y-2">
                        <label className="text-xs font-bold text-foreground flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" /> Active Academic Session
                        </label>
                        <Input
                            value={academicYear}
                            onChange={(e) => setAcademicYear(e.target.value)}
                            placeholder="e.g. 2026-2027"
                            className="h-10 text-xs rounded-xl bg-background font-bold border-border/80"
                        />
                        <p className="text-[11px] text-muted-foreground">Links all generated classes directly to the active institutional session.</p>
                    </div>
                </div>

                {/* ── 6. Sticky Executive Footer Action Bar ────────────────────────── */}
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-border/70">
                    <div className="text-xs text-muted-foreground font-semibold flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span>Ready to initialize:</span>
                        <strong className="text-foreground font-bold">{totalSelectedCount} Classes</strong>
                        <span>yielding</span>
                        <strong className="text-primary font-bold">{totalSectionsToCreate} Classroom Sections</strong>
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
