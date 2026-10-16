import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import {
    Search, Trash2, Loader2, UserCheck, X, Users, CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList,
} from "@/components/ui/command";

import api from "@/lib/api";
import { fetchAllStudents } from "@/features/classrooms/api/classroomApi";
import type { ClassroomEnrollment } from "@/types/erp";

export interface ClassroomStudentsTabProps {
    classroomId: string;
    enrollments: ClassroomEnrollment[];
    canEdit: boolean;
    onRefresh: () => void;
    monitorMaleId?: string;
    monitorFemaleId?: string;
}

export function ClassroomStudentsTab({
    classroomId,
    enrollments,
    canEdit,
    onRefresh,
    monitorMaleId,
    monitorFemaleId
}: ClassroomStudentsTabProps) {
    const navigate = useNavigate();
    const [rosterSearch, setRosterSearch] = useState("");
    const [assignOpen, setAssignOpen] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [removeId, setRemoveId] = useState<string | null>(null);

    const enrolledIds = useMemo(() => new Set(enrollments.map(e => e.student.id)), [enrollments]);

    const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
        queryKey: ["students-all", studentSearch],
        queryFn: () => fetchAllStudents(studentSearch),
        enabled: assignOpen,
        staleTime: 30_000,
    });

    const availableStudents = useMemo(
        () => allStudents.filter(s => !enrolledIds.has(s.id)),
        [allStudents, enrolledIds]
    );

    const assignMutation = useMutation({
        mutationFn: (studentIds: string[]) =>
            api.post(`/classrooms/${classroomId}/students`, { studentIds }),
        onSuccess: () => {
            toast.success(`${selected.size} student(s) assigned`);
            setSelected(new Set());
            setAssignOpen(false);
            onRefresh();
        },
        onError: (err: any) => {
            console.log("Assign error:", err, err?.response?.data);
            const msg = err?.response?.data?.message;
            const valMsg = err?.response?.data?.errors?.[0]?.msg;
            toast.error(valMsg || msg || err?.message || "Failed to assign students");
        },
    });

    const removeMutation = useMutation({
        mutationFn: (studentId: string) =>
            api.delete(`/classrooms/${classroomId}/students/${studentId}`),
        onSuccess: () => {
            toast.success("Student removed from classroom");
            setRemoveId(null);
            onRefresh();
        },
        onError: () => toast.error("Failed to remove student"),
    });

    const filteredEnrollments = enrollments.filter(e => {
        if (!rosterSearch) return true;
        const q = rosterSearch.toLowerCase();
        const account = e.student?.account || { firstName: "", lastName: "", email: "" };
        const { firstName, lastName, email } = account;
        return [firstName, lastName, email, e.student?.studentId]
            .some(v => v?.toLowerCase().includes(q));
    });

    const toggleStudent = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    return (
        <div className="space-y-4">
            {/* Roster toolbar */}
            <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search students…"
                        value={rosterSearch}
                        onChange={e => setRosterSearch(e.target.value)}
                        className="pl-9 h-10 border-none bg-muted/60 dark:bg-zinc-950/60 rounded-xl text-sm
                                   focus-visible:ring-1 focus-visible:ring-purple-500"
                    />
                </div>
                {canEdit && (
                    <Button
                        size="sm"
                        onClick={() => setAssignOpen(true)}
                        className="gap-2 h-10 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold shadow-md transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                    >
                        <UserCheck className="h-4 w-4" /> Assign Students
                    </Button>
                )}
            </div>

            {/* Enrollment count */}
            <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-purple-900/50 dark:text-zinc-500 uppercase tracking-wider">
                    {filteredEnrollments.length} student{filteredEnrollments.length !== 1 ? "s" : ""}
                </span>
                {rosterSearch && (
                    <button onClick={() => setRosterSearch("")}
                        className="text-xs text-purple-600 hover:text-purple-800 font-semibold flex items-center gap-1">
                        <X className="h-3 w-3" /> Clear
                    </button>
                )}
            </div>

            {/* Student table */}
            {filteredEnrollments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                        <Users className="h-6 w-6 text-primary/40" />
                    </div>
                    <p className="text-sm font-bold text-muted-foreground">No students enrolled</p>
                </div>
            ) : (
                <div className="rounded-xl border border-border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/40 hover:bg-muted/40">
                                <TableHead className="pl-5 text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Student</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Student ID</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Grade</TableHead>
                                <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Email</TableHead>
                                {canEdit && <TableHead className="pr-5 text-right text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Actions</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredEnrollments.map((enr, i) => {
                                const account = enr.student?.account || { firstName: "Unknown", lastName: "Student", email: "N/A" };
                                const { firstName, lastName, email } = account;
                                const initials = `${firstName[0] || ''}${lastName[0] || ''}`.toUpperCase();
                                const isMonitor = enr.student.id === monitorMaleId || enr.student.id === monitorFemaleId;
                                return (
                                    <TableRow key={enr.id}
                                        className={cn(
                                            "border-b border-border/40 last:border-0 hover:bg-muted/50 transition-colors",
                                            i % 2 === 0 ? "" : "bg-muted/20"
                                        )}>
                                        <TableCell className="pl-5 py-3.5">
                                            <div className="flex items-center gap-3 cursor-pointer group" onClick={() => navigate(`/dashboard/students/${enr.student.id}`)}>
                                                <Avatar className="h-8 w-8 border border-primary/20 shadow-sm shrink-0 transition-transform group-hover:scale-105">
                                                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                        {initials}
                                                    </AvatarFallback>
                                                </Avatar>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold text-foreground text-[13px] group-hover:text-primary transition-colors flex items-center gap-2">
                                                        {firstName} {lastName}
                                                        {isMonitor && (
                                                            <Badge variant="outline" className="text-[9px] h-4 px-1.5 bg-yellow-500/10 text-yellow-700 dark:text-yellow-500 border-yellow-500/20 uppercase font-bold tracking-wider">
                                                                Monitor
                                                            </Badge>
                                                        )}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-3.5">
                                            <Badge variant="outline" className="font-mono text-[11px] bg-muted/60 border-border/60 px-2">
                                                {enr.student.studentId}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-3.5 text-muted-foreground font-medium hidden md:table-cell">
                                            {enr.student.grade ?? "—"}
                                        </TableCell>
                                        <TableCell className="py-3.5 text-muted-foreground text-[12px] hidden lg:table-cell">
                                            {email}
                                        </TableCell>
                                        {canEdit && (
                                            <TableCell className="pr-5 py-3.5 text-right">
                                                <Button
                                                    variant="ghost" size="icon"
                                                    className="h-8 w-8 rounded-lg text-destructive/60 hover:text-destructive hover:bg-destructive/10"
                                                    onClick={() => setRemoveId(enr.student.id)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>
            )}

            {/* Assign Students Dialog */}
            <Dialog open={assignOpen} onOpenChange={v => { setAssignOpen(v); if (!v) { setSelected(new Set()); setStudentSearch(""); } }}>
                <DialogContent className="sm:max-w-lg p-0 rounded-2xl border border-border/80 shadow-2xl bg-background">
                    <DialogHeader className="px-6 py-5 bg-muted/40 border-b border-border">
                        <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                            Assign Students
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-5 space-y-3">
                        <Command className="rounded-xl border border-border bg-transparent">
                            <CommandInput
                                placeholder="Search by name or student ID…"
                                value={studentSearch}
                                onValueChange={setStudentSearch}
                                className="text-sm"
                            />
                            <CommandList>
                                <CommandEmpty>
                                    {studentsLoading ? (
                                        <div className="flex justify-center py-4">
                                            <Loader2 className="h-5 w-5 animate-spin text-primary" />
                                        </div>
                                    ) : "No students found"}
                                </CommandEmpty>
                                <CommandGroup>
                                    <ScrollArea className="h-56">
                                        {availableStudents.map(student => {
                                            const isChecked = selected.has(student.id);
                                            const name = `${student.account.firstName} ${student.account.lastName}`;
                                            return (
                                                <CommandItem
                                                    key={student.id}
                                                    value={`${name} ${student.studentId}`}
                                                    onSelect={() => toggleStudent(student.id)}
                                                    className="gap-3 cursor-pointer rounded-lg aria-selected:bg-accent"
                                                >
                                                    <Checkbox
                                                        checked={isChecked}
                                                        className="data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                                                        onCheckedChange={() => toggleStudent(student.id)}
                                                    />
                                                    <div className="flex flex-col flex-1 min-w-0">
                                                        <span className="font-semibold text-[13px] text-foreground truncate">{name}</span>
                                                        <span className="text-[11px] text-muted-foreground font-mono">{student.studentId}</span>
                                                    </div>
                                                    {isChecked && <CheckCircle2 className="h-4 w-4 text-primary shrink-0" />}
                                                </CommandItem>
                                            );
                                        })}
                                    </ScrollArea>
                                </CommandGroup>
                            </CommandList>
                        </Command>
                        {selected.size > 0 && (
                            <p className="text-xs font-semibold text-primary bg-primary/10 px-3 py-2 rounded-lg">
                                {selected.size} student{selected.size !== 1 ? "s" : ""} selected
                            </p>
                        )}
                    </div>
                    <div className="px-6 py-4 bg-muted/40 border-t border-border flex justify-end gap-3">
                        <Button variant="outline" className="rounded-xl font-medium border-border/80 transition-colors"
                            onClick={() => setAssignOpen(false)}>Cancel</Button>
                        <Button
                            disabled={selected.size === 0 || assignMutation.isPending}
                            onClick={() => assignMutation.mutate(Array.from(selected))}
                            className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            {assignMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                <><UserCheck className="h-4 w-4" /> Assign {selected.size > 0 ? selected.size : ""}</>
                            )}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Remove confirm */}
            <AlertDialog open={!!removeId} onOpenChange={v => !v && setRemoveId(null)}>
                <AlertDialogContent className="w-[95vw] sm:max-w-lg mx-auto rounded-3xl p-6 border-border shadow-2xl bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">Remove Student?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2">
                            The student will be unenrolled from this classroom. Their account will not be affected.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="h-11 rounded-xl font-semibold border-border/50 bg-background hover:bg-accent text-foreground transition-colors">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => removeId && removeMutation.mutate(removeId)}
                            className="bg-destructive hover:bg-destructive/90 text-white h-10 px-4 rounded-lg font-semibold"
                        >
                            {removeMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}

export default ClassroomStudentsTab;
