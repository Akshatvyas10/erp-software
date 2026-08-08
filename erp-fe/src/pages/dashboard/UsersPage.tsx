import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
    Users, Plus, Search, Eye, UserCheck, UserX,
    Loader2, RefreshCw, CheckCircle2, EyeOff, MoreVertical, Trash2, ShieldCheck, Mail, Edit, CalendarIcon
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
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

import UserFormDialog from "@/components/users/UserFormDialog";

export default function UsersPage() {
    const { can } = usePermissions();
    const navigate = useNavigate();
    const qc = useQueryClient();

    const [page, setPage] = useState(1);
    const [search, setSearch] = useState("");
    const [status, setStatus] = useState("");

    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [editUser, setEditUser] = useState<User | null>(null);

    const [confirmState, setConfirmState] = useState<{ isOpen: boolean; userId: string | null; userName: string }>({
        isOpen: false,
        userId: null,
        userName: ""
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

    const openEditDialog = (user: User) => {
        setEditUser(user);
        setIsCreateOpen(true);
    };

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
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-primary flex items-center gap-3">
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
                        className="h-10 w-10 border-border/80 bg-background hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-all duration-200 rounded-xl"
                        onClick={() => refetch()}
                        disabled={isFetching}
                    >
                        <RefreshCw className={`h-4 w-4 text-muted-foreground ${isFetching ? "animate-spin text-primary" : ""}`} />
                    </Button>
                    <PermissionGate resource="users" action="create">
                        <Button onClick={() => setIsCreateOpen(true)} variant="primary" className="w-full md:w-auto gap-2 h-10 px-5 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Plus className="h-4 w-4 stroke-[2.5]" /> New User
                        </Button>
                        <UserFormDialog 
                            isOpen={isCreateOpen}
                            onOpenChange={(v) => {
                                setIsCreateOpen(v);
                                if (!v) setEditUser(null);
                            }}
                            editUser={editUser}
                            onSuccess={() => qc.invalidateQueries({ queryKey: ["users"] })}
                        />
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
            <Card className="p-3 lg:p-4 border-border/60 shadow-sm bg-card rounded-2xl">
                <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
                    <div className="relative flex-1 max-w-full lg:max-w-xl">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by profile name, ERP identity, or email..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setPage(1); }}
                            className="pl-9 h-11 border-none shadow-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none bg-muted/60 rounded-xl hover:bg-muted transition-colors duration-200 text-sm"
                        />
                    </div>
                    <div className="hidden lg:block w-px h-6 bg-border/80"></div>
                    <div className="flex gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
                        {["", "active", "inactive"].map(s => (
                            <Button
                                key={s} size="sm" variant={status === s ? "default" : "ghost"}
                                className={`h-9 px-4 text-xs font-bold capitalize rounded-xl transition-all duration-200 shrink-0 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none
                                    ${status !== s
                                        ? "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                        : "bg-primary hover:bg-primary/90 border-0 text-primary-foreground shadow-sm"}`}
                                onClick={() => { setStatus(s); setPage(1); }}
                            >
                                {s === "" ? "All Statuses" : s}
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Main Institutional Directory Table */}
            <Card className="shadow-md overflow-hidden border-border/60 bg-card rounded-2xl">
                <CardHeader className="py-4 lg:py-5 px-6 border-b border-border/60 bg-muted/20">
                    <CardTitle className="text-xs md:text-sm font-bold uppercase tracking-wider text-foreground flex items-center justify-between">
                        <span>Institutional Directory</span>
                        <span className="text-xs font-semibold text-primary bg-primary/10 px-2.5 py-1 rounded-full border border-primary/20">
                            {pagination.total} records total
                        </span>
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="flex flex-col items-center justify-center py-28 gap-3 text-muted-foreground">
                            <Loader2 className="h-9 w-9 animate-spin text-primary" />
                            <p className="text-sm font-medium animate-pulse">Loading core system directory...</p>
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-28 text-muted-foreground px-4 text-center">
                            <div className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4 border border-border/40">
                                <Users className="h-8 w-8 text-muted-foreground/40" />
                            </div>
                            <p className="text-base font-bold text-foreground">No account matching filters</p>
                            <p className="text-xs lg:text-sm mt-1 max-w-xs text-muted-foreground">Try modifying your text criteria search or switching context metrics toggles.</p>
                        </div>
                    ) : (
                        <div className="w-full overflow-x-auto custom-scrollbar">
                            <Table className="shadow-md rounded-xl w-full min-w-[950px]">
                                <TableHeader className="bg-muted/40 border-b border-border/60">
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
                                        <TableRow key={user.id} className="hover:bg-muted/30 transition-colors border-border/40 group">
                                            <TableCell className="pl-6 py-4.5">
                                                <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(`/dashboard/users/${user.id}`)}>
                                                    <Avatar className="h-9 w-9 border border-primary/20 shadow-sm transition-transform group-hover:scale-105 duration-200">
                                                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                                            {user.firstName[0].toUpperCase()}{user.lastName[0].toUpperCase()}
                                                        </AvatarFallback>
                                                    </Avatar>
                                                    <div>
                                                        <p className="font-bold text-sm tracking-tight text-foreground group-hover:text-primary transition-colors">
                                                            {user.firstName} {user.lastName}
                                                        </p>
                                                    </div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-4.5">
                                                <Badge variant="outline" className="font-mono bg-muted/60 text-foreground border-border/60 px-2.5 py-0.5 rounded-md text-xs tracking-wide">
                                                    {user.userId}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-sm font-medium text-muted-foreground py-4.5 truncate max-w-[220px]">
                                                {user.email}
                                            </TableCell>
                                            <TableCell className="py-4.5">
                                                <div className="flex flex-wrap gap-1.5 max-w-[260px]">
                                                    {(user.Roles ?? []).map(r => (
                                                        <Badge key={r.id} variant="secondary" className="text-[10px] font-bold uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 rounded-md">
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
                                                    className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 border border-transparent rounded-md
                                                        ${user.isActive
                                                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                                                            : "bg-muted text-muted-foreground border-border"}`}>
                                                    {user.isActive ? "Active" : "Disabled"}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right pr-6 py-4.5">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring hover:bg-accent rounded-lg">
                                                            <MoreVertical className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end" className="w-44 rounded-xl shadow-xl border-border/80 bg-background">
                                                        <DropdownMenuItem className="text-xs font-semibold gap-2 p-2.5 cursor-pointer focus:bg-accent" onClick={() => navigate(`/dashboard/users/${user.id}`)}>
                                                            <Eye className="h-4 w-4 text-muted-foreground" /> View Details
                                                        </DropdownMenuItem>
                                                        <PermissionGate resource="users" action="update">
                                                            <DropdownMenuSeparator className="border-border/60" />
                                                            <DropdownMenuItem className="text-xs font-semibold gap-2 p-2.5 cursor-pointer focus:bg-accent" onClick={() => openEditDialog(user)}>
                                                                <Edit className="h-4 w-4 text-muted-foreground" /> Edit Profile
                                                            </DropdownMenuItem>
                                                        </PermissionGate>
                                                        <PermissionGate resource="users" action="manage">
                                                            <DropdownMenuSeparator className="border-border/60" />
                                                            <DropdownMenuItem
                                                                className={`text-xs font-semibold gap-2 p-2.5 cursor-pointer 
                                                                    ${user.isActive
                                                                        ? "text-amber-600 dark:text-amber-400 focus:bg-amber-500/10"
                                                                        : "text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10"}`}
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
                                                                className="text-xs font-semibold gap-2 p-2.5 text-destructive focus:bg-destructive/10 cursor-pointer"
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
                <AlertDialogContent className="w-[95vw] sm:max-w-lg mx-auto rounded-3xl p-6 border-border shadow-2xl bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">
                            Delete User?
                        </AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2">
                            This will permanently delete the account of <span className="font-bold text-foreground">{confirmState.userName}</span> and all associated data.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="h-11 rounded-xl font-semibold border-border/50 bg-background hover:bg-accent text-foreground transition-colors">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmState.userId && deleteUserMutation.mutate(confirmState.userId)}
                            className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90 transition-colors"
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
