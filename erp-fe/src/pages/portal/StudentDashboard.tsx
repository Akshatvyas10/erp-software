import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
    GraduationCap,
    CalendarCheck,
    BookOpen,
    Award,
    Calendar,
    ArrowUpRight,
} from "lucide-react";
import { Link } from "react-router-dom";

export default function StudentDashboard() {
    const { data: profileData } = useQuery({
        queryKey: ["portal", "student", "me"],
        queryFn: async () => {
            const res = await api.get("/portal/student/me");
            return res.data.data;
        },
    });

    const { data: attendanceData } = useQuery({
        queryKey: ["portal", "student", "attendance"],
        queryFn: async () => {
            const res = await api.get("/portal/student/attendance");
            return res.data.data;
        },
    });

    const { data: homeworkData } = useQuery({
        queryKey: ["portal", "student", "homework"],
        queryFn: async () => {
            const res = await api.get("/portal/student/homework");
            return res.data.data;
        },
    });

    const student = profileData?.student;
    const classroom = profileData?.classroom;
    const stats = attendanceData?.stats;
    const homeworks = homeworkData?.homeworks || [];

    const pendingHomeworks = homeworks.filter((hw: any) => !hw.submissions || hw.submissions.length === 0);

    return (
        <div className="space-y-6">
            {/* Hero Welcome Banner */}
            <div className="rounded-3xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 p-6 md:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 font-bold text-[11px]">
                            Student Portal
                        </Badge>
                        <span className="text-xs text-muted-foreground font-medium">Academic Year 2026–2027</span>
                    </div>
                    <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-foreground">
                        Welcome back, {student?.account?.firstName || "Student"}! 👋
                    </h1>
                    <p className="text-xs md:text-sm text-muted-foreground">
                        Enrolled in <span className="font-semibold text-foreground">{classroom?.name || "Classroom"} - Section {classroom?.section || "A"}</span> • Class Teacher: <span className="font-medium text-foreground">{classroom?.classTeacher?.account ? `${classroom.classTeacher.account.firstName} ${classroom.classTeacher.account.lastName}` : "Faculty"}</span>
                    </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                    <div className="p-3 bg-card rounded-2xl border border-border shadow-xs text-center min-w-[90px]">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Roll No</p>
                        <p className="text-xl font-extrabold text-primary">{profileData?.enrollment?.rollNumber || student?.rollNumber || "—"}</p>
                    </div>
                    <div className="p-3 bg-card rounded-2xl border border-border shadow-xs text-center min-w-[90px]">
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Attendance</p>
                        <p className="text-xl font-extrabold text-emerald-600">{stats?.attendancePercentage ?? 100}%</p>
                    </div>
                </div>
            </div>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-border/80 bg-card hover:shadow-xs transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600">
                            <CalendarCheck className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase text-muted-foreground">Presence</p>
                            <p className="text-lg font-bold text-foreground">
                                {stats?.presentDays || 0} <span className="text-xs font-normal text-muted-foreground">/ {stats?.totalDays || 0} Days</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card hover:shadow-xs transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600">
                            <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase text-muted-foreground">Pending Tasks</p>
                            <p className="text-lg font-bold text-foreground">
                                {pendingHomeworks.length} <span className="text-xs font-normal text-muted-foreground">assignments</span>
                            </p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card hover:shadow-xs transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
                            <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase text-muted-foreground">Admission No</p>
                            <p className="text-lg font-bold text-foreground">{student?.admissionNumber || "ADM-2026"}</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card hover:shadow-xs transition-shadow">
                    <CardContent className="p-4 flex items-center gap-3.5">
                        <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
                            <Award className="h-5 w-5" />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold uppercase text-muted-foreground">Status</p>
                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold text-[10px]">
                                Active Enrolled
                            </Badge>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Quick Action Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Recent Homework Preview */}
                <Card className="rounded-2xl border-border/80 bg-card p-5 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <BookOpen className="h-4 w-4 text-primary" />
                            <h3 className="font-bold text-sm text-foreground">Active Homework</h3>
                        </div>
                        <Link to="/portal/homework" className="text-xs font-bold text-primary flex items-center gap-1 hover:underline">
                            View All <ArrowUpRight className="h-3 w-3" />
                        </Link>
                    </div>

                    <div className="space-y-2.5">
                        {homeworks.slice(0, 3).map((hw: any) => (
                            <div key={hw.id} className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold text-foreground">{hw.title}</p>
                                    <p className="text-[11px] text-muted-foreground">{hw.subject?.name || "Subject"} • Due {hw.dueDate}</p>
                                </div>
                                {hw.submissions && hw.submissions.length > 0 ? (
                                    <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]">
                                        Submitted
                                    </Badge>
                                ) : (
                                    <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px]">
                                        Pending
                                    </Badge>
                                )}
                            </div>
                        ))}
                        {homeworks.length === 0 && (
                            <p className="text-xs text-muted-foreground py-4 text-center">No homework assigned currently 🎉</p>
                        )}
                    </div>
                </Card>

                {/* Quick Navigation Cards */}
                <Card className="rounded-2xl border-border/80 bg-card p-5 space-y-4">
                    <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-primary" />
                        <h3 className="font-bold text-sm text-foreground">Student Shortcuts</h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <Link
                            to="/portal/timetable"
                            className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between gap-3"
                        >
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="text-xs font-bold text-foreground">My Timetable</p>
                                <p className="text-[10px] text-muted-foreground">Daily period roster</p>
                            </div>
                        </Link>

                        <Link
                            to="/portal/attendance"
                            className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between gap-3"
                        >
                            <CalendarCheck className="h-5 w-5 text-emerald-600" />
                            <div>
                                <p className="text-xs font-bold text-foreground">Attendance</p>
                                <p className="text-[10px] text-muted-foreground">Presence breakdown</p>
                            </div>
                        </Link>

                        <Link
                            to="/portal/report-cards"
                            className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between gap-3"
                        >
                            <Award className="h-5 w-5 text-purple-600" />
                            <div>
                                <p className="text-xs font-bold text-foreground">Report Cards</p>
                                <p className="text-[10px] text-muted-foreground">Terminal exam marks</p>
                            </div>
                        </Link>

                        <Link
                            to="/portal/homework"
                            className="p-3.5 rounded-xl border border-border/60 bg-muted/20 hover:bg-muted/40 transition-colors flex flex-col justify-between gap-3"
                        >
                            <BookOpen className="h-5 w-5 text-amber-600" />
                            <div>
                                <p className="text-xs font-bold text-foreground">Homework Hub</p>
                                <p className="text-[10px] text-muted-foreground">Submit assignments</p>
                            </div>
                        </Link>
                    </div>
                </Card>
            </div>
        </div>
    );
}
