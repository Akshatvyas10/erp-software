import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

export default function StudentAttendancePage() {
    const { data } = useQuery({
        queryKey: ["portal", "student", "attendance"],
        queryFn: async () => {
            const res = await api.get("/portal/student/attendance");
            return res.data.data;
        },
    });

    const records = data?.records || [];
    const stats = data?.stats;

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                    Attendance History
                </h1>
                <p className="text-xs text-muted-foreground">
                    Review your presence records, attendance percentage, and absences.
                </p>
            </div>

            {/* Attendance Analytics Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <Card className="rounded-2xl border-border/80 bg-card p-4">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Overall Presence</p>
                    <p className="text-2xl font-extrabold text-emerald-600 mt-1">
                        {stats?.attendancePercentage ?? 100}%
                    </p>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card p-4">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Total Working Days</p>
                    <p className="text-2xl font-extrabold text-foreground mt-1">
                        {stats?.totalDays || 0}
                    </p>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card p-4">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Days Present</p>
                    <p className="text-2xl font-extrabold text-blue-600 mt-1">
                        {stats?.presentDays || 0}
                    </p>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card p-4">
                    <p className="text-[10px] font-bold uppercase text-muted-foreground">Days Absent</p>
                    <p className="text-2xl font-extrabold text-rose-600 mt-1">
                        {stats?.absentDays || 0}
                    </p>
                </Card>
            </div>

            {/* Daily Log Table */}
            <Card className="rounded-2xl border-border/80 bg-card overflow-hidden">
                <CardHeader className="p-4 border-b border-border/60 bg-muted/20">
                    <CardTitle className="text-sm font-bold text-foreground">Recent Daily Records</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        Past attendance marked by your class teacher.
                    </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="divide-y divide-border/60">
                        {records.map((rec: any) => {
                            const isPresent = ["PRESENT", "present"].includes(rec.status);
                            const isLate = ["LATE", "late"].includes(rec.status);
                            return (
                                <div key={rec.id} className="p-3.5 flex items-center justify-between hover:bg-muted/30 transition-colors">
                                    <div className="space-y-0.5">
                                        <p className="text-xs font-bold text-foreground">{rec.date}</p>
                                        <p className="text-[11px] text-muted-foreground">
                                            {rec.remarks || (isPresent ? "Normal presence logged" : "Reported absent")}
                                        </p>
                                    </div>

                                    {isPresent && (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-xs font-bold">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Present
                                        </Badge>
                                    )}

                                    {isLate && (
                                        <Badge className="bg-amber-500/10 text-amber-600 border-amber-500/20 text-xs font-bold">
                                            <Clock className="h-3 w-3 mr-1" /> Late
                                        </Badge>
                                    )}

                                    {!isPresent && !isLate && (
                                        <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-xs font-bold">
                                            <XCircle className="h-3 w-3 mr-1" /> Absent
                                        </Badge>
                                    )}
                                </div>
                            );
                        })}

                        {records.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-10">
                                No attendance records marked yet.
                            </p>
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
