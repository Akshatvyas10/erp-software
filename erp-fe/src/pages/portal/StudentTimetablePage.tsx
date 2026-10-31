import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock } from "lucide-react";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export default function StudentTimetablePage() {
    const { data } = useQuery({
        queryKey: ["portal", "student", "timetable"],
        queryFn: async () => {
            const res = await api.get("/portal/student/timetable");
            return res.data.data;
        },
    });

    const slots = data?.timetable || [];

    // Group by day of week
    const slotsByDay: Record<string, any[]> = {};
    DAYS_OF_WEEK.forEach((d) => {
        slotsByDay[d] = slots.filter((s: any) => s.dayOfWeek === d);
    });

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                        Class Timetable
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Weekly subject period schedule and assigned teachers.
                    </p>
                </div>
                <Badge variant="outline" className="self-start sm:self-auto font-bold text-xs bg-card border-border">
                    Academic Year 2026–2027
                </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {DAYS_OF_WEEK.map((day) => {
                    const daySlots = slotsByDay[day] || [];
                    return (
                        <Card key={day} className="rounded-2xl border-border/80 bg-card overflow-hidden">
                            <CardHeader className="p-4 bg-muted/30 border-b border-border/60">
                                <div className="flex items-center justify-between">
                                    <CardTitle className="text-sm font-bold text-foreground">{day}</CardTitle>
                                    <span className="text-[11px] font-semibold text-muted-foreground">
                                        {daySlots.length} period(s)
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="p-3 space-y-2.5">
                                {daySlots.map((slot: any) => {
                                    const sub = slot.classroomSubject?.subject;
                                    const teacher = slot.classroomSubject?.teacher?.account;
                                    return (
                                        <div
                                            key={slot.id}
                                            className="p-3 rounded-xl border border-border/60 bg-muted/20 space-y-1.5"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-bold text-foreground">
                                                    {sub?.name || "Subject"}
                                                </span>
                                                <Badge
                                                    variant="secondary"
                                                    className="text-[10px] font-mono px-1.5 py-0 bg-primary/10 text-primary"
                                                >
                                                    {sub?.code || "SUB"}
                                                </Badge>
                                            </div>

                                            <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                                                <span className="flex items-center gap-1 font-medium">
                                                    <Clock className="h-3 w-3" />
                                                    {slot.startTime?.slice(0, 5)} - {slot.endTime?.slice(0, 5)}
                                                </span>
                                                <span>
                                                    {teacher ? `${teacher.firstName} ${teacher.lastName}` : "Faculty"}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })}

                                {daySlots.length === 0 && (
                                    <p className="text-xs text-muted-foreground text-center py-6 italic">
                                        No scheduled classes
                                    </p>
                                )}
                            </CardContent>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
