import { useState, useEffect } from "react";
import { Plus, Building2, Trash2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";
import { motion } from "framer-motion";
import { usePermissions } from "@/store/hooks";
import AccessDenied from "@/components/auth/AccessDenied";

interface Department {
    id: string;
    name: string;
    head: { id: string; teacherId: string; account: { firstName: string; lastName: string } } | null;
}

export default function DepartmentsPage() {
    const { can } = usePermissions();
    const [departments, setDepartments] = useState<Department[]>([]);
    const [loading, setLoading] = useState(true);
    const [isRefetching, setIsRefetching] = useState(false);

    // Create State
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [createName, setCreateName] = useState("");
    const [createHeadId, setCreateHeadId] = useState("");
    const [teachers, setTeachers] = useState<{ id: string, account: { firstName: string, lastName: string }, teacherId: string }[]>([]);
    const [submitting, setSubmitting] = useState(false);

    // Delete State
    const [departmentToDelete, setDepartmentToDelete] = useState<string | null>(null);
    const [deleteTargetName, setDeleteTargetName] = useState("");

    useEffect(() => {
        fetchDepartments();
        if (can("teachers", "create")) fetchTeachers();
    }, []);

    const fetchDepartments = async (quiet = false) => {
        if (quiet) setIsRefetching(true);
        else setLoading(true);
        try {
            const { data } = await api.get("/departments");
            setDepartments(data.data.departments || []);
        } catch (err) {
            toast.error("Failed to load departments");
        } finally {
            setLoading(false);
            setIsRefetching(false);
        }
    };

    const fetchTeachers = async () => {
        try {
            const { data } = await api.get("/teachers?limit=100");
            setTeachers(data.data.teachers || []);
        } catch (err) {
            console.error(err);
        }
    };

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!createName.trim()) {
            toast.error("Department name is required");
            return;
        }
        setSubmitting(true);
        try {
            await api.post("/departments", { name: createName, headId: createHeadId === "none" || !createHeadId ? null : createHeadId });
            toast.success("Department created successfully");
            setIsCreateOpen(false);
            setCreateName("");
            setCreateHeadId("");
            fetchDepartments();
        } catch (err: any) {
            toast.error(err?.response?.data?.message ?? "Failed to create department");
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!departmentToDelete) return;
        try {
            await api.delete(`/departments/${departmentToDelete}`);
            toast.success("Department deleted successfully");
            fetchDepartments();
        } catch (err) {
            toast.error("Failed to delete department");
        } finally {
            setDepartmentToDelete(null);
            setDeleteTargetName("");
        }
    };

    const pageVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    if (!can("teachers", "read")) return <AccessDenied />;

    return (
        <motion.div
            className="space-y-6 mx-auto text-foreground transition-colors duration-200"
            variants={pageVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-border/40 bg-transparent">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#5513a1] dark:text-[#8e44ad] flex items-center gap-3">
                        <Building2 className="h-6 w-6 md:h-8 md:w-8" />
                        Departments Management
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm lg:text-base mt-1.5 max-w-2xl">
                        Manage institutional organizational branches, infrastructure, and assign leadership positions.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 border-border/80 bg-background hover:bg-muted dark:hover:bg-purple-950/20 dark:hover:text-purple-400 transition-all rounded-xl"
                        onClick={() => fetchDepartments(true)}
                        disabled={loading || isRefetching}
                    >
                        <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefetching ? "animate-spin text-[#7f39c2]" : ""}`} />
                    </Button>
                    {can("teachers", "create") && (
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button variant="primary" className="w-full md:w-auto gap-2 h-10 px-5 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                    <Plus className="h-4 w-4 stroke-[2.5]" /> New Department
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md md:max-w-lg flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-background dark:bg-zinc-950 bg-white ">
                                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">Create New Department</DialogTitle>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar p-6 lg:p-8 bg-background dark:bg-zinc-950">
                                    <form onSubmit={handleCreate} id="create-dept-form" className="space-y-5">
                                        <div className="flex items-center gap-2 pb-1.5">
                                            <div className="h-7 w-7 rounded-lg bg-[#5513a1]/10 dark:bg-purple-500/20 flex items-center justify-center">
                                                <Building2 className="h-4 w-4 text-[#5513a1] dark:text-purple-400" />
                                            </div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-[#5513a1] dark:text-purple-400">Department Parameters</h3>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Department Name *</label>
                                            <Input
                                                placeholder="e.g. Department of Computer Science"
                                                className="h-10 md:h-11 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500 text-sm"
                                                value={createName}
                                                onChange={e => setCreateName(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Head of Department (HOD)</label>
                                            <Select value={createHeadId} onValueChange={setCreateHeadId}>
                                                <SelectTrigger className="h-10 md:h-11 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500 text-sm">
                                                    <SelectValue placeholder="Select institution lead (Optional)" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-border/80 bg-background dark:bg-zinc-950">
                                                    <SelectItem value="none" className="rounded-lg">None / Leave Unassigned</SelectItem>
                                                    {teachers.map(t => (
                                                        <SelectItem key={t.id} value={t.id} className="rounded-lg">
                                                            {t.account.firstName} {t.account.lastName} ({t.teacherId})
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                    </form>
                                </div>

                                <div className="p-4 px-6 bg-muted/40 dark:bg-purple-950/10 border-t border-border flex justify-end gap-3">
                                    <Button type="button" variant="outline" className="border-border/80 bg-background hover:bg-muted font-medium rounded-xl" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                    <Button type="submit" form="create-dept-form" disabled={submitting} variant="primary" className="gap-2 h-10 px-6">
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Create"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Table Card Frame */}
            <Card className="shadow-md overflow-hidden border-border/60 bg-card dark:bg-zinc-900/20 rounded-2xl">
                <CardHeader className="py-4 lg:py-5 px-6 border-b border-border/60 bg-muted/20 dark:bg-zinc-900/40">
                    <CardTitle className="text-xs md:text-sm font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                        <span>Institutional Architecture</span>
                        <span className="text-xs font-semibold text-[#5513a1] dark:text-purple-400 bg-[#5513a1]/10 dark:bg-purple-400/10 px-2.5 py-1 rounded-full border border-purple-500/10">
                            {departments.length} structural branch{departments.length !== 1 ? "es" : ""} listed
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="flex justify-center py-20"><Loader2 className="h-7 w-7 animate-spin text-[#5513a1]/70" /></div>
                    ) : departments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Building2 className="h-9 w-9 mb-3 opacity-25 text-[#7f39c2]" />
                            <p className="text-sm font-medium">No structural department records available</p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <Table className="shadow-md rounded-xl w-full min-w-[700px]">
                                <TableHeader className="bg-muted/40 dark:bg-zinc-900/60 border-b border-border/60">
                                    <TableRow className="hover:bg-transparent border-border/60">
                                        <TableHead className="pl-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12 w-[40%]">Department Name</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12 w-[45%]">Head of Department (HOD)</TableHead>
                                        <TableHead className="text-right pr-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {departments.map((dept) => (
                                        <TableRow key={dept.id} className="hover:bg-purple-500/[0.02] dark:hover:bg-purple-500/[0.04] transition-colors border-border/40 group">
                                            <TableCell className="pl-6 py-4.5">
                                                <span className="font-bold text-sm tracking-tight text-foreground group-hover:text-[#5513a1] dark:group-hover:text-purple-400 transition-colors">{dept.name}</span>
                                            </TableCell>
                                            <TableCell className="py-4.5">
                                                {dept.head ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm tracking-tight text-foreground">{dept.head.account.firstName} {dept.head.account.lastName}</span>
                                                        <Badge variant="outline" className="font-mono bg-muted/60 dark:bg-zinc-950 text-foreground border-border/60 px-2.5 py-0.5 rounded-md text-xs tracking-wide">
                                                            {dept.head.teacherId}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:bg-amber-400/10 dark:text-amber-400 border-none px-2 py-0.5 rounded-md">
                                                        Unassigned Lead
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4.5">
                                                {can("teachers", "delete") && (
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 dark:hover:bg-destructive/20 rounded-lg transition-colors"
                                                        onClick={() => {
                                                            setDepartmentToDelete(dept.id);
                                                            setDeleteTargetName(dept.name);
                                                        }}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Delete Confirmation Modal */}
            <AlertDialog open={!!departmentToDelete} onOpenChange={(open) => !open && setDepartmentToDelete(null)}>
                <AlertDialogContent className="w-[calc(100%-2rem)] max-w-[440px] rounded-2xl border border-border dark:border-zinc-800 shadow-xl bg-background dark:bg-zinc-950">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-base font-bold">Remove Structural Branch</AlertDialogTitle>
                        <AlertDialogDescription className="text-xs">
                            Are you completely sure you want to delete the configuration profile for <strong className="text-foreground font-semibold">{deleteTargetName}</strong>? This operational system action cannot be automatically reverted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="gap-2 sm:gap-0">
                        <AlertDialogCancel className="h-8 text-xs rounded-xl dark:hover:border-purple-500/30">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="h-8 text-xs rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90">
                            Delete Department
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}