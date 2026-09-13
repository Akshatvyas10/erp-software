import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { useSubmitBulkAttendance } from '@/features/attendance/api/useAttendance';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Loader2, Save, UserCheck, UserX, AlertTriangle, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Skeleton } from '@/components/ui/skeleton';

interface Student {
    id: string;
    studentId: string;
    account: {
        firstName: string;
        lastName: string;
        avatarUrl?: string;
    }
}

interface AttendanceGridProps {
    classroomId: string;
    date: string;
    canEdit: boolean;
    existingAttendance: any[];
    attendanceLoading: boolean;
    onSaveSuccess?: () => void;
}

type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE';

export function AttendanceGrid({ classroomId, date, canEdit, existingAttendance, attendanceLoading, onSaveSuccess }: AttendanceGridProps) {
    const [localRecords, setLocalRecords] = useState<Record<string, AttendanceStatus>>({});
    const [confirmOpen, setConfirmOpen] = useState(false);
    
    // Fetch Enrolled Students
    const { data: students, isLoading: studentsLoading } = useQuery({
        queryKey: ['classrooms', classroomId, 'students'],
        queryFn: async () => {
            const { data } = await api.get(`/classrooms/${classroomId}/students`);
            return data.data.enrollments.map((e: any) => e.student) as Student[];
        },
        enabled: !!classroomId
    });
    
    const submitMutation = useSubmitBulkAttendance();

    // Sync remote attendance to local state
    useEffect(() => {
        if (existingAttendance && students) {
            const newLocal: Record<string, AttendanceStatus> = {};
            existingAttendance.forEach(record => {
                // Map LEAVE to ABSENT if it comes from backend
                if (record.status === 'LEAVE' || record.status === 'HALF_DAY') {
                    newLocal[record.studentId] = 'ABSENT';
                } else {
                    newLocal[record.studentId] = record.status as AttendanceStatus;
                }
            });
            setLocalRecords(newLocal);
        }
    }, [existingAttendance, students, classroomId, date]);

    if (studentsLoading || attendanceLoading) {
        return (
            <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-card">
                <div className="p-3 sm:p-4 border-b border-border/40 bg-muted/10 flex flex-col sm:flex-row gap-3 justify-between">
                    <Skeleton className="h-11 w-full sm:w-64 rounded-xl" />
                    <Skeleton className="h-11 w-full sm:w-32 rounded-xl" />
                </div>
                <div className="p-4 space-y-4">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <div key={i} className="flex items-center gap-4">
                            <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                            <Skeleton className="h-6 w-32 rounded-md" />
                            <div className="ml-auto flex gap-2">
                                <Skeleton className="h-10 w-20 rounded-xl" />
                                <Skeleton className="h-10 w-20 rounded-xl" />
                                <Skeleton className="h-10 w-20 rounded-xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </Card>
        );
    }

    if (!students || students.length === 0) {
        return (
            <Card className="p-4 sm:p-12 text-center border-dashed rounded-3xl bg-muted/10">
                <div className="mx-auto w-12 h-12 sm:w-16 sm:h-16 bg-muted/50 rounded-full flex items-center justify-center mb-4">
                    <UserX className="h-6 w-6 sm:h-8 sm:w-8 text-muted-foreground/50" />
                </div>
                <h3 className="text-base sm:text-lg font-bold text-foreground">No Students Enrolled</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                    There are currently no students enrolled in this classroom.
                </p>
            </Card>
        );
    }

    const markAll = (status: AttendanceStatus) => {
        const newLocal: Record<string, AttendanceStatus> = { ...localRecords };
        students.forEach(s => {
            newLocal[s.id] = status;
        });
        setLocalRecords(newLocal);
    };

    const handleSaveClick = () => {
        setConfirmOpen(true);
    };

    const confirmSave = () => {
        const records = students.map(s => ({
            studentId: s.id,
            // Default to ABSENT if not marked
            status: localRecords[s.id] || 'ABSENT'
        }));

        submitMutation.mutate({
            classroomId,
            academicYearId: '2024-25', // Should be dynamic based on current session context
            date,
            records
        }, {
            onSuccess: () => {
                toast.success('Attendance saved successfully');
                setConfirmOpen(false);
                if (onSaveSuccess) onSaveSuccess();
            },
            onError: (err: any) => {
                toast.error(err?.response?.data?.message || 'Failed to save attendance');
                setConfirmOpen(false);
            }
        });
    };

    const presentCount = students?.filter(s => localRecords[s.id] === 'PRESENT').length || 0;
    const lateCount = students?.filter(s => localRecords[s.id] === 'LATE').length || 0;
    const absentCount = (students?.length || 0) - presentCount - lateCount;

    const StatusButton = ({ studentId, status, icon: Icon, label, activeClass }: any) => {
        const isActive = localRecords[studentId] === status;
        return (
            <button
                disabled={!canEdit}
                onClick={() => setLocalRecords(prev => ({ ...prev, [studentId]: status }))}
                className={`
                    flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all min-h-[44px]
                    ${isActive ? activeClass : 'bg-muted/50 text-muted-foreground hover:bg-muted'}
                    ${!canEdit && 'opacity-50 cursor-not-allowed'}
                `}
            >
                <Icon className="h-4 w-4" />
                <span className="hidden lg:inline">{label}</span>
            </button>
        );
    };

    return (
        <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-card">
            {/* Toolbar */}
            {canEdit && (
                <div className="p-3 sm:p-4 border-b border-border/40 bg-muted/10 flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-center">
                    <div className="flex gap-2 w-full sm:w-auto">
                        <Button variant="outline" size="sm" onClick={() => markAll('PRESENT')} className="flex-1 sm:flex-none rounded-xl border-emerald-500/20 text-emerald-600 hover:bg-emerald-500/10 min-h-[44px]">
                            <UserCheck className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Mark All</span> Present
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => markAll('ABSENT')} className="flex-1 sm:flex-none rounded-xl border-destructive/20 text-destructive hover:bg-destructive/10 min-h-[44px]">
                            <UserX className="h-4 w-4 mr-2" /> <span className="hidden sm:inline">Mark All</span> Absent
                        </Button>
                    </div>
                    <Button 
                        onClick={handleSaveClick} 
                        disabled={submitMutation.isPending}
                        className="rounded-xl font-bold bg-primary hover:bg-primary/90 shadow-md shadow-primary/20 w-full sm:w-auto min-h-[44px]"
                    >
                        {submitMutation.isPending ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Attendance
                    </Button>
                </div>
            )}

            {!canEdit && (
                 <div className="p-3 sm:p-4 border-b border-border/40 bg-amber-500/10 text-amber-600 flex items-center justify-center gap-2 text-xs sm:text-sm font-bold text-center">
                    <ShieldAlert className="h-5 w-5 shrink-0" /> You do not have permission to modify attendance for this classroom.
                </div>
            )}

            <div className="overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="text-[10px] sm:text-xs uppercase bg-muted/30 text-muted-foreground">
                        <tr>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold rounded-tl-xl whitespace-nowrap">Student</th>
                            <th className="px-4 sm:px-6 py-3 sm:py-4 font-bold text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                        {students.map((student) => (
                            <tr key={student.id} className="hover:bg-muted/10 transition-colors">
                                <td className="px-4 sm:px-6 py-3 sm:py-4 min-w-[120px] max-w-[150px] sm:max-w-[200px]">
                                    <div className="flex items-center gap-2 sm:gap-3">
                                        <div className="h-8 w-8 sm:h-9 sm:w-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                                            {student.account?.firstName?.[0]}{student.account?.lastName?.[0]}
                                        </div>
                                        <TooltipProvider delayDuration={300}>
                                            <Tooltip>
                                                <TooltipTrigger asChild>
                                                    <div className="font-bold text-foreground text-xs sm:text-sm truncate cursor-default">
                                                        {student.account?.firstName} {student.account?.lastName}
                                                    </div>
                                                </TooltipTrigger>
                                                <TooltipContent className="bg-background text-foreground border-border shadow-md">
                                                    <p className="font-semibold">{student.account?.firstName} {student.account?.lastName}</p>
                                                </TooltipContent>
                                            </Tooltip>
                                        </TooltipProvider>
                                    </div>
                                </td>
                                <td className="px-4 sm:px-6 py-3 sm:py-4 min-w-[200px]">
                                    <div className="flex items-center justify-center gap-1.5 sm:gap-2">
                                        <StatusButton 
                                            studentId={student.id} status="PRESENT" icon={UserCheck} label="Present"
                                            activeClass="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 ring-1 ring-emerald-500/30" 
                                        />
                                        <StatusButton 
                                            studentId={student.id} status="ABSENT" icon={UserX} label="Absent"
                                            activeClass="bg-destructive/15 text-destructive ring-1 ring-destructive/30" 
                                        />
                                        <StatusButton 
                                            studentId={student.id} status="LATE" icon={AlertTriangle} label="Late"
                                            activeClass="bg-amber-500/15 text-amber-600 dark:text-amber-400 ring-1 ring-amber-500/30" 
                                        />
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="w-[95vw] sm:max-w-md mx-auto rounded-3xl p-6 border-border shadow-2xl bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">Confirm Attendance</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2">
                            Please review the attendance summary before saving. Unmarked students will be marked as absent.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    
                    <div className="grid grid-cols-3 gap-3 my-4">
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                            <span className="text-2xl font-black text-emerald-600">{presentCount}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600/70 mt-1">Present</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-destructive/10 border border-destructive/20">
                            <span className="text-2xl font-black text-destructive">{absentCount}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-destructive/70 mt-1">Absent</span>
                        </div>
                        <div className="flex flex-col items-center justify-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                            <span className="text-2xl font-black text-amber-600">{lateCount}</span>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600/70 mt-1">Late</span>
                        </div>
                    </div>

                    <AlertDialogFooter className="mt-2 gap-3">
                        <AlertDialogCancel className="h-11 rounded-xl font-semibold border-border/50 bg-background hover:bg-accent text-foreground transition-colors">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmSave}
                            disabled={submitMutation.isPending}
                            className="h-11 rounded-xl font-bold bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
                        >
                            {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Save"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </Card>
    );
}
