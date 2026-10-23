import { useMemo } from "react";
import { Printer, X, School, Calendar, MapPin, User, AlertCircle } from "lucide-react";
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

    // Build slot matrix by period.id matching (consistent with ClassroomTimetableTab)
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

                const period = periods.find(p => {
                    const pStart = p.startTime ? p.startTime.substring(0, 5) : "";
                    const pEnd = p.endTime ? p.endTime.substring(0, 5) : "";
                    const sStart = slot.startTime ? slot.startTime.substring(0, 5) : "";
                    const sEnd = slot.endTime ? slot.endTime.substring(0, 5) : "";

                    return (pStart && sStart && pStart === sStart && pEnd === sEnd) ||
                        (sStart && pStart && pEnd && sStart >= pStart && sStart < pEnd);
                });

                if (period) {
                    map[slot.dayOfWeek][period.id] = { subjectName: sName, teacherName: tName, code: sCode };
                }
            }
        }
        return map;
    }, [subjects, periods]);

    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                showCloseButton={false}
                className="max-w-[95vw] lg:max-w-6xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl border border-border/80 shadow-2xl bg-white text-slate-900 print:m-0 print:p-0 print:border-none print:shadow-none print:max-w-none print:max-h-none print:bg-white print:text-black"
            >
                {/* Header (Hidden when printing) */}
                <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-b border-slate-200 print:hidden shrink-0">
                    <DialogTitle className="text-sm font-bold text-slate-900 flex items-center gap-2">
                        <Printer className="w-4 h-4 text-purple-600" />
                        Timetable Print Preview (A4 Landscape)
                    </DialogTitle>
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={handlePrint}
                            className="h-8 rounded-xl font-bold text-xs bg-purple-600 text-white hover:bg-purple-700 gap-1.5 shadow-sm"
                        >
                            <Printer className="w-3.5 h-3.5" /> Print / Save as PDF
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onOpenChange(false)}
                            className="h-8 w-8 rounded-lg text-slate-500 hover:text-slate-900"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Scrollable Printable Document Area */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white print:p-0 print:overflow-visible">
                    {/* Header Details */}
                    <div className="text-center pb-4 border-b-2 border-slate-900/80 mb-5">
                        <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                            Academic Timetable
                        </h2>
                        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-1.5 mt-2.5 text-xs font-semibold text-slate-700">
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

                    {/* Table Matrix or Empty State */}
                    {sortedPeriods.length === 0 ? (
                        <div className="text-center py-12 px-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 text-slate-600">
                            <AlertCircle className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                            <h4 className="text-sm font-bold text-slate-800">No Lectures/Periods Configured</h4>
                            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                                Please open <strong>Manage Lectures</strong> in the Timetable tab to configure lectures and bell timings before printing.
                            </p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto border border-slate-300 rounded-lg shadow-2xs">
                            <table className="w-full border-collapse text-left text-xs min-w-[700px]">
                                <thead>
                                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-300">
                                        <th className="p-3 font-bold uppercase tracking-wider w-28 border-r border-slate-300 bg-slate-200/70">
                                            Day / Period
                                        </th>
                                        {sortedPeriods.map((p) => {
                                            const isLunch = p.name.toLowerCase().includes("lunch");
                                            const isBreak = p.name.toLowerCase().includes("break");
                                            return (
                                                <th
                                                    key={p.id}
                                                    className={`p-2.5 text-center border-r border-slate-300 last:border-r-0 ${isLunch ? "bg-amber-50" : isBreak ? "bg-blue-50" : ""
                                                        }`}
                                                >
                                                    <div className="font-bold text-[12px] text-slate-900">{p.name}</div>
                                                    <div className="text-[10px] text-slate-600 font-mono mt-0.5">
                                                        {p.startTime ? p.startTime.slice(0, 5) : "--:--"} - {p.endTime ? p.endTime.slice(0, 5) : "--:--"}
                                                    </div>
                                                </th>
                                            );
                                        })}
                                    </tr>
                                </thead>
                                <tbody>
                                    {DAYS.map((day, idx) => (
                                        <tr
                                            key={day}
                                            className={`border-b border-slate-200 ${idx % 2 === 0 ? "bg-white" : "bg-slate-50/50"
                                                }`}
                                        >
                                            <td className="p-3 font-bold text-slate-900 border-r border-slate-300 bg-slate-100/60">
                                                {day}
                                            </td>
                                            {sortedPeriods.map((p) => {
                                                const slot = slotMatrix[day]?.[p.id];
                                                const isLunch = p.name.toLowerCase().includes("lunch");
                                                const isBreak = p.name.toLowerCase().includes("break");

                                                return (
                                                    <td
                                                        key={p.id}
                                                        className={`p-2.5 text-center border-r border-slate-200 last:border-r-0 align-middle min-w-[110px] ${isLunch
                                                                ? "bg-amber-50/40 text-amber-800 font-semibold italic text-[11px]"
                                                                : isBreak
                                                                    ? "bg-blue-50/40 text-blue-800 font-semibold italic text-[11px]"
                                                                    : ""
                                                            }`}
                                                    >
                                                        {isLunch ? (
                                                            <span>Lunch Break</span>
                                                        ) : isBreak ? (
                                                            <span>Short Break</span>
                                                        ) : slot ? (
                                                            <div className="space-y-0.5">
                                                                <div className="font-bold text-slate-900 text-[12px] leading-tight">
                                                                    {slot.subjectName}
                                                                </div>
                                                                <div className="text-[10px] text-slate-600 truncate font-medium">
                                                                    {slot.teacherName}
                                                                </div>
                                                            </div>
                                                        ) : (
                                                            <span className="text-slate-300 font-mono text-[12px]">—</span>
                                                        )}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Footer / Legend */}
                    <div className="mt-5 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Generated on: {new Date().toLocaleDateString(undefined, { dateStyle: 'long' })}</span>
                        <span>Official ERP Timetable • Verified for Softboard Display</span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
