import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    BookText, Search, Plus, Trash2, Edit2, Loader2, RefreshCw, MoreVertical
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import AccessDenied from "@/components/auth/AccessDenied";
import PermissionGate from "@/components/auth/PermissionGate";
import type { Subject } from "@/types/erp";

// ─── Schema ───────────────────────────────────────────────────────────────────
const subjectSchema = z.object({
    code: z.string().optional(),
    name: z.string().min(2, "Name is required").max(100),
    type: z.enum(["THEORY", "PRACTICAL", "LAB", "ELECTIVE"]),
    description: z.string().optional(),
    isActive: z.boolean().default(true),
});
type SubjectFormValues = z.infer<typeof subjectSchema>;

// ─── API ──────────────────────────────────────────────────────────────────────
const fetchSubjects = async (search: string): Promise<Subject[]> => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    const { data } = await api.get(`/subjects?${params}`);
    return data.data.subjects as Subject[];
};

// ─── Form Dialog ─────────────────────────────────────────────────────────────
interface SubjectFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editTarget: Subject | null;
    onSuccess: () => void;
}

function SubjectFormDialog({ open, onOpenChange, editTarget, onSuccess }: SubjectFormDialogProps) {
    const isEdit = !!editTarget;

    const form = useForm<SubjectFormValues>({
        resolver: zodResolver(subjectSchema) as any,
        defaultValues: {
            code: editTarget?.code || "",
            name: editTarget?.name || "",
            type: editTarget?.type || "THEORY",
            description: editTarget?.description || "",
            isActive: editTarget?.isActive ?? true,
        },
    });

    const onSubmit = async (values: SubjectFormValues) => {
        try {
            if (isEdit) {
                await api.put(`/subjects/${editTarget.id}`, values);
                toast.success("Subject updated");
            } else {
                await api.post("/subjects", values);
                toast.success("Subject created");
            }
            form.reset();
            onSuccess();
            onOpenChange(false);
        } catch (err: any) {
            toast.error(err.response?.data?.message || `Failed to ${isEdit ? "update" : "create"} subject`);
        }
    };

    const inputCls = "h-9 bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50";
    const labelCls = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

    return (
        <Dialog open={open} onOpenChange={(val) => { if (!val) form.reset(); onOpenChange(val); }}>
            <DialogContent className="sm:max-w-md p-0 rounded-2xl border border-border/80 shadow-2xl bg-white dark:bg-zinc-950 overflow-hidden">
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                        {isEdit ? "Edit Subject" : "Create Subject"}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6">
                    <Form {...form}>
                        <form id="subject-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <div className="grid grid-cols-1 gap-4">
                                <FormField control={form.control} name="type" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelCls}>Type *</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl>
                                                <SelectTrigger className={inputCls}>
                                                    <SelectValue placeholder="Select type" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                <SelectItem value="THEORY">Theory</SelectItem>
                                                <SelectItem value="PRACTICAL">Practical</SelectItem>
                                                <SelectItem value="LAB">Lab</SelectItem>
                                                <SelectItem value="ELECTIVE">Elective</SelectItem>
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="name" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className={labelCls}>Name *</FormLabel>
                                    <FormControl><Input placeholder="e.g. Mathematics" className={inputCls} {...field} /></FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="description" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className={labelCls}>Description</FormLabel>
                                    <FormControl><Input placeholder="Optional details..." className={inputCls} {...field} value={field.value || ""} /></FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />
                            <FormField control={form.control} name="isActive" render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-xl border p-4 shadow-sm bg-zinc-50 dark:bg-zinc-900/50">
                                    <div className="space-y-0.5">
                                        <FormLabel className="text-sm font-semibold">Active Subject</FormLabel>
                                        <div className="text-[11px] text-muted-foreground">Subject is available for classrooms</div>
                                    </div>
                                    <FormControl>
                                        <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                    </FormControl>
                                </FormItem>
                            )} />
                        </form>
                    </Form>
                </div>
                <div className="px-6 py-4 bg-muted/40 dark:bg-purple-950/10 border-t border-border flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl font-medium border-border/80"
                        onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" form="subject-form"
                        className="gap-2 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white rounded-xl font-semibold">
                        {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : isEdit ? "Save Changes" : "Create"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SubjectsPage() {
    const { can } = usePermissions();
    const qc = useQueryClient();

    const [search, setSearch] = useState("");
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editTarget, setEditTarget] = useState<Subject | null>(null);
    const [deleteId, setDeleteId] = useState<string | null>(null);

    const { data: subjects = [], isLoading, isFetching, refetch } = useQuery({
        queryKey: ["subjects", search],
        queryFn: () => fetchSubjects(search),
        staleTime: 60_000,
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/subjects/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["subjects"] });
            toast.success("Subject deleted");
            setDeleteId(null);
        },
        onError: () => {
            toast.error("Failed to delete subject");
            setDeleteId(null);
        },
    });

    const handleCreate = () => {
        setEditTarget(null);
        setIsFormOpen(true);
    };
    const handleEdit = (s: Subject) => {
        setEditTarget(s);
        setIsFormOpen(true);
    };

    if (!can("classrooms", "read")) return <AccessDenied />;

    const typeColor: Record<string, string> = {
        THEORY: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800",
        PRACTICAL: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800",
        LAB: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800",
        ELECTIVE: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800",
    };

    return (
        <motion.div
            className="mx-auto text-foreground transition-colors duration-200 space-y-5"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35 }}
        >
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-border/40">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#5513a1] dark:text-[#8e44ad] flex items-center gap-3">
                        <BookText className="h-6 w-6 md:h-8 md:w-8" />
                        Subjects
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm mt-1.5 max-w-2xl">
                        Manage global subjects that can be assigned to classrooms.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <Button variant="outline" size="icon" className="h-10 w-10 border-border/80 rounded-xl" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? "animate-spin text-[#7f39c2]" : ""}`} />
                    </Button>
                    <PermissionGate resource="classrooms" action="create">
                        <Button onClick={handleCreate} className="gap-2 h-10 px-5 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white rounded-xl shadow-md transition-transform">
                            <Plus className="h-4 w-4 stroke-[2.5]" /> New Subject
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            <div className="relative mb-4 flex gap-3 flex-wrap">
                <div className="relative w-full md:w-72">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search subjects..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="pl-9 h-10 bg-white dark:bg-zinc-900/50 border-purple-100 dark:border-zinc-800 rounded-xl"
                    />
                </div>
            </div>

            <Card className="rounded-2xl border-purple-100 dark:border-zinc-800 bg-white dark:bg-zinc-950/40 shadow-sm overflow-hidden">
                {isLoading ? (
                    <div className="flex justify-center items-center py-24 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-500/50" />
                    </div>
                ) : subjects.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-24 text-center">
                        <div className="h-16 w-16 bg-purple-100 dark:bg-purple-900/20 rounded-full flex items-center justify-center mb-4 text-purple-600 dark:text-purple-400">
                            <BookText className="h-8 w-8" />
                        </div>
                        <h3 className="font-semibold text-lg">No subjects found</h3>
                        <p className="text-muted-foreground text-sm mt-1">Try adjusting your search filters or create a new subject.</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="bg-purple-50/50 dark:bg-zinc-900/50 border-b border-purple-100 dark:border-zinc-800">
                                    <th className="pl-6 py-4 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Code</th>
                                    <th className="py-4 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Name</th>
                                    <th className="py-4 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground hidden sm:table-cell">Type</th>
                                    <th className="py-4 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground hidden md:table-cell">Description</th>
                                    <th className="py-4 text-left font-bold text-xs uppercase tracking-wider text-muted-foreground">Status</th>
                                    <th className="pr-6 py-4 text-right font-bold text-xs uppercase tracking-wider text-muted-foreground">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                <AnimatePresence>
                                    {subjects.map(s => (
                                        <motion.tr key={s.id} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                            className="border-b border-purple-100/50 dark:border-zinc-800/50 hover:bg-purple-50/30 dark:hover:bg-white/[0.02] transition-colors">
                                            <td className="pl-6 py-4 font-mono font-medium text-[13px]">{s.code}</td>
                                            <td className="py-4 font-semibold text-foreground">{s.name}</td>
                                            <td className="py-4 hidden sm:table-cell">
                                                <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md", typeColor[s.type] || typeColor.THEORY)}>
                                                    {s.type}
                                                </Badge>
                                            </td>
                                            <td className="py-4 hidden md:table-cell text-muted-foreground max-w-[200px] truncate">
                                                {s.description || "—"}
                                            </td>
                                            <td className="py-4">
                                                <Badge variant="outline" className={cn("text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md",
                                                    s.isActive ? "border-emerald-200 text-emerald-700 bg-emerald-50 dark:border-emerald-900 dark:text-emerald-400 dark:bg-emerald-900/20"
                                                        : "border-zinc-200 text-zinc-500 bg-zinc-50 dark:border-zinc-800 dark:text-zinc-500 dark:bg-zinc-900/20"
                                                )}>
                                                    {s.isActive ? "Active" : "Inactive"}
                                                </Badge>
                                            </td>
                                            <td className="pr-6 py-4 text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-40 rounded-xl border-purple-100 dark:border-zinc-800 shadow-lg">
                                                        <PermissionGate resource="classrooms" action="update">
                                                            <DropdownMenuItem className="gap-2 text-[13px] font-medium cursor-pointer" onClick={() => handleEdit(s)}>
                                                                <Edit2 className="h-3.5 w-3.5" /> Edit
                                                            </DropdownMenuItem>
                                                        </PermissionGate>
                                                        <PermissionGate resource="classrooms" action="delete">
                                                            <DropdownMenuSeparator className="bg-purple-100 dark:bg-zinc-800" />
                                                            <DropdownMenuItem className="gap-2 text-[13px] font-medium text-destructive cursor-pointer focus:bg-destructive/10" onClick={() => setDeleteId(s.id)}>
                                                                <Trash2 className="h-3.5 w-3.5" /> Delete
                                                            </DropdownMenuItem>
                                                        </PermissionGate>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </td>
                                        </motion.tr>
                                    ))}
                                </AnimatePresence>
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>

            {isFormOpen && (
                <SubjectFormDialog open={isFormOpen} onOpenChange={setIsFormOpen} editTarget={editTarget} onSuccess={() => { qc.invalidateQueries({ queryKey: ["subjects"] }); setIsFormOpen(false); }} />
            )}

            <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
                <AlertDialogContent className="rounded-2xl border-purple-100 dark:border-zinc-800">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Subject?</AlertDialogTitle>
                        <AlertDialogDescription>This action cannot be undone. Removing a subject may affect classrooms that have assigned this subject.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => deleteId && deleteMutation.mutate(deleteId)} className="rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground">
                            {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
