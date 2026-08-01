import { useState, useCallback, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    ShieldCheck, Plus, Trash2, Edit2, Loader2,
    KeyRound, UserPlus, UserMinus, Search, X,
    MoreVertical, Eye, Info
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
    DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

// ─── Types ────────────────────────────────────────────────────────────────────
interface Permission { id: number; name: string; resource: string; action: string; description: string | null; }
interface RoleUser { id: string; userId: string; firstName: string; lastName: string; email: string; isActive: boolean; Roles?: { id: number; name: string }[]; }
interface Role { id: number; name: string; description: string | null; isActive: boolean; Permissions: Permission[]; Users: RoleUser[]; }

// ─── API ──────────────────────────────────────────────────────────────────────
const fetchRoles = async (): Promise<Role[]> => { const { data } = await api.get("/roles"); return data.data.roles; };
const fetchAllPermissions = async (): Promise<Permission[]> => { const { data } = await api.get("/permissions"); return data.data.permissions; };
const searchUsers = async (q: string): Promise<RoleUser[]> => {
    if (!q.trim()) return [];
    const { data } = await api.get(`/roles/users/search?q=${encodeURIComponent(q)}&limit=15`);
    return data.data.users;
};



// Configured mapping for permissions actions
const ACTION_COLOR: Record<string, string> = {
    read: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent",
    create: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
    update: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
    delete: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-transparent",
}

// Helper to determine a deterministic colorful variant based on user name strings
const getColorVariant = (name: string) => {
    const variants = ["orange", "blue", "green", "purple", "pink", "amber"] as const
    let hash = 0
    for (let i = 0; i < name.length; i++) {
        hash = name.charCodeAt(i) + ((hash << 5) - hash)
    }
    const index = Math.abs(hash) % variants.length
    return variants[index]
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function RolesPage() {
    const { can } = usePermissions();
    const qc = useQueryClient();
    const [editRole, setEditRole] = useState<Role | null>(null);
    const [createOpen, setCreateOpen] = useState(false);
    const [assignRole, setAssignRole] = useState<Role | null>(null);

    const { data: roles, isLoading } = useQuery({
        queryKey: ["roles"], queryFn: fetchRoles, enabled: can("roles", "read"),
    });
    const { data: allPermissions } = useQuery({
        queryKey: ["permissions", "all"], queryFn: fetchAllPermissions, enabled: can("roles", "manage"),
    });

    const deleteRole = useMutation({
        mutationFn: (id: number) => api.delete(`/roles/${id}`),
        onSuccess: () => { qc.invalidateQueries({ queryKey: ["roles"] }); toast.success("Role deleted successfully"); },
        onError: () => toast.error("Failed to delete role"),
    });


    if (!can("roles", "read")) return <AccessDenied />;

    const pageVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.4 } }
    };

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
                        <ShieldCheck className="h-6 w-6 md:h-8 md:w-8" />
                        Roles & Access Control
                    </h1>
                    <p className="text-muted-foreground text-xs md:text-sm lg:text-base mt-1.5 max-w-2xl">
                        Manage organizational roles, define fine-grained permissions, and configure user assignments.
                    </p>
                </div>
                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <PermissionGate resource="roles" action="manage">
                        <Button variant="primary" className="w-full md:w-auto gap-2 h-10 px-5 transition-all hover:scale-[1.02] active:scale-[0.98]" onClick={() => setCreateOpen(true)}>
                            <Plus className="h-4 w-4 stroke-[2.5]" /> New Role
                        </Button>
                    </PermissionGate>
                </div>
            </div>



            {/* Roles grid */}
            {isLoading ? (
                <div className="flex flex-col items-center justify-center py-32 gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-[#5513a1]" />
                    <p className="text-sm text-muted-foreground font-medium animate-pulse">Fetching secure configurations...</p>
                </div>
            ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {(roles ?? []).map((role) => (
                        <RoleCard
                            key={role.id}
                            role={role}
                            canManage={can("roles", "manage")}
                            onEdit={() => setEditRole(role)}
                            onDelete={() => deleteRole.mutate(role.id)}
                            onManageUsers={() => setAssignRole(role)}
                            deleting={deleteRole.isPending}
                        />
                    ))}
                </div>
            )}

            {/* Form Dialogs */}
            <RoleFormDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                allPermissions={allPermissions ?? []}
                onSaved={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ["roles"] }); }}
            />

            {editRole && (
                <RoleFormDialog
                    open={!!editRole}
                    onClose={() => setEditRole(null)}
                    allPermissions={allPermissions ?? []}
                    existing={editRole}
                    onSaved={() => { setEditRole(null); qc.invalidateQueries({ queryKey: ["roles"] }); }}
                />
            )}

            {assignRole && (
                <AssignUsersDialog
                    role={assignRole}
                    onClose={() => setAssignRole(null)}
                    onSaved={() => qc.invalidateQueries({ queryKey: ["roles"] })}
                />
            )}
        </motion.div>
    );
}

