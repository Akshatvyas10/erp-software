import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
    School, Calendar, BookOpen, Clock,
    UserCheck, DoorOpen, CheckCircle2
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import type { Classroom, DayOfWeek } from "@/types/erp";
import api from "@/lib/api";
import { format } from "date-fns";

interface StudentClassroomPortalViewProps {
    classroomId: string;
}

const DAYS: DayOfWeek[] = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

export function StudentClassroomPortalView({ classroomId }: StudentClassroomPortalViewProps) {
    const todayDayName = format(new Date(), "EEEE") as DayOfWeek;
    const [selectedDay, setSelectedDay] = useState<DayOfWeek>(
        DAYS.includes(todayDayName) ? todayDayName : "Monday"
    );

    // Fetch Classroom details
    const { data: classroom, isLoading } = useQuery({
        queryKey: ["classroomPortal", classroomId],
        queryFn: async () => {
            const { data } = await api.get(`/classrooms/${classroomId}`);
            return data.data.classroom as Classroom;
        },
        enabled: !!classroomId,
    });

    // Fetch Homework assigned to this classroom
    const { data: homeworks = [], isLoading: hwLoading } = useQuery({
        queryKey: ["classroomHomeworks", classroomId],
        queryFn: async () => {
            const { data } = await api.get(`/homeworks?classroomId=${classroomId}&status=PUBLISHED`);
            return data.data.homeworks || [];
        },
        enabled: !!classroomId,
    });

    if (isLoading) {
        return (
            <div className="space-y-4 max-w-4xl mx-auto py-6">
                <Skeleton className="h-32 w-full rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Skeleton className="h-64 rounded-2xl" />
                    <Skeleton className="h-64 rounded-2xl" />
                </div>
            </div>
        );
    }

    if (!classroom) {
        return (
            <div className="py-16 text-center text-muted-foreground">
                <School className="w-12 h-12 mx-auto text-primary/40 mb-3" />
                <h3 className="font-bold text-foreground text-base">Classroom details unavailable</h3>
                <p className="text-xs mt-1">Please contact your school administrator or class teacher.</p>
            </div>
        );
    }

    // Filter today's timetable slots
    const todaySlots = (classroom.subjects || [])
        .flatMap(s => (s as any).schedule || [])
        .filter((slot: any) => slot.dayOfWeek === selectedDay)
        .sort((a: any, b: any) => (a.startTime > b.startTime ? 1 : -1));

    return (
        <div className="space-y-6 max-w-4xl mx-auto py-2">
            {/* Hero Class Banner */}
            <div className="relative overflow-hidden rounded-3xl bg-linear-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-6 sm:p-8 shadow-xs">
                <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="flex items-center gap-2">
                            <Badge className="bg-primary text-primary-foreground text-xs font-bold px-2.5 py-0.5 rounded-lg">
                                Section {classroom.section}
                            </Badge>
                            <span className="text-xs font-semibold text-muted-foreground">
                                Session {classroom.academicYear}
                            </span>
                        </div>
                        <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">
                            {classroom.name}
                        </h1>
                        <p className="text-xs sm:text-sm text-muted-foreground font-medium">
                            Your official academic classroom workspace and daily schedule.
                        </p>
                    </div>

                    {/* Room & Teacher Badges */}
                    <div className="flex sm:flex-col gap-2 shrink-0">
                        {classroom.classTeacher?.account && (
                            <div className="flex items-center gap-2 bg-background/80 backdrop-blur-xs py-2 px-3 rounded-xl border border-border/60 text-xs font-semibold text-foreground">
                                <UserCheck className="w-4 h-4 text-primary shrink-0" />
                                <div>
                                    <p className="text-[10px] text-muted-foreground font-bold uppercase">Class Teacher</p>
                                    <p className="truncate font-bold">
                                        {classroom.classTeacher.account.firstName} {classroom.classTeacher.account.lastName}
                                    </p>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 bg-background/80 backdrop-blur-xs py-2 px-3 rounded-xl border border-border/60 text-xs font-semibold text-foreground">
                            <DoorOpen className="w-4 h-4 text-primary shrink-0" />
                            <div>
                                <p className="text-[10px] text-muted-foreground font-bold uppercase">Room</p>
                                <p className="truncate font-bold">
                                    {classroom.roomNumber ? `Room ${classroom.roomNumber}` : "Main Hall"}
                                    {classroom.buildingBlock ? ` (${classroom.buildingBlock})` : ""}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Interactive Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* 1. Schedule & Timetable Card */}
                <Card className="rounded-2xl border-border/60 shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Calendar className="w-4 h-4 text-primary" />
                                <CardTitle className="text-base font-bold">Class Timetable</CardTitle>
                            </div>
                            <span className="text-xs font-bold text-primary">{selectedDay}</span>
                        </div>
                        <CardDescription className="text-xs">
                            Select day to review scheduled periods & teachers.
                        </CardDescription>

                        {/* Day Selector Pills */}
                        <div className="flex items-center gap-1 mt-2 overflow-x-auto pb-1">
                            {DAYS.map(day => (
                                <button
                                    key={day}
                                    type="button"
                                    onClick={() => setSelectedDay(day)}
                                    className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-all shrink-0 ${
                                        selectedDay === day
                                            ? "bg-primary text-primary-foreground shadow-xs"
                                            : "bg-muted/40 text-muted-foreground hover:bg-muted"
                                    }`}
                                >
                                    {day.slice(0, 3)}
                                </button>
                            ))}
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-2.5">
                        {todaySlots.length === 0 ? (
                            <div className="py-10 text-center text-muted-foreground border border-dashed rounded-xl">
                                <Clock className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                                <p className="text-xs font-bold">No periods scheduled for {selectedDay}</p>
                            </div>
                        ) : (
                            todaySlots.map((slot: any, idx: number) => (
                                <div
                                    key={slot.id || idx}
                                    className="p-3 rounded-xl border border-border/50 bg-muted/20 flex items-center justify-between gap-3 text-xs"
                                >
                                    <div className="flex items-center gap-2.5">
                                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-black text-xs flex items-center justify-center">
                                            {idx + 1}
                                        </div>
                                        <div>
                                            <p className="font-bold text-foreground">
                                                {slot.subject?.name || slot.classroomSubject?.subject?.name || "Subject"}
                                            </p>
                                            <p className="text-[11px] text-muted-foreground">
                                                {slot.teacher?.account?.firstName
                                                    ? `${slot.teacher.account.firstName} ${slot.teacher.account.lastName}`
                                                    : "Assigned Faculty"}
                                            </p>
                                        </div>
                                    </div>
                                    <Badge variant="outline" className="font-semibold text-[11px] bg-background">
                                        {slot.startTime} - {slot.endTime}
                                    </Badge>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>

                {/* 2. Active Homework & Assignments Card */}
                <Card className="rounded-2xl border-border/60 shadow-xs">
                    <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <BookOpen className="w-4 h-4 text-primary" />
                                <CardTitle className="text-base font-bold">Active Homework</CardTitle>
                            </div>
                            <Badge variant="secondary" className="text-xs font-bold">
                                {homeworks.length} Due
                            </Badge>
                        </div>
                        <CardDescription className="text-xs">
                            Tasks assigned by your classroom subject teachers.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-2.5">
                        {hwLoading ? (
                            <div className="space-y-2">
                                <Skeleton className="h-12 rounded-xl" />
                                <Skeleton className="h-12 rounded-xl" />
                            </div>
                        ) : homeworks.length === 0 ? (
                            <div className="py-10 text-center text-muted-foreground border border-dashed rounded-xl">
                                <CheckCircle2 className="w-6 h-6 mx-auto mb-1.5 text-emerald-500 opacity-60" />
                                <p className="text-xs font-bold text-foreground">All caught up!</p>
                                <p className="text-[11px]">No pending homework for your section right now.</p>
                            </div>
                        ) : (
                            homeworks.slice(0, 5).map((hw: any) => (
                                <div
                                    key={hw.id}
                                    className="p-3 rounded-xl border border-border/50 bg-muted/20 flex items-start justify-between gap-3 text-xs"
                                >
                                    <div className="space-y-1">
                                        <Badge variant="outline" className="text-[10px] py-0 px-1.5 font-bold bg-background text-primary border-primary/30">
                                            {hw.subject?.name || "General"}
                                        </Badge>
                                        <h4 className="font-bold text-foreground line-clamp-1">{hw.title}</h4>
                                        <p className="text-[11px] text-muted-foreground line-clamp-1">{hw.description}</p>
                                    </div>
                                    <div className="text-right shrink-0">
                                        <span className="text-[10px] text-muted-foreground font-semibold block">Due Date</span>
                                        <span className="font-bold text-foreground text-[11px]">
                                            {hw.dueDate ? format(new Date(hw.dueDate), "MMM dd") : "Open"}
                                        </span>
                                    </div>
                                </div>
                            ))
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
