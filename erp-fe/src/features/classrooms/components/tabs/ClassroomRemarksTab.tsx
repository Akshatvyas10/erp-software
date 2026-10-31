import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    MessageSquare, Plus, Search, Trash2, Calendar, User,
    FileText, BookOpen, Smile
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import api from "@/lib/api";
import { useAuth, usePermissions } from "@/store/hooks";
import type { ClassroomEnrollment } from "@/types/erp";

export interface ClassroomRemarkItem {
    id: string;
    classroomId: string;
    studentId: string;
    teacherId?: string | null;
    teacherName: string;
    type: "Homework" | "Academic" | "Behavior" | "General";
    remark: string;
    homeworkId?: string | null;
    createdAt: string;
    updatedAt: string;
    student?: {
        id: string;
        admissionNumber: string;
        firstName?: string;
        lastName?: string;
        account?: {
            firstName: string;
            lastName: string;
        };
    };
    homework?: {
        id: string;
        title: string;
        subject?: {
            id: string;
            name: string;
        };
    } | null;
}

interface ClassroomRemarksTabProps {
    classroomId: string;
    classroomName: string;
    enrollments?: ClassroomEnrollment[];
    canCreateRemark?: boolean;
    canManageRemarks?: boolean;
}

export function ClassroomRemarksTab({
    classroomId,
    classroomName,
    enrollments = [],
    canCreateRemark = true,
    canManageRemarks = false,
}: ClassroomRemarksTabProps) {
    const qc = useQueryClient();
    const { user } = useAuth();
    const { hasRole } = usePermissions();

    const [search, setSearch] = useState("");
    const [selectedType, setSelectedType] = useState<string>("ALL");
    const [selectedStudentFilter, setSelectedStudentFilter] = useState<string>("ALL");
    const [createOpen, setCreateOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    // Form State
    const [formStudentId, setFormStudentId] = useState("");
    const [formType, setFormType] = useState<"Academic" | "Behavior" | "Homework" | "General">("Academic");
    const [formRemark, setFormRemark] = useState("");
    const [formHomeworkId, setFormHomeworkId] = useState<string>("");

    // Fetch Remarks for this classroom
    const { data: remarks = [], isLoading } = useQuery<ClassroomRemarkItem[]>({
        queryKey: ["classroom-remarks", classroomId],
        queryFn: async () => {
            const res = await api.get(`/classrooms/${classroomId}/remarks`);
            const payload = res.data;
            if (Array.isArray(payload)) return payload as ClassroomRemarkItem[];
            if (Array.isArray(payload?.remarks)) return payload.remarks as ClassroomRemarkItem[];
            if (Array.isArray(payload?.data?.remarks)) return payload.data.remarks as ClassroomRemarkItem[];
            if (Array.isArray(payload?.data)) return payload.data as ClassroomRemarkItem[];
            return [] as ClassroomRemarkItem[];
        },
    });

    // Fetch Homeworks for optional linking
    const { data: homeworks = [] } = useQuery({
        queryKey: ["homework", classroomId],
        queryFn: async () => {
            const res = await api.get(`/homeworks?classId=${classroomId}`);
            return (Array.isArray(res.data) ? res.data : (res.data?.data || []));
        },
        enabled: createOpen,
    });

    // Create Remark Mutation
    const createMutation = useMutation({
        mutationFn: async () => {
            return api.post(`/classrooms/${classroomId}/remarks`, {
                studentId: formStudentId,
                type: formType,
                remark: formRemark.trim(),
                homeworkId: formHomeworkId || null,
            });
        },
        onSuccess: () => {
            toast.success("Remark added successfully");
            qc.invalidateQueries({ queryKey: ["classroom-remarks", classroomId] });
            setCreateOpen(false);
            setFormStudentId("");
            setFormType("Academic");
            setFormRemark("");
            setFormHomeworkId("");
        },
        onError: (err: any) => {
            const msg = err.response?.data?.message || err.response?.data?.errors?.[0]?.message || "Failed to add remark";
            toast.error(msg);
        },
    });

    // Delete Remark Mutation
    const deleteMutation = useMutation({
        mutationFn: async (id: string) => {
            return api.delete(`/classrooms/${classroomId}/remarks/${id}`);
        },
        onSuccess: () => {
            toast.success("Remark removed");
            qc.invalidateQueries({ queryKey: ["classroom-remarks", classroomId] });
            setDeleteId(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete remark");
        },
    });

    // Filter remarks
    const safeRemarks = Array.isArray(remarks) ? remarks : [];
    const filteredRemarks = safeRemarks.filter((r) => {
        const studentName = r.student?.account
            ? `${r.student.account.firstName} ${r.student.account.lastName}`
            : r.student
            ? `${r.student.firstName || ""} ${r.student.lastName || ""}`
            : "";
        const matchesSearch =
            studentName.toLowerCase().includes(search.toLowerCase()) ||
            (r.remark || "").toLowerCase().includes(search.toLowerCase()) ||
            (r.teacherName || "").toLowerCase().includes(search.toLowerCase());

        const matchesType = selectedType === "ALL" || r.type === selectedType;
        const matchesStudent = selectedStudentFilter === "ALL" || r.studentId === selectedStudentFilter;

        return matchesSearch && matchesType && matchesStudent;
    });

    const getTypeBadge = (type: string) => {
        switch (type) {
            case "Homework":
                return (
                    <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-bold gap-1 text-[10px]">
                        <FileText className="w-3 h-3" /> Homework
                    </Badge>
                );
            case "Behavior":
                return (
                    <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20 font-bold gap-1 text-[10px]">
                        <Smile className="w-3 h-3" /> Behavior
                    </Badge>
                );
            case "Academic":
                return (
                    <Badge variant="outline" className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 font-bold gap-1 text-[10px]">
                        <BookOpen className="w-3 h-3" /> Academic
                    </Badge>
                );
            case "General":
            default:
                return (
                    <Badge variant="outline" className="bg-muted text-muted-foreground border-border font-bold gap-1 text-[10px]">
                        <MessageSquare className="w-3 h-3" /> General
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-4">
            {/* Header & Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
                <div>
                    <h3 className="font-bold text-sm sm:text-base flex items-center gap-2">
                        <MessageSquare className="h-4 w-4 text-primary" />
                        Classroom Remarks & Feedback Ledger
                    </h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                        Track behavioral, academic, and homework remarks for students in {classroomName}.
                    </p>
                </div>

                {canCreateRemark && (
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl text-xs h-9 font-semibold shrink-0">
                                <Plus className="h-3.5 w-3.5" /> Add Student Remark
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl p-6 border-border shadow-2xl bg-background max-w-lg">
                            <DialogHeader>
                                <DialogTitle className="text-lg font-bold flex items-center gap-2">
                                    <MessageSquare className="w-4 h-4 text-primary" /> Issue Student Remark
                                </DialogTitle>
                                <DialogDescription className="text-xs">
                                    Record academic, conduct, or homework feedback for a student in this classroom.
                                </DialogDescription>
                            </DialogHeader>

                            <div className="space-y-4 pt-3">
                                <div>
                                    <Label className="text-xs font-semibold">Select Student <span className="text-destructive">*</span></Label>
                                    <Select value={formStudentId} onValueChange={setFormStudentId}>
                                        <SelectTrigger className="mt-1 rounded-xl text-xs">
                                            <SelectValue placeholder="Choose student from class roster" />
                                        </SelectTrigger>
                                        <SelectContent className="rounded-xl max-h-56">
                                            {enrollments.map((e) => {
                                                const s = e.student;
                                                if (!s) return null;
                                                const name = s.account ? `${s.account.firstName} ${s.account.lastName}` : `Student #${s.admissionNumber}`;
                                                return (
                                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                                        {name} {s.admissionNumber ? `(${s.admissionNumber})` : ""}
                                                    </SelectItem>
                                                );
                                            })}
                                        </SelectContent>
                                    </Select>
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <Label className="text-xs font-semibold">Remark Category</Label>
                                        <Select value={formType} onValueChange={(val: any) => setFormType(val)}>
                                            <SelectTrigger className="mt-1 rounded-xl text-xs">
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl">
                                                <SelectItem value="Academic" className="text-xs">Academic</SelectItem>
                                                <SelectItem value="Behavior" className="text-xs">Behavior</SelectItem>
                                                <SelectItem value="Homework" className="text-xs">Homework</SelectItem>
                                                <SelectItem value="General" className="text-xs">General</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>

                                    <div>
                                        <Label className="text-xs font-semibold">Link Homework (Optional)</Label>
                                        <Select value={formHomeworkId} onValueChange={setFormHomeworkId}>
                                            <SelectTrigger className="mt-1 rounded-xl text-xs">
                                                <SelectValue placeholder="None" />
                                            </SelectTrigger>
                                            <SelectContent className="rounded-xl max-h-48">
                                                <SelectItem value="" className="text-xs">None (General)</SelectItem>
                                                {homeworks.map((hw: any) => (
                                                    <SelectItem key={hw.id} value={hw.id} className="text-xs truncate max-w-[200px]">
                                                        {hw.title} ({hw.subject?.name || "Subject"})
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                <div>
                                    <Label className="text-xs font-semibold">Teacher Remark / Observation <span className="text-destructive">*</span></Label>
                                    <Textarea
                                        value={formRemark}
                                        onChange={(e) => setFormRemark(e.target.value)}
                                        placeholder="Enter clear, constructive feedback or behavioral observation..."
                                        rows={4}
                                        className="mt-1 rounded-xl text-xs resize-none"
                                    />
                                    <p className="text-[11px] text-muted-foreground mt-1">
                                        This remark will be visible to the student on their personal portal ledger.
                                    </p>
                                </div>
                            </div>

                            <div className="pt-4 flex justify-end gap-2 border-t border-border/70 mt-2">
                                <Button variant="outline" size="sm" onClick={() => setCreateOpen(false)} className="rounded-xl text-xs">
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl text-xs font-bold"
                                    disabled={createMutation.isPending || !formStudentId || !formRemark.trim()}
                                    onClick={() => createMutation.mutate()}
                                >
                                    {createMutation.isPending ? "Saving..." : "Save Remark"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Filters strip */}
            <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                        placeholder="Search remarks, students, or teachers..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-8 text-xs h-9 rounded-xl bg-card"
                    />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="w-[130px] h-9 text-xs rounded-xl bg-card">
                            <SelectValue placeholder="Category" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL" className="text-xs">All Categories</SelectItem>
                            <SelectItem value="Academic" className="text-xs">Academic</SelectItem>
                            <SelectItem value="Behavior" className="text-xs">Behavior</SelectItem>
                            <SelectItem value="Homework" className="text-xs">Homework</SelectItem>
                            <SelectItem value="General" className="text-xs">General</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedStudentFilter} onValueChange={setSelectedStudentFilter}>
                        <SelectTrigger className="w-[160px] h-9 text-xs rounded-xl bg-card">
                            <SelectValue placeholder="All Students" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-56">
                            <SelectItem value="ALL" className="text-xs">All Students</SelectItem>
                            {enrollments.map((e) => {
                                const s = e.student;
                                if (!s) return null;
                                const name = s.account ? `${s.account.firstName} ${s.account.lastName}` : `Student #${s.admissionNumber}`;
                                return (
                                    <SelectItem key={s.id} value={s.id} className="text-xs">
                                        {name}
                                    </SelectItem>
                                );
                            })}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* List / Cards */}
            {isLoading ? (
                <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-24 rounded-2xl bg-muted/40 animate-pulse border border-border/60" />
                    ))}
                </div>
            ) : filteredRemarks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-center border border-dashed rounded-2xl bg-card/50">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3">
                        <MessageSquare className="w-6 h-6" />
                    </div>
                    <h4 className="font-bold text-sm text-foreground">No remarks logged</h4>
                    <p className="text-xs text-muted-foreground mt-1 max-w-sm">
                        {search || selectedType !== "ALL" || selectedStudentFilter !== "ALL"
                            ? "No remarks match the current filters. Try resetting the search or category."
                            : "Teachers can record academic feedback, behavioral notes, and homework follow-ups here."}
                    </p>
                </div>
            ) : (
                <div className="grid gap-3 sm:grid-cols-1 md:grid-cols-2">
                    {filteredRemarks.map((rem) => {
                        const studentName = rem.student?.account
                            ? `${rem.student.account.firstName} ${rem.student.account.lastName}`
                            : rem.student
                            ? `${rem.student.firstName || ""} ${rem.student.lastName || ""}`
                            : "Student";
                        const canDelete =
                            canManageRemarks ||
                            hasRole("super_admin", "admin") ||
                            (user && (rem as any).createdById === user.id);

                        return (
                            <div
                                key={rem.id}
                                className="p-4 rounded-2xl border border-border/80 bg-card shadow-xs hover:border-border transition-all flex flex-col justify-between group"
                            >
                                <div>
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {getTypeBadge(rem.type)}
                                            {rem.homework && (
                                                <Badge variant="secondary" className="text-[10px] py-0 font-medium truncate max-w-[150px]">
                                                    HW: {rem.homework.title}
                                                </Badge>
                                            )}
                                        </div>

                                        {canDelete && (
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                onClick={() => setDeleteId(rem.id)}
                                                className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                                                title="Delete remark"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5 mb-2">
                                        <div className="w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-[10px] flex items-center justify-center shrink-0">
                                            {studentName.charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-bold text-xs text-foreground truncate">
                                            {studentName}
                                        </span>
                                        {rem.student?.admissionNumber && (
                                            <span className="text-[10px] text-muted-foreground font-mono">
                                                (Adm: {rem.student.admissionNumber})
                                            </span>
                                        )}
                                    </div>

                                    <p className="text-xs text-foreground/90 whitespace-pre-wrap leading-relaxed bg-muted/30 p-2.5 rounded-xl border border-border/50">
                                        "{rem.remark}"
                                    </p>
                                </div>

                                <div className="mt-3 pt-2.5 border-t border-border/60 flex items-center justify-between text-[10px] text-muted-foreground">
                                    <span className="font-semibold text-foreground/80 flex items-center gap-1">
                                        <User className="w-3 h-3 text-primary" />
                                        By {rem.teacherName}
                                    </span>
                                    <span className="flex items-center gap-1 font-mono">
                                        <Calendar className="w-3 h-3 opacity-60" />
                                        {rem.createdAt ? format(parseISO(rem.createdAt), "MMM d, yyyy · p") : "-"}
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Delete Alert Dialog */}
            <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
                <AlertDialogContent className="rounded-3xl p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Remark</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this remark? This will delete it from both the classroom ledger and the student's personal portal view.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => deleteId && deleteMutation.mutate(deleteId)}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl"
                        >
                            {deleteMutation.isPending ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
export default ClassroomRemarksTab;
