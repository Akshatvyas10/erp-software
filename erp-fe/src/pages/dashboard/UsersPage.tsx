import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Users, Plus, Search, Eye, UserCheck, UserX,
    Loader2, RefreshCw, CheckCircle2, EyeOff, MoreVertical, Trash2, ShieldCheck, Mail
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Table, TableBody, TableCell, TableHead,
    TableHeader, TableRow,
} from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel,
    AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
    AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import type { User, Pagination, Role } from "@/types/erp";
import { motion } from "framer-motion";

const fetchUsers = async (page: number, search: string, status: string) => {
    const params = new URLSearchParams({ page: String(page), limit: "15" });
    if (search) params.set("search", search);
    if (status) params.set("status", status);
    const { data } = await api.get(`/users?${params}`);
    return data.data as { users: User[]; pagination: Pagination };
};

const userSchema = z.object({
    userId: z.string().min(1, "User ID is required").max(20),
    email: z.email("Valid email required"),
    password: z.string().min(8, "Min 8 characters"),
    firstName: z.string().min(1, "First name required"),
    lastName: z.string().min(1, "Last name required"),
});
type UserFormValues = z.infer<typeof userSchema>;

export default function UsersPage() {
    const { can } = usePermissions();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [showPw, setShowPw] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; userId: string | null; userName: string }>({
        isOpen: false,
        userId: null,
        userName: ""
    });

    const { data: roles } = useQuery<Role[]>({
        queryKey: ["roles", "simple"],
        queryFn: async () => { const { data } = await api.get("/roles"); return data.data.roles; },
        enabled: can("users", "create"),
    });

    const { data, isLoading, isFetching, refetch } = useQuery({
        queryKey: ["users", page, search, status],
        queryFn: () => fetchUsers(page, search, status),
        enabled: can("users", "read"),
        staleTime: 60_000,
    });

    const toggleActive = useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) =>
            api.patch(`/users/${id}/${active ? "activate" : "deactivate"}`),
        onSuccess: (_, { active }) => {
            qc.invalidateQueries({ queryKey: ["users"] });
            toast.success(`User ${active ? "activated" : "deactivated"}`);
        },
        onError: () => toast.error("Failed to update status"),
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["users"] });
            toast.success("User deleted successfully");
            setConfirmState({ isOpen: false, userId: null, userName: "" });
        },
        onError: () => toast.error("Failed to delete user"),
    });

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues: { userId: "", email: "", password: "", firstName: "", lastName: "" },
    });

    const onSubmit = async (values: UserFormValues) => {
        try {
            const { data } = await api.post("/users", { ...values, roleIds: selectedRoles });
            toast.success(`User ${data.data.user.userId} created successfully`);
            setIsCreateOpen(false);
            form.reset();
            setSelectedRoles([]);
            qc.invalidateQueries({ queryKey: ["users"] });
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to create user");
        }
    };

    const toggleRole = (id: number) =>
        setSelectedRoles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    if (!can("users", "read")) return <AccessDenied />;

    const users = data?.users ?? [];
    const pagination = data?.pagination ?? { total: 0, page: 1, limit: 15, pages: 1 };

    const pageVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

    return (
        <motion.div
            className="mx-auto  text-foreground transition-colors duration-200"
            variants={pageVariants}
            initial="hidden"
            animate="visible"
        >
            {/* Header Section */}
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between pb-4 border-b border-border/40 bg-transparent">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-[#5513a1] dark:text-[#8e44ad] flex items-center gap-3">
                        Users Management
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm lg:text-base mt-1.5 max-w-2xl">
                        Manage and assign roles for all institution profiles and system members.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <Button
                        variant="outline"
                        size="icon"
                        className="h-10 w-10 border-border/80 bg-background hover:bg-muted dark:hover:bg-purple-950/20 dark:hover:text-purple-400 transition-all rounded-xl"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? "animate-spin text-[#7f39c2]" : ""}`} />
                    </Button>
                    <PermissionGate resource="users" action="create">
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button variant="primary" className="w-full md:w-auto gap-2 h-10 px-5 transition-all hover:scale-[1.02] active:scale-[0.98]">
                                    <Plus className="h-4 w-4 stroke-[2.5]" /> New User
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-2xl md:max-w-3xl flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-background dark:bg-zinc-950">
                                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                                    <DialogTitle className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                                        Create New User Profile
                                    </DialogTitle>
                                </DialogHeader>

                                <div className="flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar p-6 lg:p-8 bg-background dark:bg-zinc-950">
                                    <Form {...form}>
                                        <form id="create-user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
                                            {/* Identity Details Row */}
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                                                    <div className="h-7 w-7 rounded-lg bg-[#5513a1]/10 dark:bg-purple-500/20 flex items-center justify-center">
                                                        <Users className="h-4 w-4 text-[#5513a1] dark:text-purple-400" />
                                                    </div>
                                                    <h3 className="text-xs font-bold uppercase tracking-wider text-[#5513a1] dark:text-purple-400">Identity Details</h3>
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <FormField control={form.control} name="firstName" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-semibold text-muted-foreground">First Name *</FormLabel>
                                                            <FormControl><Input className="h-10 md:h-11 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500" placeholder="e.g. John" {...field} /></FormControl>
                                                            <FormMessage className="text-xs" />
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="lastName" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-semibold text-muted-foreground">Last Name *</FormLabel>
                                                            <FormControl><Input className="h-10 md:h-11 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500" placeholder="e.g. Doe" {...field} /></FormControl>
                                                            <FormMessage className="text-xs" />
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                    <FormField control={form.control} name="userId" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-semibold text-muted-foreground">System ID *</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <ShieldCheck className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                    <Input className="h-10 md:h-11 pl-9 font-mono text-sm rounded-lg bg-background border-border/80 focus-visible:ring-purple-500" placeholder="e.g. U12345" {...field} />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage className="text-xs" />
                                                        </FormItem>
                                                    )} />
                                                    <FormField control={form.control} name="email" render={({ field }) => (
                                                        <FormItem>
                                                            <FormLabel className="text-xs font-semibold text-muted-foreground">Email Address *</FormLabel>
                                                            <FormControl>
                                                                <div className="relative">
                                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                    <Input type="email" className="h-10 md:h-11 pl-9 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500" placeholder="john@example.com" {...field} />
                                                                </div>
                                                            </FormControl>
                                                            <FormMessage className="text-xs" />
                                                        </FormItem>
                                                    )} />
                                                </div>
                                                <FormField control={form.control} name="password" render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel className="text-xs font-semibold text-muted-foreground">Security Password *</FormLabel>
                                                        <FormControl>
                                                            <div className="relative">
                                                                <Input type={showPw ? "text" : "password"} className="h-10 md:h-11 pr-10 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500" placeholder="Minimum 8 characters" {...field} />
                                                                <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#7f39c2] transition-colors">
                                                                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                                </button>
                                                            </div>
                                                        </FormControl>
                                                        <FormMessage className="text-xs" />
                                                    </FormItem>
                                                )} />
                                            </div>

                                            {/* Roles Layout Section */}
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                                    <div className="flex items-center gap-2">
                                                        <div className="h-7 w-7 rounded-lg bg-[#5513a1]/10 dark:bg-purple-500/20 flex items-center justify-center">
                                                            <ShieldCheck className="h-4 w-4 text-[#5513a1] dark:text-purple-400" />
                                                        </div>
                                                        <h3 className="text-xs font-bold uppercase tracking-wider text-[#5513a1] dark:text-purple-400">System Roles</h3>
                                                    </div>
                                                    {selectedRoles.length > 0 && (
                                                        <Badge variant="secondary" className="bg-[#5513a1]/10 text-[#5513a1] dark:bg-purple-400/20 dark:text-purple-300 border border-purple-500/20">
                                                            {selectedRoles.length} Selected
                                                        </Badge>
                                                    )}
                                                </div>
                                                {!roles ? (
                                                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#7f39c2]" /></div>
                                                ) : (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                                                        {roles.map((role) => {
                                                            const isChecked = selectedRoles.includes(role.id);
                                                            return (
                                                                <label key={role.id} className={
                                                                    `flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none
                                                                    ${isChecked
                                                                        ? "border-purple-600 bg-purple-500/5 dark:border-purple-500 dark:bg-[#5513a1]/10 shadow-sm"
                                                                        : "border-border/80 bg-background hover:border-purple-500/40 hover:bg-purple-500/5"}`
                                                                }>
                                                                    <Checkbox checked={isChecked} onCheckedChange={() => toggleRole(role.id)} className="mt-0.5 data-[state=checked]:bg-purple-600 data-[state=checked]:border-purple-600" />
                                                                    <div className="space-y-1">
                                                                        <p className={`text-sm font-bold capitalize tracking-tight ${isChecked ? "text-[#5513a1] dark:text-purple-400" : "text-foreground"}`}>
                                                                            {role.name.replace(/_/g, " ")}
                                                                        </p>
                                                                        {role.description && <p className="text-[11px] lg:text-xs leading-snug text-muted-foreground line-clamp-2">{role.description}</p>}
                                                                    </div>
                                                                </label>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        </form>
                                    </Form>
                                </div>
                                <div className="p-4 px-6 bg-muted/40 dark:bg-purple-950/10 border-t border-border flex justify-end gap-3">
                                    <Button type="button" variant="outline" className="border-border/80 bg-background hover:bg-muted font-medium rounded-xl" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
                                    <Button type="submit" form="create-user-form" variant="primary" className="gap-2 h-10 px-6">
                                        {form.formState?.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> Create Profile</>}
                                    </Button>
                                </div>
                            </DialogContent>
                        </Dialog>
                    </PermissionGate>
                </div>
            </div>

            {/* Metrics Snapshot Grid */}
            {/* <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {[
                    { label: "Total Managed Profiles", value: pagination.total, color: "text-[#7f39c2]", bg: "bg-[#5513a1]/10 dark:bg-purple-500/20" },
                    { label: "Active Operations", value: users.filter(u => u.isActive).length, color: "text-emerald-500", bg: "bg-emerald-500/10 dark:bg-emerald-500/20" },
                    { label: "Disabled Accounts", value: users.filter(u => !u.isActive).length, color: "text-rose-500", bg: "bg-rose-500/10 dark:bg-rose-500/20" },
                ].map(({ label, value, color, bg }) => (
                    <Card key={label} className="border-border/60 bg-card dark:bg-zinc-900/50 rounded-xl hover:shadow-sm dark:hover:border-purple-500/30 transition-all group duration-200">
                        <CardContent className="p-3 flex items-center gap-3">
                            <div className={`p-2 rounded-xl ${bg} transition-transform group-hover:scale-105 duration-200 shrink-0`}>
                                <Users className={`h-4 w-4 ${color}`} />
                            </div>
                            <div className="min-w-0">
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground truncate">{label}</p>
                                <p className="text-xl font-bold tracking-tight text-foreground leading-none mt-0.5">{value}</p>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div> */}

            {/* Filters Dashboard Toolbar */}
            <Card className="p-3 lg:p-4 border-border/60 shadow-sm bg-card dark:bg-zinc-900/40 rounded-2xl">
                <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                    <div className="relative flex-1 max-w-full lg:max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by profile name, ERP identity, or email..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9 h-11 border-none shadow-none focus-visible:ring-1 focus-visible:ring-purple-500 bg-muted/60 dark:bg-zinc-950/60 rounded-xl hover:bg-muted dark:hover:bg-zinc-950 transition-colors text-sm"
                        />
                    </div>
                    <div className="hidden lg:block w-px h-6 bg-border/80"></div>
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                        {["", "active", "inactive"].map(s => (
                            <Button
                                key={s} size="sm" variant={status === s ? "default" : "ghost"}
                                className={`h-9 px-4 text-xs font-bold capitalize rounded-xl transition-all shrink-0
                                    ${status !== s
                                        ? "text-muted-foreground hover:bg-muted dark:hover:bg-purple-950/10 dark:hover:text-purple-400"
                                        : "bg-gradient-to-b from-[#5513a1] to-[#3a0d6e] hover:opacity-90 border-0 text-white shadow-sm shadow-purple-600/10 dark:bg-purple-700 dark:hover:bg-purple-600"}`}
                                onClick={() => { setStatus(s); setPage(1); }}
                            >
                                {s === "" ? "All Statuses" : s}
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Main Institutional Directory Table */}
            <Card className="shadow-md overflow-hidden border-border/60 bg-card dark:bg-zinc-900/20 rounded-2xl">
                <CardHeader className="py-4 lg:py-5 px-6 border-b border-border/60 bg-muted/20 dark:bg-zinc-900/40">
                    <CardTitle className="text-xs md:text-sm font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                        <span>Institutional Directory</span>
                        <span className="text-xs font-semibold text-[#5513a1] dark:text-purple-400 bg-[#5513a1]/10 dark:bg-purple-400/10 px-2.5 py-1 rounded-full border border-purple-500/10">
                            {pagination.total} records total
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-28 gap-3 text-muted-foreground">
                            <Loader2 className="h-9 w-9 animate-spin text-[#5513a1] dark:text-purple-400" />
                            <p className="text-sm font-medium animate-pulse">Loading core system directory...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-28 text-muted-foreground px-4 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-muted dark:bg-zinc-900 flex items-center justify-center mb-4 border border-border/40">
                                <Users className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                            <p className="text-base font-bold text-foreground">No account matching filters</p>
                            <p className="text-xs lg:text-sm mt-1 max-w-xs text-muted-foreground">Try modifying your text criteria search or switching context metrics toggles.</p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <Table className="shadow-md rounded-xl w-full min-w-[950px]">
                                <TableHeader className="bg-muted/40 dark:bg-zinc-900/60 border-b border-border/60">
                                    <TableRow className="hover:bg-transparent border-border/60">
                                        <TableHead className="pl-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">User Profile</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">System ID</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Email Address</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Assigned Roles</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Last Active</TableHead>
                                        <TableHead className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Status</TableHead>
                                        <TableHead className="text-right pr-6 text-[11px] font-bold uppercase tracking-wider text-muted-foreground h-12">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id} className="hover:bg-purple-500/[0.02] dark:hover:bg-purple-500/[0.04] transition-colors border-border/40 group">
                                            <TableCell className="pl-6 py-4.5">
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-9 w-9 border border-purple-500/20 shadow-sm transition-transform group-hover:scale-105 duration-200">
                                                        <AvatarFallback className="bg-[#5513a1]/10 text-[#5513a1] dark:bg-purple-400/20 dark:text-purple-300 text-xs font-bold">
                                                            {user.firstName[0].toUpperCase()}{user.lastName[0].toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-bold text-sm tracking-tight text-foreground group-hover:text-[#5513a1] dark:group-hover:text-purple-400 transition-colors">
                                                            {user.firstName} {user.lastName}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4.5">
                                                <Badge variant="outline" className="font-mono bg-muted/60 dark:bg-zinc-950 text-foreground border-border/60 px-2.5 py-0.5 rounded-md text-xs tracking-wide">
                                                    {user.userId}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground py-4.5 truncate max-w-[220px]">
                                                {user.email}
                                            </TableCell>
                                            <TableCell className="py-4.5">
                                                <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                                                    {(user.Roles ?? []).map(r => (
                                                        <Badge key={r.id} variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-purple-500/5 text-[#5513a1] border border-purple-500/10 dark:bg-purple-400/10 dark:text-purple-300 px-2 py-0.5 rounded-md">
                                                            {r.name.replace(/_/g, " ")}
                                                        </Badge>
                                                    ))}
                                                    {(user.Roles ?? []).length === 0 && <span className="text-xs text-muted-foreground/60 font-medium italic">No roles assigned</span>}
                                                </div>
                                            </TableCell>
                                            <TableCell className="text-xs font-medium text-muted-foreground py-4.5">
                                                {user.lastLoginAt
                                                    ? new Date(user.lastLoginAt).toLocaleDateString(undefined, { dateStyle: 'medium' })
                                                    : <span className="text-muted-foreground/40 italic">Never logged in</span>}
                                            </TableCell>
                                            <TableCell className="py-4.5">
                                                <Badge variant="outline"
                                                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border-none rounded-md
                                                        ${user.isActive
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-400"
                                                            : "bg-muted dark:bg-zinc-950 text-muted-foreground"}`}>
                                                    {user.isActive ? "Active" : "Disabled"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4.5">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground dark:hover:bg-zinc-900 rounded-lg">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl border-border/80 bg-background dark:bg-zinc-950">
                                                        <DropdownMenuItem className="text-xs font-semibold gap-2 p-2.5 cursor-pointer focus:bg-muted dark:focus:bg-zinc-900" onClick={() => navigate(`/dashboard/users/${user.id}`)}>
                                                            <Eye className="h-4 w-4 text-muted-foreground" /> View Details
                                                        </DropdownMenuItem>
                                                        <PermissionGate resource="users" action="manage">
                                                            <DropdownMenuSeparator className="border-border/60" />
                                                            <DropdownMenuItem
                                                                className={`text-xs font-semibold gap-2 p-2.5 cursor-pointer 
                                                                    ${user.isActive
                                                                        ? "text-amber-600 focus:bg-amber-500/5 focus:text-amber-700 dark:text-amber-500 dark:focus:bg-amber-500/10"
                                                                        : "text-emerald-600 focus:bg-emerald-500/5 focus:text-emerald-700 dark:text-emerald-500 dark:focus:bg-emerald-500/10"}`}
                                                                onClick={() => toggleActive.mutate({ id: user.id, active: !user.isActive })}
                                                                disabled={toggleActive.isPending}
                                                            >
                                                                {user.isActive ? (
                                                                    <><UserX className="h-4 w-4" /> Deactivate</>
                                                                ) : (
                                                                    <><UserCheck className="h-4 w-4" /> Activate</>
                                                                )}
                                                            </DropdownMenuItem>
                                                            <DropdownMenuSeparator className="border-border/60" />
                                                            <DropdownMenuItem
                                                                className="text-xs font-semibold gap-2 p-2.5 text-destructive focus:bg-destructive/5 focus:text-destructive dark:focus:bg-destructive/10 cursor-pointer"
                                                                onClick={() => setConfirmState({
                                                                    isOpen: true,
                                                                    userId: user.id,
                                                                    userName: `${user.firstName} ${user.lastName}`
                                                                })}
                                                            >
                                                                <Trash2 className="h-4 w-4" /> Delete User
                                                            </DropdownMenuItem>
                                                        </PermissionGate>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    )}
                </CardContent>
            </Card>

            <AlertDialog open={confirmState.isOpen} onOpenChange={v => !v && setConfirmState(prev => ({ ...prev, isOpen: false }))}>
                <AlertDialogContent className="rounded-xl border border-purple-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-purple-950 dark:text-zinc-50 font-bold">
                            Delete User?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-purple-900/70 dark:text-zinc-400">
                            This will permanently delete the account of <span className="font-bold text-foreground">{confirmState.userName}</span> and all associated data.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="bg-purple-100/50 dark:bg-zinc-900 text-purple-950 dark:text-zinc-300 hover:bg-purple-100 dark:hover:bg-zinc-800 border-none h-10 px-4 rounded-lg font-semibold">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmState.userId && deleteUserMutation.mutate(confirmState.userId)}
                            className="bg-destructive hover:bg-destructive/90 text-white h-10 px-4 rounded-lg font-semibold"
                        >
                            {deleteUserMutation.isPending
                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                : "Delete User"
                            }
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}