import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Sliders, Plus, Check, Loader2, Award,
    Layers, Edit2
} from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

import {
    Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    fetchPromotionRules, createPromotionRule, updatePromotionRule,
    type PromotionRule
} from "@/features/classrooms/api/classroomApi";
import api from "@/lib/api";

interface PromotionRulesModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function PromotionRulesModal({ open, onOpenChange }: PromotionRulesModalProps) {
    const qc = useQueryClient();
    const [editingRule, setEditingRule] = useState<PromotionRule | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    // Form states
    const [name, setName] = useState("");
    const [academicClassId, setAcademicClassId] = useState<string>("all");
    const [minOverallPercentage, setMinOverallPercentage] = useState<number>(33);
    const [mustPassAllSubjects, setMustPassAllSubjects] = useState<boolean>(true);
    const [minSubjectPercentage, setMinSubjectPercentage] = useState<number>(33);
    const [maxCompartmentSubjects, setMaxCompartmentSubjects] = useState<number>(0);

    // Load rules
    const { data: rules = [], isLoading } = useQuery({
        queryKey: ["promotion-rules"],
        queryFn: fetchPromotionRules,
        enabled: open,
    });

    // Load academic classes for class-specific targeting
    const { data: academicClasses = [] } = useQuery({
        queryKey: ["academic-classes-list"],
        queryFn: async () => {
            const { data } = await api.get("/academic-classes");
            return (data.data.classes || []) as Array<{ id: string; name: string; code: string }>;
        },
        enabled: open,
    });

    const resetForm = () => {
        setEditingRule(null);
        setIsCreating(false);
        setName("");
        setAcademicClassId("all");
        setMinOverallPercentage(33);
        setMustPassAllSubjects(true);
        setMinSubjectPercentage(33);
        setMaxCompartmentSubjects(0);
    };

    const startEdit = (rule: PromotionRule) => {
        setEditingRule(rule);
        setIsCreating(true);
        setName(rule.name);
        setAcademicClassId(rule.academicClassId || "all");
        setMinOverallPercentage(Number(rule.minOverallPercentage));
        setMustPassAllSubjects(Boolean(rule.mustPassAllSubjects));
        setMinSubjectPercentage(Number(rule.minSubjectPercentage));
        setMaxCompartmentSubjects(Number(rule.maxCompartmentSubjects));
    };

    const saveMutation = useMutation({
        mutationFn: async () => {
            const payload = {
                name,
                academicClassId: academicClassId === "all" ? null : academicClassId,
                minOverallPercentage,
                mustPassAllSubjects,
                minSubjectPercentage,
                maxCompartmentSubjects
            };
            if (editingRule) {
                return updatePromotionRule(editingRule.id, payload);
            }
            return createPromotionRule(payload);
        },
        onSuccess: () => {
            toast.success(editingRule ? "Promotion rule updated" : "Promotion rule created");
            qc.invalidateQueries({ queryKey: ["promotion-rules"] });
            resetForm();
        },
        onError: (err: unknown) => {
            const msg = axios.isAxiosError(err) ? err.response?.data?.message : undefined;
            toast.error(msg || "Failed to save promotion rule");
        }
    });

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        if (!name.trim()) {
            toast.error("Rule name is required");
            return;
        }
        saveMutation.mutate();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl">
                <DialogHeader className="px-6 pt-6 pb-4 bg-muted/30 border-b border-border/70">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <div className="p-2 rounded-xl bg-primary/10 text-primary border border-primary/20">
                                <Sliders className="w-5 h-5" />
                            </div>
                            <div>
                                <DialogTitle className="text-base font-bold text-foreground">
                                    Academic Promotion Rules
                                </DialogTitle>
                                <DialogDescription className="text-xs text-muted-foreground">
                                    Configure passing thresholds and criteria for student year-end promotions.
                                </DialogDescription>
                            </div>
                        </div>

                        {!isCreating && (
                            <Button
                                size="sm"
                                onClick={() => {
                                    resetForm();
                                    setIsCreating(true);
                                    setName("Standard Promotion Rule");
                                }}
                                className="h-8 rounded-xl text-xs font-bold gap-1.5 shadow-sm"
                            >
                                <Plus className="w-3.5 h-3.5" /> New Rule
                            </Button>
                        )}
                    </div>
                </DialogHeader>

