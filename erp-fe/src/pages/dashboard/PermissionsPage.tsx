import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Plus, Loader2, RefreshCw, Lock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";

interface Permission {
    id: number; name: string; resource: string; action: string; description: string | null;
}

const ACTIONS = ["read", "create", "update", "delete", "manage"] as const;

const ACTION_COLOR: Record<string, string> = {
    read: "bg-blue-500/10 text-blue-600 border-blue-200",
    create: "bg-green-500/10 text-green-600 border-green-200",
    update: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
    delete: "bg-red-500/10 text-red-600 border-red-200",
    manage: "bg-primary/10 text-primary border-primary/20",
};

const fetchPermissions = async (): Promise<Permission[]> => {
    const { data } = await api.get("/permissions");
    return data.data.permissions;
};

export default function PermissionsPage() {
    const { can } = usePermissions();
    const qc = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [search, setSearch] = useState("");

    const { data, isLoading, refetch, isFetching } = useQuery({
        queryKey: ["permissions", "all"],
        queryFn: fetchPermissions,
        enabled: can("permissions", "read"),
    });

    if (!can("permissions", "read")) return <AccessDenied />;

    const filtered = (data ?? []).filter(
        p => !search || p.name.toLowerCase().includes(search.toLowerCase()) || p.resource.toLowerCase().includes(search.toLowerCase())
    );

    const grouped = filtered.reduce<Record<string, Permission[]>>((acc, p) => {
        if (!acc[p.resource]) acc[p.resource] = [];
        acc[p.resource].push(p);
        return acc;
    }, {});

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <KeyRound className="h-6 w-6 text-primary" />
                        Permissions
                        {data && <Badge variant="secondary" className="text-xs">{data.length}</Badge>}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">All system permissions grouped by resource.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 h-9" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <PermissionGate resource="permissions" action="manage">
                        <Button onClick={() => setCreateOpen(true)} className="gap-2 h-9">
                            <Plus className="h-4 w-4" /> New Permission
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Search */}
            <Input
                placeholder="Search permissions..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="max-w-sm h-9 bg-secondary/50 border-none"
            />

            {isLoading ? (
                <div className="flex justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {Object.entries(grouped).map(([resource, perms]) => (
                        <Card key={resource} className="border-border shadow-sm">
                            <CardHeader className="pb-3 border-b border-border">
                                <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center justify-between">
                                    <span className="capitalize flex items-center gap-1.5">
                                        <Lock className="h-3.5 w-3.5 text-primary" />
                                        {resource}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px] normal-case font-normal">
                                        {perms.length}
                                    </Badge>
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-3 space-y-1.5">
                                {perms.map((p) => (
                                    <div
                                        key={p.id}
                                        className="flex items-center justify-between py-1.5 px-2 rounded-lg hover:bg-secondary/50 transition-colors group"
                                    >
                                        <div className="min-w-0">
                                            <p className="text-[11px] font-semibold font-mono text-foreground truncate">{p.name}</p>
                                            {p.description && (
                                                <p className="text-[10px] text-muted-foreground truncate">{p.description}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-1.5 ml-2 shrink-0">
                                            <Badge variant="outline" className={`text-[10px] capitalize ${ACTION_COLOR[p.action] ?? ""}`}>
                                                {p.action}
                                            </Badge>
                                        </div>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}

                    {Object.keys(grouped).length === 0 && !isLoading && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <KeyRound className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No permissions found</p>
                        </div>
                    )}
                </div>
            )}

            <CreatePermissionDialog
                open={createOpen}
                onClose={() => setCreateOpen(false)}
                onSaved={() => { setCreateOpen(false); qc.invalidateQueries({ queryKey: ["permissions"] }); }}
            />
        </div>
    );
}

function CreatePermissionDialog({ open, onClose, onSaved }: {
    open: boolean; onClose: () => void; onSaved: () => void;
}) {
    const [name, setName] = useState("");
    const [resource, setResource] = useState("");
    const [action, setAction] = useState<string>("read");
    const [description, setDescription] = useState("");
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
        if (!name.trim() || !resource.trim()) { toast.error("Name and resource are required"); return; }
        setSaving(true);
        try {
            await api.post("/permissions", { name, resource, action, description });
            toast.success("Permission created");
            onSaved();
        } catch (e: any) {
            toast.error(e.response?.data?.message ?? "Failed to create permission");
        } finally {
            setSaving(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <KeyRound className="h-5 w-5 text-primary" />
                        New Permission
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Name *</Label>
                        <Input value={name} onChange={e => setName(e.target.value)} placeholder="students:read" className="h-10 font-mono" />
                        <p className="text-[11px] text-muted-foreground">Convention: resource:action</p>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Resource *</Label>
                            <Input value={resource} onChange={e => setResource(e.target.value)} placeholder="students" className="h-10" />
                        </div>
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action *</Label>
                            <div className="flex flex-wrap gap-1.5">
                                {ACTIONS.map(a => (
                                    <Badge
                                        key={a}
                                        variant="outline"
                                        onClick={() => setAction(a)}
                                        className={`cursor-pointer capitalize text-xs transition-all ${action === a ? "bg-primary text-primary-foreground border-primary" : ACTION_COLOR[a]}`}
                                    >
                                        {a}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="space-y-1.5">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Description</Label>
                        <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Optional description" className="h-10" />
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="gap-2">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
