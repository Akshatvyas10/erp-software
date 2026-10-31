import { useEffect, useId } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type {
    LeaveRule,
    LeaveTypePolicyConfig,
    SandwichRuleConfig,
    LeaveRestrictionsConfig
} from "@/types/erp";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    FormDescription,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
    ShieldCheck,
    Layers,
    CalendarClock,
    Flame,
    Sparkles,
    Clock,
    UserCheck,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";

// Leave Type Default Archetypes
export const LEAVE_TYPE_KEYS = ["CL", "SL", "EL", "ML", "LWP"] as const;
export type LeaveTypeKey = (typeof LEAVE_TYPE_KEYS)[number];

export const LEAVE_TYPE_METADATA: Record<LeaveTypeKey, { name: string; code: string; color: string; desc: string }> = {
    CL: {
        name: "Casual Leave",
        code: "CL",
        color: "bg-blue-500/10 text-blue-600 border-blue-500/20",
        desc: "Short planned or urgent personal leaves, accruable monthly.",
    },
    SL: {
        name: "Sick / Medical Leave",
        code: "SL",
        color: "bg-rose-500/10 text-rose-600 border-rose-500/20",
        desc: "Unplanned health exigencies, may require medical certificate.",
    },
    EL: {
        name: "Earned / Privilege Leave",
        code: "EL",
        color: "bg-amber-500/10 text-amber-600 border-amber-500/20",
        desc: "Accumulated annual leave eligible for carry-forward to next year.",
    },
    ML: {
        name: "Maternity / Parental Leave",
        code: "ML",
        color: "bg-purple-500/10 text-purple-600 border-purple-500/20",
        desc: "Statutory parenthood entitlement with predefined long block.",
    },
    LWP: {
        name: "Leave Without Pay",
        code: "LWP",
        color: "bg-slate-500/10 text-slate-600 border-slate-500/20",
        desc: "Unpaid absence approved beyond statutory credit quotas.",
    },
};

const defaultLeaveTypeConfigs: Record<LeaveTypeKey, LeaveTypePolicyConfig> = {
    CL: {
        enabled: true,
        allocationMode: "MONTHLY",
        monthlyCreditCount: 1.0,
        yearlyTotalQuota: 12.0,
        maxPerRequest: 3.0,
        maxPerMonth: 2.0,
        maxPerYear: 12.0,
        requiresAttachment: false,
        isPaid: true,
        allowNegativeBalance: false,
        allowAdvanceFromFutureMonths: true,
        advanceLimit: 1.0,
        carryForwardEnabled: true,
        carryForwardMaxLimit: 3.0,
        expiryMonths: null,
    },
    SL: {
        enabled: true,
        allocationMode: "YEARLY",
        monthlyCreditCount: 0.83,
        yearlyTotalQuota: 10.0,
        maxPerRequest: 5.0,
        maxPerMonth: 5.0,
        maxPerYear: 10.0,
        requiresAttachment: true,
        isPaid: true,
        allowNegativeBalance: false,
        allowAdvanceFromFutureMonths: false,
        advanceLimit: 0,
        carryForwardEnabled: false,
        carryForwardMaxLimit: 0,
        expiryMonths: null,
    },
    EL: {
        enabled: true,
        allocationMode: "YEARLY",
        monthlyCreditCount: 1.25,
        yearlyTotalQuota: 15.0,
        maxPerRequest: 10.0,
        maxPerMonth: 10.0,
        maxPerYear: 15.0,
        requiresAttachment: false,
        isPaid: true,
        allowNegativeBalance: false,
        allowAdvanceFromFutureMonths: false,
        advanceLimit: 0,
        carryForwardEnabled: true,
        carryForwardMaxLimit: 30.0,
        expiryMonths: 24,
    },
    ML: {
        enabled: true,
        allocationMode: "YEARLY",
        monthlyCreditCount: 0,
        yearlyTotalQuota: 90.0,
        maxPerRequest: 90.0,
        maxPerMonth: 90.0,
        maxPerYear: 90.0,
        requiresAttachment: true,
        isPaid: true,
        allowNegativeBalance: false,
        allowAdvanceFromFutureMonths: false,
        advanceLimit: 0,
        carryForwardEnabled: false,
        carryForwardMaxLimit: 0,
        expiryMonths: null,
    },
    LWP: {
        enabled: true,
        allocationMode: "YEARLY",
        monthlyCreditCount: 0,
        yearlyTotalQuota: 30.0,
        maxPerRequest: 15.0,
        maxPerMonth: 15.0,
        maxPerYear: 30.0,
        requiresAttachment: false,
        isPaid: false,
        allowNegativeBalance: true,
        allowAdvanceFromFutureMonths: false,
        advanceLimit: 0,
        carryForwardEnabled: false,
        carryForwardMaxLimit: 0,
        expiryMonths: null,
    },
};

const defaultSandwichRule: SandwichRuleConfig = {
    mode: "WEEKENDS",
    includeSundays: true,
    includeSaturdays: true,
    includeCalendarHolidays: false,
    applyOnFridayMondayLeaves: true,
    applyOnPrePostHolidayLeaves: false,
};

