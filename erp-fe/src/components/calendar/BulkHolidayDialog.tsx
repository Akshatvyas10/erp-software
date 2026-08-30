import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { CalendarIcon, Loader2 } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '../ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '../ui/form';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { toast } from 'sonner';
import { useBulkGenerateHolidays } from '../../hooks/useEvents';

const formSchema = z.object({
    sessionStartDate: z.date({ message: "Start date is required." }),
    sessionEndDate: z.date({ message: "End date is required." }),
    saturdayRule: z.enum(['NONE', 'ALL', 'SECOND_FOURTH', 'HALF_DAY']).default('NONE'),
    sundayRule: z.enum(['NONE', 'ALL']).default('ALL'),
}).refine(data => data.sessionStartDate < data.sessionEndDate, {
    message: "End date must be after start date",
    path: ["sessionEndDate"]
});

type FormValues = z.input<typeof formSchema>;

interface BulkHolidayDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function BulkHolidayDialog({ open, onOpenChange }: BulkHolidayDialogProps) {
    const [isStartDateOpen, setIsStartDateOpen] = useState(false);
    const [isEndDateOpen, setIsEndDateOpen] = useState(false);

    const { mutate: generateHolidays, isPending } = useBulkGenerateHolidays();

    const getStoredValues = () => {
        try {
            const stored = localStorage.getItem('calendarSessionSetup');
            return stored ? JSON.parse(stored) : null;
        } catch {
            return null;
        }
    };

    const storedVals = getStoredValues();

    const form = useForm<FormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            saturdayRule: storedVals?.saturdayRule || 'NONE',
            sundayRule: storedVals?.sundayRule || 'ALL',
            // @ts-ignore
            sessionStartDate: storedVals?.sessionStartDate ? new Date(storedVals.sessionStartDate) : undefined,
            // @ts-ignore
            sessionEndDate: storedVals?.sessionEndDate ? new Date(storedVals.sessionEndDate) : undefined,
        },
    });

    useEffect(() => {
        if (open) {
            const stored = getStoredValues();
            form.reset({
                saturdayRule: stored?.saturdayRule || 'NONE',
                sundayRule: stored?.sundayRule || 'ALL',
                // @ts-ignore
                sessionStartDate: stored?.sessionStartDate ? new Date(stored.sessionStartDate) : undefined,
                // @ts-ignore
                sessionEndDate: stored?.sessionEndDate ? new Date(stored.sessionEndDate) : undefined,
            });
        }
    }, [open, form]);

    const onSubmit = (data: FormValues) => {
        generateHolidays(
            {
                sessionStartDate: data.sessionStartDate.toISOString(),
                sessionEndDate: data.sessionEndDate.toISOString(),
                saturdayRule: data.saturdayRule,
                sundayRule: data.sundayRule,
            },
            {
                onSuccess: (res) => {
                    localStorage.setItem('calendarSessionSetup', JSON.stringify(data));
                    toast.success(res.message || 'Holidays generated successfully');
                    onOpenChange(false);
                },
                onError: (err: any) => {
                    toast.error(err.response?.data?.message || 'Failed to generate holidays');
                },
            }
        );
    };

    const labelCls = "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-foreground";
    const inputCls = "flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50";

    return (
        <Dialog open={open} onOpenChange={(isOpen) => {
            onOpenChange(isOpen);
            if (!isOpen) form.reset();
        }}>
            <DialogContent className="sm:max-w-[425px] w-[95vw]">
                <DialogHeader>
                    <DialogTitle>Auto-Generate Holidays</DialogTitle>
                    <DialogDescription>
                        Set your academic session dates. Days outside this period will be marked as Summer Vacation.
                        Weekend rules will auto-generate holidays within the session.
                    </DialogDescription>
                </DialogHeader>

                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField control={form.control} name="sessionStartDate" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className={labelCls} style={{ marginBottom: '6px' }}>Session Start</FormLabel>
                                    <Popover modal={true} open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    type="button"
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full h-9 pl-3 text-left font-normal border-none bg-zinc-100 dark:bg-zinc-900/50 focus-visible:ring-1 focus-visible:ring-ring",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={(date) => {
                                                    field.onChange(date);
                                                    setIsStartDateOpen(false);
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />

                            <FormField control={form.control} name="sessionEndDate" render={({ field }) => (
                                <FormItem className="flex flex-col">
                                    <FormLabel className={labelCls} style={{ marginBottom: '6px' }}>Session End</FormLabel>
                                    <Popover modal={true} open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                                        <PopoverTrigger asChild>
                                            <FormControl>
                                                <Button
                                                    type="button"
                                                    variant={"outline"}
                                                    className={cn(
                                                        "w-full h-9 pl-3 text-left font-normal border-none bg-zinc-100 dark:bg-zinc-900/50 focus-visible:ring-1 focus-visible:ring-ring",
                                                        !field.value && "text-muted-foreground"
                                                    )}
                                                >
                                                    {field.value ? format(field.value, "PPP") : <span>Pick a date</span>}
                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                </Button>
                                            </FormControl>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0" align="start">
                                            <Calendar
                                                mode="single"
                                                selected={field.value}
                                                onSelect={(date) => {
                                                    field.onChange(date);
                                                    setIsEndDateOpen(false);
                                                }}
                                            />
                                        </PopoverContent>
                                    </Popover>
                                    <FormMessage />
                                </FormItem>
                            )} />
                        </div>

                        <FormField control={form.control} name="sundayRule" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelCls}>Sundays</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className={cn(inputCls, "bg-zinc-100 dark:bg-zinc-900/50 border-none")}>
                                            <SelectValue placeholder="Select Sunday rule" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="ALL">All Sundays are holidays</SelectItem>
                                        <SelectItem value="NONE">No Sunday holidays</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <FormField control={form.control} name="saturdayRule" render={({ field }) => (
                            <FormItem>
                                <FormLabel className={labelCls}>Saturdays</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                        <SelectTrigger className={cn(inputCls, "bg-zinc-100 dark:bg-zinc-900/50 border-none")}>
                                            <SelectValue placeholder="Select Saturday rule" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="NONE">No Saturday holidays</SelectItem>
                                        <SelectItem value="ALL">All Saturdays are holidays</SelectItem>
                                        <SelectItem value="SECOND_FOURTH">2nd and 4th Saturday</SelectItem>
                                        <SelectItem value="HALF_DAY">Half-day on all Saturdays</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />

                        <div className="pt-4 flex justify-end space-x-2">
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                Generate Holidays
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
