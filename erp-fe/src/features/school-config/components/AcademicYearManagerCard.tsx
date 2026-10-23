import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    CalendarDays,
    CheckCircle2,
    Clock,
    AlertCircle,
    Sparkles,
    Loader2,
    CalendarCheck,
    ChevronRight,
    Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    fetchAcademicYears,
    activateAcademicYear,
    updateAcademicYear,
    type AcademicYear,
} from "../api/academicYearApi";

export function AcademicYearManagerCard() {
    const queryClient = useQueryClient();
    const [editingYear, setEditingYear] = useState<AcademicYear | null>(null);
    const [confirmActivateId, setConfirmActivateId] = useState<string | null>(null);
    const [editName, setEditName] = useState("");
    const [editNotes, setEditNotes] = useState("");

    const { data: years = [], isLoading, isError } = useQuery<AcademicYear[]>({
        queryKey: ["academicYears"],
        queryFn: fetchAcademicYears,
    });

    const activateMutation = useMutation({
        mutationFn: activateAcademicYear,
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ["academicYears"] });
            queryClient.invalidateQueries({ queryKey: ["classrooms"] });
            queryClient.invalidateQueries({ queryKey: ["events"] });
            toast.success(`Academic Year ${updated.name} is now ACTIVE and current.`);
            setConfirmActivateId(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to activate academic year");
        },
    });

    const updateMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: { name?: string; notes?: string } }) =>
            updateAcademicYear(id, data),
        onSuccess: (updated) => {
            queryClient.invalidateQueries({ queryKey: ["academicYears"] });
            toast.success(`Academic Year ${updated.name} updated successfully.`);
            setEditingYear(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to update academic year");
        },
    });

    const currentYear = years.find((y) => y.isCurrent || y.status === "ACTIVE");

    const getStatusBadge = (status: AcademicYear["status"], isCurrent: boolean) => {
        if (isCurrent || status === "ACTIVE") {
            return (
                <Badge className="bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    ACTIVE (CURRENT)
                </Badge>
            );
        }
        if (status === "UPCOMING") {
            return (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    UPCOMING
                </Badge>
            );
        }
        return (
            <Badge variant="secondary" className="bg-muted text-muted-foreground text-[10px] font-semibold px-2 py-0.5 rounded-full">
                COMPLETED
            </Badge>
        );
    };

    const handleOpenEdit = (year: AcademicYear) => {
        setEditingYear(year);
        setEditName(year.name);
        setEditNotes(year.notes || "");
    };

    const handleSaveEdit = () => {
        if (!editingYear) return;
        updateMutation.mutate({
            id: editingYear.id,
            data: { name: editName, notes: editNotes },
        });
    };

    return (
        <Card className="rounded-2xl border-border/70 shadow-xs bg-card/60 backdrop-blur-xs overflow-hidden mb-6">
            <CardHeader className="p-4 sm:p-5 border-b border-border/50 bg-muted/20">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs">
                            <CalendarDays className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <CardTitle className="text-base font-bold tracking-tight">
                                    Academic Year Management
                                </CardTitle>
                                {currentYear && (
                                    <Badge className="bg-primary/15 text-primary border-primary/20 text-[10px] font-extrabold uppercase px-2 py-0.2">
                                        Current: {currentYear.name}
                                    </Badge>
                                )}
                            </div>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                Automatically synchronized from Academic Calendar session boundaries. Drives classrooms, promotions, and attendance.
                            </CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-4 sm:p-5">
                {isLoading ? (
                    <div className="space-y-3">
                        <Skeleton className="h-14 w-full rounded-xl" />
                        <Skeleton className="h-14 w-full rounded-xl" />
                    </div>
                ) : isError ? (
                    <div className="flex items-center gap-2 p-3 text-xs text-destructive bg-destructive/10 rounded-xl border border-destructive/20">
                        <AlertCircle className="w-4 h-4" />
                        <span>Failed to load academic years. Please check server connection.</span>
                    </div>
                ) : years.length === 0 ? (
                    <div className="text-center py-6 px-4 rounded-xl border border-dashed border-border/80 bg-muted/10">
                        <CalendarCheck className="w-8 h-8 text-muted-foreground/60 mx-auto mb-2" />
                        <h4 className="text-sm font-semibold text-foreground">No Academic Year Found</h4>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto mt-1">
                            Save an Academic Calendar session range in the Academic Calendar setup to automatically provision your academic year.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {years.map((year) => {
                            const isCurrent = year.isCurrent || year.status === "ACTIVE";
                            return (
                                <div
                                    key={year.id}
                                    className={`relative p-3.5 rounded-xl border transition-all ${
                                        isCurrent
                                            ? "border-emerald-500/40 bg-emerald-500/5 dark:bg-emerald-950/15 shadow-xs"
                                            : "border-border/60 bg-background/50 hover:border-border"
                                    }`}
                                >
                                    <div className="flex items-start justify-between gap-2 mb-2">
                                        <div>
                                            <span className="text-base font-bold text-foreground tracking-tight">
                                                {year.name}
                                            </span>
                                            <p className="text-[11px] text-muted-foreground">
                                                {year.startDate} → {year.endDate}
                                            </p>
                                        </div>
                                        {getStatusBadge(year.status, isCurrent)}
                                    </div>

                                    {year.notes && (
                                        <p className="text-[11px] text-muted-foreground/80 line-clamp-1 italic mb-3">
                                            {year.notes}
                                        </p>
                                    )}

                                    <div className="flex items-center justify-between gap-2 pt-2 border-t border-border/40 mt-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleOpenEdit(year)}
                                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                        >
                                            <Edit3 className="w-3 h-3 mr-1" />
                                            Edit
                                        </Button>

                                        {!isCurrent && (
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                disabled={activateMutation.isPending}
                                                onClick={() => setConfirmActivateId(year.id)}
                                                className="h-7 px-2.5 text-xs font-semibold rounded-lg border-primary/30 text-primary hover:bg-primary/10"
                                            >
                                                Activate Year
                                                <ChevronRight className="w-3 h-3 ml-1" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </CardContent>

            {/* Confirm Activation Modal */}
            <ResponsiveModal
                open={!!confirmActivateId}
                onOpenChange={(open) => !open && setConfirmActivateId(null)}
                title="Activate Academic Year"
                description="Make this year the active source of truth for the entire school ERP"
            >
                <div className="space-y-4 py-2">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <div>
                            <p className="font-semibold mb-0.5">Activation Confirmation</p>
                            <p>
                                Switching the active academic year will mark the previous active year as <strong>COMPLETED</strong>. All new classroom registrations, section assignments, and attendance logs will default to this year.
                            </p>
                        </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-border/70">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setConfirmActivateId(null)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={activateMutation.isPending}
                            onClick={() => confirmActivateId && activateMutation.mutate(confirmActivateId)}
                            className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95"
                        >
                            {activateMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            ) : (
                                <Sparkles className="w-3.5 h-3.5 mr-1.5" />
                            )}
                            Confirm & Activate
                        </Button>
                    </div>
                </div>
            </ResponsiveModal>

            {/* Edit Year Modal */}
            <ResponsiveModal
                open={!!editingYear}
                onOpenChange={(open) => !open && setEditingYear(null)}
                title="Edit Academic Year Details"
                description="Update display label or administration notes"
            >
                <div className="space-y-4 py-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">Display Label / Name</label>
                        <Input
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="h-9 text-xs rounded-xl"
                            placeholder="e.g. 2026-27"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">Admin Notes</label>
                        <Textarea
                            value={editNotes}
                            onChange={(e) => setEditNotes(e.target.value)}
                            className="text-xs rounded-xl min-h-[70px]"
                            placeholder="Optional metadata or school term information"
                        />
                    </div>

                    <div className="flex justify-end gap-2 pt-3 border-t border-border/70">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingYear(null)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            size="sm"
                            disabled={updateMutation.isPending || !editName.trim()}
                            onClick={handleSaveEdit}
                            className="rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/95"
                        >
                            {updateMutation.isPending && (
                                <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                            )}
                            Save Changes
                        </Button>
                    </div>
                </div>
            </ResponsiveModal>
        </Card>
    );
}