const defaultRestrictions: LeaveRestrictionsConfig = {
    excludeSundays: true,
    excludeHolidays: true,
    allowHalfDay: true,
    minNoticeDays: 1,
    maxConsecutiveDays: 15,
    blockIfNoActiveRule: true,
    autoDeductOnApprovalOnly: true,
    pendingLeaveReservesBalance: true,
};

// Form Schema
const leaveTypePolicyConfigSchema = z.object({
    enabled: z.boolean(),
    allocationMode: z.enum(["MONTHLY", "YEARLY"]),
    monthlyCreditCount: z.coerce.number().min(0, "Must be >= 0"),
    yearlyTotalQuota: z.coerce.number().min(0, "Must be >= 0"),
    maxPerRequest: z.coerce.number().min(0, "Must be >= 0"),
    maxPerMonth: z.coerce.number().min(0, "Must be >= 0"),
    maxPerYear: z.coerce.number().min(0, "Must be >= 0"),
    requiresAttachment: z.boolean(),
    isPaid: z.boolean(),
    allowNegativeBalance: z.boolean(),
    allowAdvanceFromFutureMonths: z.boolean(),
    advanceLimit: z.coerce.number().min(0, "Must be >= 0"),
    carryForwardEnabled: z.boolean(),
    carryForwardMaxLimit: z.coerce.number().min(0, "Must be >= 0"),
    expiryMonths: z.coerce.number().nullable().optional(),
});

const sandwichRuleSchema = z.object({
    mode: z.enum(["NONE", "WEEKENDS", "HOLIDAYS", "BOTH"]),
    includeSundays: z.boolean(),
    includeSaturdays: z.boolean(),
    includeCalendarHolidays: z.boolean(),
    applyOnFridayMondayLeaves: z.boolean(),
    applyOnPrePostHolidayLeaves: z.boolean(),
});

const restrictionsSchema = z.object({
    excludeSundays: z.boolean(),
    excludeHolidays: z.boolean(),
    allowHalfDay: z.boolean(),
    minNoticeDays: z.coerce.number().min(0, "Cannot be negative"),
    maxConsecutiveDays: z.coerce.number().min(1, "Must allow at least 1 day"),
    blockIfNoActiveRule: z.boolean(),
    autoDeductOnApprovalOnly: z.boolean(),
    pendingLeaveReservesBalance: z.boolean(),
});

const leaveRulePolicyFormSchema = z.object({
    ruleName: z.string().trim().min(3, "Policy name must be at least 3 characters"),
    academicYearId: z.string().min(1, "Please select an academic year"),
    status: z.enum(["DRAFT", "ACTIVE", "INACTIVE"]),
    appliesTo: z.enum(["ALL", "DEPARTMENT", "EMPLOYMENT_TYPE"]),
    effectiveFrom: z.string().optional().nullable(),
    effectiveTo: z.string().optional().nullable(),
    casualLeaveCount: z.coerce.number().min(0),
    sickLeaveCount: z.coerce.number().min(0),
    earnedLeaveCount: z.coerce.number().min(0),
    maternityLeaveCount: z.coerce.number().min(0),
    leaveWithoutPayCount: z.coerce.number().min(0),
    leaveTypeConfigs: z.record(z.string(), leaveTypePolicyConfigSchema),
    sandwichRule: sandwichRuleSchema,
    restrictions: restrictionsSchema,
});

export type LeaveRulePolicyFormValues = z.infer<typeof leaveRulePolicyFormSchema>;
export type LeaveRulePolicyFormInput = z.input<typeof leaveRulePolicyFormSchema>;

interface LeaveRulePolicyDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    policyToEdit?: LeaveRule | null;
    academicYears?: { id: string; name: string }[];
    defaultAcademicYearId?: string;
    onSuccess?: () => void;
}

