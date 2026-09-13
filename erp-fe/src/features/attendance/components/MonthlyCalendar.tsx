import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight, CheckCircle, XCircle, Clock, UserMinus } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface MonthlyCalendarProps {
    studentId: string;
    attendanceRecords: any[]; // In a real app, this would be fetched from the backend based on studentId and month
}

export function MonthlyCalendar({ attendanceRecords = [] }: MonthlyCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const days = eachDayOfInterval({
        start: startOfMonth(currentMonth),
        end: endOfMonth(currentMonth)
    });

    const getStatusIcon = (date: Date) => {
        // Mock lookup
        const record = attendanceRecords.find(r => r.date === format(date, 'yyyy-MM-dd'));
        if (!record) return null;

        switch (record.status) {
            case 'PRESENT': return <CheckCircle className="h-4 w-4 text-emerald-500" />;
            case 'ABSENT': return <XCircle className="h-4 w-4 text-destructive" />;
            case 'LATE': return <Clock className="h-4 w-4 text-amber-500" />;
            case 'LEAVE': return <UserMinus className="h-4 w-4 text-blue-500" />;
            default: return null;
        }
    };

    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));

    return (
        <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-card p-4 sm:p-6">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-bold text-foreground">Attendance Calendar</h3>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="icon" onClick={prevMonth} className="h-8 w-8 rounded-lg">
                        <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <span className="font-semibold min-w-[120px] text-center">
                        {format(currentMonth, 'MMMM yyyy')}
                    </span>
                    <Button variant="outline" size="icon" onClick={nextMonth} className="h-8 w-8 rounded-lg">
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                    <div key={day} className="text-xs font-bold text-muted-foreground py-2 uppercase tracking-wider">
                        {day}
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {/* Padding for first day of month */}
                {Array.from({ length: startOfMonth(currentMonth).getDay() }).map((_, i) => (
                    <div key={`pad-${i}`} className="p-2 sm:p-4 rounded-xl bg-muted/5 opacity-50"></div>
                ))}

                {days.map(day => {
                    const isCurrentMonth = isSameMonth(day, currentMonth);
                    const isDayToday = isToday(day);
                    
                    return (
                        <div 
                            key={day.toISOString()} 
                            className={`
                                flex flex-col items-center justify-center p-2 sm:p-4 rounded-xl border transition-all
                                ${isDayToday ? 'border-primary/50 bg-primary/5 shadow-sm' : 'border-border/30 hover:border-border/60 hover:bg-muted/10'}
                                ${!isCurrentMonth && 'opacity-30'}
                            `}
                        >
                            <span className={`text-sm font-semibold mb-1 ${isDayToday ? 'text-primary' : 'text-foreground'}`}>
                                {format(day, 'd')}
                            </span>
                            <div className="h-5 flex items-center justify-center">
                                {getStatusIcon(day)}
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-6 flex flex-wrap gap-4 items-center justify-center text-xs font-medium text-muted-foreground border-t border-border/40 pt-4">
                <div className="flex items-center gap-1.5"><CheckCircle className="h-4 w-4 text-emerald-500" /> Present</div>
                <div className="flex items-center gap-1.5"><XCircle className="h-4 w-4 text-destructive" /> Absent</div>
                <div className="flex items-center gap-1.5"><Clock className="h-4 w-4 text-amber-500" /> Late</div>
                <div className="flex items-center gap-1.5"><UserMinus className="h-4 w-4 text-blue-500" /> Leave</div>
            </div>
        </Card>
    );
}
