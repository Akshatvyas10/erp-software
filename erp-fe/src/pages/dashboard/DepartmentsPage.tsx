import { useState, useEffect } from "react";
import { Plus, Building2, Trash2, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
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
        if (can("departments", "create")) fetchTeachers();
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

    if (!can("departments", "read")) return <AccessDenied />;

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
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-primary flex items-center gap-3">
                        <Building2 className="h-6 w-6 md:h-8 md:w-8 text-primary" />
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
                        className="h-10 w-10 border-border/80 bg-background hover:bg-accent hover:text-accent-foreground transition-all rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        onClick={() => fetchDepartments(true)}
                        disabled={loading || isRefetching}
                    >
                        <RefreshCw className={`h-4 w-4 text-muted-foreground ${isRefetching ? "animate-spin text-primary" : ""}`} />
                    </Button>
                    {can("departments", "create") && (
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button className="w-full md:w-auto gap-2 h-10 px-5 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md transition-transform focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                    <Plus className="h-4 w-4 stroke-[2.5]" /> New Department
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md md:max-w-lg flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-background">
                                <DialogHeader className="px-6 py-5 bg-muted/40 border-b border-border">
                                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">Create New Department</DialogTitle>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar p-6 lg:p-8 bg-background">
                                    <form onSubmit={handleCreate} id="create-dept-form" className="space-y-5">
                                        <div className="flex items-center gap-2 pb-1.5">
                                            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                                <Building2 className="h-4 w-4 text-primary" />
                                            </div>
                                            <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Department Parameters</h3>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Department Name *</label>
                                            <Input
                                                placeholder="e.g. Department of Computer Science"
                                                className="h-10 md:h-11 rounded-lg bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none text-sm"
                                                value={createName}
                                                onChange={e => setCreateName(e.target.value)}
                                                required
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Head of Department (HOD)</label>
                                            <Select value={createHeadId} onValueChange={setCreateHeadId}>
                                                <SelectTrigger className="h-10 md:h-11 rounded-lg bg-muted/50 border-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none text-sm">
                                                    <SelectValue placeholder="Select institution lead (Optional)" />
                                                </SelectTrigger>
                                                <SelectContent className="rounded-xl border-border/80 bg-background">
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

                                <div className="p-4 px-6 bg-muted/40 border-t border-border flex justify-end gap-3">
                                    <Button type="button" variant="outline" className="border-border/80 bg-background hover:bg-accent hover:text-accent-foreground font-medium rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                    <Button type="submit" form="create-dept-form" disabled={submitting} className="gap-2 h-10 px-6 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
                                        {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm & Create"}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </div>

            {/* Table Card Frame */}
            <Card className="shadow-sm overflow-hidden border-border bg-card rounded-2xl">
                <CardHeader className="py-4 lg:py-5 px-6 border-b border-border/60 bg-muted/20">
                    <CardTitle className="text-xs md:text-sm font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                        <span>Institutional Architecture</span>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                            {departments.length} structural branch{departments.length !== 1 ? "es" : ""} listed
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {loading ? (
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <Table className="w-full min-w-[700px]">
                                <TableHeader className="bg-muted/40 border-b border-border/60">
                                    <TableRow className="border-border/60">
                                        <TableHead className="pl-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12 w-[40%]">Department Name</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12 w-[45%]">Head of Department (HOD)</TableHead>
                                        <TableHead className="text-right pr-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i} className="border-border/40">
                                            <TableCell className="pl-6 py-4.5">
                                                <Skeleton className="h-5 w-40" />
                                            </TableCell>
                                            <TableCell className="py-4.5">
                                                <div className="flex items-center gap-2">
                                                    <Skeleton className="h-5 w-32" />
                                                    <Skeleton className="h-5 w-16 rounded-md" />
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4.5">
                                                <Skeleton className="h-8 w-8 rounded-lg ml-auto" />
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    ) : departments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
                            <Building2 className="h-9 w-9 mb-3 opacity-25 text-primary" />
                            <p className="text-sm font-medium">No structural department records available</p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <Table className="shadow-sm rounded-xl w-full min-w-[700px]">
                                <TableHeader className="bg-muted/40 border-b border-border/60">
                                    <TableRow className="hover:bg-transparent border-border/60">
                                        <TableHead className="pl-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12 w-[40%]">Department Name</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12 w-[45%]">Head of Department (HOD)</TableHead>
                                        <TableHead className="text-right pr-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {departments.map((dept) => (
                                        <TableRow key={dept.id} className="hover:bg-muted/30 transition-colors border-border/40 group">
                                            <TableCell className="pl-6 py-4.5">
                                                <span className="font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">{dept.name}</span>
                                            </TableCell>
                                            <TableCell className="py-4.5">
                                                {dept.head ? (
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-semibold text-sm tracking-tight text-foreground">{dept.head.account.firstName} {dept.head.account.lastName}</span>
                                                        <Badge variant="outline" className="font-mono bg-muted/60 text-foreground border-border/60 px-2.5 py-0.5 rounded-md text-xs tracking-wide">
                                                            {dept.head.teacherId}
                                                        </Badge>
                                                    </div>
                                                ) : (
                                                    <Badge variant="outline" className="text-[10px] font-bold uppercase tracking-wider bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 px-2 py-0.5 rounded-md">
                                                        Unassigned Lead
                                                    </Badge>
                                                )}
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4.5">
                                                {can("departments", "delete") && (
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
                <AlertDialogContent className="w-[95vw] sm:max-w-lg mx-auto rounded-3xl p-6 border-border shadow-2xl bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">Remove Structural Branch</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2">
                            Are you completely sure you want to delete the configuration profile for <strong className="text-foreground font-semibold">{deleteTargetName}</strong>? This operational system action cannot be automatically reverted.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="h-11 rounded-xl font-semibold border-border/50 bg-background hover:bg-accent text-foreground transition-colors">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDelete} className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors">
                            Delete Department
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}