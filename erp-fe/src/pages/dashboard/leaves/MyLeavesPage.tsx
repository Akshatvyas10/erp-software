import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { TeacherLeaveBalance, TeacherLeaveRequest, Pagination } from "@/types/erp";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { LeaveBalanceCards } from "@/components/leaves/LeaveBalanceCards";
import { ApplyLeaveModal, type LeaveFormValues } from "@/components/leaves/ApplyLeaveModal";
import { LeaveStatusBadge } from "@/components/leaves/LeaveStatusBadge";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
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
import { usePermissions } from "@/store/hooks";
import {
    Plus,
    RefreshCw,
    XCircle,
    FileText,
    CalendarCheck,
    Calendar,
    Clock,
    AlertCircle,
    CheckCircle2,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function MyLeavesPage() {
    const { can } = usePermissions();
    const qc = useQueryClient();
    const canApply = can("teacher_leaves", "create") || can("teacher_leaves", "manage");
    const canCancel = can("teacher_leaves", "delete") || can("teacher_leaves", "manage");

    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("all");
    const [isApplyOpen, setIsApplyOpen] = useState(false);
    const [cancelRequestId, setCancelRequestId] = useState<string | null>(null);
    const [selectedDetailRequest, setSelectedDetailRequest] = useState<TeacherLeaveRequest | null>(null);

    // Fetch user leave balances
    const {
        data: balancesData,
        isLoading: balancesLoading,
        refetch: refetchBalances,
    } = useQuery({
        queryKey: ["my-leave-balances"],
        queryFn: async () => {
            const { data } = await api.get("/teacher-leaves/balances/my");
            return data.data.balances as TeacherLeaveBalance[];
        },
    });

    // Fetch user requests
    const {
        data: requestsData,
        isLoading: requestsLoading,
        isFetching,
        refetch: refetchRequests,
    } = useQuery({
        queryKey: ["my-leave-requests", page, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({ page: String(page), limit: "15" });
            if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
            const { data } = await api.get(`/teacher-leaves/requests/my?${params}`);
            return data.data as { requests: TeacherLeaveRequest[]; pagination: Pagination };
        },
    });

    // Apply mutation
    const applyMutation = useMutation({
        mutationFn: (values: LeaveFormValues) => api.post("/teacher-leaves/requests", values),
        onSuccess: () => {
            toast.success("Leave application submitted successfully");
            setIsApplyOpen(false);
            qc.invalidateQueries({ queryKey: ["my-leave-requests"] });
            qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to submit leave application");
        },
    });

    // Cancel mutation
    const cancelMutation = useMutation({
        mutationFn: (id: string) => api.patch(`/teacher-leaves/requests/${id}/cancel`),
        onSuccess: () => {
            toast.success("Leave application cancelled");
            setCancelRequestId(null);
            qc.invalidateQueries({ queryKey: ["my-leave-requests"] });
            qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to cancel leave application");
        },
    });

    const requestsList = requestsData?.requests || [];
    const pagination = requestsData?.pagination || { page: 1, pages: 1, total: 0, limit: 15 };

    const columns: Column<TeacherLeaveRequest>[] = [
        {
            header: "Category",
            cell: (r) => (
                <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary">
                        {r.leaveType?.code || "LEAVE"}
                    </Badge>
                    <span className="font-medium text-sm text-foreground">
                        {r.leaveType?.name || "Leave"}
                    </span>
                </div>
            ),
        },
        {
            header: "Date Range",
            cell: (r) => (
                <div className="flex flex-col text-xs">
                    <span className="font-medium text-foreground">
                        {new Date(r.fromDate).toLocaleDateString()} &rarr; {new Date(r.toDate).toLocaleDateString()}
                    </span>
                    <span className="text-muted-foreground font-semibold">
                        {r.totalDays} working day(s)
                    </span>
                </div>
            ),
        },
        {
            header: "Reason",
            cell: (r) => (
                <p className="text-xs text-muted-foreground max-w-xs truncate" title={r.reason}>
                    {r.reason}
                </p>
            ),
        },
        {
            header: "Status",
            cell: (r) => <LeaveStatusBadge status={r.status} />,
        },
        {
            header: "Decision & Audit",
            cell: (r) => {
                if (r.status === "PENDING") {
                    return <span className="text-xs text-muted-foreground/60 italic">Pending approver action</span>;
                }
                const deciderName = r.actionByName || (r.decider ? `${r.decider.firstName} ${r.decider.lastName}` : "Approver");
                return (
                    <div className="flex flex-col text-xs">
                        <span className="font-semibold text-foreground">
                            {r.status === "APPROVED" ? "Approved by" : (r.status === "REJECTED" ? "Rejected by" : "Cancelled")} {r.status !== "CANCELLED" && deciderName}
                        </span>
                        {r.decidedAt && (
                            <span className="text-[10px] text-muted-foreground">
                                on {new Date(r.decidedAt).toLocaleDateString()}
                            </span>
                        )}
                        {r.decisionRemark && (
                            <span className="text-[10px] text-muted-foreground italic truncate max-w-[180px]" title={r.decisionRemark}>
                                "{r.decisionRemark}"
                            </span>
                        )}
                    </div>
                );
            },
        },
        {
            header: "Actions",
            className: "text-right",
            cell: (r) =>
                canCancel && r.status === "PENDING" ? (
                    <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 text-xs text-destructive hover:bg-destructive/10"
                        onClick={() => setCancelRequestId(r.id)}
                    >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Cancel
                    </Button>
                ) : null,
        },
    ];

    return (
        <motion.div
            className="space-y-6 text-foreground"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
        >
            <PageHeader
                title="My Leaves & Quotas"
                description="View your active leave balances, submit requests, and track approval status."
            >
                <Button
                    variant="outline"
                    size="icon"
                    className="h-10 w-10 rounded-xl"
                    onClick={() => {
                        refetchBalances();
                        refetchRequests();
                    }}
                    disabled={isFetching}
                >
                    <RefreshCw className={`h-4 w-4 ${isFetching ? "animate-spin text-primary" : "text-muted-foreground"}`} />
                </Button>
                {canApply && (
                    <Button
                        className="gap-2 h-10 px-4 rounded-xl font-semibold shadow-sm"
                        onClick={() => setIsApplyOpen(true)}
                    >
                        <Plus className="h-4 w-4" /> Apply for Leave
                    </Button>
                )}
            </PageHeader>

            {/* Balances Display */}
            <LeaveBalanceCards balances={balancesData || []} isLoading={balancesLoading} />

            {/* Requests DataTable */}
            <Card className="p-4 border-border/60 bg-card rounded-2xl shadow-xs">
                <div className="flex items-center justify-between pb-3">
                    <h3 className="font-bold text-sm text-foreground flex items-center gap-2">
                        <FileText className="h-4 w-4 text-primary" />
                        Leave Application History
                    </h3>
                    <div className="flex items-center gap-1.5">
                        {["all", "PENDING", "APPROVED", "REJECTED"].map((st) => (
                            <Button
                                key={st}
                                variant={statusFilter === st ? "default" : "outline"}
                                size="sm"
                                className="h-7 text-xs rounded-lg px-2.5"
                                onClick={() => {
                                    setStatusFilter(st);
                                    setPage(1);
                                }}
                            >
                                {st === "all" ? "All" : st.charAt(0) + st.slice(1).toLowerCase()}
                            </Button>
                        ))}
                    </div>
                </div>

                <DataTable
                    columns={columns}
                    data={requestsList}
                    keyExtractor={(r) => r.id}
                    isLoading={requestsLoading}
                    onRowClick={(row) => setSelectedDetailRequest(row)}
                    pagination={{
                        page: pagination.page,
                        totalPages: pagination.pages,
                        total: pagination.total,
                        limit: pagination.limit,
                        onPageChange: (newPage) => setPage(newPage),
                    }}
                    emptyTitle="No leave applications"
                    emptyDescription="You have not submitted any leave applications for this session."
                    emptyIcon={CalendarCheck}
                    emptyActionLabel={canApply ? "Apply for Leave" : undefined}
                    onEmptyAction={canApply ? () => setIsApplyOpen(true) : undefined}
                />
            </Card>

            {/* Application Detail Dialog */}
            {selectedDetailRequest && (
                <Dialog open onOpenChange={() => setSelectedDetailRequest(null)}>
                    <DialogContent className="max-w-lg rounded-2xl border-border/80 p-0 overflow-hidden shadow-2xl">
                        <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
                            <div className="flex items-center justify-between">
                                <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                    <FileText className="h-5 w-5 text-primary" />
                                    Leave Application Details
                                </DialogTitle>
                                <LeaveStatusBadge status={selectedDetailRequest.status} />
                            </div>
                        </DialogHeader>

                        <div className="p-5 space-y-4 text-xs">
                            {/* Summary Grid */}
                            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-muted/40 border border-border/60">
                                <div>
                                    <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider block">Category</span>
                                    <span className="font-bold text-foreground text-sm">
                                        {selectedDetailRequest.leaveType?.name || selectedDetailRequest.leaveType?.code}
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                                        {selectedDetailRequest.leaveType?.isPaid ? "Paid Leave" : "Leave Without Pay"}
                                    </span>
                                </div>
                                <div>
                                    <span className="text-muted-foreground uppercase text-[10px] font-bold tracking-wider block">Duration</span>
                                    <span className="font-bold text-primary text-sm">
                                        {selectedDetailRequest.totalDays} working day(s)
                                    </span>
                                    <span className="text-[11px] text-muted-foreground block mt-0.5">
                                        {new Date(selectedDetailRequest.fromDate).toLocaleDateString()} &rarr; {new Date(selectedDetailRequest.toDate).toLocaleDateString()}
                                    </span>
                                </div>
                            </div>

                            {/* Reason for Leave */}
                            <div className="space-y-1.5 p-3 rounded-xl border border-border/50 bg-card">
                                <span className="font-bold text-foreground block">Reason for Application</span>
                                <p className="text-muted-foreground whitespace-pre-wrap leading-relaxed">
                                    {selectedDetailRequest.reason || "No explanation provided."}
                                </p>
                            </div>

                            {/* Decision & Audit Stamp */}
                            {selectedDetailRequest.status !== "PENDING" && (
                                <div className={`p-3.5 rounded-xl border space-y-2 ${
                                    selectedDetailRequest.status === "APPROVED"
                                        ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-900 dark:text-emerald-200"
                                        : "bg-destructive/10 border-destructive/20 text-destructive dark:text-rose-200"
                                }`}>
                                    <div className="flex items-center gap-2 font-bold text-xs">
                                        {selectedDetailRequest.status === "APPROVED" ? (
                                            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                                        ) : (
                                            <AlertCircle className="h-4 w-4 text-destructive shrink-0" />
                                        )}
                                        <span>
                                            {selectedDetailRequest.status === "APPROVED" ? "Approved" : "Rejected"} by{" "}
                                            <strong>{selectedDetailRequest.actionByName || "Approving Authority"}</strong>
                                        </span>
                                    </div>
                                    {selectedDetailRequest.decidedAt && (
                                        <div className="text-[11px] opacity-80 flex items-center gap-1.5">
                                            <Clock className="h-3 w-3" />
                                            <span>Decided on {new Date(selectedDetailRequest.decidedAt).toLocaleString()}</span>
                                        </div>
                                    )}
                                    {selectedDetailRequest.decisionRemark && (
                                        <div className="text-[11px] pt-1 border-t border-border/30 italic">
                                            <strong>Remark:</strong> "{selectedDetailRequest.decisionRemark}"
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Submission Audit info */}
                            <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-1">
                                <span className="flex items-center gap-1">
                                    <Calendar className="h-3.5 w-3.5" />
                                    Submitted on {new Date(selectedDetailRequest.createdAt).toLocaleString()}
                                </span>
                                {selectedDetailRequest.academicYear?.name && (
                                    <Badge variant="outline" className="text-[10px] font-semibold">
                                        Session: {selectedDetailRequest.academicYear.name}
                                    </Badge>
                                )}
                            </div>
                        </div>

                        <DialogFooter className="p-4 border-t border-border/60 bg-muted/10 flex items-center justify-between">
                            <div>
                                {canCancel && selectedDetailRequest.status === "PENDING" && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        className="text-destructive border-destructive/30 hover:bg-destructive/10 rounded-xl text-xs h-9"
                                        onClick={() => {
                                            setCancelRequestId(selectedDetailRequest.id);
                                            setSelectedDetailRequest(null);
                                        }}
                                    >
                                        <XCircle className="h-3.5 w-3.5 mr-1" /> Cancel Application
                                    </Button>
                                )}
                            </div>
                            <Button
                                variant="default"
                                size="sm"
                                className="rounded-xl h-9 px-4 text-xs font-semibold"
                                onClick={() => setSelectedDetailRequest(null)}
                            >
                                Close
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}

            {/* Apply Modal */}
            <ResponsiveModal
                open={isApplyOpen}
                onOpenChange={setIsApplyOpen}
                maxWidth="sm:max-w-xl"
                contentClassName="p-0 overflow-hidden"
            >
                <ApplyLeaveModal
                    balances={balancesData || []}
                    onSubmit={(values) => applyMutation.mutate(values)}
                    onCancel={() => setIsApplyOpen(false)}
                    isSubmitting={applyMutation.isPending}
                />
            </ResponsiveModal>

            {/* Cancel Confirmation */}
            <AlertDialog open={!!cancelRequestId} onOpenChange={() => setCancelRequestId(null)}>
                <AlertDialogContent className="rounded-2xl border-border">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Cancel Leave Application?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to cancel this pending leave application? This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="rounded-xl">Keep Application</AlertDialogCancel>
                        <AlertDialogAction
                            className="bg-destructive hover:bg-destructive/90 text-white rounded-xl"
                            onClick={() => cancelRequestId && cancelMutation.mutate(cancelRequestId)}
                            disabled={cancelMutation.isPending}
                        >
                            Yes, Cancel Leave
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </motion.div>
    );
}