                <div className="p-6">
                    {isCreating ? (
                        <form onSubmit={handleSave} className="space-y-4">
                            <div className="grid grid-cols-2 gap-3.5">
                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <Label className="text-xs font-bold text-foreground">Rule Name *</Label>
                                    <Input
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="e.g. CBSE Senior Secondary Standard"
                                        className="h-9 rounded-xl text-xs bg-muted/30"
                                        required
                                    />
                                </div>

                                <div className="space-y-1.5 col-span-2 sm:col-span-1">
                                    <Label className="text-xs font-bold text-foreground">Applicable Class</Label>
                                    <Select value={academicClassId} onValueChange={setAcademicClassId}>
                                        <SelectTrigger className="h-9 rounded-xl text-xs bg-muted/30">
                                            <SelectValue placeholder="All Classes (Default)" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="all">All Classes (Global Default)</SelectItem>
                                            {academicClasses.map((c) => (
                                                <SelectItem key={c.id} value={c.id}>
                                                    {c.name} ({c.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="grid grid-cols-3 gap-3 p-3.5 rounded-xl bg-muted/30 border border-border/70">
                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-foreground">Min Overall %</Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="100"
                                        value={minOverallPercentage}
                                        onChange={(e) => setMinOverallPercentage(Number(e.target.value))}
                                        className="h-8 rounded-lg text-xs font-mono font-bold"
                                    />
                                    <span className="text-[10px] text-muted-foreground">e.g. 33% required</span>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-foreground">Min Subject %</Label>
                                    <Input
                                        type="number"
                                        step="0.5"
                                        min="0"
                                        max="100"
                                        value={minSubjectPercentage}
                                        onChange={(e) => setMinSubjectPercentage(Number(e.target.value))}
                                        className="h-8 rounded-lg text-xs font-mono font-bold"
                                    />
                                    <span className="text-[10px] text-muted-foreground">In each exam</span>
                                </div>

                                <div className="space-y-1">
                                    <Label className="text-[11px] font-bold text-foreground">Max Compartments</Label>
                                    <Input
                                        type="number"
                                        min="0"
                                        max="5"
                                        value={maxCompartmentSubjects}
                                        onChange={(e) => setMaxCompartmentSubjects(Number(e.target.value))}
                                        className="h-8 rounded-lg text-xs font-mono font-bold"
                                    />
                                    <span className="text-[10px] text-muted-foreground">Allowed failures</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-muted/20 border border-border/70">
                                <div className="space-y-0.5">
                                    <Label className="text-xs font-bold text-foreground">Must Pass All Subjects</Label>
                                    <p className="text-[11px] text-muted-foreground">
                                        Failing any single subject will flag student as ineligible for direct promotion.
                                    </p>
                                </div>
                                <Switch
                                    checked={mustPassAllSubjects}
                                    onCheckedChange={setMustPassAllSubjects}
                                />
                            </div>

                            <div className="flex justify-end gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={resetForm}
                                    className="rounded-xl text-xs h-8"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="rounded-xl text-xs h-8 font-bold gap-1.5 shadow-sm"
                                >
                                    {saveMutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                                    <Check className="w-3.5 h-3.5" /> Save Rule
                                </Button>
                            </div>
                        </form>
                    ) : (
                        <div className="space-y-3">
                            {isLoading ? (
                                <div className="py-10 text-center space-y-2">
                                    <Loader2 className="w-5 h-5 animate-spin text-primary mx-auto" />
                                    <p className="text-xs text-muted-foreground">Loading promotion rules...</p>
                                </div>
                            ) : rules.length === 0 ? (
                                <div className="py-10 text-center border border-dashed rounded-xl border-border/80 p-6 space-y-3">
                                    <Award className="w-8 h-8 text-muted-foreground mx-auto opacity-50" />
                                    <p className="text-xs text-muted-foreground">No custom promotion rules defined.</p>
                                    <Button
                                        size="sm"
                                        onClick={() => {
                                            setIsCreating(true);
                                            setName("Default School Promotion Rule");
                                        }}
                                        className="rounded-xl text-xs h-8"
                                    >
                                        Create Default Rule
                                    </Button>
                                </div>
                            ) : (
                                <ScrollArea className="h-72 pr-2">
                                    <div className="space-y-2.5">
                                        {rules.map((rule) => (
                                            <div
                                                key={rule.id}
                                                className="p-3.5 rounded-xl bg-background border border-border/70 hover:border-primary/40 transition-colors shadow-2xs flex items-center justify-between gap-4"
                                            >
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-bold text-xs text-foreground">
                                                            {rule.name}
                                                        </span>
                                                        {rule.academicClass ? (
                                                            <Badge variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                                                                <Layers className="w-2.5 h-2.5 mr-1" />
                                                                {rule.academicClass.name}
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="outline" className="text-[10px] bg-muted/60 text-muted-foreground">
                                                                Global Default
                                                            </Badge>
                                                        )}
                                                    </div>

                                                    <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
                                                        <span>Min: <strong className="text-foreground">{rule.minOverallPercentage}%</strong></span>
                                                        <span>Subject Min: <strong className="text-foreground">{rule.minSubjectPercentage}%</strong></span>
                                                        <span>
                                                            Pass All: <strong className="text-foreground">{rule.mustPassAllSubjects ? "Yes" : "No"}</strong>
                                                        </span>
                                                    </div>
                                                </div>

                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    onClick={() => startEdit(rule)}
                                                    className="h-8 w-8 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
