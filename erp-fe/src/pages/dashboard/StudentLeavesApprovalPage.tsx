import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CalendarCheck, Check, X, Search, Clock, Calendar, FileText, CheckCircle2, XCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

interface StudentLeaveReview {
    id: string;
    studentId: string;
    classroomId: string;
    category: string;
    fromDate: string;
    toDate: string;
    totalDays: string | number;
    reason: string;
    attachmentUrl?: string | null;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    actionByName?: string | null;
    decidedAt?: string | null;
    decisionRemark?: string | null;
    student?: {
        id: string;
        firstName: string;
        lastName: string;
        admissionNumber: string;
        rollNumber?: number | string | null;
    };
    classroom?: {
        id: string;
        name: string;
        section: string;
    };
    department?: {
        id: string;
        name: string;
    };
    created_at: string;
}

export default function StudentLeavesApprovalPage() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("PENDING");

    // Action dialog state
    const [selectedLeave, setSelectedLeave] = useState<StudentLeaveReview | null>(null);
    const [actionType, setActionType] = useState<"APPROVED" | "REJECTED">("APPROVED");
    const [remark, setRemark] = useState("");

    const { data: leaves = [], isLoading } = useQuery<StudentLeaveReview[]>({
        queryKey: ["student-leaves", "reviewable", statusFilter],
        queryFn: async () => {
            const params = statusFilter === "ALL" ? {} : { status: statusFilter };
            const res = await api.get("/student-leaves", { params });
            return res.data.data;
        },
    });

    const actionMutation = useMutation({
        mutationFn: async ({ id, action, decisionRemark }: { id: string; action: string; decisionRemark?: string }) => {
            const res = await api.post(`/student-leaves/${id}/action`, {
                action,
                decisionRemark,
            });
            return res.data;
        },
        onSuccess: (_, vars) => {
            toast.success(`Student leave application has been ${vars.action.toLowerCase()}.`);
            setSelectedLeave(null);
            setRemark("");
            queryClient.invalidateQueries({ queryKey: ["student-leaves"] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to process leave application.");
        },
    });

    const handleActionSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedLeave) return;

        if (actionType === "REJECTED" && !remark.trim()) {
            toast.error("A reason or remark is required when rejecting a student leave.");
            return;
        }

        actionMutation.mutate({
            id: selectedLeave.id,
            action: actionType,
            decisionRemark: remark.trim() || undefined,
        });
    };

    const filtered = leaves.filter((item) => {
        const studentName = `${item.student?.firstName || ""} ${item.student?.lastName || ""}`.toLowerCase();
        const admNo = (item.student?.admissionNumber || "").toLowerCase();
        const rollNo = String(item.student?.rollNumber || "");
        const query = searchTerm.toLowerCase();
        return studentName.includes(query) || admNo.includes(query) || rollNo.includes(query);
    });

    const getStatusBadge = (status: string) => {
        switch (status) {
            case "APPROVED":
                return (
                    <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-600 font-bold">
                        <CheckCircle2 className="h-3 w-3" /> Approved
                    </Badge>
                );
            case "REJECTED":
                return (
                    <Badge variant="outline" className="gap-1 border-rose-500/30 bg-rose-500/10 text-rose-600 font-bold">
                        <XCircle className="h-3 w-3" /> Rejected
                    </Badge>
                );
            default:
                return (
                    <Badge variant="outline" className="gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600 font-bold">
                        <Clock className="h-3 w-3" /> Pending Review
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                        Student Leave Approvals
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Review and approve student leave requests for your assigned classrooms or department.
                    </p>
                </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search student by name, admission no, or roll no..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 h-9 rounded-xl text-xs"
                    />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-full sm:w-[160px] h-9 rounded-xl text-xs">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-border bg-card">
                        <SelectItem value="PENDING">Pending Only</SelectItem>
                        <SelectItem value="APPROVED">Approved</SelectItem>
                        <SelectItem value="REJECTED">Rejected</SelectItem>
                        <SelectItem value="ALL">All Applications</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            {/* Request Review List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-32 rounded-2xl bg-muted/40 animate-pulse border border-border/60" />
                        ))}
                    </div>
                ) : filtered.length === 0 ? (
                    <Card className="rounded-2xl border-dashed border-border/80 bg-card py-16 text-center">
                        <CalendarCheck className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-foreground">No Student Leaves Found</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                            {statusFilter === "PENDING"
                                ? "There are currently no pending student leave requests in your assigned sections."
                                : "No records matching your search and filter criteria."}
                        </p>
                    </Card>
                ) : (
                    filtered.map((item) => (
                        <Card key={item.id} className="rounded-2xl border-border/80 bg-card overflow-hidden shadow-xs hover:border-primary/30 transition-colors">
                            <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div className="space-y-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <span className="font-extrabold text-sm sm:text-base text-foreground">
                                            {item.student?.firstName} {item.student?.lastName}
                                        </span>
                                        <Badge variant="outline" className="text-[10px] font-mono bg-primary/10 text-primary border-primary/20">
                                            {item.classroom ? `${item.classroom.name}-${item.classroom.section}` : "Class"}
                                        </Badge>
                                        {item.student?.rollNumber && (
                                            <Badge variant="secondary" className="text-[10px] font-mono">
                                                Roll #{item.student.rollNumber}
                                            </Badge>
                                        )}
                                        <Badge variant="outline" className="text-[10px] uppercase font-semibold text-muted-foreground">
                                            {item.category.replace(/_/g, " ")}
                                        </Badge>
                                    </div>
                                    <CardDescription className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                                        <Calendar className="h-3.5 w-3.5 text-primary" />
                                        <span>Duration: <strong>{item.fromDate}</strong> to <strong>{item.toDate}</strong></span>
                                        <span className="text-foreground font-bold">({item.totalDays} {Number(item.totalDays) === 1 ? "day" : "days"})</span>
                                    </CardDescription>
                                </div>

                                <div className="flex items-center gap-2 self-end sm:self-center">
                                    {getStatusBadge(item.status)}
                                    {item.status === "PENDING" && (
                                        <div className="flex items-center gap-1.5 ml-2">
                                            <Button
                                                size="sm"
                                                onClick={() => {
                                                    setSelectedLeave(item);
                                                    setActionType("APPROVED");
                                                    setRemark("");
                                                }}
                                                className="h-8 gap-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-xs"
                                            >
                                                <Check className="h-3.5 w-3.5" /> Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                    setSelectedLeave(item);
                                                    setActionType("REJECTED");
                                                    setRemark("");
                                                }}
                                                className="h-8 gap-1 border-rose-500/30 text-rose-600 hover:bg-rose-500/10 font-bold text-xs rounded-xl"
                                            >
                                                <X className="h-3.5 w-3.5" /> Reject
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </CardHeader>

                            <CardContent className="p-4 sm:p-5 pt-3.5 space-y-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Reason for Leave</p>
                                    <p className="text-xs text-foreground bg-muted/40 p-3 rounded-xl border border-border/60 leading-relaxed">
                                        {item.reason}
                                    </p>
                                </div>

                                {item.attachmentUrl && (
                                    <div className="flex items-center gap-2 text-xs text-primary font-medium">
                                        <FileText className="h-4 w-4" />
                                        <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="underline hover:text-primary/80">
                                            View Student Attachment / Medical Certificate
                                        </a>
                                    </div>
                                )}

                                {item.status !== "PENDING" && (
                                    <div className="pt-2 border-t border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-muted-foreground">
                                        <span>
                                            Actioned by: <strong className="text-foreground">{item.actionByName || "Faculty"}</strong>
                                        </span>
                                        {item.decisionRemark && (
                                            <span className="italic bg-muted/30 px-2.5 py-1 rounded-lg border border-border/40">
                                                Remarks: &ldquo;{item.decisionRemark}&rdquo;
                                            </span>
                                        )}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    ))
                )}
            </div>

            {/* Approval / Rejection Decision Dialog */}
            <Dialog open={!!selectedLeave} onOpenChange={(open) => { if (!open) setSelectedLeave(null); }}>
                <DialogContent className="sm:max-w-[440px] rounded-2xl border-border bg-card">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold text-foreground">
                            {actionType === "APPROVED" ? "Approve Student Leave" : "Reject Student Leave"}
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {actionType === "APPROVED"
                                ? "Approving this leave will automatically mark student attendance as 'ON LEAVE' (excused) for the selected dates."
                                : "Please state the reason for rejecting this leave application."}
                        </DialogDescription>
                    </DialogHeader>

                    {selectedLeave && (
                        <form onSubmit={handleActionSubmit} className="space-y-4 pt-2">
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 text-xs space-y-1">
                                <p><strong>Student:</strong> {selectedLeave.student?.firstName} {selectedLeave.student?.lastName} ({selectedLeave.classroom?.name}-{selectedLeave.classroom?.section})</p>
                                <p><strong>Dates:</strong> {selectedLeave.fromDate} to {selectedLeave.toDate} ({selectedLeave.totalDays} days)</p>
                            </div>

                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">
                                    {actionType === "APPROVED" ? "Faculty Remarks (Optional)" : "Rejection Reason *"}
                                </Label>
                                <Textarea
                                    placeholder={actionType === "APPROVED" ? "Add notes or homework guidance..." : "Explain why the leave cannot be approved..."}
                                    value={remark}
                                    onChange={(e) => setRemark(e.target.value)}
                                    required={actionType === "REJECTED"}
                                    rows={3}
                                    className="rounded-xl text-xs resize-none"
                                />
                            </div>

                            <DialogFooter className="gap-2 pt-2">
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setSelectedLeave(null)}
                                    className="h-9 rounded-xl text-xs font-semibold"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    disabled={actionMutation.isPending}
                                    className={
                                        actionType === "APPROVED"
                                            ? "h-9 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                                            : "h-9 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-xs"
                                    }
                                >
                                    {actionMutation.isPending
                                        ? "Saving..."
                                        : actionType === "APPROVED" ? "Confirm Approval" : "Confirm Rejection"}
                                </Button>
                            </DialogFooter>
                        </form>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
}
