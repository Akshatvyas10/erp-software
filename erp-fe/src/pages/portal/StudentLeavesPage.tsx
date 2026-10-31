import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarCheck, Plus, Calendar, FileText, CheckCircle2, Clock, XCircle, AlertCircle } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { toast } from "sonner";

interface StudentLeave {
    id: string;
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
    classroom?: {
        name: string;
        section: string;
    };
    created_at: string;
}

export default function StudentLeavesPage() {
    const queryClient = useQueryClient();
    const [isApplyOpen, setIsApplyOpen] = useState(false);

    // Form state
    const [category, setCategory] = useState("CASUAL_PERSONAL");
    const [fromDate, setFromDate] = useState("");
    const [toDate, setToDate] = useState("");
    const [reason, setReason] = useState("");
    const [attachmentUrl, setAttachmentUrl] = useState("");

    const { data: leaves = [], isLoading } = useQuery<StudentLeave[]>({
        queryKey: ["portal", "student", "leaves"],
        queryFn: async () => {
            const res = await api.get("/portal/student/leaves");
            return res.data.data;
        },
    });

    const calculateDays = () => {
        if (!fromDate || !toDate) return 1;
        const start = new Date(fromDate);
        const end = new Date(toDate);
        const diffTime = end.getTime() - start.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
        return diffDays > 0 ? diffDays : 1;
    };

    const applyMutation = useMutation({
        mutationFn: async (payload: {
            category: string;
            fromDate: string;
            toDate: string;
            totalDays: number;
            reason: string;
            attachmentUrl?: string;
        }) => {
            const res = await api.post("/portal/student/leaves", payload);
            return res.data;
        },
        onSuccess: () => {
            toast.success("Leave application submitted successfully for faculty review.");
            setIsApplyOpen(false);
            setReason("");
            setFromDate("");
            setToDate("");
            setAttachmentUrl("");
            queryClient.invalidateQueries({ queryKey: ["portal", "student", "leaves"] });
        },
        onError: (err: any) => {
            toast.error(err?.response?.data?.message || "Failed to submit leave application.");
        },
    });

    const handleApply = (e: React.FormEvent) => {
        e.preventDefault();
        if (!fromDate || !toDate || !reason.trim()) {
            toast.error("Please fill in from date, to date, and reason.");
            return;
        }

        applyMutation.mutate({
            category,
            fromDate,
            toDate,
            totalDays: calculateDays(),
            reason,
            attachmentUrl: attachmentUrl.trim() || undefined,
        });
    };

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
                        Student Leave Requests
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Submit and monitor leave applications for Class Teacher and Department approval.
                    </p>
                </div>
                <Button onClick={() => setIsApplyOpen(true)} className="gap-2 font-bold h-9 shadow-xs">
                    <Plus className="h-4 w-4" />
                    Apply for Leave
                </Button>
            </div>

            {/* Leave History List */}
            <div className="space-y-4">
                {isLoading ? (
                    <div className="space-y-3">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-28 rounded-2xl bg-muted/40 animate-pulse border border-border/60" />
                        ))}
                    </div>
                ) : leaves.length === 0 ? (
                    <Card className="rounded-2xl border-dashed border-border/80 bg-card py-16 text-center">
                        <CalendarCheck className="h-10 w-10 text-muted-foreground/60 mx-auto mb-3" />
                        <h3 className="text-sm font-bold text-foreground">No Leave Applications Found</h3>
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto mt-1">
                            You have not submitted any leave applications. Click the button above to apply for medical or casual leave.
                        </p>
                    </Card>
                ) : (
                    leaves.map((item) => (
                        <Card key={item.id} className="rounded-2xl border-border/80 bg-card overflow-hidden shadow-xs hover:border-primary/30 transition-colors">
                            <CardHeader className="p-4 sm:p-5 pb-3 bg-muted/20 border-b border-border/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="secondary" className="text-[10px] font-bold uppercase tracking-wider">
                                            {item.category.replace(/_/g, " ")}
                                        </Badge>
                                        <CardTitle className="text-sm sm:text-base font-bold text-foreground">
                                            {item.totalDays} {Number(item.totalDays) === 1 ? "Day" : "Days"} Leave
                                        </CardTitle>
                                    </div>
                                    <CardDescription className="text-xs text-muted-foreground flex items-center gap-1.5 font-medium">
                                        <Calendar className="h-3.5 w-3.5 text-primary" />
                                        {item.fromDate} to {item.toDate}
                                    </CardDescription>
                                </div>
                                <div>
                                    {getStatusBadge(item.status)}
                                </div>
                            </CardHeader>

                            <CardContent className="p-4 sm:p-5 pt-4 space-y-3">
                                <div>
                                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">Reason</p>
                                    <p className="text-xs text-foreground bg-muted/40 p-3 rounded-xl border border-border/60 leading-relaxed">
                                        {item.reason}
                                    </p>
                                </div>

                                {item.attachmentUrl && (
                                    <div className="flex items-center gap-2 text-xs text-primary font-medium">
                                        <FileText className="h-4 w-4" />
                                        <a href={item.attachmentUrl} target="_blank" rel="noreferrer" className="underline hover:text-primary/80">
                                            View Medical / Supporting Attachment
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

            {/* Apply Leave Dialog */}
            <Dialog open={isApplyOpen} onOpenChange={setIsApplyOpen}>
                <DialogContent className="sm:max-w-[480px] rounded-2xl border-border bg-card">
                    <DialogHeader>
                        <DialogTitle className="text-lg font-bold text-foreground">Apply for Student Leave</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Applications are sent directly to your Class Teacher for primary review.
                        </DialogDescription>
                    </DialogHeader>

                    <form onSubmit={handleApply} className="space-y-4 pt-2">
                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Leave Category</Label>
                            <Select value={category} onValueChange={setCategory}>
                                <SelectTrigger className="h-9 rounded-xl text-xs">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-xl border-border bg-card">
                                    <SelectItem value="CASUAL_PERSONAL">Personal / Casual</SelectItem>
                                    <SelectItem value="MEDICAL">Medical / Sick</SelectItem>
                                    <SelectItem value="FAMILY_EVENT">Family Event / Function</SelectItem>
                                    <SelectItem value="OFFICIAL_DUTY">Official School Duty / Competition</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">From Date</Label>
                                <Input
                                    type="date"
                                    value={fromDate}
                                    onChange={(e) => setFromDate(e.target.value)}
                                    required
                                    className="h-9 rounded-xl text-xs"
                                />
                            </div>
                            <div className="space-y-1.5">
                                <Label className="text-xs font-bold text-foreground">To Date</Label>
                                <Input
                                    type="date"
                                    value={toDate}
                                    min={fromDate}
                                    onChange={(e) => setToDate(e.target.value)}
                                    required
                                    className="h-9 rounded-xl text-xs"
                                />
                            </div>
                        </div>

                        {fromDate && toDate && (
                            <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/20 flex items-center justify-between text-xs font-medium text-foreground">
                                <span>Duration:</span>
                                <span className="font-bold text-primary">{calculateDays()} {calculateDays() === 1 ? "day" : "days"}</span>
                            </div>
                        )}

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground">Reason / Explanation</Label>
                            <Textarea
                                placeholder="Explain why the student will be absent from school..."
                                value={reason}
                                onChange={(e) => setReason(e.target.value)}
                                required
                                rows={3}
                                className="rounded-xl text-xs resize-none"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <Label className="text-xs font-bold text-foreground flex items-center justify-between">
                                <span>Supporting Document URL</span>
                                <span className="text-[10px] text-muted-foreground font-normal">(Optional)</span>
                            </Label>
                            <Input
                                placeholder="https://..."
                                value={attachmentUrl}
                                onChange={(e) => setAttachmentUrl(e.target.value)}
                                className="h-9 rounded-xl text-xs"
                            />
                            {category === "MEDICAL" && (
                                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3 text-amber-500" />
                                    Medical certificate is recommended for sick leaves exceeding 2 days.
                                </p>
                            )}
                        </div>

                        <DialogFooter className="gap-2 pt-2">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setIsApplyOpen(false)}
                                className="h-9 rounded-xl text-xs font-semibold"
                            >
                                Cancel
                            </Button>
                            <Button
                                type="submit"
                                disabled={applyMutation.isPending}
                                className="h-9 rounded-xl text-xs font-bold shadow-xs"
                            >
                                {applyMutation.isPending ? "Submitting..." : "Submit Application"}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}
