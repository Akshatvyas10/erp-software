import { useState, useMemo } from "react";
import { format } from "date-fns";
import { ClipboardCheck, CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { usePermissions } from "@/store/hooks";

import { Button } from "@/components/ui/button";
import {
    Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";

import { AttendanceGrid } from "@/features/attendance/components/AttendanceGrid";
import { AttendanceChart } from "@/features/attendance/components/AttendanceChart";
import { useClassroomAttendance } from "@/features/attendance/api/useAttendance";

export interface ClassroomAttendanceTabProps {
    classroomId: string;
    canEdit: boolean;
}

export function ClassroomAttendanceTab({ classroomId }: ClassroomAttendanceTabProps) {
    const { can } = usePermissions();
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
    const [isEditing, setIsEditing] = useState(false);
    const dateStr = format(selectedDate, 'yyyy-MM-dd');

    const { data: existingAttendance, isLoading: attendanceLoading, refetch } = useClassroomAttendance(classroomId, dateStr);

    // Auto-switch mode based on whether attendance exists for the selected date
    useMemo(() => {
        if (existingAttendance) {
            setIsEditing(existingAttendance.length === 0);
        }
    }, [dateStr, existingAttendance]);

    const hasAttendance = existingAttendance && existingAttendance.length > 0;

    return (
        <div className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between bg-card p-4 rounded-xl border border-border/50 shadow-sm">
                <div>
                    <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                        <ClipboardCheck className="h-4 w-4 text-primary" />
                        Daily Attendance
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">Manage student attendance for the selected date.</p>
                </div>
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {hasAttendance && !isEditing && can("attendance", "update") && (
                        <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => setIsEditing(true)}
                            className="rounded-xl font-bold border-primary/20 text-primary hover:bg-primary/10 h-10"
                        >
                            Edit Attendance
                        </Button>
                    )}
                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider hidden sm:block">Date</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full sm:w-[200px] justify-start text-left font-normal rounded-xl h-10 border-border/60",
                                    !selectedDate && "text-muted-foreground"
                                )}
                            >
                                <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
                                {selectedDate ? format(selectedDate, "PPP") : <span>Pick a date</span>}
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0 rounded-2xl border-border/60 shadow-xl" align="end">
                            <Calendar
                                mode="single"
                                selected={selectedDate}
                                onSelect={(date) => {
                                    if (date) {
                                        setSelectedDate(date);
                                    }
                                }}
                                disabled={(date) => date > new Date()}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
            </div>
            
            {!isEditing && hasAttendance ? (
                <AttendanceChart attendance={existingAttendance} />
            ) : (
                <AttendanceGrid 
                    classroomId={classroomId} 
                    date={dateStr} 
                    canEdit={hasAttendance ? can("attendance", "update") : can("attendance", "create")} 
                    existingAttendance={existingAttendance || []}
                    attendanceLoading={attendanceLoading}
                    onSaveSuccess={() => {
                        refetch();
                        setIsEditing(false);
                    }}
                />
            )}
        </div>
    );
}

export default ClassroomAttendanceTab;
