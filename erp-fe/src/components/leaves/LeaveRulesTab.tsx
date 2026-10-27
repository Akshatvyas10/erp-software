import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import type { LeaveRule } from "@/types/erp";
import { usePermissions } from "@/store/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    ShieldCheck,
    UserCheck,
    History,
    Plus,
    Edit3,
    CheckCircle2,
    Clock,
    AlertCircle,
    Info,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";

const ruleFormSchema = z.object({
    ruleName: z.string().min(3, "Rule name must be at least 3 characters"),
    casualLeaveCount: z.number().min(0, "Must be >= 0"),
    sickLeaveCount: z.number().min(0, "Must be >= 0"),
    earnedLeaveCount: z.number().min(0, "Must be >= 0"),
    maternityLeaveCount: z.number().min(0, "Must be >= 0"),
    leaveWithoutPayCount: z.number().min(0, "Must be >= 0"),
    isActive: z.boolean(),
});

type RuleFormValues = z.infer<typeof ruleFormSchema>;

export function LeaveRulesTab() {
    const { can } = usePermissions();
    const qc = useQueryClient();

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editingRule, setEditingRule] = useState<LeaveRule | null>(null);

    const canCreate = can("leave_rules", "create") || can("leave_rules", "manage");
    const canUpdate = can("leave_rules", "update") || can("leave_rules", "manage");

    // 1. Fetch active rule
    const {
        data: activeRuleData,
        isLoading: activeLoading,
    } = useQuery({
        queryKey: ["active-leave-rule"],
        queryFn: async () => {
            const { data } = await api.get("/teacher-leaves/rules/active");
            return data.data as { rule: LeaveRule | null; academicYear: { id: string; name: string } };
        },
    });

    // 2. Fetch all rules history
    const {
        data: rulesHistory,
        isLoading: historyLoading,
    } = useQuery({
        queryKey: ["leave-rules-list"],
        queryFn: async () => {
            const { data } = await api.get("/teacher-leaves/rules");
            return data.data.rules as LeaveRule[];
        },
    });

    // Form definition
    const form = useForm<RuleFormValues>({
        resolver: zodResolver(ruleFormSchema),
        defaultValues: {
            ruleName: "Teacher Annual Leave Policy",
            casualLeaveCount: 12,
            sickLeaveCount: 10,
            earnedLeaveCount: 15,
            maternityLeaveCount: 90,
            leaveWithoutPayCount: 30,
            isActive: true,
        },
    });

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: (values: RuleFormValues) =>
            api.post("/teacher-leaves/rules", {
                ...values,
                academicYearId: activeRuleData?.academicYear?.id,
            }),
        onSuccess: () => {
            toast.success("Leave policy rule created and deployed successfully");
            setIsCreateOpen(false);
            form.reset();
            qc.invalidateQueries({ queryKey: ["active-leave-rule"] });
            qc.invalidateQueries({ queryKey: ["leave-rules-list"] });
            qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to create leave rule");
        },
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: ({ id, values }: { id: string; values: Partial<RuleFormValues> }) =>
            api.put(`/teacher-leaves/rules/${id}`, values),
        onSuccess: () => {
            toast.success("Leave policy rule updated successfully");
            setEditingRule(null);
            qc.invalidateQueries({ queryKey: ["active-leave-rule"] });
            qc.invalidateQueries({ queryKey: ["leave-rules-list"] });
            qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to update leave rule");
        },
    });

    const activeRule = activeRuleData?.rule;
    const academicYear = activeRuleData?.academicYear;

    const openEditModal = (rule: LeaveRule) => {
        setEditingRule(rule);
        form.reset({
            ruleName: rule.ruleName,
            casualLeaveCount: Number(rule.casualLeaveCount),
            sickLeaveCount: Number(rule.sickLeaveCount),
            earnedLeaveCount: Number(rule.earnedLeaveCount),
            maternityLeaveCount: Number(rule.maternityLeaveCount),
            leaveWithoutPayCount: Number(rule.leaveWithoutPayCount),
            isActive: rule.isActive,
        });
    };

    return (
        <div className="space-y-6">
            {/* Top Bar / Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Teacher Leave Policy & Allocations</h2>
                        {academicYear && (
                            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 font-semibold text-xs ml-2">
                                Year: {academicYear.name}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Define annual statutory and discretionary leave day allocations. Active policy initializes teacher leave balances.
                    </p>
                </div>

                {canCreate && (
                    <Button
                        className="rounded-xl font-semibold gap-2 shadow-sm"
                        onClick={() => {
                            form.reset({
                                ruleName: `Academic Policy (${academicYear?.name || "Current"})`,
                                casualLeaveCount: 12,
                                sickLeaveCount: 10,
                                earnedLeaveCount: 15,
                                maternityLeaveCount: 90,
                                leaveWithoutPayCount: 30,
                                isActive: true,
                            });
                            setIsCreateOpen(true);
                        }}
                    >
                        <Plus className="h-4 w-4" />
                        New Leave Rule
                    </Button>
                )}
            </div>

            {/* Active Rule Highlight Card */}
            {activeLoading ? (
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-28 rounded-2xl" />
                    ))}
                </div>
            ) : activeRule ? (
                <div className="space-y-4">
                    {/* Active Rule Metadata & Creator Audit Banner */}
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                            <div>
                                <span className="font-bold text-foreground text-sm">
                                    {activeRule.ruleName}
                                </span>
                                <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-600 text-white">
                                    ACTIVE POLICY
                                </span>
                            </div>
                        </div>

                        {/* Audit Details */}
                        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <UserCheck className="h-3.5 w-3.5 text-primary" />
                                <span>
                                    Created by <strong className="text-foreground">{activeRule.createdByName || activeRule.creator?.firstName || "System Admin"}</strong> on {new Date(activeRule.createdAt).toLocaleDateString()}
                                </span>
                            </div>

                            {activeRule.updatedByName && activeRule.updatedAt !== activeRule.createdAt && (
                                <div className="flex items-center gap-1.5 border-l border-border/60 pl-3">
                                    <Clock className="h-3.5 w-3.5 text-amber-500" />
                                    <span>
                                        Updated by <strong className="text-foreground">{activeRule.updatedByName}</strong>
                                    </span>
                                </div>
                            )}

                            {canUpdate && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 text-xs rounded-lg gap-1 border-emerald-500/30 hover:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                                    onClick={() => openEditModal(activeRule)}
                                >
                                    <Edit3 className="h-3 w-3" /> Edit Quotas
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Quota Counts Cards with Paid / Unpaid Type Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
                        <Card className="p-4 rounded-2xl border-border/60 bg-card shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Casual Leave</span>
                                <Badge variant="secondary" className="font-bold text-[10px] bg-blue-500/10 text-blue-600">CL</Badge>
                            </div>
                            <div className="mt-3 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-foreground">{Number(activeRule.casualLeaveCount).toFixed(0)}</span>
                                <span className="text-xs font-semibold text-muted-foreground">days/yr</span>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground/80">Personal</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Paid Leave
                                </span>
                            </div>
                        </Card>

                        <Card className="p-4 rounded-2xl border-border/60 bg-card shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Sick Leave</span>
                                <Badge variant="secondary" className="font-bold text-[10px] bg-rose-500/10 text-rose-600">SL</Badge>
                            </div>
                            <div className="mt-3 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-foreground">{Number(activeRule.sickLeaveCount).toFixed(0)}</span>
                                <span className="text-xs font-semibold text-muted-foreground">days/yr</span>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground/80">Medical</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Paid Leave
                                </span>
                            </div>
                        </Card>

                        <Card className="p-4 rounded-2xl border-border/60 bg-card shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Earned Leave</span>
                                <Badge variant="secondary" className="font-bold text-[10px] bg-amber-500/10 text-amber-600">EL</Badge>
                            </div>
                            <div className="mt-3 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-foreground">{Number(activeRule.earnedLeaveCount).toFixed(0)}</span>
                                <span className="text-xs font-semibold text-muted-foreground">days/yr</span>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground/80">Privilege</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Paid Leave
                                </span>
                            </div>
                        </Card>

                        <Card className="p-4 rounded-2xl border-border/60 bg-card shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Maternity</span>
                                <Badge variant="secondary" className="font-bold text-[10px] bg-purple-500/10 text-purple-600">ML</Badge>
                            </div>
                            <div className="mt-3 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-foreground">{Number(activeRule.maternityLeaveCount).toFixed(0)}</span>
                                <span className="text-xs font-semibold text-muted-foreground">days</span>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground/80">Statutory</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Paid Leave
                                </span>
                            </div>
                        </Card>

                        <Card className="p-4 rounded-2xl border-border/60 bg-card shadow-xs flex flex-col justify-between">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Leave Without Pay</span>
                                <Badge variant="secondary" className="font-bold text-[10px] bg-slate-500/10 text-slate-600">LWP</Badge>
                            </div>
                            <div className="mt-3 flex items-baseline gap-1">
                                <span className="text-3xl font-extrabold text-foreground">{Number(activeRule.leaveWithoutPayCount).toFixed(0)}</span>
                                <span className="text-xs font-semibold text-muted-foreground">max days</span>
                            </div>
                            <div className="mt-2.5 pt-2 border-t border-border/40 flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground/80">Deduction</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-500/20">
                                    Unpaid Leave
                                </span>
                            </div>
                        </Card>
                    </div>
                </div>
            ) : (
                <div className="p-6 rounded-2xl border border-dashed border-amber-500/40 bg-amber-500/5 text-center space-y-2">
                    <AlertCircle className="h-8 w-8 text-amber-500 mx-auto" />
                    <h3 className="font-bold text-foreground text-sm">No Active Leave Rule Configured</h3>
                    <p className="text-xs text-muted-foreground max-w-md mx-auto">
                        There is no active policy set for this academic session. Please create or activate a rule so teachers can apply for leaves.
                    </p>
                </div>
            )}

            {/* Historical Rules Table */}
            <div className="space-y-3 pt-2">
                <div className="flex items-center gap-2">
                    <History className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-bold text-foreground">Rule History & Revisions</h3>
                </div>

                <Card className="border-border/60 rounded-2xl overflow-hidden shadow-xs">
                    {historyLoading ? (
                        <div className="p-6 space-y-3">
                            <Skeleton className="h-8 w-full rounded-lg" />
                            <Skeleton className="h-8 w-full rounded-lg" />
                        </div>
                    ) : (rulesHistory || []).length === 0 ? (
                        <div className="p-8 text-center text-muted-foreground text-xs">
                            No leave policy records logged yet.
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left border-collapse">
                                <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground font-semibold">
                                    <tr>
                                        <th className="py-3 px-4">Policy Name</th>
                                        <th className="py-3 px-4">Status</th>
                                        <th className="py-3 px-4">Quotas (CL / SL / EL / ML / LWP)</th>
                                        <th className="py-3 px-4">Created By</th>
                                        <th className="py-3 px-4">Last Modified</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 text-foreground">
                                    {(rulesHistory || []).map((r) => (
                                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3.5 px-4 font-semibold">
                                                {r.ruleName}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {r.isActive ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                                        Active
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-medium text-xs">
                                                {Number(r.casualLeaveCount)} / {Number(r.sickLeaveCount)} / {Number(r.earnedLeaveCount)} / {Number(r.maternityLeaveCount)} / {Number(r.leaveWithoutPayCount)}
                                            </td>
                                            <td className="py-3.5 px-4 text-muted-foreground">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">{r.createdByName || r.creator?.firstName || "Admin"}</span>
                                                    <span className="text-[10px]">{new Date(r.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-muted-foreground">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-foreground">{r.updatedByName || "—"}</span>
                                                    <span className="text-[10px]">{new Date(r.updatedAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!r.isActive && canUpdate && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-[11px] rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                                                            onClick={() => updateMutation.mutate({ id: r.id, values: { isActive: true } })}
                                                            disabled={updateMutation.isPending}
                                                        >
                                                            Set Active
                                                        </Button>
                                                    )}
                                                    {canUpdate && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 w-7 p-0 rounded-lg"
                                                            onClick={() => openEditModal(r)}
                                                        >
                                                            <Edit3 className="h-3.5 w-3.5 text-muted-foreground" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </Card>
            </div>

            {/* Create / Edit Rule Dialog */}
            {(isCreateOpen || editingRule) && (
                <Dialog
                    open
                    onOpenChange={(open) => {
                        if (!open) {
                            setIsCreateOpen(false);
                            setEditingRule(null);
                        }
                    }}
                >
                    <DialogContent className="max-w-lg rounded-2xl border-border/80 p-0 overflow-hidden shadow-2xl">
                        <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
                            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                <ShieldCheck className="h-5 w-5 text-primary" />
                                {editingRule ? "Edit Leave Policy Rule" : "Create New Leave Policy"}
                            </DialogTitle>
                        </DialogHeader>

                        <Form {...form}>
                            <form
                                onSubmit={form.handleSubmit((vals) => {
                                    if (editingRule) {
                                        updateMutation.mutate({ id: editingRule.id, values: vals });
                                    } else {
                                        createMutation.mutate(vals);
                                    }
                                })}
                                className="space-y-4 p-5"
                            >
                                <FormField
                                    control={form.control}
                                    name="ruleName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold">Policy Title</FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="e.g. Standard Teacher Leave Policy 2026-27"
                                                    className="h-10 rounded-xl bg-muted/40 text-sm"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                    <FormField
                                        control={form.control}
                                        name="casualLeaveCount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold flex items-center justify-between">
                                                    <span>Casual (CL)</span>
                                                    <span className="text-[10px] text-emerald-600 font-bold">Paid</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        value={field.value}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-muted/40 text-sm"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="sickLeaveCount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold flex items-center justify-between">
                                                    <span>Sick (SL)</span>
                                                    <span className="text-[10px] text-emerald-600 font-bold">Paid</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        value={field.value}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-muted/40 text-sm"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="earnedLeaveCount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold flex items-center justify-between">
                                                    <span>Earned (EL)</span>
                                                    <span className="text-[10px] text-emerald-600 font-bold">Paid</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.5"
                                                        value={field.value}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-muted/40 text-sm"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="maternityLeaveCount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold flex items-center justify-between">
                                                    <span>Maternity (ML)</span>
                                                    <span className="text-[10px] text-emerald-600 font-bold">Paid</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="1"
                                                        value={field.value}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-muted/40 text-sm"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="leaveWithoutPayCount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold flex items-center justify-between">
                                                    <span>LWP Max</span>
                                                    <span className="text-[10px] text-amber-600 font-bold">Unpaid</span>
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="1"
                                                        value={field.value}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        className="h-10 rounded-xl bg-muted/40 text-sm"
                                                    />
                                                </FormControl>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="isActive"
                                        render={({ field }) => (
                                            <FormItem className="flex flex-col justify-end">
                                                <div className="flex items-center gap-2 h-10 px-3 bg-muted/30 border border-border/60 rounded-xl">
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                    <span className="text-xs font-semibold">Set as Active</span>
                                                </div>
                                            </FormItem>
                                        )}
                                    />
                                </div>

                                <div className="p-3 rounded-xl bg-muted/30 border border-border/50 text-[11px] text-muted-foreground flex items-start gap-2">
                                    <Info className="h-4 w-4 text-primary shrink-0 mt-0.5" />
                                    <span>
                                        Audit stamp will record your username and timestamp on submission. Setting this rule to active will supersede previous rules for the academic session.
                                    </span>
                                </div>

                                <DialogFooter className="pt-2">
                                    <Button
                                        type="button"
                                        variant="outline"
                                        className="rounded-xl h-10 px-4"
                                        onClick={() => {
                                            setIsCreateOpen(false);
                                            setEditingRule(null);
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        type="submit"
                                        className="rounded-xl h-10 px-5 font-semibold"
                                        disabled={createMutation.isPending || updateMutation.isPending}
                                    >
                                        {(createMutation.isPending || updateMutation.isPending) && (
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                        )}
                                        {editingRule ? "Save Rule Changes" : "Deploy Rule"}
                                    </Button>
                                </DialogFooter>
                            </form>
                        </Form>
                    </DialogContent>
                </Dialog>
            )}
        </div>
    );
}