export function LeaveRulePolicyDialog({
    open,
    onOpenChange,
    policyToEdit,
    academicYears = [],
    defaultAcademicYearId,
    onSuccess,
}: LeaveRulePolicyDialogProps) {
    const qc = useQueryClient();
    const isEditMode = Boolean(policyToEdit?.id);
    const formId = useId();

    const form = useForm<LeaveRulePolicyFormInput, any, LeaveRulePolicyFormValues>({
        resolver: zodResolver(leaveRulePolicyFormSchema),
        defaultValues: {
            ruleName: "Standard Faculty Leave Policy",
            academicYearId: defaultAcademicYearId || "",
            status: "ACTIVE",
            appliesTo: "ALL",
            effectiveFrom: "",
            effectiveTo: "",
            casualLeaveCount: 12.0,
            sickLeaveCount: 10.0,
            earnedLeaveCount: 15.0,
            maternityLeaveCount: 90.0,
            leaveWithoutPayCount: 30.0,
            leaveTypeConfigs: defaultLeaveTypeConfigs,
            sandwichRule: defaultSandwichRule,
            restrictions: defaultRestrictions,
        },
    });

    // Populate or reset form whenever modal opens or active policy changes
    useEffect(() => {
        if (!open) return;

        if (policyToEdit) {
            const mergedConfigs: Record<string, LeaveTypePolicyConfig> = { ...defaultLeaveTypeConfigs };
            if (policyToEdit.leaveTypeConfigs) {
                Object.keys(policyToEdit.leaveTypeConfigs).forEach((k) => {
                    mergedConfigs[k] = {
                        ...defaultLeaveTypeConfigs[k as LeaveTypeKey],
                        ...policyToEdit.leaveTypeConfigs![k],
                    };
                });
            }

            form.reset({
                ruleName: policyToEdit.ruleName || "",
                academicYearId: policyToEdit.academicYearId || defaultAcademicYearId || "",
                status: policyToEdit.status || (policyToEdit.isActive ? "ACTIVE" : "INACTIVE"),
                appliesTo: policyToEdit.appliesTo || "ALL",
                effectiveFrom: policyToEdit.effectiveFrom || "",
                effectiveTo: policyToEdit.effectiveTo || "",
                casualLeaveCount: Number(policyToEdit.casualLeaveCount ?? 12),
                sickLeaveCount: Number(policyToEdit.sickLeaveCount ?? 10),
                earnedLeaveCount: Number(policyToEdit.earnedLeaveCount ?? 15),
                maternityLeaveCount: Number(policyToEdit.maternityLeaveCount ?? 90),
                leaveWithoutPayCount: Number(policyToEdit.leaveWithoutPayCount ?? 30),
                leaveTypeConfigs: mergedConfigs,
                sandwichRule: {
                    ...defaultSandwichRule,
                    ...(policyToEdit.sandwichRule || {}),
                },
                restrictions: {
                    ...defaultRestrictions,
                    ...(policyToEdit.restrictions || {}),
                },
            });
        } else {
            form.reset({
                ruleName: `Standard Faculty Leave Policy (${academicYears.find((y) => y.id === defaultAcademicYearId)?.name || "Current"})`,
                academicYearId: defaultAcademicYearId || (academicYears[0]?.id ?? ""),
                status: "ACTIVE",
                appliesTo: "ALL",
                effectiveFrom: "",
                effectiveTo: "",
                casualLeaveCount: 12.0,
                sickLeaveCount: 10.0,
                earnedLeaveCount: 15.0,
                maternityLeaveCount: 90.0,
                leaveWithoutPayCount: 30.0,
                leaveTypeConfigs: defaultLeaveTypeConfigs,
                sandwichRule: defaultSandwichRule,
                restrictions: defaultRestrictions,
            });
        }
    }, [open, policyToEdit, defaultAcademicYearId, academicYears, form]);

    // Create Mutation
    const createMutation = useMutation({
        mutationFn: (values: LeaveRulePolicyFormValues) =>
            api.post("/teacher-leaves/rules", {
                ...values,
                casualLeaveCount: values.leaveTypeConfigs.CL?.yearlyTotalQuota ?? values.casualLeaveCount,
                sickLeaveCount: values.leaveTypeConfigs.SL?.yearlyTotalQuota ?? values.sickLeaveCount,
                earnedLeaveCount: values.leaveTypeConfigs.EL?.yearlyTotalQuota ?? values.earnedLeaveCount,
                maternityLeaveCount: values.leaveTypeConfigs.ML?.yearlyTotalQuota ?? values.maternityLeaveCount,
                leaveWithoutPayCount: values.leaveTypeConfigs.LWP?.yearlyTotalQuota ?? values.leaveWithoutPayCount,
                isActive: values.status === "ACTIVE",
            }),
        onSuccess: () => {
            toast.success("Leave policy rule created and published successfully");
            qc.invalidateQueries({ queryKey: ["active-leave-rule"] });
            qc.invalidateQueries({ queryKey: ["leave-rules-list"] });
            qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: unknown) => {
            const apiErr = err as { response?: { data?: { message?: string } } };
            toast.error(apiErr.response?.data?.message || "Failed to create leave policy");
        },
    });

    // Update Mutation
    const updateMutation = useMutation({
        mutationFn: (values: LeaveRulePolicyFormValues) =>
            api.put(`/teacher-leaves/rules/${policyToEdit!.id}`, {
                ...values,
                casualLeaveCount: values.leaveTypeConfigs.CL?.yearlyTotalQuota ?? values.casualLeaveCount,
                sickLeaveCount: values.leaveTypeConfigs.SL?.yearlyTotalQuota ?? values.sickLeaveCount,
                earnedLeaveCount: values.leaveTypeConfigs.EL?.yearlyTotalQuota ?? values.earnedLeaveCount,
                maternityLeaveCount: values.leaveTypeConfigs.ML?.yearlyTotalQuota ?? values.maternityLeaveCount,
                leaveWithoutPayCount: values.leaveTypeConfigs.LWP?.yearlyTotalQuota ?? values.leaveWithoutPayCount,
                isActive: values.status === "ACTIVE",
            }),
        onSuccess: () => {
            toast.success("Leave policy rule updated successfully");
            qc.invalidateQueries({ queryKey: ["active-leave-rule"] });
            qc.invalidateQueries({ queryKey: ["leave-rules-list"] });
            qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
            onOpenChange(false);
            onSuccess?.();
        },
        onError: (err: unknown) => {
            const apiErr = err as { response?: { data?: { message?: string } } };
            toast.error(apiErr.response?.data?.message || "Failed to update leave policy");
        },
    });

    const isSubmitting = createMutation.isPending || updateMutation.isPending;

    const handleSubmit = (values: LeaveRulePolicyFormValues) => {
        if (isEditMode) {
            updateMutation.mutate(values);
        } else {
            createMutation.mutate(values);
        }
    };

    const handleSaveAsDraft = () => {
        form.setValue("status", "DRAFT");
        form.handleSubmit(handleSubmit)();
    };

    const currentStatus = form.watch("status");
    const sandwichMode = form.watch("sandwichRule.mode");

    return (
        <Dialog open={open} onOpenChange={(v) => !isSubmitting && onOpenChange(v)}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden flex flex-col max-h-[92vh] sm:rounded-2xl border-border/80 shadow-2xl">
                {/* ── HEADER ── */}
                <DialogHeader className="px-6 py-5 border-b border-border/60 bg-muted/20 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                        <div className="space-y-1">
                            <div className="flex items-center gap-2.5">
                                <div className="h-9 w-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                                    <ShieldCheck className="h-5 w-5" />
                                </div>
                                <DialogTitle className="text-lg font-bold text-foreground">
                                    {isEditMode ? "Edit Leave Rule Policy" : "Configure Leave Rule Policy"}
                                </DialogTitle>
                                {isEditMode && (
                                    <div className="flex items-center gap-1.5 ml-1">
                                        <Badge
                                            variant={currentStatus === "ACTIVE" ? "default" : "secondary"}
                                            className={
                                                currentStatus === "ACTIVE"
                                                    ? "bg-emerald-600 hover:bg-emerald-600 text-white font-semibold text-[11px]"
                                                    : currentStatus === "DRAFT"
                                                        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 text-[11px]"
                                                        : "text-[11px]"
                                            }
                                        >
                                            {currentStatus}
                                        </Badge>
                                        <span className="text-xs text-muted-foreground font-mono">
                                            v{policyToEdit?.version || 1}
                                        </span>
                                    </div>
                                )}
                            </div>
                            <DialogDescription className="text-xs text-muted-foreground">
                                {isEditMode
                                    ? `Modifying policy parameters for "${policyToEdit?.ruleName}". Adjust statutory quotas, accrual cycles, and sandwich rules.`
                                    : "Define annual and monthly leave allocations, advance limits, carry forward, and holiday sandwich rules for teachers."}
                            </DialogDescription>
                        </div>
                    </div>
                </DialogHeader>

                {/* ── BODY (Scrollable, Sectioned) ── */}
                <Form {...form}>
                    <form
                        id={formId}
                        onSubmit={form.handleSubmit(handleSubmit)}
                        className="flex-1 overflow-y-auto px-6 py-6 space-y-8"
                    >
                        {/* ── SECTION 1: Basic Info ── */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                    1
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">Basic Information & Scope</h3>
                                    <p className="text-[11px] text-muted-foreground">
                                        Policy identifier, target academic session, and deployment status.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="ruleName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold">
                                                Policy Name <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    {...field}
                                                    placeholder="e.g. 2026-27 Comprehensive Faculty Policy"
                                                    className="h-9 rounded-xl bg-card text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="academicYearId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold">
                                                Academic Year <span className="text-destructive">*</span>
                                            </FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 rounded-xl bg-card text-xs">
                                                        <SelectValue placeholder="Select Academic Year" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl">
                                                    {academicYears.length > 0 ? (
                                                        academicYears.map((ay) => (
                                                            <SelectItem key={ay.id} value={ay.id}>
                                                                {ay.name}
                                                            </SelectItem>
                                                        ))
                                                    ) : (
                                                        <SelectItem value={field.value || "default"}>
                                                            Current Academic Year
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold">Status</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 rounded-xl bg-card text-xs">
                                                        <SelectValue placeholder="Policy Status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="ACTIVE">ACTIVE (Deploys immediately to staff)</SelectItem>
                                                    <SelectItem value="DRAFT">DRAFT (Testing only, unlisted to teachers)</SelectItem>
                                                    <SelectItem value="INACTIVE">INACTIVE (Archived)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription className="text-[11px] text-muted-foreground">
                                                Active rules supersede previous default policies for this session.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="appliesTo"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold">Applicability Scope</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-9 rounded-xl bg-card text-xs">
                                                        <SelectValue placeholder="Scope" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="ALL">All School Teaching Staff</SelectItem>
                                                    <SelectItem value="DEPARTMENT">Specific Department</SelectItem>
                                                    <SelectItem value="EMPLOYMENT_TYPE">Employment Type</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormDescription className="text-[11px] text-muted-foreground">
                                                Determines which employees inherit this policy engine.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="effectiveFrom"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-muted-foreground">
                                                Effective From (Optional)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                    className="h-9 rounded-xl bg-card text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="effectiveTo"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-muted-foreground">
                                                Effective To (Optional)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="date"
                                                    value={field.value || ""}
                                                    onChange={field.onChange}
                                                    className="h-9 rounded-xl bg-card text-xs"
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </section>

                        <Separator className="bg-border/60" />

                        {/* ── SECTION 2: Leave Type Allocations ── */}
                        <section className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                        2
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-foreground">
                                            Leave Type Allocations & Entitlements
                                        </h3>
                                        <p className="text-[11px] text-muted-foreground">
                                            Enable, allocate quotas, and set request caps for each leave archetype.
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                {LEAVE_TYPE_KEYS.map((key) => {
                                    const meta = LEAVE_TYPE_METADATA[key];
                                    const isEnabled = form.watch(`leaveTypeConfigs.${key}.enabled`);

                                    return (
                                        <Card
                                            key={key}
                                            className={`rounded-2xl transition-all border ${isEnabled
                                                ? "border-border/80 bg-card shadow-xs"
                                                : "border-dashed border-border/60 bg-muted/10 opacity-70"
                                                }`}
                                        >
                                            <CardContent className="p-4 space-y-3.5">
                                                {/* Header Row of Type Card */}
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                                                    <div className="flex items-center gap-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`leaveTypeConfigs.${key}.enabled`}
                                                            render={({ field }) => (
                                                                <FormControl>
                                                                    <Switch
                                                                        checked={field.value}
                                                                        onCheckedChange={field.onChange}
                                                                    />
                                                                </FormControl>
                                                            )}
                                                        />
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-foreground">
                                                                    {meta.name}
                                                                </span>
                                                                <span
                                                                    className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${meta.color}`}
                                                                >
                                                                    {meta.code}
                                                                </span>
                                                            </div>
                                                            <p className="text-[11px] text-muted-foreground mt-0.5">
                                                                {meta.desc}
                                                            </p>
                                                        </div>
                                                    </div>

                                                    {isEnabled && (
                                                        <div className="flex items-center gap-3 self-end sm:self-center">
                                                            <FormField
                                                                control={form.control}
                                                                name={`leaveTypeConfigs.${key}.isPaid`}
                                                                render={({ field }) => (
                                                                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                                                                        <Checkbox
                                                                            checked={field.value}
                                                                            onCheckedChange={field.onChange}
                                                                        />
                                                                        <span className="text-[11px]">Paid Leave</span>
                                                                    </label>
                                                                )}
                                                            />
                                                            <FormField
                                                                control={form.control}
                                                                name={`leaveTypeConfigs.${key}.requiresAttachment`}
                                                                render={({ field }) => (
                                                                    <label className="flex items-center gap-1.5 text-xs font-medium cursor-pointer">
                                                                        <Checkbox
                                                                            checked={field.value}
                                                                            onCheckedChange={field.onChange}
                                                                        />
                                                                        <span className="text-[11px]">Require Document</span>
                                                                    </label>
                                                                )}
                                                            />
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Expanded Fields when Enabled */}
                                                {isEnabled && (
                                                    <div className="pt-3 border-t border-border/40 grid grid-cols-2 sm:grid-cols-4 gap-3">
                                                        <FormField
                                                            control={form.control}
                                                            name={`leaveTypeConfigs.${key}.allocationMode`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">
                                                                        Mode
                                                                    </FormLabel>
                                                                    <Select
                                                                        value={field.value}
                                                                        onValueChange={field.onChange}
                                                                    >
                                                                        <FormControl>
                                                                            <SelectTrigger className="h-8 rounded-lg text-xs bg-muted/30">
                                                                                <SelectValue />
                                                                            </SelectTrigger>
                                                                        </FormControl>
                                                                        <SelectContent className="rounded-xl">
                                                                            <SelectItem value="MONTHLY">Monthly</SelectItem>
                                                                            <SelectItem value="YEARLY">Yearly Lump</SelectItem>
                                                                        </SelectContent>
                                                                    </Select>
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={form.control}
                                                            name={`leaveTypeConfigs.${key}.yearlyTotalQuota`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">
                                                                        Yearly Quota
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            step="0.5"
                                                                            min="0"
                                                                            value={(field.value as number | string | undefined) ?? 0}
                                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                            className="h-8 rounded-lg text-xs bg-muted/30"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={form.control}
                                                            name={`leaveTypeConfigs.${key}.maxPerRequest`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">
                                                                        Max / Request
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            step="0.5"
                                                                            min="0"
                                                                            value={(field.value as number | string | undefined) ?? 0}
                                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                            className="h-8 rounded-lg text-xs bg-muted/30"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />

                                                        <FormField
                                                            control={form.control}
                                                            name={`leaveTypeConfigs.${key}.maxPerMonth`}
                                                            render={({ field }) => (
                                                                <FormItem>
                                                                    <FormLabel className="text-[10px] font-bold uppercase text-muted-foreground">
                                                                        Max / Month
                                                                    </FormLabel>
                                                                    <FormControl>
                                                                        <Input
                                                                            type="number"
                                                                            step="0.5"
                                                                            min="0"
                                                                            value={(field.value as number | string | undefined) ?? 0}
                                                                            onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                            className="h-8 rounded-lg text-xs bg-muted/30"
                                                                        />
                                                                    </FormControl>
                                                                    <FormMessage />
                                                                </FormItem>
                                                            )}
                                                        />
                                                    </div>
                                                )}
                                            </CardContent>
                                        </Card>
                                    );
                                })}
                            </div>
                        </section>

                        <Separator className="bg-border/60" />

                        {/* ── SECTION 3: Monthly / Advance / Carry Rules ── */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                    3
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        Monthly Accrual, Advance & Carry Forward
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground">
                                        Control incremental quota crediting, borrowing from future months, and rollover limits.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Monthly Credit Settings Card */}
                                <Card className="rounded-2xl border-border/80 bg-card p-4 space-y-3.5">
                                    <div className="flex items-center gap-2">
                                        <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600">
                                            <CalendarClock className="h-4 w-4" />
                                        </div>
                                        <div>
                                            <h4 className="text-xs font-bold text-foreground">Monthly Credit Settings</h4>
                                            <p className="text-[11px] text-muted-foreground">
                                                Monthly accrual speed for Casual Leaves (CL).
                                            </p>
                                        </div>
                                    </div>

                                    <FormField
                                        control={form.control}
                                        name="leaveTypeConfigs.CL.monthlyCreditCount"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-semibold">
                                                    CL Accrual Rate (Days / Month)
                                                </FormLabel>
                                                <FormControl>
                                                    <Input
                                                        type="number"
                                                        step="0.25"
                                                        min="0"
                                                        value={(field.value as number | string | undefined) ?? 0}
                                                        onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                        className="h-9 rounded-xl bg-muted/30 text-xs"
                                                    />
                                                </FormControl>
                                                <FormDescription className="text-[11px] text-muted-foreground">
                                                    Credits automatically on the 1st of each calendar month.
                                                </FormDescription>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                </Card>

                                {/* Advance Leave Card */}
                                <Card className="rounded-2xl border-border/80 bg-card p-4 space-y-3.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-purple-500/10 text-purple-600">
                                                <Sparkles className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-foreground">Advance Leave Borrowing</h4>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Allows teachers to use next month&apos;s CL in current month.
                                                </p>
                                            </div>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="leaveTypeConfigs.CL.allowAdvanceFromFutureMonths"
                                            render={({ field }) => (
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            )}
                                        />
                                    </div>

                                    {form.watch("leaveTypeConfigs.CL.allowAdvanceFromFutureMonths") && (
                                        <div className="pt-2 border-t border-border/40">
                                            <FormField
                                                control={form.control}
                                                name="leaveTypeConfigs.CL.advanceLimit"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-semibold">
                                                            Max Advance Limit (Days)
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="0.5"
                                                                min="0.5"
                                                                value={(field.value as number | string | undefined) ?? 0}
                                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                className="h-9 rounded-xl bg-muted/30 text-xs"
                                                            />
                                                        </FormControl>
                                                        <FormDescription className="text-[11px] text-muted-foreground">
                                                            Maximum days an employee may borrow ahead of schedule.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </Card>

                                {/* Carry Forward Card (CL) */}
                                <Card className="rounded-2xl border-border/80 bg-card p-4 space-y-3.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                                                <Clock className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-foreground">CL Carry Forward</h4>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Rollover unconsumed casual leave to next year.
                                                </p>
                                            </div>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="leaveTypeConfigs.CL.carryForwardEnabled"
                                            render={({ field }) => (
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            )}
                                        />
                                    </div>

                                    {form.watch("leaveTypeConfigs.CL.carryForwardEnabled") && (
                                        <div className="pt-2 border-t border-border/40">
                                            <FormField
                                                control={form.control}
                                                name="leaveTypeConfigs.CL.carryForwardMaxLimit"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-semibold">
                                                            Max Carry Forward Limit (Days)
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="1"
                                                                min="1"
                                                                value={(field.value as number | string | undefined) ?? 0}
                                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                className="h-9 rounded-xl bg-muted/30 text-xs"
                                                            />
                                                        </FormControl>
                                                        <FormDescription className="text-[11px] text-muted-foreground">
                                                            Excess leaves beyond this limit will lapse at year-end.
                                                        </FormDescription>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </Card>

                                {/* Carry Forward Card (EL) */}
                                <Card className="rounded-2xl border-border/80 bg-card p-4 space-y-3.5">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                                                <Layers className="h-4 w-4" />
                                            </div>
                                            <div>
                                                <h4 className="text-xs font-bold text-foreground">EL Accumulation & Rollover</h4>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Earned leave multi-year accumulation ceiling.
                                                </p>
                                            </div>
                                        </div>
                                        <FormField
                                            control={form.control}
                                            name="leaveTypeConfigs.EL.carryForwardEnabled"
                                            render={({ field }) => (
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            )}
                                        />
                                    </div>

                                    {form.watch("leaveTypeConfigs.EL.carryForwardEnabled") && (
                                        <div className="pt-2 border-t border-border/40 grid grid-cols-2 gap-3">
                                            <FormField
                                                control={form.control}
                                                name="leaveTypeConfigs.EL.carryForwardMaxLimit"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-semibold">
                                                            Max Cap (Days)
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="1"
                                                                min="1"
                                                                value={(field.value as number | string | undefined) ?? 0}
                                                                onChange={(e) => field.onChange(parseFloat(e.target.value) || 0)}
                                                                className="h-9 rounded-xl bg-muted/30 text-xs"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />

                                            <FormField
                                                control={form.control}
                                                name="leaveTypeConfigs.EL.expiryMonths"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-semibold">
                                                            Expiry (Months)
                                                        </FormLabel>
                                                        <FormControl>
                                                            <Input
                                                                type="number"
                                                                step="1"
                                                                min="1"
                                                                placeholder="e.g. 24"
                                                                value={(field.value as number | string | undefined) ?? 0}
                                                                onChange={(e) =>
                                                                    field.onChange(
                                                                        e.target.value ? parseInt(e.target.value) : null
                                                                    )
                                                                }
                                                                className="h-9 rounded-xl bg-muted/30 text-xs"
                                                            />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    )}
                                </Card>
                            </div>
                        </section>

                        <Separator className="bg-border/60" />

                        {/* ── SECTION 4: Sandwich & Calendar Rules ── */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                    4
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        Sandwich & Calendar Treatment Rules
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground">
                                        Enforce statutory deduction of weekends or holidays enclosed within leave spans.
                                    </p>
                                </div>
                            </div>

                            <Card className="rounded-2xl border-border/80 bg-card p-4 space-y-4">
                                <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300">
                                    <Flame className="h-4 w-4 shrink-0 mt-0.5 text-amber-600" />
                                    <span>
                                        <strong>Sandwich Enforcement:</strong> When a teacher applies for leave spanning adjacent weekends or calendar holidays (e.g., Friday and Monday), the intervening off-days count against the teacher&apos;s leave balance.
                                    </span>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="sandwichRule.mode"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="text-xs font-bold">
                                                    Enforcement Mode
                                                </FormLabel>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <FormControl>
                                                        <SelectTrigger className="h-9 rounded-xl bg-muted/30 text-xs font-semibold">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent className="rounded-xl">
                                                        <SelectItem value="NONE">NONE (Normal working days charged only)</SelectItem>
                                                        <SelectItem value="WEEKENDS">WEEKENDS (Intervening Sat / Sun counted)</SelectItem>
                                                        <SelectItem value="HOLIDAYS">HOLIDAYS (Intervening calendar holidays counted)</SelectItem>
                                                        <SelectItem value="BOTH">BOTH (All intervening weekends & holidays counted)</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="sandwichRule.applyOnFridayMondayLeaves"
                                        render={({ field }) => (
                                            <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-muted/20">
                                                <div className="space-y-0.5">
                                                    <span className="text-xs font-semibold text-foreground">
                                                        Friday + Monday Leaves
                                                    </span>
                                                    <p className="text-[11px] text-muted-foreground">
                                                        Detect adjacent approved leaves across weekends
                                                    </p>
                                                </div>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                    />
                                                </FormControl>
                                            </div>
                                        )}
                                    />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2 border-t border-border/40">
                                    <FormField
                                        control={form.control}
                                        name="sandwichRule.includeSundays"
                                        render={({ field }) => (
                                            <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-muted/10">
                                                <span className="text-xs font-medium">Sandwich Sundays</span>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        disabled={sandwichMode === "NONE"}
                                                    />
                                                </FormControl>
                                            </div>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="sandwichRule.includeSaturdays"
                                        render={({ field }) => (
                                            <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-muted/10">
                                                <span className="text-xs font-medium">Sandwich Saturdays</span>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        disabled={sandwichMode === "NONE"}
                                                    />
                                                </FormControl>
                                            </div>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="sandwichRule.includeCalendarHolidays"
                                        render={({ field }) => (
                                            <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-muted/10">
                                                <span className="text-xs font-medium">Sandwich Holidays</span>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        disabled={sandwichMode === "NONE" || sandwichMode === "WEEKENDS"}
                                                    />
                                                </FormControl>
                                            </div>
                                        )}
                                    />

                                    <FormField
                                        control={form.control}
                                        name="sandwichRule.applyOnPrePostHolidayLeaves"
                                        render={({ field }) => (
                                            <div className="flex items-center justify-between p-2.5 rounded-xl border border-border/40 bg-muted/10">
                                                <span className="text-xs font-medium">Pre/Post Holiday Span</span>
                                                <FormControl>
                                                    <Switch
                                                        checked={field.value}
                                                        onCheckedChange={field.onChange}
                                                        disabled={sandwichMode === "NONE" || sandwichMode === "WEEKENDS"}
                                                    />
                                                </FormControl>
                                            </div>
                                        )}
                                    />
                                </div>
                            </Card>
                        </section>

                        <Separator className="bg-border/60" />

                        {/* ── SECTION 5: Restrictions ── */}
                        <section className="space-y-4">
                            <div className="flex items-center gap-2">
                                <div className="h-6 w-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold">
                                    5
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-foreground">
                                        Application Restrictions & Safeguards
                                    </h3>
                                    <p className="text-[11px] text-muted-foreground">
                                        Advance notice periods, max consecutive lengths, and balance reserving.
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="restrictions.minNoticeDays"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold">
                                                Minimum Notice Period (Days)
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="0"
                                                    value={(field.value as number | string | undefined) ?? 0}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                                                    className="h-9 rounded-xl bg-card text-xs"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-[11px] text-muted-foreground">
                                                Mandatory advance notice required for planned leave submissions.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="restrictions.maxConsecutiveDays"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold">
                                                Max Consecutive Days
                                            </FormLabel>
                                            <FormControl>
                                                <Input
                                                    type="number"
                                                    min="1"
                                                    value={(field.value as number | string | undefined) ?? 0}
                                                    onChange={(e) => field.onChange(parseInt(e.target.value) || 1)}
                                                    className="h-9 rounded-xl bg-card text-xs"
                                                />
                                            </FormControl>
                                            <FormDescription className="text-[11px] text-muted-foreground">
                                                Continuous span allowed before requiring administrative override.
                                            </FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            {/* Additional Operational Toggles */}
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                                <FormField
                                    control={form.control}
                                    name="restrictions.allowHalfDay"
                                    render={({ field }) => (
                                        <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card">
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-semibold text-foreground">
                                                    Allow Half Day Leaves
                                                </span>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Permit 0.5 day deduction for first/second half
                                                </p>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="restrictions.pendingLeaveReservesBalance"
                                    render={({ field }) => (
                                        <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card">
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-semibold text-foreground">
                                                    Reserve Pending Balance
                                                </span>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Lock quota while application awaits approval
                                                </p>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="restrictions.excludeSundays"
                                    render={({ field }) => (
                                        <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card">
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-semibold text-foreground">
                                                    Exclude Sundays by Default
                                                </span>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Do not deduct standalone Sundays
                                                </p>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="restrictions.excludeHolidays"
                                    render={({ field }) => (
                                        <div className="flex items-center justify-between p-3 rounded-xl border border-border/60 bg-card">
                                            <div className="space-y-0.5">
                                                <span className="text-xs font-semibold text-foreground">
                                                    Exclude Calendar Holidays
                                                </span>
                                                <p className="text-[11px] text-muted-foreground">
                                                    Do not deduct gazetted institutional holidays
                                                </p>
                                            </div>
                                            <FormControl>
                                                <Switch checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                        </div>
                                    )}
                                />
                            </div>
                        </section>

                        {/* ── AUDIT INFO (Update Mode Only) ── */}
                        {isEditMode && policyToEdit && (
                            <div className="rounded-xl bg-muted/40 p-3.5 border border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-muted-foreground">
                                <div className="flex items-center gap-1.5">
                                    <UserCheck className="h-4 w-4 text-primary" />
                                    <span>
                                        Created by{" "}
                                        <strong className="text-foreground">
                                            {policyToEdit.createdByName || policyToEdit.creator?.firstName || "Admin"}
                                        </strong>{" "}
                                        on {new Date(policyToEdit.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                {policyToEdit.updatedByName && (
                                    <div className="flex items-center gap-1.5">
                                        <Clock className="h-4 w-4 text-amber-500" />
                                        <span>
                                            Last revised by{" "}
                                            <strong className="text-foreground">{policyToEdit.updatedByName}</strong>
                                        </span>
                                    </div>
                                )}
                            </div>
                        )}
                    </form>
                </Form>

                {/* ── FOOTER (Sticky) ── */}
                <DialogFooter className="px-6 py-4 border-t border-border/60 bg-muted/20 shrink-0 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2">
                    <span className="text-[11px] text-muted-foreground hidden sm:inline">
                        All configuration modifications are versioned and audited on submission.
                    </span>

                    <div className="flex items-center justify-end gap-2.5 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl h-10 px-4 text-xs font-semibold flex-1 sm:flex-initial"
                            onClick={() => onOpenChange(false)}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>

                        {!isEditMode && (
                            <Button
                                type="button"
                                variant="secondary"
                                className="rounded-xl h-10 px-4 text-xs font-semibold flex-1 sm:flex-initial"
                                onClick={handleSaveAsDraft}
                                disabled={isSubmitting}
                            >
                                Save as Draft
                            </Button>
                        )}

                        <Button
                            type="submit"
                            form={formId}
                            className="rounded-xl h-10 px-5 text-xs font-bold shadow-sm flex-1 sm:flex-initial gap-2"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isEditMode ? "Update Policy" : "Create Policy"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
