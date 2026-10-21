import { useMemo } from "react";
import { Printer, X, School, Calendar, MapPin, User } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { ClassroomSubject, ClassroomPeriod, DayOfWeek } from "@/types/erp";

interface PrintableTimetableModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomName: string;
    section: string;
    academicYear: string;
    roomNumber?: string | null;
    classTeacherName?: string | null;
    periods: ClassroomPeriod[];
    subjects: ClassroomSubject[];
}

const DAYS: DayOfWeek[] = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function PrintableTimetableModal({
    open,
    onOpenChange,
    classroomName,
    section,
    academicYear,
    roomNumber,
    classTeacherName,
    periods,
    subjects,
}: PrintableTimetableModalProps) {
    const sortedPeriods = useMemo(
        () => [...periods].sort((a, b) => a.order - b.order),
        [periods]
    );

    const slotMatrix = useMemo(() => {
        const map: Record<string, Record<string, { subjectName: string; teacherName: string; code: string }>> = {};
        for (const subj of subjects) {
            const sName = subj.subject?.name || "Subject";
            const sCode = subj.subject?.code || "";
            const tName = subj.teacher?.account
                ? `${subj.teacher.account.firstName} ${subj.teacher.account.lastName}`
                : "TBD";

            for (const slot of subj.schedule ?? []) {
                if (!map[slot.dayOfWeek]) map[slot.dayOfWeek] = {};
                const startStr = slot.startTime ? slot.startTime.slice(0, 5) : "";
                const endStr = slot.endTime ? slot.endTime.slice(0, 5) : "";
                if (startStr && endStr) {
                    const key = `${startStr}-${endStr}`;
                    map[slot.dayOfWeek][key] = { subjectName: sName, teacherName: tName, code: sCode };
                }
            }
        }
        return map;
    }, [subjects]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-4xl p-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none">
                <div className="flex items-center justify-between px-6 py-3.5 bg-muted/40 border-b border-border/80 print:hidden">
                    <DialogTitle className="text-sm font-bold text-foreground flex items-center gap-2">
                        <Printer className="w-4 h-4 text-primary" /> Timetable Print Preview (A4 Landscape)
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={handlePrint}
                            className="h-8 rounded-xl font-bold text-xs bg-primary text-primary-foreground hover:bg-primary/90 gap-1.5 shadow-sm"
                        >
                            <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="h-8 w-8 rounded-lg text-muted-foreground hover:text-foreground"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Printable Document Area */}
                <div className="p-6 sm:p-8 bg-white text-slate-900 print:p-4 print:text-black">
                    {/* Header */}
                    <div className="text-center pb-4 border-b-2 border-slate-900/80 mb-4">
                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                            Academic Timetable
                        </h2>
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 mt-2 text-xs font-semibold text-slate-700">
                            <span className="flex items-center gap-1.5">
                                <School className="w-3.5 h-3.5 text-slate-500" />
                                <strong>Class:</strong> {classroomName} - Section {section}
                            </span>
                            <span className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-500" />
                                <strong>Session:</strong> {academicYear}
                            </span>
                            {roomNumber && (
                                <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3.5 h-3.5 text-slate-500" />
                                    <strong>Room:</strong> {roomNumber}
                                </span>
                            )}
                            {classTeacherName && (
                                <span className="flex items-center gap-1.5">
                                    <User className="w-3.5 h-3.5 text-slate-500" />
                                    <strong>Class Teacher:</strong> {classTeacherName}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Table Matrix */}
                    <div className="overflow-x-auto border border-slate-300 rounded-lg">
                        <table className="w-full border-collapse text-left text-xs">
                            <thead>
                                <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                                    <th className="p-2.5 font-bold uppercase tracking-wider w-24 border-r border-slate-300">
                                        Day / Period
                                    </th>
                                    {sortedPeriods.map((p) => (
                                        <th key={p.id} className="p-2 text-center border-r border-slate-300 last:border-r-0">
                                            <div className="font-bold text-[11px] text-slate-900">{p.name}</div>
                                            <div className="text-[10px] text-slate-500 font-mono">
                                                {(p.startTime ? p.startTime.slice(0, 5) : "--:--")} - {(p.endTime ? p.endTime.slice(0, 5) : "--:--")}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {DAYS.map((day, idx) => (
                                    <tr key={day} className={`border-b border-slate-200 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                        <td className="p-2.5 font-bold text-slate-900 border-r border-slate-300 bg-slate-50">
                                            {day}
                                        </td>
                                        {sortedPeriods.map((p) => {
                                            const pStart = p.startTime ? p.startTime.slice(0, 5) : "";
                                            const pEnd = p.endTime ? p.endTime.slice(0, 5) : "";
                                            const key = pStart && pEnd ? `${pStart}-${pEnd}` : "";
                                            const slot = key ? slotMatrix[day]?.[key] : null;

                                            return (
                                                <td
                                                    key={p.id}
                                                    className="p-2 text-center border-r border-slate-200 last:border-r-0 align-middle min-w-[100px]"
                                                >
                                                    {slot ? (
                                                        <div className="space-y-0.5">
                                                            <div className="font-bold text-slate-900 text-[11px] leading-tight">
                                                                {slot.subjectName}
                                                            </div>
                                                            <div className="text-[10px] text-slate-600 truncate">
                                                                {slot.teacherName}
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <span className="text-slate-300 font-mono text-[11px]">—</span>
                                                    )}
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Footer / Legend */}
                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-500">
                        <span>Generated on: {new Date().toLocaleDateString()}</span>
                        <span>Official ERP Timetable • Verified for Softboard Display</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
