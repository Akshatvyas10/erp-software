import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { LeaveRule } from "@/types/erp";
import { usePermissions } from "@/store/hooks";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    ShieldCheck,
    UserCheck,
    History,
    Plus,
    Edit3,
    CheckCircle2,
    Clock,
    AlertCircle,
    CalendarClock,
    Flame,
    Sparkles,
    Ban,
    Power,
} from "lucide-react";
import { toast } from "sonner";
import { LeaveRulePolicyDialog } from "./LeaveRulePolicyDialog";

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

    // 3. Fetch academic years list for rule assignment
    const { data: academicYears = [] } = useQuery({
        queryKey: ["academic-years-all"],
        queryFn: async () => {
            try {
                const { data } = await api.get("/academic-years");
                const items = data.data?.academicYears || data.data || [];
                return (items as { id: string; name: string }[]).map((y) => ({
                    id: y.id,
                    name: y.name,
                }));
            } catch {
                return [];
            }
        },
    });

    // Activate / Deactivate mutations
    const toggleActivateMutation = useMutation({
        mutationFn: ({ id, activate }: { id: string; activate: boolean }) =>
            api.patch(`/teacher-leaves/rules/${id}/${activate ? "activate" : "deactivate"}`),
        onSuccess: (_, vars) => {
            toast.success(vars.activate ? "Policy rule activated successfully" : "Policy rule deactivated");
            qc.invalidateQueries({ queryKey: ["active-leave-rule"] });
            qc.invalidateQueries({ queryKey: ["leave-rules-list"] });
            qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
        },
        onError: (err: unknown) => {
            const apiErr = err as { response?: { data?: { message?: string } } };
            toast.error(apiErr.response?.data?.message || "Action failed");
        },
    });

    const activeRule = activeRuleData?.rule;
    const academicYear = activeRuleData?.academicYear;

    const openCreateModal = () => {
        setEditingRule(null);
        setIsCreateOpen(true);
    };

    const openEditModal = (rule: LeaveRule) => {
        setEditingRule(rule);
        setIsCreateOpen(true);
    };

    const activeSandwich = activeRule?.sandwichRule;
    const activeConfigs = activeRule?.leaveTypeConfigs;

    return (
        <div className="space-y-6">
            {/* Top Bar / Header Section */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-5 rounded-2xl bg-card border border-border/60 shadow-xs">
                <div className="space-y-1">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                            <ShieldCheck className="h-4 w-4" />
                        </div>
                        <h2 className="text-lg font-bold text-foreground">Dynamic Leave Rules Engine</h2>
                        {academicYear && (
                            <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 font-semibold text-xs ml-2">
                                Session: {academicYear.name}
                            </Badge>
                        )}
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Configure monthly leave accruals (e.g. 1 CL/mo), sandwich enforcement, future advances, and carry-forward quotas without hardcoding.
                    </p>
                </div>

                {canCreate && (
                    <Button
                        className="rounded-xl font-semibold gap-2 shadow-sm"
                        onClick={openCreateModal}
                    >
                        <Plus className="h-4 w-4" />
                        New Policy Rule
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
                                    ACTIVE ENGINE v{activeRule.version || 1}
                                </span>
                                <Badge variant="outline" className="ml-2 text-[10px] border-emerald-600/40 text-emerald-700 dark:text-emerald-300">
                                    Scope: {activeRule.appliesTo || "ALL"}
                                </Badge>
                            </div>
                        </div>

                        {/* Audit Details & Actions */}
                        <div className="flex flex-wrap items-center gap-4 text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <UserCheck className="h-3.5 w-3.5 text-primary" />
                                <span>
                                    By <strong className="text-foreground">{activeRule.createdByName || activeRule.creator?.firstName || "Admin"}</strong> on {new Date(activeRule.createdAt).toLocaleDateString()}
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
                                    <Edit3 className="h-3 w-3" /> Edit Engine
                                </Button>
                            )}
                        </div>
                    </div>

                    {/* Policy Highlights Pill Row: Monthly Allocations & Sandwich Mode */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <Card className="p-3.5 rounded-xl border-border/60 bg-card/60 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600">
                                <CalendarClock className="h-4 w-4" />
                            </div>
                            <div className="text-xs">
                                <div className="font-bold text-foreground">Monthly Accrual Mode</div>
                                <div className="text-muted-foreground text-[11px]">
                                    CL credits {activeConfigs?.CL?.monthlyCreditCount ?? 1} day/month (max {activeConfigs?.CL?.yearlyTotalQuota ?? 12}/yr)
                                </div>
                            </div>
                        </Card>

                        <Card className="p-3.5 rounded-xl border-border/60 bg-card/60 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
                                <Flame className="h-4 w-4" />
                            </div>
                            <div className="text-xs">
                                <div className="font-bold text-foreground">Sandwich Rule Mode: {activeSandwich?.mode || "WEEKENDS"}</div>
                                <div className="text-muted-foreground text-[11px]">
                                    {activeSandwich?.mode === "NONE"
                                        ? "No weekends/holidays counted as leaves"
                                        : "Enclosed Saturdays/Sundays added to total leaves"}
                                </div>
                            </div>
                        </Card>

                        <Card className="p-3.5 rounded-xl border-border/60 bg-card/60 flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600">
                                <Sparkles className="h-4 w-4" />
                            </div>
                            <div className="text-xs">
                                <div className="font-bold text-foreground">Advance Leave Allowance</div>
                                <div className="text-muted-foreground text-[11px]">
                                    {activeConfigs?.CL?.allowAdvanceFromFutureMonths
                                        ? `Allowed up to ${activeConfigs?.CL?.advanceLimit ?? 1} day from next month`
                                        : "Disabled"}
                                </div>
                            </div>
                        </Card>
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
                                <span className="text-[11px] text-muted-foreground/80">{activeConfigs?.CL?.allocationMode || "MONTHLY"}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Paid
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
                                <span className="text-[11px] text-muted-foreground/80">{activeConfigs?.SL?.allocationMode || "YEARLY"}</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Paid
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
                                <span className="text-[11px] text-muted-foreground/80">Carry Fwd: {activeConfigs?.EL?.carryForwardMaxLimit ?? 30}d</span>
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                    Paid
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
                                    Paid
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
                                    Unpaid
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
                    <h3 className="text-sm font-bold text-foreground">Rule History & Version Revisions</h3>
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
                                        <th className="py-3 px-4">Scope</th>
                                        <th className="py-3 px-4">Quotas (CL / SL / EL / ML / LWP)</th>
                                        <th className="py-3 px-4">Sandwich</th>
                                        <th className="py-3 px-4">Created By</th>
                                        <th className="py-3 px-4 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/60 text-foreground">
                                    {(rulesHistory || []).map((r) => (
                                        <tr key={r.id} className="hover:bg-muted/20 transition-colors">
                                            <td className="py-3.5 px-4 font-semibold">
                                                <div className="flex items-center gap-2">
                                                    <span>{r.ruleName}</span>
                                                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-mono">v{r.version || 1}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4">
                                                {r.status === "ACTIVE" || r.isActive ? (
                                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                                                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-600 animate-pulse" />
                                                        Active
                                                    </span>
                                                ) : r.status === "DRAFT" ? (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20">
                                                        Draft
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-muted text-muted-foreground">
                                                        Inactive
                                                    </span>
                                                )}
                                            </td>
                                            <td className="py-3.5 px-4">
                                                <Badge variant="outline" className="text-[10px]">
                                                    {r.appliesTo || "ALL"}
                                                </Badge>
                                            </td>
                                            <td className="py-3.5 px-4 font-mono font-medium text-xs">
                                                {Number(r.casualLeaveCount)} / {Number(r.sickLeaveCount)} / {Number(r.earnedLeaveCount)} / {Number(r.maternityLeaveCount)} / {Number(r.leaveWithoutPayCount)}
                                            </td>
                                            <td className="py-3.5 px-4 text-[11px] font-medium text-muted-foreground">
                                                {r.sandwichRule?.mode || "WEEKENDS"}
                                            </td>
                                            <td className="py-3.5 px-4 text-muted-foreground">
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground">{r.createdByName || r.creator?.firstName || "Admin"}</span>
                                                    <span className="text-[10px]">{new Date(r.createdAt).toLocaleDateString()}</span>
                                                </div>
                                            </td>
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {!r.isActive && canUpdate && (
                                                        <Button
                                                            size="sm"
                                                            variant="outline"
                                                            className="h-7 text-[11px] rounded-lg border-primary/30 text-primary hover:bg-primary/10 gap-1"
                                                            onClick={() => toggleActivateMutation.mutate({ id: r.id, activate: true })}
                                                            disabled={toggleActivateMutation.isPending}
                                                        >
                                                            <Power className="h-3 w-3" />
                                                            Activate
                                                        </Button>
                                                    )}
                                                    {r.isActive && canUpdate && (
                                                        <Button
                                                            size="sm"
                                                            variant="ghost"
                                                            className="h-7 text-[11px] rounded-lg text-rose-600 hover:bg-rose-500/10 gap-1"
                                                            onClick={() => toggleActivateMutation.mutate({ id: r.id, activate: false })}
                                                            disabled={toggleActivateMutation.isPending}
                                                        >
                                                            <Ban className="h-3 w-3" />
                                                            Deactivate
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

            {/* Enterprise Dynamic Leave Rule Policy Dialog */}
            <LeaveRulePolicyDialog
                open={isCreateOpen || Boolean(editingRule)}
                onOpenChange={(open) => {
                    setIsCreateOpen(open);
                    if (!open) {
                        setEditingRule(null);
                    }
                }}
                policyToEdit={editingRule}
                academicYears={academicYears}
                defaultAcademicYearId={academicYear?.id}
                onSuccess={() => {
                    setIsCreateOpen(false);
                    setEditingRule(null);
                }}
            />
        </div>
    );
}
