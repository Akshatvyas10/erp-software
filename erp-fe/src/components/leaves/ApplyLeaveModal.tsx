import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { format, parseISO, isValid, isBefore, startOfDay, addDays } from "date-fns";
import api from "@/lib/api";
import type { TeacherLeaveBalance } from "@/types/erp";
import { Button } from "@/components/ui/button";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, Info, Calendar as CalendarIcon, CalendarDays, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type LeaveMode = "single" | "multiple";

const leaveSchema = z
    .object({
        mode: z.enum(["single", "multiple"]),
        leaveTypeId: z.string().min(1, "Please choose a leave category"),
        singleDate: z.string().optional(),
        fromDate: z.string().optional(),
        toDate: z.string().optional(),
        reason: z.string().min(5, "Please provide a reason of at least 5 characters"),
        attachmentUrl: z.string().optional(),
    })
    .superRefine((data, ctx) => {
        const today = startOfDay(new Date());

        if (data.mode === "single") {
            if (!data.singleDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Please select a leave date",
                    path: ["singleDate"],
                });
            } else {
                const parsed = parseISO(data.singleDate);
                if (!isValid(parsed)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Invalid date selected",
                        path: ["singleDate"],
                    });
                } else if (isBefore(startOfDay(parsed), today)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Leave date cannot be in the past",
                        path: ["singleDate"],
                    });
                }
            }
        } else {
            // Multiple days mode
            if (!data.fromDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "Start date is required",
                    path: ["fromDate"],
                });
            } else {
                const parsedFrom = parseISO(data.fromDate);
                if (!isValid(parsedFrom)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Invalid start date",
                        path: ["fromDate"],
                    });
                } else if (isBefore(startOfDay(parsedFrom), today)) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "Start date cannot be in the past",
                        path: ["fromDate"],
                    });
                }
            }

            if (!data.toDate) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    message: "End date is required",
                    path: ["toDate"],
                });
            } else if (data.fromDate) {
                const parsedFrom = parseISO(data.fromDate);
                const parsedTo = parseISO(data.toDate);
                if (isValid(parsedFrom) && isValid(parsedTo) && isBefore(startOfDay(parsedTo), startOfDay(parsedFrom))) {
                    ctx.addIssue({
                        code: z.ZodIssueCode.custom,
                        message: "End date cannot be earlier than start date",
                        path: ["toDate"],
                    });
                }
            }
        }
    });

export type LeaveFormInputValues = z.infer<typeof leaveSchema>;

export interface LeaveFormPayload {
    leaveTypeId: string;
    fromDate: string;
    toDate: string;
    reason: string;
    attachmentUrl?: string;
}

export type LeaveFormValues = LeaveFormPayload;

interface ApplyLeaveModalProps {
    balances: TeacherLeaveBalance[];
    onSubmit: (values: LeaveFormPayload) => void;
    onCancel: () => void;
    isSubmitting: boolean;
}

