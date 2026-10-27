import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import api from "@/lib/api";
import type { TeacherLeaveBalance } from "@/types/erp";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Loader2, Info } from "lucide-react";

const leaveSchema = z.object({
    leaveTypeId: z.string().min(1, "Please choose a leave category"),
    fromDate: z.string().min(1, "Start date is required"),
    toDate: z.string().min(1, "End date is required"),
    reason: z.string().min(5, "Please provide a reason of at least 5 characters"),
    attachmentUrl: z.string().optional(),
}).refine((data) => new Date(data.fromDate) <= new Date(data.toDate), {
    message: "From date cannot be later than to date",
    path: ["toDate"],
});

export type LeaveFormValues = z.infer<typeof leaveSchema>;

interface ApplyLeaveModalProps {
    balances: TeacherLeaveBalance[];
    onSubmit: (values: LeaveFormValues) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export function ApplyLeaveModal({
    balances,
    onSubmit,
    onCancel,
    isSubmitting,
}: ApplyLeaveModalProps) {
    const [calcDays, setCalcDays] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    const form = useForm<LeaveFormValues>({
        resolver: zodResolver(leaveSchema),
        defaultValues: {
            leaveTypeId: balances[0]?.leaveTypeId || "",
            fromDate: new Date().toISOString().slice(0, 10),
            toDate: new Date().toISOString().slice(0, 10),
            reason: "",
            attachmentUrl: "",
        },
    });

    const fromDate = form.watch("fromDate");
    const toDate = form.watch("toDate");

    // Auto preview days on change
    const checkDays = async (from: string, to: string) => {
        if (!from || !to || new Date(from) > new Date(to)) return;
        try {
            setIsCalculating(true);
            const res = await api.post("/teacher-leaves/calculate-days", { fromDate: from, toDate: to });
            setCalcDays(res.data.data.totalDays);
        } catch {
            // fallback calendar days calculation
            const diffTime = Math.abs(new Date(to).getTime() - new Date(from).getTime());
            setCalcDays(Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-card rounded-2xl overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-border/60 bg-muted/20 flex items-center justify-between">
                <div>
                    <h3 className="text-lg font-bold text-foreground">Apply for Leave</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Submit a formal leave request for academic scheduling and approval
                    </p>
                </div>
            </div>

            {/* Form */}
            <Form {...form}>
                <form
                    onSubmit={form.handleSubmit(onSubmit)}
                    className="p-5 space-y-4 flex-1 overflow-y-auto"
                >
                    {/* Category */}
                    <FormField
                        control={form.control}
                        name="leaveTypeId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-foreground">
                                    Leave Category *
                                </FormLabel>
                                <Select
                                    value={field.value}
                                    onValueChange={field.onChange}
                                >
                                    <FormControl>
                                        <SelectTrigger className="h-10 rounded-xl bg-muted/40 border-border/60">
                                            <SelectValue placeholder="Select Category" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {balances.map((b) => {
                                            const remaining = b.remainingDays !== undefined ? b.remainingDays : 0;
                                            return (
                                                <SelectItem key={b.leaveTypeId} value={b.leaveTypeId}>
                                                    {b.leaveType?.name || b.leaveTypeId} ({remaining} days available)
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />

                    {/* Date inputs */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="fromDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-foreground">
                                        From Date *
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            className="h-10 rounded-xl bg-muted/40 border-border/60"
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                checkDays(e.target.value, toDate);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="toDate"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-foreground">
                                        To Date *
                                    </FormLabel>
                                    <FormControl>
                                        <Input
                                            type="date"
                                            className="h-10 rounded-xl bg-muted/40 border-border/60"
                                            {...field}
                                            onChange={(e) => {
                                                field.onChange(e);
                                                checkDays(fromDate, e.target.value);
                                            }}
                                        />
                                    </FormControl>
                                    <FormMessage className="text-xs" />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Day Preview info badge */}
                    <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 text-primary font-medium">
                            <Info className="h-4 w-4" />
                            <span>Calculated working days:</span>
                        </div>
                        <span className="font-bold text-foreground">
                            {isCalculating ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                            ) : calcDays !== null ? (
                                `${calcDays} day(s)`
                            ) : (
                                "1 day"
                            )}
                        </span>
                    </div>

                    {/* Reason */}
                    <FormField
                        control={form.control}
                        name="reason"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-foreground">
                                    Reason for Leave *
                                </FormLabel>
                                <FormControl>
                                    <Textarea
                                        placeholder="State specific reason, handover details, or context..."
                                        className="rounded-xl bg-muted/40 border-border/60 min-h-[90px] resize-none text-sm"
                                        {...field}
                                    />
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />

                    {/* Actions */}
                    <div className="pt-3 border-t border-border/60 flex items-center justify-end gap-2.5">
                        <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl h-10 px-4"
                            onClick={onCancel}
                            disabled={isSubmitting}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="rounded-xl h-10 px-5 font-semibold"
                            disabled={isSubmitting}
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Submit Leave Application
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
    );
}
