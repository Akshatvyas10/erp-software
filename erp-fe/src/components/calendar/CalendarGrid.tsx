import { useState } from 'react';
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    endOfMonth,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    startOfWeek,
    endOfWeek,
    parseISO,
    startOfDay,
    endOfDay
} from 'date-fns';
import { ChevronLeft, ChevronRight, Plus, Calendar as CalendarIcon, ListOrdered } from 'lucide-react';
import { Button } from '../ui/button';
import { cn } from '../../lib/utils';
import type { CalendarEvent } from '../../hooks/useEvents';
import { Badge } from '../ui/badge';
import { usePermissions } from '../../store/hooks';
import { ResponsiveModal } from '../common/ResponsiveModal';

interface CalendarGridProps {
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onAddEventClick: () => void;
}

export function CalendarGrid({ events, onEventClick, onAddEventClick }: CalendarGridProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [mobileView, setMobileView] = useState<'calendar' | 'agenda'>('calendar');
    const [selectedDateEvents, setSelectedDateEvents] = useState<{ date: Date, events: CalendarEvent[] } | null>(null);
    const { can } = usePermissions();
    const canCreateEvent = can('events', 'create');

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
    const goToToday = () => {
        const today = new Date();
        setCurrentMonth(today);
        setSelectedDate(today);
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 });

    const dateFormat = "MMMM yyyy";
    const days = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    const shortWeekDays = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

    const getEventsForDay = (day: Date) => {
        return events.filter(event => {
            const eventStart = parseISO(event.start_date);
            const eventEnd = parseISO(event.end_date);
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

    const getDotColor = (type: CalendarEvent['type']) => {
        switch (type) {
            case 'HOLIDAY': return 'bg-emerald-500';
            case 'EXAM': return 'bg-destructive';
            case 'MILESTONE': return 'bg-amber-500';
            default: return 'bg-primary';
        }
    };

    const eventsForCurrentMonth = events.filter(e => {
        const d = parseISO(e.start_date);
        return d.getMonth() === currentMonth.getMonth() && d.getFullYear() === currentMonth.getFullYear();
    }).sort((a, b) => parseISO(a.start_date).getTime() - parseISO(b.start_date).getTime());

    const selectedDayEvents = getEventsForDay(selectedDate);

    return (
        <div className="flex flex-col h-full bg-card rounded-lg shadow-sm border border-border overflow-hidden">
            {/* Header Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 gap-3 border-b border-border bg-card">
                <div className="flex items-center justify-between sm:justify-start space-x-2 sm:space-x-4">
                    <h2 className="text-lg sm:text-2xl font-bold tracking-tight text-foreground">
                        {format(currentMonth, dateFormat)}
                    </h2>
                    <div className="flex items-center rounded-md border border-border overflow-hidden bg-muted/40">
                        <Button variant="ghost" size="icon" onClick={prevMonth} className="rounded-none h-8 w-8 hover:bg-muted" aria-label="Previous month">
                            <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={goToToday} className="rounded-none h-8 px-2.5 sm:px-3 text-xs sm:text-sm font-medium hover:bg-muted">
                            Today
                        </Button>
                        <Button variant="ghost" size="icon" onClick={nextMonth} className="rounded-none h-8 w-8 hover:bg-muted" aria-label="Next month">
                            <ChevronRight className="h-4 w-4" />
                        </Button>
                    </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end gap-2">
                    {/* Mobile View Toggle: Calendar Grid vs Agenda List */}
                    <div className="flex sm:hidden items-center p-0.5 rounded-lg border border-border bg-muted/40">
                        <button
                            type="button"
                            onClick={() => setMobileView('calendar')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                mobileView === 'calendar'
                                    ? "bg-background text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <CalendarIcon className="h-3.5 w-3.5" />
                            Month
                        </button>
                        <button
                            type="button"
                            onClick={() => setMobileView('agenda')}
                            className={cn(
                                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md transition-all",
                                mobileView === 'agenda'
                                    ? "bg-background text-foreground shadow-xs"
                                    : "text-muted-foreground hover:text-foreground"
                            )}
                        >
                            <ListOrdered className="h-3.5 w-3.5" />
                            Agenda
                        </button>
                    </div>

                    {canCreateEvent && (
                        <Button onClick={onAddEventClick} size="sm" className="h-8 sm:h-9 px-3 text-xs sm:text-sm">
                            <Plus className="mr-1.5 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Add Event
                        </Button>
                    )}
                </div>
            </div>

            {/* Mobile View: Interactive Calendar Grid + Day Details or Agenda View */}
            <div className="md:hidden flex flex-col flex-1 overflow-y-auto">
                {mobileView === 'calendar' ? (
                    <div className="flex flex-col p-3 space-y-4">
                        {/* Compact 7-day Month Grid */}
                        <div className="rounded-xl border border-border/80 bg-background/50 overflow-hidden shadow-xs p-2">
                            {/* Weekday headers */}
                            <div className="grid grid-cols-7 mb-1 text-center">
                                {shortWeekDays.map((day, idx) => (
                                    <div key={idx} className="py-1 text-[11px] font-semibold text-muted-foreground">
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Day Cells */}
                            <div className="grid grid-cols-7 gap-1">
                                {days.map((day) => {
                                    const dayEvents = getEventsForDay(day);
                                    const isCurrentMonth = isSameMonth(day, monthStart);
                                    const isSelected = isSameDay(day, selectedDate);
                                    const isCurrentDay = isToday(day);

                                    return (
                                        <button
                                            key={day.toISOString()}
                                            type="button"
                                            onClick={() => setSelectedDate(day)}
                                            className={cn(
                                                "relative flex flex-col items-center justify-center min-h-[46px] rounded-lg p-1 transition-all text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                                                !isCurrentMonth && "opacity-35 text-muted-foreground",
                                                isSelected
                                                    ? "bg-primary text-primary-foreground font-bold shadow-xs scale-102"
                                                    : isCurrentDay
                                                    ? "border border-primary/50 bg-primary/10 text-primary font-bold hover:bg-primary/15"
                                                    : "hover:bg-muted/60 text-foreground font-medium"
                                            )}
                                        >
                                            <span className="leading-none">{format(day, 'd')}</span>
                                            {/* Event indicator dots */}
                                            {dayEvents.length > 0 && (
                                                <div className="flex items-center justify-center gap-0.5 mt-1">
                                                    {dayEvents.slice(0, 3).map((ev, i) => (
                                                        <span
                                                            key={ev.id || i}
                                                            className={cn(
                                                                "h-1.5 w-1.5 rounded-full shrink-0",
                                                                isSelected ? "bg-primary-foreground" : getDotColor(ev.type)
                                                            )}
                                                        />
                                                    ))}
                                                    {dayEvents.length > 3 && (
                                                        <span className={cn("text-[8px] leading-none font-bold", isSelected ? "text-primary-foreground" : "text-muted-foreground")}>
                                                            +
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Selected Date Agenda Tray */}
                        <div className="flex flex-col space-y-2 pt-1">
                            <div className="flex items-center justify-between px-1">
                                <div>
                                    <h3 className="text-sm font-semibold text-foreground">
                                        {format(selectedDate, "EEEE, MMMM d")}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {selectedDayEvents.length} event{selectedDayEvents.length === 1 ? '' : 's'} on this day
                                    </p>
                                </div>
                                {canCreateEvent && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={onAddEventClick}
                                        className="h-7 text-xs px-2.5 rounded-lg"
                                    >
                                        <Plus className="mr-1 h-3 w-3" /> Event
                                    </Button>
                                )}
                            </div>

                            {selectedDayEvents.length === 0 ? (
                                <div className="text-center py-8 px-4 rounded-xl border border-dashed border-border bg-muted/20">
                                    <p className="text-xs text-muted-foreground font-medium">No events scheduled for this day</p>
                                </div>
                            ) : (
                                <div className="space-y-2">
                                    {selectedDayEvents.map(event => (
                                        <div
                                            key={event.id}
                                            onClick={() => onEventClick(event)}
                                            className="p-3 border border-border/80 bg-background rounded-xl shadow-xs active:bg-muted/50 cursor-pointer transition-colors"
                                        >
                                            <div className="flex justify-between items-start gap-2 mb-1">
                                                <h4 className="font-semibold text-sm text-foreground leading-snug">{event.title}</h4>
                                                <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", getEventColor(event.type))}>
                                                    {event.type}
                                                </Badge>
                                            </div>
                                            <p className="text-xs text-muted-foreground">
                                                {format(parseISO(event.start_date), "MMM d")} – {format(parseISO(event.end_date), "MMM d, yyyy")}
                                            </p>
                                            {event.location && (
                                                <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
                                                    📍 <span className="line-clamp-1">{event.location}</span>
                                                </p>
                                            )}
                                            {event.status === 'DRAFT' && (
                                                <span className="text-[10px] font-bold text-amber-500 mt-1 block">DRAFT</span>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    /* Agenda Mode: All events for the month in chronological list */
                    <div className="flex flex-col p-3 space-y-3">
                        <div className="px-1 text-xs font-semibold text-muted-foreground">
                            All events in {format(currentMonth, 'MMMM yyyy')} ({eventsForCurrentMonth.length})
                        </div>
                        {eventsForCurrentMonth.length === 0 ? (
                            <div className="text-center py-12 text-muted-foreground text-sm rounded-xl border border-dashed border-border">
                                No events this month
                            </div>
                        ) : (
                            eventsForCurrentMonth.map(event => (
                                <div
                                    key={event.id}
                                    onClick={() => onEventClick(event)}
                                    className="p-3 border border-border/80 bg-background rounded-xl shadow-xs active:bg-muted/50 cursor-pointer"
                                >
                                    <div className="flex justify-between items-start mb-1 gap-2">
                                        <h4 className="font-semibold text-sm text-foreground">{event.title}</h4>
                                        <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 shrink-0", getEventColor(event.type))}>
                                            {event.type}
                                        </Badge>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{format(parseISO(event.start_date), "MMM d, yyyy")}</p>
                                    {event.location && (
                                        <p className="text-xs text-muted-foreground/80 mt-1 flex items-center gap-1">
                                            📍 <span className="line-clamp-1">{event.location}</span>
                                        </p>
                                    )}
                                    {event.status === 'DRAFT' && <span className="text-[10px] font-bold text-amber-500 mt-1 block">DRAFT</span>}
                                </div>
                            ))
                        )}
                    </div>
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

            {/* Date Details Modal using ResponsiveModal */}
            <ResponsiveModal
                open={!!selectedDateEvents}
                onOpenChange={(open) => !open && setSelectedDateEvents(null)}
                title={selectedDateEvents?.date ? format(selectedDateEvents.date, "MMMM d, yyyy") : 'Events'}
                description={`${selectedDateEvents?.events.length || 0} event${selectedDateEvents?.events.length === 1 ? '' : 's'} scheduled`}
                maxWidth="sm:max-w-md"
            >
                <div className="flex-1 overflow-y-auto py-2 space-y-3">
                    {selectedDateEvents?.events.map(event => (
                        <div
                            key={event.id}
                            onClick={() => {
                                setSelectedDateEvents(null);
                                onEventClick(event);
                            }}
                            className="group relative flex flex-col p-3 sm:p-4 rounded-xl cursor-pointer border border-border bg-card hover:border-primary/40 hover:shadow-xs hover:bg-muted/30 transition-all duration-200"
                        >
                            <div className="flex justify-between items-start gap-3">
                                <div className="flex flex-col gap-1.5">
                                    <span className="font-semibold text-foreground text-sm sm:text-base leading-tight break-all pr-2 group-hover:text-primary transition-colors">
                                        {event.title}
                                    </span>
                                    {event.location && (
                                        <span className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                                            📍 <span className="line-clamp-1">{event.location}</span>
                                        </span>
                                    )}
                                </div>
                                <Badge variant="outline" className={cn("text-[10px] px-2 py-0.5 shrink-0 bg-background/50 whitespace-nowrap", getEventColor(event.type))}>
                                    {event.type}
                                </Badge>
                            </div>
                            {event.status === 'DRAFT' && (
                                <div className="mt-2">
                                    <Badge variant="secondary" className="text-[10px] uppercase font-bold tracking-wider text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 border-transparent">
                                        Draft
                                    </Badge>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </ResponsiveModal>
        </div>
    );
}
