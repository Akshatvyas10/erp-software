import { useState, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
    School, ArrowLeft, Users, LayoutGrid, BookOpen, ClipboardCheck, FileText
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useAuth, usePermissions } from "@/store/hooks";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClassroomDetailsSkeleton } from "@/components/common/skeletons/ClassroomDetailsSkeleton";
import AccessDenied from "@/components/auth/AccessDenied";
import HomeworkTab from "@/components/classrooms/HomeworkTab";
import GradebookTab from "@/components/classrooms/GradebookTab";

import { fetchClassroom } from "@/features/classrooms/api/classroomApi";
import {
    ClassroomOverviewTab,
    ClassroomStudentsTab,
    ClassroomTimetableTab,
    ClassroomAttendanceTab,
} from "@/features/classrooms/components/tabs";
import type { ClassroomEnrollment, ClassroomSubject, Subject } from "@/types/erp";

type ActiveTab = "roster" | "timetable" | "attendance" | "homework" | "gradebook";

export default function ClassroomDetails() {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const qc = useQueryClient();
    const { can } = usePermissions();
    const { user } = useAuth();
    const [activeTab, setActiveTab] = useState<ActiveTab>("roster");

    const {
        data: classroom,
        isLoading,
        refetch,
    } = useQuery({
        queryKey: ["classroom", id],
        queryFn: () => fetchClassroom(id!),
        enabled: !!id && can("classrooms", "read"),
        staleTime: 30_000,
    });

    const subjects = (classroom?.subjects ?? []) as ClassroomSubject[];

    const teacherSubjectsMap = useMemo(() => {
        const map = new Map<string, { teacher: NonNullable<ClassroomSubject["teacher"]>; subjects: Subject[] }>();
        subjects.forEach(sub => {
            if (!sub.teacher) return;
            if (!map.has(sub.teacher.id)) {
                map.set(sub.teacher.id, { teacher: sub.teacher, subjects: [] });
            }
            if (sub.subject && !map.get(sub.teacher.id)!.subjects.find(s => s.id === sub.subject!.id)) {
                map.get(sub.teacher.id)!.subjects.push(sub.subject);
            }
        });
        return Array.from(map.values());
    }, [subjects]);

    const refresh = () => {
        qc.invalidateQueries({ queryKey: ["classroom", id] });
        refetch();
    };

    if (!can("classrooms", "read")) return <AccessDenied />;

    if (isLoading) {
        return <ClassroomDetailsSkeleton />;
    }

    if (!classroom) {
        return (
            <div className="flex flex-col items-center justify-center py-20 gap-3 text-muted-foreground">
                <School className="h-10 w-10 text-primary/40" />
                <p className="font-bold text-sm text-foreground">Classroom not found</p>
                <Button variant="ghost" size="sm" onClick={() => navigate("/dashboard/classrooms")}
                    className="gap-2 text-primary hover:bg-primary/10 hover:text-primary transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                    <ArrowLeft className="h-4 w-4" /> Back to Classrooms
                </Button>
            </div>
        );
    }

    const isClassTeacher = user?.teacherId === classroom.classTeacherId;
    const canEdit = can("classrooms", "update") || isClassTeacher;
    const enrollments = (classroom.enrollments ?? []) as ClassroomEnrollment[];
    const tabs: { key: ActiveTab; label: string; icon: React.ElementType; count?: number }[] = [
        { key: "roster", label: "Roster", icon: Users, count: enrollments.length },
        { key: "timetable", label: "Timetable Builder", icon: LayoutGrid, count: subjects.length },
        { key: "homework", label: "Homework", icon: FileText },
    ];

    if (can("exams", "read") || isClassTeacher) {
        tabs.push({ key: "gradebook", label: "Gradebook", icon: BookOpen });
    }

    if (can("attendance", "read") || isClassTeacher) {
        tabs.push({ key: "attendance", label: "Attendance", icon: ClipboardCheck });
    }

    return (
        <motion.div
            className="mx-auto text-foreground transition-colors duration-200 space-y-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            {/* Header & Classroom Details */}
            <div className="pt-4 pb-2 px-1 -mx-1 border-b border-border/60">
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
                    <div>
                        <h1 className="text-2xl font-black text-foreground tracking-tight flex items-center gap-3">
                            {classroom.name}
                            <Badge variant="secondary" className="bg-primary/10 text-primary hover:bg-primary/20">
                                {classroom.section}
                            </Badge>
                        </h1>
                        <p className="text-sm text-muted-foreground mt-1.5 font-medium max-w-xl">
                            Manage classroom details, enrolled students, and schedule.
                        </p>
                    </div>
                </div>

                {/* Teachers Section Overview */}
                <div className="mt-6">
                    <ClassroomOverviewTab classroom={classroom} teacherSubjectsMap={teacherSubjectsMap} />
                </div>

                {/* Custom Tabs Navigation */}
                <div className="flex items-center gap-2 mt-6 overflow-x-auto custom-scrollbar pb-px">
                    {tabs.map(tab => {
                        const isActive = activeTab === tab.key;
                        const Icon = tab.icon;
                        return (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2.5 text-sm font-bold rounded-t-xl transition-all relative -mb-px",
                                    isActive
                                        ? "bg-muted border-b-2 border-primary text-primary"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
                                )}
                            >
                                <Icon className="h-4 w-4 shrink-0" />
                                {tab.label}
                                {tab.count !== undefined && (
                                    <span className={cn(
                                        "ml-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                        isActive
                                            ? "bg-primary/10 text-primary"
                                            : "bg-muted text-muted-foreground"
                                    )}>
                                        {tab.count}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Tab content */}
            <Card className="border border-border shadow-sm rounded-2xl bg-card overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-border/60 bg-muted/20">
                    <CardTitle className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-2">
                        {activeTab === "roster" ? (
                            <><Users className="h-4 w-4 text-primary" /> Student Roster</>
                        ) : activeTab === "timetable" ? (
                            <><LayoutGrid className="h-4 w-4 text-primary" /> Weekly Timetable</>
                        ) : activeTab === "homework" ? (
                            <><FileText className="h-4 w-4 text-primary" /> Homework & Assignments</>
                        ) : activeTab === "gradebook" ? (
                            <><BookOpen className="h-4 w-4 text-primary" /> Examination Gradebook</>
                        ) : (
                            <><ClipboardCheck className="h-4 w-4 text-primary" /> Daily Attendance</>
                        )}
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-5 md:p-6">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, x: activeTab === "roster" ? -10 : 10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.18 }}
                        >
                            {activeTab === "roster" ? (
                                <ClassroomStudentsTab
                                    classroomId={classroom.id}
                                    enrollments={enrollments}
                                    canEdit={canEdit}
                                    onRefresh={refresh}
                                    monitorMaleId={classroom.monitorMaleId || undefined}
                                    monitorFemaleId={classroom.monitorFemaleId || undefined}
                                />
                            ) : activeTab === "timetable" ? (
                                <ClassroomTimetableTab
                                    classroomId={classroom.id}
                                    subjects={subjects}
                                    periods={classroom.periods ?? []}
                                    canEdit={canEdit}
                                    onRefresh={refresh}
                                />
                            ) : activeTab === "homework" ? (
                                <HomeworkTab 
                                    classroomId={classroom.id} 
                                    classTeacherId={classroom.classTeacherId || undefined} 
                                    subjects={subjects} 
                                />
                            ) : activeTab === "gradebook" ? (
                                <GradebookTab 
                                    classroomId={classroom.id} 
                                    enrollments={enrollments} 
                                    subjects={subjects} 
                                    canEdit={can("exams", "manage") || isClassTeacher}
                                    classTeacherId={classroom.classTeacherId || undefined}
                                />
                            ) : (
                                <ClassroomAttendanceTab 
                                    classroomId={classroom.id} 
                                    canEdit={can("attendance", "update") || can("attendance", "create") || isClassTeacher} 
                                />
                            )}
                        </motion.div>
                    </AnimatePresence>
                </CardContent>
            </Card>
        </motion.div>
    );
}
