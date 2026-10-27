import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { TeacherLeaveRequest, Pagination, LeaveType } from "@/types/erp";
import { usePermissions } from "@/store/hooks";
import AccessDenied from "@/components/auth/AccessDenied";
import { PageHeader } from "@/components/common/PageHeader";
import { DataTable, type Column } from "@/components/common/DataTable";
import { LeaveStatusBadge } from "@/components/leaves/LeaveStatusBadge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    CheckCircle2,
    XCircle,
    RefreshCw,
    Check,
    X,
    Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LeaveApprovalsPage() {
    const { can } = usePermissions();
    const qc = useQueryClient();

    const [page, setPage] = useState(1);
    const [statusFilter, setStatusFilter] = useState("PENDING");
    const [leaveTypeFilter, setLeaveTypeFilter] = useState("all");

    // Decision Modal
    const [selectedRequest, setSelectedRequest] = useState<TeacherLeaveRequest | null>(null);
    const [decisionAction, setDecisionAction] = useState<"APPROVED" | "REJECTED">("APPROVED");
    const [decisionRemark, setDecisionRemark] = useState("");

    // Fetch leave types for filter
    const { data: typesData } = useQuery({
        queryKey: ["leave-types"],
        queryFn: async () => {
            const { data } = await api.get("/teacher-leaves/types");
            return data.data.leaveTypes as LeaveType[];
        },
    });

    // Fetch queue
    const {
        data: queueData,
        isLoading,
        isFetching,
        refetch,
    } = useQuery({
        queryKey: ["leave-approvals-queue", page, statusFilter, leaveTypeFilter],
        queryFn: async () => {
            const params = new URLSearchParams({ page: String(page), limit: "15" });
            if (statusFilter && statusFilter !== "all") params.set("status", statusFilter);
            if (leaveTypeFilter && leaveTypeFilter !== "all") params.set("leaveTypeId", leaveTypeFilter);
            const { data } = await api.get(`/teacher-leaves/requests?${params}`);
            return data.data as { requests: TeacherLeaveRequest[]; pagination: Pagination };
        },
        enabled: can("teacher_leaves", "update") || can("teacher_leaves", "read"),
    });

    // Decision mutation
    const decideMutation = useMutation({
        mutationFn: async ({ id, decision, decisionRemark }: { id: string; decision: string; decisionRemark: string }) => {
            return api.patch(`/teacher-leaves/requests/${id}/decide`, { decision, decisionRemark });
        },
        onSuccess: (_, vars) => {
            toast.success(`Leave application marked as ${vars.decision.toLowerCase()}`);
            setSelectedRequest(null);
            setDecisionRemark("");
            qc.invalidateQueries({ queryKey: ["leave-approvals-queue"] });
            qc.invalidateQueries({ queryKey: ["my-leave-balances"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to submit decision");
        },
    });

    if (!can("teacher_leaves", "read") && !can("teacher_leaves", "update")) {
        return <AccessDenied />;
    }

    const requestsList = queueData?.requests || [];
    const pagination = queueData?.pagination || { page: 1, pages: 1, total: 0, limit: 15 };

    const columns: Column<TeacherLeaveRequest>[] = [
        {
            header: "Teacher",
            cell: (r) => {
                const account = r.teacher?.account;
                const name = account ? `${account.firstName} ${account.lastName}` : "Faculty";
                const initials = account ? `${account.firstName[0]}${account.lastName[0]}`.toUpperCase() : "T";
                return (
                    <div className="flex items-center gap-2.5">
                        <Avatar className="h-9 w-9 border border-primary/20 shrink-0">
                            <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                                {initials}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="font-bold text-sm text-foreground">{name}</p>
                            <p className="text-xs text-muted-foreground">{r.teacher?.teacherId} {r.teacher?.designationName ? `• ${r.teacher.designationName}` : ''}</p>
                        </div>
                    </div>
                );
            },
        },
        {
            header: "Leave Category",
            cell: (r) => (
                <div className="flex items-center gap-1.5">
                    <Badge variant="secondary" className="font-bold text-xs bg-primary/10 text-primary">
                        {r.leaveType?.code}
                    </Badge>
                    <span className="text-xs font-semibold">{r.leaveType?.name}</span>
                </div>
            ),
        },
        {
            header: "Span & Days",
            cell: (r) => (
                <div className="flex flex-col text-xs">
                    <span className="font-semibold text-foreground">
                        {new Date(r.fromDate).toLocaleDateString()} &rarr; {new Date(r.toDate).toLocaleDateString()}
                    </span>
                    <span className="text-primary font-bold">{r.totalDays} working day(s)</span>
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
            header: "Action / Decided By",
            cell: (r) => {
                if (r.status === "PENDING") {
                    return <span className="text-xs text-amber-600 font-medium">Awaiting Review</span>;
                }
                const deciderName = r.actionByName || (r.decider ? `${r.decider.firstName} ${r.decider.lastName}` : "Authorized Staff");
                return (
                    <div className="flex flex-col text-xs">
                        <span className="font-semibold text-foreground">
                            {deciderName}
                        </span>
                        {r.decidedAt && (
                            <span className="text-[10px] text-muted-foreground">
                                on {new Date(r.decidedAt).toLocaleDateString()}
                            </span>
                        )}
                        {r.decisionRemark && (
                            <span className="text-[10px] text-muted-foreground italic truncate max-w-[130px]" title={r.decisionRemark}>
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
                r.status === "PENDING" && can("teacher_leaves", "update") ? (
                    <div className="flex justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10 gap-1 rounded-lg"
                            onClick={() => {
                                setSelectedRequest(r);
                                setDecisionAction("APPROVED");
                                setDecisionRemark("");
                            }}
                        >
                            <Check className="h-3.5 w-3.5" /> Approve
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            className="h-8 text-xs text-destructive border-destructive/30 hover:bg-destructive/10 gap-1 rounded-lg"
                            onClick={() => {
                                setSelectedRequest(r);
                                setDecisionAction("REJECTED");
                                setDecisionRemark("");
                            }}
                        >
                            <X className="h-3.5 w-3.5" /> Reject
                        </Button>
                    </div>
                ) : (
                    <span className="text-xs text-muted-foreground/60 italic">Decided</span>
                ),
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
                title="Leave Approvals Queue"
                description="Review, verify, and approve faculty leave requests across departments."
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
            </PageHeader>

            {/* Filter Bar */}
            <Card className="p-4 border-border/60 bg-card rounded-2xl shadow-xs">
                <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                    <div className="flex flex-wrap gap-2.5 items-center w-full sm:w-auto">
                        {/* Status Filter */}
                        <div className="w-full sm:w-44">
                            <Select
                                value={statusFilter}
                                onValueChange={(val) => {
                                    setStatusFilter(val);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-10 bg-muted/40 border-border/60 rounded-xl text-sm">
                                    <SelectValue placeholder="Status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Statuses</SelectItem>
                                    <SelectItem value="PENDING">Pending Review</SelectItem>
                                    <SelectItem value="APPROVED">Approved Only</SelectItem>
                                    <SelectItem value="REJECTED">Rejected Only</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Leave Type Filter */}
                        <div className="w-full sm:w-48">
                            <Select
                                value={leaveTypeFilter}
                                onValueChange={(val) => {
                                    setLeaveTypeFilter(val);
                                    setPage(1);
                                }}
                            >
                                <SelectTrigger className="h-10 bg-muted/40 border-border/60 rounded-xl text-sm">
                                    <SelectValue placeholder="Leave Category" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Categories</SelectItem>
                                    {(typesData || []).map((t) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.name} ({t.code})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="text-xs text-muted-foreground self-end sm:self-auto">
                        <span className="font-semibold text-foreground">{pagination.total}</span> requests in queue
                    </div>
                </div>
            </Card>

            {/* Approvals Table */}
            <DataTable
                columns={columns}
                data={requestsList}
                keyExtractor={(r) => r.id}
                isLoading={isLoading}
                pagination={{
                    page: pagination.page,
                    totalPages: pagination.pages,
                    total: pagination.total,
                    limit: pagination.limit,
                    onPageChange: (newPage) => setPage(newPage),
                }}
                emptyTitle="No pending leave approvals"
                emptyDescription="There are no faculty leave requests matching your filter criteria."
                emptyIcon={CheckCircle2}
            />

            {/* Decision Dialog */}
            {selectedRequest && (
                <Dialog open onOpenChange={() => setSelectedRequest(null)}>
                    <DialogContent className="max-w-md rounded-2xl border-border/80 p-0 overflow-hidden shadow-2xl">
                        <DialogHeader className="p-5 border-b border-border/60 bg-muted/20">
                            <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                                {decisionAction === "APPROVED" ? (
                                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                                ) : (
                                    <XCircle className="h-5 w-5 text-destructive" />
                                )}
                                Confirm {decisionAction === "APPROVED" ? "Approval" : "Rejection"}
                            </DialogTitle>
                        </DialogHeader>

                        <div className="p-5 space-y-4">
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1.5">
                                <p className="font-semibold text-foreground">
                                    Applicant: {selectedRequest.teacher?.account?.firstName} {selectedRequest.teacher?.account?.lastName}
                                </p>
                                <p className="text-muted-foreground">
                                    Category: {selectedRequest.leaveType?.name} ({selectedRequest.totalDays} working days)
                                </p>
                                <p className="text-muted-foreground">
                                    Span: {new Date(selectedRequest.fromDate).toLocaleDateString()} &rarr; {new Date(selectedRequest.toDate).toLocaleDateString()}
                                </p>
                                <p className="text-muted-foreground pt-1 border-t border-border/40 italic">
                                    Reason: "{selectedRequest.reason}"
                                </p>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-foreground">
                                    Decision Remark / Notes (Optional)
                                </label>
                                <Textarea
                                    placeholder="Enter administrative remark or condition..."
                                    className="rounded-xl bg-muted/40 border-border/60 text-sm resize-none"
                                    value={decisionRemark}
                                    onChange={(e) => setDecisionRemark(e.target.value)}
                                />
                            </div>
                        </div>

                        <DialogFooter className="p-4 border-t border-border/60 bg-muted/10 gap-2">
                            <Button
                                variant="outline"
                                className="rounded-xl h-10 px-4"
                                onClick={() => setSelectedRequest(null)}
                            >
                                Cancel
                            </Button>
                            <Button
                                className={`rounded-xl h-10 px-5 font-semibold text-white ${
                                    decisionAction === "APPROVED"
                                        ? "bg-emerald-600 hover:bg-emerald-700"
                                        : "bg-destructive hover:bg-destructive/90"
                                }`}
                                onClick={() =>
                                    decideMutation.mutate({
                                        id: selectedRequest.id,
                                        decision: decisionAction,
                                        decisionRemark,
                                    })
                                }
                                disabled={decideMutation.isPending}
                            >
                                {decideMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                                Confirm {decisionAction === "APPROVED" ? "Approval" : "Rejection"}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </motion.div>
    );
}
