import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { KeyRound, Plus, Loader2, RefreshCw, Lock } from "lucide-react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "../../components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog, DialogContent, DialogHeader,
    DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import api from "@/lib/api";
import { usePermissions } from "@/store/hooks";
import { useDebounce } from "@/hooks/use-debounce";
import PermissionGate from "@/components/auth/PermissionGate";
import AccessDenied from "@/components/auth/AccessDenied";

interface Permission {
    id: number; name: string; resource: string; action: string; description: string | null;
}

const ACTIONS = ["read", "create", "update", "delete", "manage"] as const;

const ACTION_COLOR: Record<string, string> = {
    read: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent",
    create: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
    update: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
    delete: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-transparent",
    manage: "bg-purple-600/10 text-[#5513a1] dark:text-purple-400 border-transparent",
};

const fetchPermissions = async (): Promise<Permission[]> => {
    const { data } = await api.get("/permissions");
    return data.data.permissions;
};

export default function PermissionsPage() {
    const { can } = usePermissions();
    const qc = useQueryClient();
    const [createOpen, setCreateOpen] = useState(false);
    const [searchInput, setSearchInput] = useState("");
    const search = useDebounce(searchInput, 300);

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
                        <KeyRound className="h-6 w-6 text-[#5513a1] dark:text-purple-400" />
                        Permissions
                        {data && <Badge variant="secondary" className="text-xs bg-purple-600/10 text-[#5513a1] dark:text-purple-400">{data.length}</Badge>}
                    </h1>
                    <p className="text-muted-foreground text-sm mt-1">All system permissions grouped by resource.</p>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="gap-1.5 h-9 border-border/80 hover:bg-muted" onClick={() => refetch()} disabled={isFetching}>
                        <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
                        Refresh
                    </Button>
                    <PermissionGate resource="permissions" action="manage">
                        <Button variant="primary" onClick={() => setCreateOpen(true)} className="w-full md:w-auto gap-2 h-10 px-5 transition-all hover:scale-[1.02] active:scale-[0.98]">
                            <Plus className="h-4 w-4 stroke-[2.5]" /> New Permission
                        </Button>
                    </PermissionGate>
                </div>
            </div>

            {/* Search */}
            <Input
                placeholder="Search permissions..."
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                className="max-w-sm h-9 border-border bg-background shadow-sm focus-visible:ring-purple-500"
            />

            {isLoading ? (
                <div className="w-full space-y-4">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="border border-border/60 rounded-xl px-4 py-4 bg-card shadow-sm">
                            <div className="flex items-center justify-between w-full">
                                <div className="flex items-center gap-2">
                                    <Skeleton className="h-4 w-4 rounded-full" />
                                    <Skeleton className="h-5 w-32" />
                                </div>
                                <Skeleton className="h-5 w-24 rounded-full" />
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <Accordion type="multiple" className="w-full space-y-4">
                    {Object.entries(grouped).map(([resource, perms]) => (
                        <AccordionItem value={resource} key={resource} className="border border-border/60 rounded-xl px-1 sm:px-4 bg-card shadow-sm data-[state=open]:border-purple-600/40 transition-colors">
                            <AccordionTrigger className="hover:no-underline py-4">
                                <div className="flex items-center justify-between w-full pr-4">
                                    <span className="capitalize flex items-center gap-2 font-bold text-sm md:text-base text-foreground">
                                        <Lock className="h-4 w-4 text-[#5513a1] dark:text-purple-400" />
                                        {resource}
                                    </span>
                                    <Badge variant="secondary" className="text-[10px] md:text-xs normal-case font-bold text-white bg-purple-600 dark:bg-purple-700/90 border-transparent">
                                        {perms.length} Permissions
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-4 pt-2">
                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
                                    {perms.map((p) => (
                                        <div
                                            key={p.id}
                                            className="flex items-start justify-between py-3 px-3.5 rounded-lg bg-muted/20 border border-border/40 hover:bg-muted/50 transition-colors group"
                                        >
                                            <div className="min-w-0 flex-1 pr-3">
                                                <p className="text-xs font-bold font-mono text-foreground truncate group-hover:text-[#5513a1] dark:group-hover:text-purple-400 transition-colors">{p.name}</p>
                                                {p.description && (
                                                    <p className="text-[10px] text-muted-foreground mt-1 line-clamp-2">{p.description}</p>
                                                )}
                                            </div>
                                            <Badge variant="outline" className={`text-[9px] uppercase font-bold shrink-0 shadow-sm ${ACTION_COLOR[p.action] ?? ""}`}>
                                                {p.action}
                                            </Badge>
                                        </div>
                                    ))}
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    ))}

                    {Object.keys(grouped).length === 0 && !isLoading && (
                        <div className="col-span-full flex flex-col items-center justify-center py-16 text-muted-foreground">
                            <KeyRound className="h-10 w-10 mb-3 opacity-20" />
                            <p className="font-medium">No permissions found</p>
                        </div>
                    )}
                </Accordion>
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
            <DialogContent className="max-w-md p-0 overflow-hidden border-border/80 shadow-2xl rounded-2xl bg-background dark:bg-zinc-950">
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-lg font-bold tracking-tight text-foreground">
                        <KeyRound className="h-5 w-5 text-[#5513a1] dark:text-purple-400" />
                        New Permission
                    </DialogTitle>
                </DialogHeader>

                <div className="space-y-4 px-6 py-4">
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
                                        className={`cursor-pointer capitalize text-xs transition-all font-bold tracking-tight ${action === a ? "bg-purple-600 text-white border-transparent" : ACTION_COLOR[a]}`}
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

                <DialogFooter className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-t border-border mt-6">
                    <Button variant="outline" onClick={onClose} disabled={saving} className="h-10 px-6 font-semibold border-border/80 hover:bg-muted rounded-xl">Cancel</Button>
                    <Button onClick={handleSave} disabled={saving} className="h-10 px-8 gap-2 font-semibold bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white rounded-xl shadow-md transition-transform active:scale-[0.98]">
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                        Create
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