// ─── Role card ────────────────────────────────────────────────────────────────
export function RoleCard({
    role,
    canManage,
    onEdit,
    onDelete,
    onManageUsers,
    deleting
}: {
    role: Role
    canManage: boolean
    deleting: boolean
    onEdit: () => void
    onDelete: () => void
    onManageUsers: () => void
}) {
    const [viewDetailsOpen, setViewDetailsOpen] = useState(false)

    const grouped = useMemo(() => {
        return role.Permissions.reduce<Record<string, Permission[]>>((acc, p) => {
            if (!acc[p.resource]) acc[p.resource] = []
            acc[p.resource].push(p)
            return acc
        }, {})
    }, [role.Permissions])

    return (
        <>
            <Card className="border-border shadow-sm hover:shadow-md transition-all flex flex-col h-full relative">
                <CardHeader className="p-4 border-b border-border/60 bg-muted/10 flex flex-row items-start justify-between gap-3 space-y-0">
                    <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                            <CardTitle className="text-sm font-bold capitalize truncate max-w-[140px] md:max-w-none">
                                {role.name.replace(/_/g, " ")}
                            </CardTitle>
                            <Badge
                                variant={role.isActive ? "default" : "outline"}
                                className={cn(
                                    "text-[9px] uppercase font-bold tracking-wider shrink-0 px-1.5 py-0",
                                    role.isActive ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent" : "text-muted-foreground"
                                )}
                            >
                                {role.isActive ? "Active" : "Disabled"}
                            </Badge>
                        </div>
                        {role.description && (
                            <CardDescription className="text-[11px] line-clamp-2 min-h-[2.2rem] leading-tight">
                                {role.description}
                            </CardDescription>
                        )}
                    </div>

                    {canManage && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-7 w-7 p-0 shrink-0 text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="h-3.5 w-3.5" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-36">
                                <DropdownMenuItem onClick={onManageUsers} className="gap-2 text-xs">
                                    <UserPlus className="h-3.5 w-3.5 text-muted-foreground" /> Assignments
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={onEdit} className="gap-2 text-xs">
                                    <Edit2 className="h-3.5 w-3.5 text-muted-foreground" /> Modify
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => setViewDetailsOpen(true)} className="gap-2 text-xs text-foreground focus:bg-muted/5">
                                    <Eye className="h-3.5 w-3.5 text-muted-foreground" /> Details
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={onDelete}
                                    disabled={deleting}
                                    className="gap-2 text-xs text-destructive focus:text-destructive focus:bg-destructive/5"
                                >
                                    {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
                                    Delete Role
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </CardHeader>

                <CardContent className="p-4 flex-1 flex flex-col justify-between gap-4">
                    <div>
                        {role.Permissions.length > 0 && (
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                                <KeyRound className="h-3 w-3 text-[#5513a1] dark:text-purple-400/70" />
                                {role.Permissions.length} Authorized Capabilities
                            </p>
                        )}
                        <div className="space-y-1.5">
                            {Object.entries(grouped).slice(0, 2).map(([resource, perms]) => (
                                <div key={resource} className="flex items-center gap-2 text-xs py-0.5 border-b border-border/10 last:border-0">
                                    <span className="text-[10px] font-semibold text-foreground/80 capitalize w-16 shrink-0 truncate">{resource}</span>
                                    <div className="flex flex-wrap gap-1">
                                        {perms.slice(0, 3).map((p) => (
                                            <Badge
                                                key={p.id}
                                                variant="outline"
                                                className={cn("text-[9px] font-medium tracking-wide py-0 px-1", ACTION_COLOR[p.action] ?? "")}
                                            >
                                                {p.action}
                                            </Badge>
                                        ))}
                                        {perms.length > 3 && <span className="text-[9px] text-muted-foreground">+{perms.length - 3}</span>}
                                    </div>
                                </div>
                            ))}
                            {Object.keys(grouped).length > 2 && (
                                <p className="text-[10px] text-[#5513a1] dark:text-purple-400 font-medium pt-0.5 pl-0.5">
                                    +{Object.keys(grouped).length - 2} more resource domains
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-border/40">
                        <div className="flex -space-x-1.5 overflow-hidden">
                            {role.Users.slice(0, 4).map((user) => {
                                const fullName = `${user.firstName} ${user.lastName}`
                                const variantColor = getColorVariant(fullName)
                                return (
                                    <Avatar key={user.id}
                                        variant={variantColor} className="h-8 w-8 border border-purple-600/30/10 shadow-sm">
                                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-[#5513a1] dark:text-purple-400-foreground text-xs font-bold">
                                            {user.firstName[0]}{user.lastName[0]}
                                        </AvatarFallback>
                                    </Avatar>

                                )
                            })}
                            {role.Users.length > 4 && (
                                <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted ring-2 ring-background text-[9px] font-bold text-muted-foreground">
                                    +{role.Users.length - 4}
                                </div>
                            )}
                            {role.Users.length === 0 && (
                                <p className="text-[11px] italic text-muted-foreground">No accounts linked</p>
                            )}
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* View Full Details Dialog */}
            <Dialog open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
                <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-0 overflow-hidden shadow-2xl border-border">
                    <div className="p-6 pb-4 border-b border-border/50">
                        <DialogHeader className="space-y-1">
                            <DialogTitle className="text-lg md:text-xl font-bold flex items-center gap-2 capitalize">
                                <Info className="h-4 w-4 md:h-5 md:w-5 text-[#5513a1] dark:text-purple-400" /> {role.name.replace(/_/g, " ")} Details
                            </DialogTitle>
                            <DialogDescription className="text-xs md:text-sm leading-relaxed">
                                Full capability mapping overview and account matrices boundaries.
                            </DialogDescription>
                        </DialogHeader>
                    </div>

                    {/* Scroll container logic wrapper */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-5 pr-4 max-h-[calc(85vh-140px)]">
                        <div className="bg-muted/30 border border-border/50 rounded-xl p-3 space-y-1">
                            <span className="text-[9px] uppercase font-bold tracking-wider text-muted-foreground block">Description Summary</span>
                            <p className="text-xs md:text-sm text-foreground/90">
                                {role.description || "No supplemental descriptor content provided for this operational role context."}
                            </p>
                        </div>

                        {/* Complete Capabilities & Counts Mapping Section */}
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                Assigned Capabilities ({role.Permissions.length})
                            </h4>
                            <div className="border border-border/60 rounded-xl p-3 bg-muted/5 space-y-3">
                                {Object.entries(grouped).map(([resource, perms]) => (
                                    <div key={resource} className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 pb-2.5 border-b border-border/20 last:border-0 last:pb-0">
                                        <div className="flex items-center gap-2 shrink-0">
                                            <span className="text-xs font-bold text-foreground capitalize">{resource}</span>
                                            <Badge variant="secondary" className="text-[9px] px-1 py-0">
                                                {perms.length} Active
                                            </Badge>
                                        </div>
                                        <div className="flex flex-wrap gap-1 sm:justify-end">
                                            {perms.map((p) => (
                                                <Badge
                                                    key={p.id}
                                                    variant="outline"
                                                    className={cn("text-[9px] font-medium tracking-wide py-0.5 px-1.5", ACTION_COLOR[p.action] ?? "")}
                                                >
                                                    {p.action}
                                                </Badge>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Complete User Index Grid Matrix section mapping */}
                        <div className="space-y-2">
                            <h4 className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                                All Bound Directory Members ({role.Users.length})
                            </h4>
                            <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                                {role.Users.length === 0 ? (
                                    <p className="text-xs text-muted-foreground italic py-4 text-center">
                                        No structural user identities bound into this role block node.
                                    </p>
                                ) : (
                                    role.Users.map((u) => {
                                        const variantColor = getColorVariant(`${u.firstName} ${u.lastName}`)
                                        return (
                                            <div key={u.id} className="flex items-center gap-2.5 py-1.5 px-2.5 rounded-lg bg-secondary/30 border border-border/40">
                                                <Avatar key={u.id}
                                                    variant={variantColor} className="h-8 w-8 border border-purple-600/30/10 shadow-sm">
                                                    <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-[#5513a1] dark:text-purple-400-foreground text-xs font-bold">
                                                        {u.firstName[0]}{u.lastName[0]}
                                                    </AvatarFallback>
                                                </Avatar>

                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-semibold text-foreground truncate">{u.firstName} {u.lastName}</p>
                                                    <p className="text-[9px] text-muted-foreground truncate">{u.email}</p>
                                                </div>
                                                {!u.isActive && (
                                                    <Badge variant="outline" className="text-[8px] uppercase font-bold tracking-tight text-destructive border-destructive/20 bg-destructive/5">
                                                        Suspended
                                                    </Badge>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="p-4 border-t border-border/40 bg-muted/5 flex justify-end">
                        <Button variant="outline" size="sm" onClick={() => setViewDetailsOpen(false)} className="text-xs">
                            Close Overview
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    )
}

// ─── Assign Users Dialog ──────────────────────────────────────────────────────
function AssignUsersDialog({ role, onClose, onSaved }: {
    role: Role; onClose: () => void; onSaved: () => void;
}) {
    const [search, setSearch] = useState("");
    const [results, setResults] = useState<RoleUser[]>([]);
    const [searching, setSearching] = useState(false);
    const qc = useQueryClient();

    const assignedIds = useMemo(() => new Set(role.Users.map(u => u.id)), [role.Users]);

    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) { setResults([]); return; }
        setSearching(true);
        try {
            const users = await searchUsers(q);
            setResults(users);
        } catch {
            toast.error("User search failed unexpected framework lifecycle drop");
        } finally {
            setSearching(false);
        }
    }, []);

    const assignMutation = useMutation({
        mutationFn: ({ userId, action }: { userId: string; action: "assign" | "remove" }) =>
            api.patch(`/roles/${role.id}/users/${userId}`, { action }),
        onSuccess: (_, { action, userId }) => {
            qc.invalidateQueries({ queryKey: ["roles"] });
            onSaved();
            const user = results.find(u => u.id === userId) ?? role.Users.find(u => u.id === userId);
            const name = user ? `${user.firstName} ${user.lastName}` : "Identity record";
            toast.success(`${name} correctly ${action === "assign" ? "appended context flags into" : "revoked access patterns from"} "${role.name}"`);
        },
        onError: () => toast.error("System structural modification fault mapping entity parameters"),
    });

    return (
        <Dialog open onOpenChange={onClose}>
            <DialogContent className="max-w-lg shadow-xl border-border">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <UserPlus className="h-5 w-5 text-[#5513a1] dark:text-purple-400" />
                        <span>Manage Member Assignments</span>
                    </DialogTitle>
                    <DialogDescription>
                        Scope user roles inside <span className="text-foreground font-semibold capitalize">"{role.name.replace(/_/g, " ")}"</span> context matrices.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    {/* Current users index */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            Active Assignments ({role.Users.length})
                        </p>
                        <ScrollArea className="h-36 border border-border rounded-xl bg-muted/10 p-2">
                            {role.Users.length === 0 ? (
                                <p className="text-xs text-muted-foreground text-center py-8 italic">No assigned targets linked</p>
                            ) : (
                                <div className="space-y-1.5">
                                    {role.Users.map((u) => {
                                        const variantColor = getColorVariant(`${u.firstName} ${u.lastName}`)
                                        return (
                                            <div key={u.id} className="flex items-center justify-between gap-3 py-1.5 px-3 rounded-lg bg-card border border-border/40 group">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Avatar key={u.id}
                                                        variant={variantColor} className="h-8 w-8 border border-purple-600/30/10 shadow-sm">
                                                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-[#5513a1] dark:text-purple-400-foreground text-xs font-bold">
                                                            {u.firstName[0]}{u.lastName[0]}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold truncate text-foreground">{u.firstName} {u.lastName}</p>
                                                        <p className="text-[10px] text-muted-foreground truncate">{u.userId} · {u.email}</p>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant="ghost"
                                                    className="h-8 w-8 p-0 shrink-0 text-destructive hover:bg-destructive/10 rounded-lg opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                                    onClick={() => assignMutation.mutate({ userId: u.id, action: "remove" })}
                                                    disabled={assignMutation.isPending}
                                                >
                                                    <UserMinus className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        )
                                    })}
                                </div>
                            )}
                        </ScrollArea>
                    </div>

                    <Separator className="border-border/60" />

                    {/* Search parameters boundary handler */}
                    <div>
                        <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">
                            Search Platform Directory
                        </p>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                value={search}
                                onChange={e => { setSearch(e.target.value); doSearch(e.target.value); }}
                                placeholder="Search by exact display name, handle sequence identity or matching email..."
                                className="pl-9 h-10 bg-muted/30 border-border/80 focus-visible:ring-1"
                            />
                            {search && (
                                <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2" onClick={() => { setSearch(""); setResults([]); }}>
                                    <X className="h-4 w-4 text-muted-foreground hover:text-foreground transition-colors" />
                                </button>
                            )}
                        </div>

                        {searching && (
                            <div className="flex justify-center py-6"><Loader2 className="h-5 w-5 animate-spin text-[#5513a1] dark:text-purple-400" /></div>
                        )}

                        {!searching && results.length > 0 && (
                            <ScrollArea className="h-48 mt-3 border border-border rounded-xl p-2 bg-muted/10">
                                <div className="space-y-1.5">
                                    {results.map((u) => {
                                        const isAssigned = assignedIds.has(u.id);
                                        const userRoles = u.Roles ?? [];
                                        const variantColor = getColorVariant(`${u.firstName} ${u.lastName}`)

                                        return (
                                            <div key={u.id} className="flex items-center justify-between gap-3 py-2 px-2.5 rounded-lg bg-card border border-border/40 hover:border-border transition-all">
                                                <div className="flex items-center gap-2.5 min-w-0">
                                                    <Avatar key={u.id}
                                                        variant={variantColor} className="h-8 w-8 border border-purple-600/30/10 shadow-sm">
                                                        <AvatarFallback className="bg-gradient-to-br from-primary to-primary/80 text-[#5513a1] dark:text-purple-400-foreground text-xs font-bold">
                                                            {u.firstName[0]}{u.lastName[0]}
                                                        </AvatarFallback>
                                                    </Avatar>

                                                    <div className="min-w-0">
                                                        <p className="text-xs font-semibold text-foreground truncate">{u.firstName} {u.lastName}</p>
                                                        <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                                                            <span className="text-[10px] font-mono text-muted-foreground">{u.userId}</span>
                                                            {userRoles.map(r => (
                                                                <Badge key={r.id} variant="outline" className="text-[9px] capitalize py-0 px-1 bg-purple-600 dark:bg-purple-700/5 text-[#5513a1] dark:text-purple-400 border-purple-600/30/20">
                                                                    {r.name.replace(/_/g, " ")}
                                                                </Badge>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                                <Button
                                                    size="sm"
                                                    variant={isAssigned ? "outline" : "default"}
                                                    className={`h-8 text-xs px-3 shrink-0 gap-1.5 font-medium ${isAssigned ? "text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive" : ""}`}
                                                    onClick={() => assignMutation.mutate({ userId: u.id, action: isAssigned ? "remove" : "assign" })}
                                                    disabled={assignMutation.isPending}
                                                >
                                                    {assignMutation.isPending ? (
                                                        <Loader2 className="h-3 w-3 animate-spin" />
                                                    ) : isAssigned ? (
                                                        <><UserMinus className="h-3.5 w-3.5" /> Eject</>
                                                    ) : (
                                                        <><UserPlus className="h-3.5 w-3.5" /> Authorize</>
                                                    )}
                                                </Button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </ScrollArea>
                        )}

                        {!searching && search && results.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center py-8 border border-dashed border-border rounded-xl bg-muted/5 mt-3">No profiles matched your current context filter criteria.</p>
                        )}
                    </div>
                </div>

                <DialogFooter className="mt-2">
                    <Button variant="outline" onClick={onClose} className="h-9">Close Panel</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}

// ─── Role form dialog (create / edit) ─────────────────────────────────────────
function RoleFormDialog({ open, onClose, allPermissions, existing, onSaved }: {
    open: boolean; onClose: () => void;
    allPermissions: Permission[]; existing?: Role; onSaved: () => void;
}) {
    const [name, setName] = useState(existing?.name ?? "");
    const [description, setDescription] = useState(existing?.description ?? "");
    const [selectedIds, setSelectedIds] = useState<number[]>(existing?.Permissions.map(p => p.id) ?? []);
    const [saving, setSaving] = useState(false);

    const grouped = useMemo(() => {
        return allPermissions.reduce<Record<string, Permission[]>>((acc, p) => {
            if (!acc[p.resource]) acc[p.resource] = [];
            acc[p.resource].push(p);
            return acc;
        }, {});
    }, [allPermissions]);

    const toggle = (id: number) => setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    const toggleAll = (perms: Permission[]) => {
        const ids = perms.map(p => p.id);
        const allSel = ids.every(id => selectedIds.includes(id));
        setSelectedIds(prev => allSel ? prev.filter(id => !ids.includes(id)) : [...new Set([...prev, ...ids])]);
    };

    const handleSave = async () => {
        if (!name.trim()) { toast.error("Role operational token descriptor required"); return; }
        setSaving(true);
        try {
            if (existing) {
                await api.put(`/roles/${existing.id}`, { name, description, permissionIds: selectedIds });
                toast.success("Role configurations persistent variables pushed successfully");
            } else {
                await api.post("/roles", { name, description, permissionIds: selectedIds });
                toast.success("New structural role parameters appended cleanly");
            }
            onSaved();
        } catch (e: unknown) {
            toast.error((e as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Configuration state mapping failure detected.");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-background dark:bg-zinc-950">
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                    <DialogTitle className="flex items-center gap-2 text-lg md:text-xl font-bold tracking-tight text-foreground">
                        <ShieldCheck className="h-5 w-5 text-[#5513a1] dark:text-purple-400" />
                        {existing ? "Modify Existing Role Properties" : "Provision Security Access Descriptor"}
                    </DialogTitle>
                    <DialogDescription className="text-xs md:text-sm text-muted-foreground mt-1.5">
                        Establish organizational permissions bounds, operational policies, and identity access scoping configurations.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar p-6 lg:p-8 bg-background dark:bg-zinc-950 space-y-5">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Label Reference *</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. core_compliance_reviewer" className="h-10 bg-muted/10 border-border/80" />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scoping Summary Context</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Functional parameters context description..." className="h-10 bg-muted/10 border-border/80" />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Capability Mapping Matrix</Label>
                            <Badge variant="secondary" className="text-xs font-mono font-bold text-[#5513a1] dark:text-purple-400 bg-purple-600 dark:bg-purple-700/10 border border-purple-600/30/20 px-2 py-0.5">{selectedIds.length} Nodes Enabled</Badge>
                        </div>

                        <ScrollArea className="h-[40vh] border border-border rounded-xl p-4 bg-muted/5">
                            <div className="space-y-6">
                                {Object.entries(grouped).map(([resource, perms]) => {
                                    const groupIds = perms.map(p => p.id);
                                    const allChecked = groupIds.every(id => selectedIds.includes(id));
                                    return (
                                        <div key={resource} className="space-y-3 pb-4 border-b border-border/40 last:border-0 last:pb-0">
                                            <div className="flex items-center justify-between bg-muted/40 p-2 rounded-lg border border-border/40">
                                                <span className="text-xs font-bold uppercase tracking-wider text-foreground capitalize">{resource} Matrix</span>
                                                <div className="flex items-center gap-2">
                                                    <Checkbox id={`all-${resource}`} checked={allChecked} onCheckedChange={() => toggleAll(perms)} />
                                                    <Label htmlFor={`all-${resource}`} className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide cursor-pointer select-none">Toggle Scope</Label>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pl-1">
                                                {perms.map((p) => (
                                                    <div key={p.id} className="flex items-start gap-3 p-2 rounded-lg border border-border/30 bg-card hover:bg-muted/10 transition-colors">
                                                        <Checkbox id={`p-${p.id}`} checked={selectedIds.includes(p.id)} onCheckedChange={() => toggle(p.id)} className="mt-0.5" />
                                                        <div className="space-y-0.5 cursor-pointer select-none flex-1" onClick={() => toggle(p.id)}>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-bold text-foreground capitalize">{p.action}</span>
                                                                <Badge variant="outline" className={`text-[9px] uppercase font-medium tracking-tight px-1 py-0 ${ACTION_COLOR[p.action] ?? ""}`}>{p.action}</Badge>
                                                            </div>
                                                            {p.description && <p className="text-[10px] text-muted-foreground leading-normal">{p.description}</p>}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </ScrollArea>
                    </div>
                </div>

                <DialogFooter className="mt-4 border-t border-border/40 pt-3 flex gap-2">
                    <Button variant="outline" onClick={onClose} disabled={saving} className="h-10">Abort Provision</Button>
                    <Button onClick={handleSave} disabled={saving} className="h-10 min-w-[100px]">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Commit State"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}