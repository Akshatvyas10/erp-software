import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, FileText, CalendarDays, Plus, Edit, Trash2, MoreVertical } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useAuth, usePermissions } from "@/store/hooks";
import type { ClassroomSubject } from "@/types/erp";

interface Homework {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    status: string;
    subject: {
        id: string;
        name: string;
    };
    teacher?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    createdAt: string;
}

export default function HomeworkTab({ classroomId, classTeacherId, subjects }: { classroomId: string, classTeacherId?: string, subjects?: ClassroomSubject[] }) {
    const qc = useQueryClient();
    const { user } = useAuth();
    const { can, hasRole } = usePermissions();
    
    const [createOpen, setCreateOpen] = useState(false);
    const [editOpen, setEditOpen] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    
    const [formData, setFormData] = useState<{ title: string, description: string, dueDate: Date | undefined, subjectId: string }>({
        title: "", description: "", dueDate: undefined, subjectId: ""
    });
    const [editId, setEditId] = useState<string | null>(null);

    const isClassTeacher = user?.teacherId === classTeacherId;
    const canManageHomework = can("homework", "manage") || isClassTeacher || (subjects || []).some(s => s.teacherId === user?.teacherId);

    const canEditSubjectHomework = (subjectId: string) => {
        if (hasRole("super_admin", "admin")) return true;
        if (isClassTeacher) return true;
        const sub = subjects?.find(s => s.subjectId === subjectId);
        if (sub && sub.teacherId === user?.teacherId) return true;
        return false;
    };

    const { data: homeworks = [], isLoading } = useQuery({
        queryKey: ["homework", classroomId],
        queryFn: async () => {
            const res = await api.get(`/homeworks?classId=${classroomId}`);
            return res.data as Homework[];
        },
    });

    const createMutation = useMutation({
        mutationFn: () => api.post(`/homeworks`, {
            title: formData.title,
            description: formData.description,
            dueDate: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : null,
            subjectId: formData.subjectId,
            classId: classroomId,
            status: 'PUBLISHED'
        }),
        onSuccess: () => {
            toast.success("Homework created");
            qc.invalidateQueries({ queryKey: ["homework", classroomId] });
            setCreateOpen(false);
            setFormData({ title: "", description: "", dueDate: undefined, subjectId: "" });
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to create homework")
    });

    const updateMutation = useMutation({
        mutationFn: () => api.put(`/homeworks/${editId}`, {
            title: formData.title,
            description: formData.description,
            dueDate: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : null,
            subjectId: formData.subjectId,
            classId: classroomId,
            status: 'PUBLISHED'
        }),
        onSuccess: () => {
            toast.success("Homework updated");
            qc.invalidateQueries({ queryKey: ["homework", classroomId] });
            setEditOpen(false);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to update homework")
    });

    const deleteMutation = useMutation({
        mutationFn: () => api.delete(`/homeworks/${deleteId}`),
        onSuccess: () => {
            toast.success("Homework deleted");
            qc.invalidateQueries({ queryKey: ["homework", classroomId] });
            setDeleteId(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.message || "Failed to delete homework")
    });

    const handleEditClick = (hw: Homework) => {
        setFormData({
            title: hw.title,
            description: hw.description || "",
            dueDate: hw.dueDate ? parseISO(hw.dueDate) : undefined,
            subjectId: hw.subject.id
        });
        setEditId(hw.id);
        setEditOpen(true);
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-48">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center bg-card p-4 rounded-xl border shadow-sm">
                <div>
                    <h3 className="font-bold flex items-center gap-2">Homework & Assignments</h3>
                    <p className="text-xs text-muted-foreground">Manage and track student assignments.</p>
                </div>
                {canManageHomework && (
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-xl text-xs h-9 font-semibold">
                                <Plus className="h-3 w-3" /> Assign Homework
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="rounded-3xl p-6 border-border shadow-2xl bg-background max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-xl font-bold">Assign Homework</DialogTitle>
                                <DialogDescription>Create a new assignment for this classroom.</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div>
                                    <Label>Title</Label>
                                    <Input value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} className="mt-1" />
                                </div>
                                <div>
                                    <Label>Subject</Label>
                                    <Select value={formData.subjectId} onValueChange={v => setFormData(prev => ({ ...prev, subjectId: v }))}>
                                        <SelectTrigger className="mt-1"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                        <SelectContent>
                                            {subjects?.map(s => (
                                                <SelectItem key={s.subjectId} value={s.subjectId}>{s.subject?.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label>Due Date</Label>
                                    <Popover modal={true}>
                                        <PopoverTrigger asChild>
                                            <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !formData.dueDate && "text-muted-foreground")}>
                                                <CalendarDays className="mr-2 h-4 w-4" />
                                                {formData.dueDate ? format(formData.dueDate, "PPP") : <span>Pick a date</span>}
                                            </Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 z-[100]">
                                            <Calendar mode="single" selected={formData.dueDate} onSelect={d => setFormData(prev => ({ ...prev, dueDate: d }))} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                                <div>
                                    <Label>Description</Label>
                                    <Textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="mt-1" />
                                </div>
                            </div>
                            <div className="pt-4 flex justify-end gap-2">
                                <Button variant="outline" onClick={() => setCreateOpen(false)} className="rounded-xl">Cancel</Button>
                                <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" disabled={createMutation.isPending || !formData.title || !formData.subjectId || !formData.dueDate} onClick={() => createMutation.mutate()}>
                                    {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : "Assign"}
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {homeworks.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3 border rounded-2xl">
                    <FileText className="h-10 w-10 text-primary/40" />
                    <p className="font-bold text-sm">No assignments found</p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {homeworks.map(hw => {
                        const canEditHw = canEditSubjectHomework(hw.subject.id);
                        return (
                            <div key={hw.id} className="p-5 rounded-2xl border border-border bg-card shadow-sm hover:shadow-md transition-all relative group">
                                <div className="flex justify-between items-start mb-3">
                                    <Badge variant="outline" className="bg-primary/10 text-primary border-none">
                                        {hw.subject.name}
                                    </Badge>
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] uppercase border-border">
                                            {hw.status}
                                        </Badge>
                                        {canEditHw && (
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity rounded-full">
                                                        <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end" className="w-36 rounded-xl">
                                                    <DropdownMenuItem className="cursor-pointer text-xs" onClick={() => handleEditClick(hw)}>
                                                        <Edit className="h-3.5 w-3.5 mr-2" /> Edit
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem className="cursor-pointer text-xs text-destructive focus:bg-destructive/10 focus:text-destructive" onClick={() => setDeleteId(hw.id)}>
                                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                    </div>
                                </div>
                                <h4 className="font-bold text-sm mb-1.5">{hw.title}</h4>
                                {hw.description && <p className="text-xs text-muted-foreground mb-4 line-clamp-2">{hw.description}</p>}
                                <div className="flex items-center justify-between mt-auto pt-2 border-t border-border/40">
                                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                                        <CalendarDays className="h-3.5 w-3.5 text-primary/60" />
                                        Due: <span className="font-medium text-foreground">{hw.dueDate ? format(parseISO(hw.dueDate), 'MMM d, yyyy') : '-'}</span>
                                    </div>
                                    {hw.teacher && (
                                        <div className="text-[11px] text-muted-foreground flex items-center gap-1">
                                            <span className="opacity-70">By</span>
                                            <span className="font-semibold text-foreground truncate max-w-[80px]" title={`${hw.teacher.firstName} ${hw.teacher.lastName}`}>
                                                {hw.teacher.firstName} {hw.teacher.lastName}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Dialog open={editOpen} onOpenChange={setEditOpen}>
                <DialogContent className="rounded-3xl p-6 border-border shadow-2xl bg-background max-w-md">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-bold">Edit Homework</DialogTitle>
                        <DialogDescription>Update assignment details.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pt-4">
                        <div>
                            <Label>Title</Label>
                            <Input value={formData.title} onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))} className="mt-1" />
                        </div>
                        <div>
                            <Label>Subject</Label>
                            <Select value={formData.subjectId} onValueChange={v => setFormData(prev => ({ ...prev, subjectId: v }))}>
                                <SelectTrigger className="mt-1"><SelectValue placeholder="Select Subject" /></SelectTrigger>
                                <SelectContent>
                                    {subjects?.map(s => (
                                        <SelectItem key={s.subjectId} value={s.subjectId}>{s.subject?.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label>Due Date</Label>
                            <Popover modal={true}>
                                <PopoverTrigger asChild>
                                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal mt-1", !formData.dueDate && "text-muted-foreground")}>
                                        <CalendarDays className="mr-2 h-4 w-4" />
                                        {formData.dueDate ? format(formData.dueDate, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0 z-[100]">
                                    <Calendar mode="single" selected={formData.dueDate} onSelect={d => setFormData(prev => ({ ...prev, dueDate: d }))} />
                                </PopoverContent>
                            </Popover>
                        </div>
                        <div>
                            <Label>Description</Label>
                            <Textarea value={formData.description} onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))} className="mt-1" />
                        </div>
                    </div>
                    <div className="pt-4 flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setEditOpen(false)} className="rounded-xl">Cancel</Button>
                        <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl" disabled={updateMutation.isPending || !formData.title || !formData.subjectId || !formData.dueDate} onClick={() => updateMutation.mutate()}>
                            {updateMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : "Save Changes"}
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <AlertDialog open={!!deleteId} onOpenChange={(v) => !v && setDeleteId(null)}>
                <AlertDialogContent className="rounded-3xl p-6">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Homework</AlertDialogTitle>
                        <AlertDialogDescription>Are you sure you want to delete this homework? This action cannot be undone.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteMutation.mutate()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin"/> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
