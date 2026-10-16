import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { User, Role } from "@/types/erp";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";

// Reusable Components
import { DataTable, type Column } from "@/components/common/DataTable";
import { PageHeader } from "@/components/common/PageHeader";
import UserFormDialog from "@/components/users/UserFormDialog";

// UI Components
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Icons
import {
    Plus,
    Search,
    MoreHorizontal,
    Edit,
    Trash2,
    Eye,
    Shield,
    Users,
    RefreshCw,
    UserCheck,
    UserX,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import AccessDenied from "@/components/auth/AccessDenied";
import { motion } from "framer-motion";
import { useUsersQuery } from "@/features/users/api/useUsersQuery";

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
        userName: "",
    });

    const { data, isLoading, isFetching, refetch } = useUsersQuery(
        { page, limit: 15, search, role: status },
        can("users", "read")
    );

    const toggleActive = useMutation({
        mutationFn: ({ id, active }: { id: string; active: boolean }) =>
            api.patch(`/users/${id}/${active ? "activate" : "deactivate"}`),
        onSuccess: (_, { active }) => {
            toast.success(`User ${active ? "activated" : "deactivated"} successfully`);
            qc.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to update user status");
        },
    });

    const deleteUserMutation = useMutation({
        mutationFn: (id: string) => api.delete(`/users/${id}`),
        onSuccess: () => {
            toast.success("User deleted successfully");
            setConfirmState({ isOpen: false, userId: null, userName: "" });
            qc.invalidateQueries({ queryKey: ["users"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete user");
        },
    });

    if (!can("users", "read")) return <AccessDenied />;

    const users = data?.users ?? [];
    const pagination = data?.pagination ?? { total: 0, page: 1, limit: 15, pages: 1 };

    // Columns Definition for Generic DataTable
    const columns: Column<User>[] = [
        {
            header: "User Profile",
            cell: (user) => (
                <div
                    className="flex items-center gap-3 cursor-pointer"
                    onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/dashboard/users/${user.id}`);
                    }}
                >
                    <Avatar className="h-9 w-9 border border-primary/20 shadow-xs shrink-0">
                        <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                            {user.firstName[0]?.toUpperCase()}{user.lastName[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                        <p className="font-semibold text-sm tracking-tight text-foreground hover:text-primary transition-colors truncate">
                            {user.firstName} {user.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground font-mono">{user.userId}</p>
                    </div>
                </div>
            ),
        },
        {
            header: "Email Address",
            accessorKey: "email",
            className: "text-muted-foreground text-xs",
            mobileHide: true,
        },
        {
            header: "Assigned Roles",
            cell: (user) => (
                <div className="flex flex-wrap gap-1.5">
                    {user.Roles && user.Roles.length > 0 ? (
                        user.Roles.map((role: Role) => (
                            <Badge
                                key={role.id}
                                variant="secondary"
                                className="bg-muted text-foreground border border-border/60 text-[11px] font-medium"
                            >
                                <Shield className="h-3 w-3 mr-1 text-primary opacity-80" />
                                {role.name.replace(/_/g, " ")}
                            </Badge>
                        ))
                    ) : (
                        <span className="text-xs text-muted-foreground italic">No roles</span>
                    )}
                </div>
            ),
        },
        {
            header: "Last Active",
            cell: (user) => (
                <span className="text-xs text-muted-foreground">
                    {user.lastLoginAt
                        ? new Date(user.lastLoginAt).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                          })
                        : "Never"}
                </span>
            ),
            mobileHide: true,
        },
        {
            header: "Status",
            cell: (user) => (
                <Badge
                    variant="outline"
                    className={`font-semibold text-[11px] px-2.5 py-0.5 rounded-full ${
                        user.isActive
                            ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                            : "bg-destructive/10 text-destructive border-destructive/20"
                    }`}
                >
                    {user.isActive ? "Active" : "Disabled"}
                </Badge>
            ),
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (user) => (
                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="h-8 w-8 rounded-lg hover:bg-muted">
                                <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-xl shadow-lg border-border">
                            <DropdownMenuLabel className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">
                                Actions
                            </DropdownMenuLabel>
                            <DropdownMenuItem
                                className="text-xs font-semibold gap-2 p-2 cursor-pointer"
                                onClick={() => navigate(`/dashboard/users/${user.id}`)}
                            >
                                <Eye className="h-4 w-4 text-primary" /> View Details
                            </DropdownMenuItem>
                            <PermissionGate resource="users" action="update">
                                <DropdownMenuItem
                                    className="text-xs font-semibold gap-2 p-2 cursor-pointer"
                                    onClick={() => {
                                        setEditUser(user);
                                        setIsCreateOpen(true);
                                    }}
                                >
                                    <Edit className="h-4 w-4" /> Edit Account
                                </DropdownMenuItem>
                            </PermissionGate>
                            <PermissionGate resource="users" action="manage">
                                <DropdownMenuSeparator className="border-border/60" />
                                <DropdownMenuItem
                                    className={`text-xs font-semibold gap-2 p-2 cursor-pointer ${
                                        user.isActive
                                            ? "text-amber-600 dark:text-amber-400 focus:bg-amber-500/10"
                                            : "text-emerald-600 dark:text-emerald-400 focus:bg-emerald-500/10"
                                    }`}
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
                                    className="text-xs font-semibold gap-2 p-2 text-destructive focus:bg-destructive/10 cursor-pointer"
                                    onClick={() =>
                                        setConfirmState({
                                            isOpen: true,
                                            userId: user.id,
                                            userName: `${user.firstName} ${user.lastName}`,
                                        })
                                    }
                                >
                                    <Trash2 className="h-4 w-4" /> Delete User
                                </DropdownMenuItem>
                            </PermissionGate>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>
            ),
        },
    ];

    // Mobile Card renderer for small viewports (< 768px)
    const renderMobileCard = (user: User) => (
        <div className="flex items-center justify-between gap-3">
            <div
                className="flex items-center gap-3 min-w-0 cursor-pointer"
                onClick={() => navigate(`/dashboard/users/${user.id}`)}
            >
                <Avatar className="h-10 w-10 border border-primary/20 shrink-0">
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                        {user.firstName[0]?.toUpperCase()}{user.lastName[0]?.toUpperCase()}
                    </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                    <p className="font-bold text-sm text-foreground truncate">
                        {user.firstName} {user.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">{user.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                        <Badge
                            variant="outline"
                            className={`text-[10px] px-2 py-0.2 rounded-full ${
                                user.isActive
                                    ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                                    : "bg-destructive/10 text-destructive border-destructive/20"
                            }`}
                        >
                            {user.isActive ? "Active" : "Disabled"}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">
                            {user.Roles?.[0]?.name.replace(/_/g, " ") || "No Role"}
                        </span>
                    </div>
                </div>
            </div>

            <Button
                variant="ghost"
                size="icon-xs"
                className="h-8 w-8 shrink-0"
                onClick={() => navigate(`/dashboard/users/${user.id}`)}
            >
                <Eye className="h-4 w-4 text-muted-foreground" />
            </Button>
        </div>
    );

    return (
        <motion.div
            className="space-y-6 text-foreground"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Standardized Page Header */}
            <PageHeader
                title="Users Management"
                description="Manage and assign roles for all institution profiles and system members."
            >
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={() => refetch()}
                    disabled={isFetching}
                >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
                </Button>
                <PermissionGate resource="users" action="create">
                    <Button onClick={() => setIsCreateOpen(true)} className="gap-2 h-10 px-4 rounded-xl font-semibold shadow-sm">
                        <Plus className="h-4 w-4" /> New User
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
            </PageHeader>

            {/* Filter & Search Bar */}
            <Card className="p-4 border-border/60 bg-card rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="relative w-full sm:w-80">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search by name, ID or email..."
                            className="pl-9 h-10 bg-muted/40 border-border/60 rounded-xl text-sm"
                            value={search}
                            onChange={(e) => {
                                setSearch(e.target.value);
                                setPage(1);
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
                        {["", "ACTIVE", "INACTIVE"].map((s) => (
                            <Button
                                key={s}
                                variant={status === s ? "default" : "outline"}
                                size="sm"
                                onClick={() => {
                                    setStatus(s);
                                    setPage(1);
                                }}
                                className="h-9 px-3 text-xs rounded-xl font-medium shrink-0"
                            >
                                {s === "" ? "All Statuses" : s}
                            </Button>
                        ))}
                    </div>
                </div>
            </Card>

            {/* Generic DataTable Component */}
            <DataTable
                columns={columns}
                data={users}
                keyExtractor={(u) => u.id}
                isLoading={isLoading}
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.pages,
                    total: pagination.total,
                    limit: pagination.limit,
                    onPageChange: (newPage) => setPage(newPage),
                }}
                emptyTitle="No users found"
                emptyDescription="No account matches your search criteria or status filter."
                emptyIcon={Users}
                emptyActionLabel={can("users", "create") ? "Create New User" : undefined}
                onEmptyAction={() => setIsCreateOpen(true)}
                renderMobileCard={renderMobileCard}
            />

            {/* Centralized Delete Confirmation Modal */}
            <AlertDialog
                open={confirmState.isOpen}
                onOpenChange={(v) => !v && setConfirmState((prev) => ({ ...prev, isOpen: false }))}
            >
                <AlertDialogContent className="w-[95vw] sm:max-w-lg mx-auto rounded-3xl p-6 border-border shadow-2xl bg-background">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-xl font-bold text-foreground">Delete User?</AlertDialogTitle>
                        <AlertDialogDescription className="text-muted-foreground mt-2">
                            This will permanently delete the account of{" "}
                            <span className="font-bold text-foreground">{confirmState.userName}</span> and all associated data.
                            This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-6 gap-3">
                        <AlertDialogCancel className="h-11 rounded-xl font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => confirmState.userId && deleteUserMutation.mutate(confirmState.userId)}
                            className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                            {deleteUserMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete User"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