export function ApplyLeaveModal({
    balances,
    onSubmit,
    onCancel,
    isSubmitting,
}: ApplyLeaveModalProps) {
    interface CalcResult {
        totalDays: number;
        workingDays: number;
        sandwichedDays: number;
        sandwichDetails?: Array<{ date: string; reason: string }>;
        messages?: string[];
    }
    const [calcResult, setCalcResult] = useState<CalcResult | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // Popover open states for date pickers
    const [isSinglePickerOpen, setIsSinglePickerOpen] = useState(false);
    const [isFromPickerOpen, setIsFromPickerOpen] = useState(false);
    const [isToPickerOpen, setIsToPickerOpen] = useState(false);

    const defaultDateStr = format(new Date(), "yyyy-MM-dd");
    const tomorrowStr = format(addDays(new Date(), 1), "yyyy-MM-dd");

    const form = useForm<LeaveFormInputValues>({
        resolver: zodResolver(leaveSchema),
        defaultValues: {
            mode: "single",
            leaveTypeId: balances[0]?.leaveTypeId || "",
            singleDate: defaultDateStr,
            fromDate: defaultDateStr,
            toDate: tomorrowStr,
            reason: "",
            attachmentUrl: "",
        },
    });

    const mode = form.watch("mode");
    const singleDate = form.watch("singleDate");
    const fromDate = form.watch("fromDate");
    const toDate = form.watch("toDate");
    const selectedLeaveTypeId = form.watch("leaveTypeId");

    // Recalculate working days whenever date inputs change
    useEffect(() => {
        const from = mode === "single" ? singleDate : fromDate;
        const to = mode === "single" ? singleDate : toDate;

        if (!from || !to) {
            setCalcResult(null);
            return;
        }

        const parsedFrom = parseISO(from);
        const parsedTo = parseISO(to);

        if (!isValid(parsedFrom) || !isValid(parsedTo) || isBefore(startOfDay(parsedTo), startOfDay(parsedFrom))) {
            setCalcResult(null);
            return;
        }

        let isMounted = true;
        const checkDays = async () => {
            try {
                setIsCalculating(true);
                const res = await api.post("/teacher-leaves/calculate-days", {
                    fromDate: from,
                    toDate: to,
                    leaveTypeId: selectedLeaveTypeId,
                });
                if (isMounted) {
                    setCalcResult(res.data.data);
                }
            } catch {
                if (isMounted) {
                    // Fallback to calendar days difference
                    const diffTime = Math.abs(parsedTo.getTime() - parsedFrom.getTime());
                    const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
                    setCalcResult({
                        totalDays: days,
                        workingDays: days,
                        sandwichedDays: 0,
                    });
                }
            } finally {
                if (isMounted) {
                    setIsCalculating(false);
                }
            }
        };

        checkDays();

        return () => {
            isMounted = false;
        };
    }, [mode, singleDate, fromDate, toDate, selectedLeaveTypeId]);

    const handleFormSubmit = (values: LeaveFormInputValues) => {
        const payload: LeaveFormPayload = {
            leaveTypeId: values.leaveTypeId,
            fromDate: values.mode === "single" ? (values.singleDate || defaultDateStr) : (values.fromDate || defaultDateStr),
            toDate: values.mode === "single" ? (values.singleDate || defaultDateStr) : (values.toDate || defaultDateStr),
            reason: values.reason,
            attachmentUrl: values.attachmentUrl || undefined,
        };
        onSubmit(payload);
    };

    const todayDate = startOfDay(new Date());

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
                    onSubmit={form.handleSubmit(handleFormSubmit)}
                    className="p-5 space-y-4 flex-1 overflow-y-auto"
                >
                    {/* 1. Leave Category */}
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

                    {/* 2. Leave Mode Selection First (Single vs Multiple) */}
                    <FormField
                        control={form.control}
                        name="mode"
                        render={({ field }) => (
                            <FormItem className="space-y-2">
                                <FormLabel className="text-xs font-bold text-foreground">
                                    Leave Duration Mode *
                                </FormLabel>
                                <FormControl>
                                    <RadioGroup
                                        value={field.value}
                                        onValueChange={(val: LeaveMode) => {
                                            field.onChange(val);
                                            // Pre-fill or sync dates smoothly
                                            if (val === "single" && form.getValues("fromDate")) {
                                                form.setValue("singleDate", form.getValues("fromDate"), { shouldValidate: true });
                                            } else if (val === "multiple" && form.getValues("singleDate")) {
                                                const sDate = form.getValues("singleDate")!;
                                                form.setValue("fromDate", sDate, { shouldValidate: true });
                                                form.setValue("toDate", sDate, { shouldValidate: true });
                                            }
                                        }}
                                        className="grid grid-cols-2 gap-3"
                                    >
                                        <div>
                                            <RadioGroupItem
                                                value="single"
                                                id="mode-single"
                                                className="peer sr-only"
                                            />
                                            <Label
                                                htmlFor="mode-single"
                                                className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-3 hover:bg-accent/50 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                                            >
                                                <Clock className="mb-1.5 h-4 w-4 text-primary" />
                                                <span className="text-xs font-bold text-foreground">Single Day Leave</span>
                                                <span className="text-[10px] text-muted-foreground mt-0.5">1-day absence</span>
                                            </Label>
                                        </div>
                                        <div>
                                            <RadioGroupItem
                                                value="multiple"
                                                id="mode-multiple"
                                                className="peer sr-only"
                                            />
                                            <Label
                                                htmlFor="mode-multiple"
                                                className="flex flex-col items-center justify-between rounded-xl border-2 border-muted bg-popover p-3 hover:bg-accent/50 hover:text-accent-foreground peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 cursor-pointer transition-all"
                                            >
                                                <CalendarDays className="mb-1.5 h-4 w-4 text-primary" />
                                                <span className="text-xs font-bold text-foreground">Multiple Days Leave</span>
                                                <span className="text-[10px] text-muted-foreground mt-0.5">Date range</span>
                                            </Label>
                                        </div>
                                    </RadioGroup>
                                </FormControl>
                                <FormMessage className="text-xs" />
                            </FormItem>
                        )}
                    />

                    {/* 3. Date Selection based on chosen mode */}
                    {mode === "single" ? (
                        <FormField
                            control={form.control}
                            name="singleDate"
                            render={({ field }) => {
                                const selectedDateObj = field.value ? parseISO(field.value) : undefined;
                                const isDateValid = selectedDateObj && isValid(selectedDateObj);

                                return (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className="text-xs font-bold text-foreground">
                                            Leave Date *
                                        </FormLabel>
                                        <Popover open={isSinglePickerOpen} onOpenChange={setIsSinglePickerOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        type="button"
                                                        variant="outline"
                                                        className={cn(
                                                            "w-full h-10 px-3 justify-start text-left font-normal rounded-xl bg-muted/40 border-border/60 text-xs sm:text-sm",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
                                                        {isDateValid ? (
                                                            format(selectedDateObj, "PPP")
                                                        ) : (
                                                            <span>Pick leave date</span>
                                                        )}
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0 rounded-2xl border-border/60 shadow-xl" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={isDateValid ? selectedDateObj : undefined}
                                                    onSelect={(date) => {
                                                        if (date) {
                                                            field.onChange(format(date, "yyyy-MM-dd"));
                                                            setIsSinglePickerOpen(false);
                                                        }
                                                    }}
                                                    disabled={(date) => isBefore(startOfDay(date), todayDate)}
                                                    captionLayout="dropdown"
                                                    startMonth={new Date(new Date().getFullYear() - 1, 0)}
                                                    endMonth={new Date(new Date().getFullYear() + 2, 11)}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage className="text-xs" />
                                    </FormItem>
                                );
                            }}
                        />
                    ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {/* From Date */}
                            <FormField
                                control={form.control}
                                name="fromDate"
                                render={({ field }) => {
                                    const selectedDateObj = field.value ? parseISO(field.value) : undefined;
                                    const isDateValid = selectedDateObj && isValid(selectedDateObj);

                                    return (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-xs font-bold text-foreground">
                                                From Date *
                                            </FormLabel>
                                            <Popover open={isFromPickerOpen} onOpenChange={setIsFromPickerOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full h-10 px-3 justify-start text-left font-normal rounded-xl bg-muted/40 border-border/60 text-xs sm:text-sm",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
                                                            {isDateValid ? (
                                                                format(selectedDateObj, "PP")
                                                            ) : (
                                                                <span>Pick start date</span>
                                                            )}
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 rounded-2xl border-border/60 shadow-xl" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={isDateValid ? selectedDateObj : undefined}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                const formatted = format(date, "yyyy-MM-dd");
                                                                field.onChange(formatted);
                                                                // If toDate is before new fromDate, auto-adjust toDate
                                                                if (toDate && isBefore(parseISO(toDate), date)) {
                                                                    form.setValue("toDate", formatted, { shouldValidate: true });
                                                                }
                                                                setIsFromPickerOpen(false);
                                                            }
                                                        }}
                                                        disabled={(date) => isBefore(startOfDay(date), todayDate)}
                                                        captionLayout="dropdown"
                                                        startMonth={new Date(new Date().getFullYear() - 1, 0)}
                                                        endMonth={new Date(new Date().getFullYear() + 2, 11)}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    );
                                }}
                            />

                            {/* To Date */}
                            <FormField
                                control={form.control}
                                name="toDate"
                                render={({ field }) => {
                                    const selectedDateObj = field.value ? parseISO(field.value) : undefined;
                                    const isDateValid = selectedDateObj && isValid(selectedDateObj);
                                    const minToDate = fromDate && isValid(parseISO(fromDate)) ? startOfDay(parseISO(fromDate)) : todayDate;

                                    return (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className="text-xs font-bold text-foreground">
                                                To Date *
                                            </FormLabel>
                                            <Popover open={isToPickerOpen} onOpenChange={setIsToPickerOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn(
                                                                "w-full h-10 px-3 justify-start text-left font-normal rounded-xl bg-muted/40 border-border/60 text-xs sm:text-sm",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4 text-primary shrink-0" />
                                                            {isDateValid ? (
                                                                format(selectedDateObj, "PP")
                                                            ) : (
                                                                <span>Pick end date</span>
                                                            )}
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0 rounded-2xl border-border/60 shadow-xl" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={isDateValid ? selectedDateObj : undefined}
                                                        onSelect={(date) => {
                                                            if (date) {
                                                                field.onChange(format(date, "yyyy-MM-dd"));
                                                                setIsToPickerOpen(false);
                                                            }
                                                        }}
                                                        disabled={(date) => isBefore(startOfDay(date), minToDate)}
                                                        captionLayout="dropdown"
                                                        startMonth={new Date(new Date().getFullYear() - 1, 0)}
                                                        endMonth={new Date(new Date().getFullYear() + 2, 11)}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    );
                                }}
                            />
                        </div>
                    )}

                    {/* Calculated Days Preview & Sandwich Breakdown */}
                    <div className="space-y-2">
                        <div className="p-3 rounded-xl border border-primary/20 bg-primary/5 flex items-center justify-between text-xs">
                            <div className="flex items-center gap-1.5 text-primary font-medium">
                                <Info className="h-4 w-4" />
                                <span>
                                    {mode === "single" ? "Leave duration:" : "Calculated chargeable days:"}
                                </span>
                            </div>
                            <span className="font-bold text-foreground">
                                {isCalculating ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                ) : calcResult !== null ? (
                                    `${calcResult.totalDays} day(s)`
                                ) : (
                                    mode === "single" ? "1 day" : "—"
                                )}
                            </span>
                        </div>

                        {/* Sandwich Rule Alert if holidays/weekends are enveloped */}
                        {calcResult && calcResult.sandwichedDays > 0 && (
                            <div className="p-3 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-1">
                                <div className="flex items-center justify-between font-bold text-amber-700 dark:text-amber-400">
                                    <span>🥪 Sandwich Policy Triggered</span>
                                    <span>+{calcResult.sandwichedDays} Sandwiched day(s)</span>
                                </div>
                                <p className="text-[11px] text-muted-foreground">
                                    Enclosed weekend/holiday days ({calcResult.sandwichDetails?.map((s) => s.date).join(', ')}) are treated as leave days as per institutional policy.
                                </p>
                            </div>
                        )}

                        {/* Policy Messages (e.g. advance leave warning) */}
                        {calcResult?.messages && calcResult.messages.length > 0 && (
                            <div className="space-y-1">
                                {calcResult.messages.map((msg, i) => (
                                    <div key={i} className="text-[11px] text-blue-600 dark:text-blue-400 flex items-center gap-1.5 px-2">
                                        <Info className="h-3 w-3 shrink-0" />
                                        <span>{msg}</span>
                                    </div>
                                ))}
                            </div>
                        )}
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
