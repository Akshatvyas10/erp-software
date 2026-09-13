import { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isToday,
    startOfWeek,
    endOfWeek,
    parseISO,
    startOfDay,
    endOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { CalendarEvent } from '../../hooks/useEvents';
import { Badge } from '../ui/badge';
import { usePermissions } from '../../store/hooks';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '../ui/dialog';

interface CalendarGridProps {
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onAddEventClick: () => void;
}

export function CalendarGrid({ events, onEventClick, onAddEventClick }: CalendarGridProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDateEvents, setSelectedDateEvents] = useState<{ date: Date, events: CalendarEvent[] } | null>(null);
    const { can } = usePermissions();
    const canCreateEvent = can('events', 'create');

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => setCurrentMonth(new Date());

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "MMMM yyyy";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const getEventsForDay = (day: Date) => {
        return events.filter(event => {
            const eventStart = parseISO(event.start_date);
            const eventEnd = parseISO(event.end_date);
            // Simple check: if day is between start and end date
            return day >= startOfDay(eventStart) && day <= endOfDay(eventEnd);
        });
    };

    const getEventColor = (type: CalendarEvent['type']) => {
        switch (type) {
            case 'HOLIDAY': return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
            case 'EXAM': return 'bg-destructive/10 text-destructive border-destructive/20';
            case 'MILESTONE': return 'bg-accent/50 text-accent-foreground border-accent';
            default: return 'bg-primary/10 text-primary border-primary/20';
        }
    };

    const eventsForCurrentMonth = events.filter(e => {
        const d = parseISO(e.start_date);
        return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    }).sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime());

    return (
        <div className="flex flex-col h-full bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
                <div className="flex items-center space-x-4">
                    <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                        {format(currentMonth, dateFormat)}
                    </h2>
                    <div className="flex items-center rounded-md border border-border overflow-hidden">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-none h-8 w-8">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={goToToday} className="rounded-none h-8 px-3 font-medium">
                            Today
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-none h-8 w-8">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                {canCreateEvent && (
                    <Button onClick={onAddEventClick} size="sm" className="hidden sm:flex">
                        <Plus className="mr-2 h-4 w-4" /> Add Event
                    </Button>
                )}
            </div>

            {/* Mobile View: Agenda List (Stack) */}
            <div className="md:hidden flex flex-col p-4 space-y-4 overflow-y-auto">
                {canCreateEvent && (
                    <Button onClick={onAddEventClick} size="sm" className="w-full mb-2">
                        <Plus className="mr-2 h-4 w-4" /> Add Event
                    </Button>
                )}
                {eventsForCurrentMonth.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground text-sm">No events this month</div>
                ) : (
                    eventsForCurrentMonth.map(event => (
                            <div
                                key={event.id}
                                onClick={() => onEventClick(event)}
                                className="p-3 border border-border rounded-md shadow-sm active:bg-muted/50 cursor-pointer"
                            >
                                <div className="flex justify-between items-start mb-1">
                                    <h4 className="font-semibold text-sm">{event.title}</h4>
                                    <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", getEventColor(event.type))}>
                                        {event.type}
                                    </Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">{format(parseISO(event.start_date), "MMM d, yyyy")}</p>
                                {event.status === 'DRAFT' && <span className="text-[10px] font-bold text-amber-500 mt-1 block">DRAFT</span>}
                            </div>
                        ))
                )}
            </div>

            {/* Desktop View: Grid */}
            <div className="hidden md:flex flex-col flex-grow">
                <div className="grid grid-cols-7 border-b border-border bg-muted/30">
                    {weekDays.map(day => (
                        <div key={day} className="py-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            {day}
                        </div>
                    ))}
                </div>
                <div className="grid grid-cols-7 flex-grow auto-rows-fr">
                    {days.map((day, dayIdx) => {
                        const dayEvents = getEventsForDay(day);
                        return (
                            <div
                                key={day.toString()}
                                className={cn(
                                    "min-h-[100px] p-1.5 border-b border-r border-border transition-colors hover:bg-muted/10",
                                    !isSameMonth(day, monthStart) && "bg-muted/30 opacity-50",
                                    (dayIdx + 1) % 7 === 0 && "border-r-0"
                                )}
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className={cn(
                                        "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                                        isToday(day) ? "bg-primary text-primary-foreground" : "text-foreground"
                                    )}>
                                        {format(day, 'd')}
                                    </span>
                                    {dayEvents.length > 2 && (
                                        <div
                                            className="text-[10px] px-1.5 py-0.5 rounded-sm cursor-pointer font-medium text-muted-foreground hover:bg-muted text-center transition-colors"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDateEvents({ date: day, events: dayEvents });
                                            }}
                                        >
                                            +{dayEvents.length - 2} more
                                        </div>
                                    )}
                                </div>
                                <div className="space-y-1 overflow-y-auto max-h-[100px] scrollbar-hide">
                                    {dayEvents.slice(0, 2).map(event => (
                                        <div
                                            key={event.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onEventClick(event);
                                            }}
                                            className={cn(
                                                "text-[10px] px-1.5 py-1 rounded-sm cursor-pointer font-medium border leading-tight line-clamp-2 break-all",
                                                getEventColor(event.type)
                                            )}
                                        >
                                            {event.title}
                                            {event.status === 'DRAFT' && ' (Draft)'}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            <Dialog open={!!selectedDateEvents} onOpenChange={(open) => !open && setSelectedDateEvents(null)}>
                <DialogContent className="sm:max-w-md w-[95vw] p-4 sm:p-6 overflow-hidden flex flex-col max-h-[90vh]">
                    <DialogHeader className="pb-2 border-b border-border shrink-0">
                        <DialogTitle className="text-xl sm:text-2xl font-bold tracking-tight text-foreground">
                            {selectedDateEvents?.date ? format(selectedDateEvents.date, "MMMM d, yyyy") : 'Events'}
                        </DialogTitle>
                        <p className="text-sm text-muted-foreground mt-1.5">
                            {selectedDateEvents?.events.length} event{selectedDateEvents?.events.length === 1 ? '' : 's'} scheduled. Click any card to view details.
                        </p>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto py-4 space-y-3 pr-2 scrollbar-thin scrollbar-thumb-muted">
                        {selectedDateEvents?.events.map(event => (
                            <div
                                key={event.id}
                                onClick={() => {
                                    setSelectedDateEvents(null);
                                    onEventClick(event);
                                }}
                                className="group relative flex flex-col p-3 sm:p-4 rounded-xl cursor-pointer border border-border bg-card hover:border-primary/40 hover:shadow-sm hover:bg-muted/30 transition-all duration-200"
                            >
                                <div className="flex justify-between items-start gap-3">
                                    <div className="flex flex-col gap-1.5">
                                        <span className="font-semibold text-foreground text-sm sm:text-base leading-tight break-all pr-2 group-hover:text-primary transition-colors">
                                            {event.title}
                                        </span>
                                        {event.location && (
                                            <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="opacity-70 shrink-0"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>
                                                <span className="line-clamp-1">{event.location}</span>
                                            </span>
                                        )}
                                    </div>
                                    <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 shrink-0 bg-background/50 whitespace-nowrap", getEventColor(event.type))}>
                                        {event.type}
                                    </Badge>
                                </div>
                                {event.status === 'DRAFT' && (
                                    <div className="mt-3">
                                        <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border-transparent">
                                            Draft
                                        </Badge>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
