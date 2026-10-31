import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Award, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function StudentReportCardPage() {
    const { data } = useQuery({
        queryKey: ["portal", "student", "exam-results"],
        queryFn: async () => {
            const res = await api.get("/portal/student/exam-results");
            return res.data.data;
        },
    });

    const schedules = data?.schedules || [];

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                        Report Cards & Exam Results
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Official terminal examination scorecards published by academic faculty.
                    </p>
                </div>
                {schedules.length > 0 && (
                    <Button onClick={handlePrint} variant="outline" className="h-9 gap-2 font-semibold">
                        <Printer className="h-4 w-4" />
                        Print Official Report Card
                    </Button>
                )}
            </div>

            <style>{`
                @media print {
                    body {
                        background: #ffffff !important;
                        color: #000000 !important;
                    }
                    .print\\:hidden {
                        display: none !important;
                    }
                    nav, aside, header, footer {
                        display: none !important;
                    }
                    .card-report {
                        border: 2px solid #000000 !important;
                        box-shadow: none !important;
                        page-break-after: always;
                    }
                }
            `}</style>

            <div className="space-y-6">
                {schedules.map((sched: any) => {
                    const exams = sched.exams || [];
                    let totalMax = 0;
                    let totalObtained = 0;

                    exams.forEach((ex: any) => {
                        totalMax += Number(ex.maxMarks || 0);
                        const result = ex.results?.[0];
                        if (result?.marksObtained !== undefined && result?.marksObtained !== null) {
                            totalObtained += Number(result.marksObtained);
                        }
                    });

                    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(1) : "—";

                    return (
                        <Card key={sched.id} className="rounded-2xl border-border/80 bg-card overflow-hidden">
                            <CardHeader className="p-5 bg-muted/20 border-b border-border/60">
                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-[10px] font-bold bg-primary/10 text-primary border-primary/20">
                                                {sched.type || "TERMINAL"}
                                            </Badge>
                                            <CardTitle className="text-base font-bold text-foreground">
                                                {sched.name}
                                            </CardTitle>
                                        </div>
                                        <CardDescription className="text-xs text-muted-foreground">
                                            Published official grade breakdown
                                        </CardDescription>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold uppercase text-muted-foreground">Aggregate Score</p>
                                            <p className="text-lg font-extrabold text-foreground">
                                                {totalObtained} <span className="text-xs font-normal text-muted-foreground">/ {totalMax}</span>
                                            </p>
                                        </div>
                                        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-center min-w-[70px]">
                                            <p className="text-[9px] font-bold uppercase text-emerald-600">Percentage</p>
                                            <p className="text-base font-extrabold text-emerald-700">{percentage}%</p>
                                        </div>
                                    </div>
                                </div>
                            </CardHeader>

                            <CardContent className="p-0">
                                <div className="divide-y divide-border/60">
                                    <div className="grid grid-cols-12 px-4 py-2.5 bg-muted/40 text-[10px] font-bold uppercase text-muted-foreground">
                                        <div className="col-span-5 sm:col-span-6">Subject</div>
                                        <div className="col-span-3 text-center">Max Marks</div>
                                        <div className="col-span-4 sm:col-span-3 text-right">Marks Obtained</div>
                                    </div>

                                    {exams.map((ex: any) => {
                                        const result = ex.results?.[0];
                                        const isAbsent = Boolean(result?.isAbsent);
                                        const marks = result?.marksObtained;
                                        return (
                                            <div key={ex.id} className="grid grid-cols-12 px-4 py-3 items-center text-xs">
                                                <div className="col-span-5 sm:col-span-6">
                                                    <p className="font-bold text-foreground">{ex.subject?.name || "Subject"}</p>
                                                    <p className="text-[10px] text-muted-foreground font-mono">{ex.subject?.code || "CODE"} • Date: {ex.date || "Scheduled"}</p>
                                                </div>

                                                <div className="col-span-3 text-center font-medium text-muted-foreground">
                                                    {ex.maxMarks}
                                                </div>

                                                <div className="col-span-4 sm:col-span-3 text-right">
                                                    {isAbsent ? (
                                                        <Badge variant="outline" className="text-rose-600 border-rose-500/30 text-[10px]">
                                                            Absent
                                                        </Badge>
                                                    ) : marks !== undefined && marks !== null ? (
                                                        <span className="font-extrabold text-foreground text-sm">
                                                            {marks}
                                                        </span>
                                                    ) : (
                                                        <span className="text-muted-foreground italic text-xs">Grading in progress</span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </CardContent>
                        </Card>
                    );
                })}

                {schedules.length === 0 && (
                    <div className="py-16 text-center space-y-2 border border-dashed border-border/80 rounded-2xl bg-card">
                        <Award className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm font-semibold text-foreground">No Published Exam Schedules</p>
                        <p className="text-xs text-muted-foreground">Exam results will appear here once published by your school faculty.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
