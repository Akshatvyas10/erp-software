import { useState } from 'react';
import { CalendarGrid } from '../../components/calendar/CalendarGrid';
import { EventFormDialog } from '../../components/calendar/EventFormDialog';
import { useEvents, useCreateEvent, useUpdateEvent, type CalendarEvent } from '../../hooks/useEvents';
import { toast } from 'sonner';
import { BulkHolidayDialog } from '../../components/calendar/BulkHolidayDialog';
import { usePermissions } from '../../store/hooks';
import { Button } from '../../components/ui/button';
import { CalendarDays } from 'lucide-react';
import { CalendarSkeleton } from '@/components/common/skeletons/CalendarSkeleton';

export default function CalendarPage() {
    const { data: events, isLoading, isError } = useEvents();
    const createEvent = useCreateEvent();
    const updateEvent = useUpdateEvent();

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [isBulkHolidayOpen, setIsBulkHolidayOpen] = useState(false);
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const { can } = usePermissions();
    const canManageEvents = can('events', 'manage');

    const handleAddClick = () => {
        setSelectedEvent(null);
        setIsFormOpen(true);
    };

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
        setIsFormOpen(true);
    };

    const handleFormSubmit = (data: Partial<CalendarEvent>) => {
        if (selectedEvent) {
            updateEvent.mutate(
                { id: selectedEvent.id, data },
                {
                    onSuccess: () => toast.success('Event updated successfully'),
                    onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to update event'),
                }
            );
        } else {
            createEvent.mutate(data, {
                onSuccess: () => toast.success('Event created successfully'),
                onError: (err: any) => toast.error(err.response?.data?.message || 'Failed to create event'),
            });
        }
    };

    if (isLoading) return <div className="p-4 sm:p-6 md:p-8"><CalendarSkeleton /></div>;
    if (isError) return <div className="p-8 text-destructive">Failed to load calendar events.</div>;

    return (
        <div className="h-full flex flex-col p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 md:gap-6">
                <div>
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground">Academic Calendar</h1>
                    <p className="text-xs sm:text-sm text-muted-foreground mt-1">
                        Manage institutional events, exams, holidays, and milestones.
                    </p>
                </div>
                {canManageEvents && (
                    <Button variant="outline" className="w-full sm:w-auto transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" onClick={() => setIsBulkHolidayOpen(true)}>
                        <CalendarDays className="mr-2 h-4 w-4" />
                        Session Setup
                    </Button>
                )}
            </div>

            <div className="flex-grow min-h-[600px] bg-background rounded-lg border border-border overflow-hidden">
                <CalendarGrid
                    events={events || []}
                    onEventClick={handleEventClick}
                    onAddEventClick={handleAddClick}
                />
            </div>

            <EventFormDialog
                open={isFormOpen}
                onOpenChange={setIsFormOpen}
                event={selectedEvent}
                onSubmit={handleFormSubmit}
            />

            <BulkHolidayDialog 
                open={isBulkHolidayOpen} 
                onOpenChange={setIsBulkHolidayOpen} 
            />
        </div>
    );
}
