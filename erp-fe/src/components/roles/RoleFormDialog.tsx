import { useState, useMemo } from "react";
import { ShieldCheck, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import api from "@/lib/api";

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Permission { id: number; name: string; resource: string; action: string; description: string | null; }
export interface RoleUser { id: string; userId: string; firstName: string; lastName: string; email: string; isActive: boolean; Roles?: { id: number; name: string }[]; }
export interface Role { id: number; name: string; description: string | null; isActive: boolean; Permissions: Permission[]; Users: RoleUser[]; }

const ACTION_COLOR: Record<string, string> = {
    read: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-transparent",
    create: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-transparent",
    update: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-transparent",
    delete: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-transparent",
}

export function RoleFormDialog({ open, onClose, allPermissions, existing, onSaved }: {
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

    const toggle = (p: Permission) => {
        setSelectedIds(prev => {
            const isSelected = prev.includes(p.id);
            if (isSelected) {
                if (p.action === "read") {
                    const otherSelected = allPermissions.some(x => x.resource === p.resource && x.action !== "read" && prev.includes(x.id));
                    if (otherSelected) return prev;
                }
                return prev.filter(x => x !== p.id);
            } else {
                const next = [...prev, p.id];
                if (p.action !== "read") {
                    const readPerm = allPermissions.find(x => x.resource === p.resource && x.action === "read");
                    if (readPerm && !next.includes(readPerm.id)) {
                        next.push(readPerm.id);
                    }
                }
                return next;
            }
        });
    };
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
            <DialogContent className="max-w-[95vw] md:max-w-3xl max-h-[95vh] w-full flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-background">
                <DialogHeader className="px-4 sm:px-6 py-4 sm:py-5 bg-muted/30 border-b border-border shrink-0">
                    <DialogTitle className="flex items-center gap-2 text-xl md:text-2xl font-bold tracking-tight text-foreground">
                        <ShieldCheck className="h-6 w-6 md:h-7 md:w-7 text-primary" />
                        {existing ? "Modify Existing Role Properties" : "Provision Security Access Descriptor"}
                    </DialogTitle>
                    <DialogDescription className="text-sm md:text-base text-muted-foreground mt-2">
                        Establish organizational permissions bounds, operational policies, and identity access scoping configurations.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto max-h-[75vh] md:max-h-[65vh] custom-scrollbar p-4 sm:p-6 lg:p-8 bg-background space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 bg-muted/5 p-4 sm:p-5 rounded-xl border border-border/40">
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">System Label Reference *</Label>
                            <Input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. core_compliance_reviewer" className="h-11 md:h-12 text-sm md:text-base bg-background border-border/80 rounded-xl focus-visible:ring-ring" />
                        </div>
                        <div className="space-y-3">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Scoping Summary Context</Label>
                            <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Functional parameters context description..." className="h-11 md:h-12 text-sm md:text-base bg-background border-border/80 rounded-xl focus-visible:ring-ring" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between pb-2 border-b border-border/50">
                            <div className="space-y-1">
                                <Label className="text-sm md:text-base font-bold uppercase tracking-wider text-foreground">Capability Mapping Matrix</Label>
                                <p className="text-xs text-muted-foreground hidden sm:block">Define what actions this role can perform across different system resources.</p>
                            </div>
                            <Badge variant="secondary" className="text-xs md:text-sm font-mono font-bold text-primary-foreground bg-primary border border-primary/20 px-3 py-1.5 rounded-lg shadow-sm">
                                {selectedIds.length} Nodes Enabled
                            </Badge>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-5">
                            {Object.entries(grouped).map(([resource, perms]) => {
                                const groupIds = perms.map(p => p.id);
                                const allChecked = groupIds.every(id => selectedIds.includes(id));
                                return (
                                    <div key={resource} className="flex flex-col border border-border/60 rounded-xl overflow-hidden bg-card shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between bg-muted/50 p-3.5 border-b border-border/40">
                                            <span className="text-sm font-bold uppercase tracking-wider text-foreground capitalize">{resource} Matrix</span>
                                            <div className="flex items-center gap-2">
                                                <Checkbox id={`all-${resource}`} checked={allChecked} onCheckedChange={() => toggleAll(perms)} className="data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                                                <Label htmlFor={`all-${resource}`} className="text-[11px] font-bold text-muted-foreground uppercase tracking-wide cursor-pointer select-none">All</Label>
                                            </div>
                                        </div>
                                        <div className="p-3 grid grid-cols-1 gap-2 bg-background/50">
                                            {perms.map((p) => {
                                                const isRead = p.action === "read";
                                                const hasOtherSelected = isRead && perms.some(x => x.action !== "read" && selectedIds.includes(x.id));
                                                const isDisabled = hasOtherSelected;
                                                return (
                                                    <div key={p.id} className={`flex items-start gap-3 p-2.5 rounded-lg border border-border/40 bg-card transition-colors group ${isDisabled ? "opacity-75 cursor-not-allowed" : "hover:bg-muted/30 cursor-pointer"}`} onClick={() => !isDisabled && toggle(p)}>
                                                        <Checkbox id={`p-${p.id}`} checked={selectedIds.includes(p.id)} disabled={isDisabled} onCheckedChange={() => !isDisabled && toggle(p)} className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary" onClick={(e) => e.stopPropagation()} />
                                                        <div className="space-y-1 select-none flex-1">
                                                            <div className="flex items-center gap-2.5 flex-wrap">
                                                                <span className="text-sm font-semibold text-foreground capitalize group-hover:text-primary transition-colors">{p.action}</span>
                                                                <Badge variant="outline" className={`text-[10px] uppercase font-bold tracking-tight px-1.5 py-0 shadow-sm ${ACTION_COLOR[p.action] ?? ""}`}>{p.action}</Badge>
                                                            </div>
                                                            {p.description && <p className="text-[11px] text-muted-foreground leading-relaxed">{p.description}</p>}
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                <DialogFooter className="px-4 sm:px-6 py-4 sm:py-5 bg-muted/30 border-t border-border flex flex-col sm:flex-row justify-end gap-3 shrink-0">
                    <Button variant="outline" onClick={onClose} disabled={saving} className="h-11 px-6 font-semibold border-border/80 hover:bg-muted rounded-xl w-full sm:w-auto">
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="h-11 px-8 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-md transition-transform active:scale-[0.98] w-full sm:w-auto">
                        {saving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : null}
                        {saving ? "Saving..." : "Save Role Configuration"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
