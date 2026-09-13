import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { Calendar } from '../ui/calendar';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from '../ui/form';
import { Input } from '../ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import type { CalendarEvent } from '../../hooks/useEvents';
import { usePermissions } from '../../store/hooks';
import { useClassrooms } from '../../hooks/useClassrooms';

const baseSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(150),
    type: z.string().min(1, "Event type is required"),
    startDate: z.date({ message: "A start date is required." }),
    endDate: z.date({ message: "An end date is required." }),
    dayType: z.enum(['FULL_DAY', 'HALF_DAY', 'HOLIDAY', 'SPECIAL']),
    location: z.string().max(255).optional(),
    description: z.string().optional(),
    status: z.enum(['DRAFT', 'PUBLISHED', 'CANCELLED']),
    targetAudience: z.enum(['ALL', 'STAFF', 'STUDENTS', 'CLASS']),
    targetClassId: z.string().uuid().optional(),
});

const formSchema = baseSchema.refine(data => data.startDate <= data.endDate, {
    message: "End date must be after or same as start date",
    path: ["endDate"]
});

type EventFormValues = z.infer<typeof baseSchema>;

interface EventFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    event?: CalendarEvent | null;
    onSubmit: (data: Partial<CalendarEvent>) => void;
}

export function EventFormDialog({ open, onOpenChange, event, onSubmit }: EventFormDialogProps) {
    const { can } = usePermissions();
    const canManageEvents = can('events', 'manage');
    const { data: classrooms } = useClassrooms();
    const [isStartDateOpen, setIsStartDateOpen] = useState(false);
    const [isEndDateOpen, setIsEndDateOpen] = useState(false);

    // Fetch dynamic event types
    const { data: eventTypesData } = useQuery({
        queryKey: ['eventTypes'],
        queryFn: async () => {
            const { default: api } = await import('../../lib/api');
            const { data } = await api.get('/events/types');
            return data.data; // Array of EventType objects
        }
    });
    const eventTypes = eventTypesData || [];

    const form = useForm<EventFormValues>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            title: '',
            type: 'EVENT',
            startDate: new Date(),
            endDate: new Date(),
            dayType: 'FULL_DAY',
            location: '',
            description: '',
            status: 'DRAFT',
            targetAudience: !canManageEvents ? 'CLASS' : 'ALL',
            targetClassId: undefined,
        },
    });

    useEffect(() => {
        if (event && open) {
            form.reset({
                title: event.title,
                type: event.type,
                startDate: new Date(event.start_date),
                endDate: new Date(event.end_date),
                dayType: event.day_type || 'FULL_DAY',
                location: event.location || '',
                description: event.description || '',
                status: event.status,
                targetAudience: event.target_audience,
                targetClassId: event.target_class_id || undefined,
            });
        } else if (open) {
            form.reset({
                title: '',
                type: 'EVENT',
                startDate: new Date(),
                endDate: new Date(),
                dayType: 'FULL_DAY',
                location: '',
                description: '',
                status: 'DRAFT',
                targetAudience: !canManageEvents ? 'CLASS' : 'ALL',
                targetClassId: undefined,
            });
        }
    }, [event, open, form, canManageEvents]);

    const targetAudience = form.watch("targetAudience");

    const handleSubmit = (values: EventFormValues) => {
        // Enforce teacher constraints dynamically before submit
        let finalStatus = values.status;
        let finalAudience = values.targetAudience;
        
        if (!canManageEvents) {
            finalStatus = 'DRAFT';
            finalAudience = 'CLASS';
        }

        onSubmit({
            title: values.title,
            type: values.type as CalendarEvent['type'],
            start_date: values.startDate.toISOString(),
            end_date: values.endDate.toISOString(),
            day_type: values.dayType,
            location: values.location,
            description: values.description,
            status: finalStatus,
            target_audience: finalAudience,
            target_class_id: values.targetClassId || undefined,
        });
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-xl mx-auto max-h-[90vh] overflow-y-auto p-4 sm:p-6">
                <DialogHeader>
                    <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">{event ? 'Edit Event' : 'Create Event'}</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6 sm:space-y-8">
                        {/* BASIC INFORMATION */}
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-lg sm:text-xl font-semibold text-foreground border-b border-border pb-2">Basic Information</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                                <FormField
                                    control={form.control}
                                    name="title"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Event Title</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Enter event name" {...field} />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="type"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel>Event Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl>
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Select type" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {eventTypes.map((t: any) => (
                                                        <SelectItem key={t.id} value={t.code}>{t.name}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* DATE & TIME */}
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-lg sm:text-xl font-semibold text-foreground border-b border-border pb-2">Date & Time</h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                                <FormField
                                    control={form.control}
                                    name="startDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>Start Date</FormLabel>
                                            <Popover modal={true} open={isStartDateOpen} onOpenChange={setIsStartDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full h-10 pl-3 text-left font-normal border border-input bg-background hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors duration-200",
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
                                    )}
                                />
                                <FormField
                                    control={form.control}
                                    name="endDate"
                                    render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel>End Date</FormLabel>
                                            <Popover modal={true} open={isEndDateOpen} onOpenChange={setIsEndDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full h-10 pl-3 text-left font-normal border border-input bg-background hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors duration-200",
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
                                                        disabled={(date) => date < form.getValues('startDate')}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>

                        {/* DAY TYPE */}
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-lg sm:text-xl font-semibold text-foreground border-b border-border pb-2">Day Type</h3>
                            <FormField
                                control={form.control}
                                name="dayType"
                                render={({ field }) => (
                                    <FormItem className="space-y-3">
                                        <FormLabel>Select how the school operates on this date</FormLabel>
                                        <FormControl>
                                            <RadioGroup
                                                onValueChange={field.onChange}
                                                defaultValue={field.value}
                                                className="flex flex-col sm:flex-row flex-wrap gap-4 sm:gap-6"
                                            >
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="FULL_DAY" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal cursor-pointer text-sm">
                                                        Full Working Day
                                                    </FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="HALF_DAY" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal cursor-pointer text-sm">
                                                        Half Day
                                                    </FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="HOLIDAY" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal cursor-pointer text-sm">
                                                        Full Holiday
                                                    </FormLabel>
                                                </FormItem>
                                                <FormItem className="flex items-center space-x-2 space-y-0">
                                                    <FormControl>
                                                        <RadioGroupItem value="SPECIAL" />
                                                    </FormControl>
                                                    <FormLabel className="font-normal cursor-pointer text-sm">
                                                        Special Activity
                                                    </FormLabel>
                                                </FormItem>
                                            </RadioGroup>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>

                        {/* ADDITIONAL INFORMATION */}
                        <div className="space-y-3 sm:space-y-4">
                            <h3 className="text-lg sm:text-xl font-semibold text-foreground border-b border-border pb-2">Additional Information</h3>
                            
                            <FormField
                                control={form.control}
                                name="location"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Location</FormLabel>
                                        <FormControl>
                                            <Input placeholder="Where the event will take place" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Description</FormLabel>
                                        <FormControl>
                                            <Textarea
                                                placeholder="Optional details about the event"
                                                className="resize-none min-h-[100px]"
                                                {...field}
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                                {canManageEvents && (
                                    <FormField
                                        control={form.control}
                                        name="targetAudience"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Target Audience</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select audience" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="ALL">All School</SelectItem>
                                                        <SelectItem value="STAFF">Staff Only</SelectItem>
                                                        <SelectItem value="STUDENTS">Students Only</SelectItem>
                                                        <SelectItem value="CLASS">Specific Class</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {(targetAudience === 'CLASS' || !canManageEvents) && (
                                    <FormField
                                        control={form.control}
                                        name="targetClassId"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Select Class</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value || ""}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select a class" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        {classrooms?.map((c) => (
                                                            <SelectItem key={c.id} value={c.id}>
                                                                {c.name} - {c.section} ({c.academicYear})
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}

                                {canManageEvents && (
                                    <FormField
                                        control={form.control}
                                        name="status"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel>Status</FormLabel>
                                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                    <FormControl>
                                                        <SelectTrigger>
                                                            <SelectValue placeholder="Select status" />
                                                        </SelectTrigger>
                                                    </FormControl>
                                                    <SelectContent>
                                                        <SelectItem value="DRAFT">Draft</SelectItem>
                                                        <SelectItem value="PUBLISHED">Published</SelectItem>
                                                        <SelectItem value="CANCELLED">Cancelled</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <FormMessage />
                                            </FormItem>
                                        )}
                                    />
                                )}
                            </div>
                        </div>

                        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 sm:space-x-2 pt-4 sm:pt-6 border-t border-border mt-6">
                            <Button type="button" variant="outline" className="w-full sm:w-auto transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" onClick={() => onOpenChange(false)}>
                                Cancel
                            </Button>
                            <Button type="submit" className="w-full sm:w-auto transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                {event ? 'Save Changes' : 'Create Event'}
                            </Button>
                        </div>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
