import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    DollarSign,
    CheckCircle2,
    Clock,
    Printer,
} from "lucide-react";
import { toast } from "sonner";

export default function SalaryHubPage() {
    const qc = useQueryClient();
    const [selectedMonth, setSelectedMonth] = useState(String(new Date().getMonth() + 1));
    const [selectedYear, setSelectedYear] = useState(String(new Date().getFullYear()));
    const [statusFilter, setStatusFilter] = useState("all");
    const [activeSlip, setActiveSlip] = useState<any | null>(null);

    const { data: slipsData } = useQuery({
        queryKey: ["salary", "slips", selectedMonth, selectedYear, statusFilter],
        queryFn: async () => {
            const params = new URLSearchParams({
                month: selectedMonth,
                year: selectedYear,
            });
            if (statusFilter !== "all") params.append("status", statusFilter);
            const res = await api.get(`/salary?${params.toString()}`);
            return res.data.data;
        },
    });

    const statusMutation = useMutation({
        mutationFn: async ({ slipId, status }: { slipId: string; status: string }) => {
            return await api.patch(`/salary/slip/${slipId}/status`, { status });
        },
        onSuccess: () => {
            toast.success("Payment status updated successfully");
            qc.invalidateQueries({ queryKey: ["salary", "slips"] });
            if (activeSlip) {
                setActiveSlip(null);
            }
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to update status");
        },
    });

    const slips = slipsData?.salarySlips || slipsData?.slips || [];

    const totalDisbursed = slips.reduce((sum: number, s: any) => sum + Number(s.netSalary || 0), 0);
    const paidCount = slips.filter((s: any) => s.paymentStatus === "paid").length;
    const pendingCount = slips.filter((s: any) => s.paymentStatus === "pending").length;

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                    <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                        Payroll & Salary Management
                    </h1>
                    <p className="text-xs text-muted-foreground">
                        Review faculty monthly payroll, disburse salary slips, and manage compensation status.
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                        <SelectTrigger className="w-32 h-9 rounded-xl text-xs bg-card">
                            <SelectValue placeholder="Month" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                                <SelectItem key={m} value={String(m)}>
                                    Month {m}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>

                    <Select value={selectedYear} onValueChange={setSelectedYear}>
                        <SelectTrigger className="w-28 h-9 rounded-xl text-xs bg-card">
                            <SelectValue placeholder="Year" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {[2025, 2026, 2027].map((y) => (
                                <SelectItem key={y} value={String(y)}>
                                    {y}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Card className="rounded-2xl border-border/80 bg-card p-4 flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-600">
                        <DollarSign className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Monthly Payroll</p>
                        <p className="text-xl font-extrabold text-foreground">
                            ${totalDisbursed.toLocaleString()}
                        </p>
                    </div>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card p-4 flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-blue-500/10 text-blue-600">
                        <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Disbursed (Paid)</p>
                        <p className="text-xl font-extrabold text-blue-600">
                            {paidCount} <span className="text-xs font-normal text-muted-foreground">slips</span>
                        </p>
                    </div>
                </Card>

                <Card className="rounded-2xl border-border/80 bg-card p-4 flex items-center gap-3.5">
                    <div className="p-3 rounded-xl bg-amber-500/10 text-amber-600">
                        <Clock className="h-5 w-5" />
                    </div>
                    <div>
                        <p className="text-[10px] font-bold uppercase text-muted-foreground">Pending Approval</p>
                        <p className="text-xl font-extrabold text-amber-600">
                            {pendingCount} <span className="text-xs font-normal text-muted-foreground">slips</span>
                        </p>
                    </div>
                </Card>
            </div>

            {/* Salary Slips Table */}
            <Card className="rounded-2xl border-border/80 bg-card overflow-hidden">
                <CardHeader className="p-4 border-b border-border/60 bg-muted/20 flex flex-row items-center justify-between">
                    <div>
                        <CardTitle className="text-sm font-bold text-foreground">Staff Salary Slips</CardTitle>
                        <CardDescription className="text-xs text-muted-foreground">
                            Generated compensation records for Month {selectedMonth}, {selectedYear}
                        </CardDescription>
                    </div>

                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger className="w-32 h-8 rounded-lg text-xs bg-background">
                            <SelectValue placeholder="All Status" />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="all">All Status</SelectItem>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="on_hold">On Hold</SelectItem>
                        </SelectContent>
                    </Select>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="divide-y divide-border/60">
                        <div className="grid grid-cols-12 px-4 py-2.5 bg-muted/40 text-[10px] font-bold uppercase text-muted-foreground">
                            <div className="col-span-4">Teacher / Employee</div>
                            <div className="col-span-2 text-right">Base Salary</div>
                            <div className="col-span-2 text-right">Net Payable</div>
                            <div className="col-span-2 text-center">Status</div>
                            <div className="col-span-2 text-right">Action</div>
                        </div>

                        {slips.map((slip: any) => {
                            const teacher = slip.teacher;
                            const account = teacher?.account;
                            const name = account ? `${account.firstName} ${account.lastName}` : "Faculty";
                            const isPaid = slip.paymentStatus === "paid";
                            return (
                                <div key={slip.id} className="grid grid-cols-12 px-4 py-3 items-center text-xs hover:bg-muted/30 transition-colors">
                                    <div className="col-span-4">
                                        <p className="font-bold text-foreground">{name}</p>
                                        <p className="text-[10px] text-muted-foreground font-mono">
                                            {teacher?.employeeNumber || "EMP"} • {teacher?.department || "General"}
                                        </p>
                                    </div>

                                    <div className="col-span-2 text-right font-medium text-muted-foreground">
                                        ${Number(slip.baseSalary || 0).toLocaleString()}
                                    </div>

                                    <div className="col-span-2 text-right font-extrabold text-foreground">
                                        ${Number(slip.netSalary || 0).toLocaleString()}
                                    </div>

                                    <div className="col-span-2 text-center">
                                        {isPaid ? (
                                            <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                                                Paid
                                            </Badge>
                                        ) : slip.paymentStatus === "on_hold" ? (
                                            <Badge className="bg-rose-500/10 text-rose-600 border-rose-500/20 text-[10px] font-bold">
                                                On Hold
                                            </Badge>
                                        ) : (
                                            <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px] font-bold">
                                                Pending
                                            </Badge>
                                        )}
                                    </div>

                                    <div className="col-span-2 flex items-center justify-end gap-1.5">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setActiveSlip(slip)}
                                            className="h-7 text-xs rounded-lg px-2"
                                        >
                                            View Slip
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}

                        {slips.length === 0 && (
                            <div className="py-12 text-center space-y-2">
                                <DollarSign className="h-7 w-7 text-muted-foreground mx-auto" />
                                <p className="text-sm font-semibold text-foreground">No Salary Slips Generated</p>
                                <p className="text-xs text-muted-foreground">Select month and year or generate batch salary.</p>
                            </div>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Slip Detail & Print Modal */}
            <Dialog open={Boolean(activeSlip)} onOpenChange={(open) => !open && setActiveSlip(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold flex items-center gap-2">
                            <DollarSign className="h-4 w-4 text-primary" /> Salary Slip Details
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Month {activeSlip?.month}, {activeSlip?.year} • Reference: {activeSlip?.id?.slice(0, 8)}
                        </DialogDescription>
                    </DialogHeader>

                    {activeSlip && (
                        <div className="space-y-4 py-2 text-xs">
                            <div className="p-3 rounded-xl bg-muted/40 border border-border/60 flex items-center justify-between">
                                <div>
                                    <p className="font-bold text-foreground">
                                        {activeSlip.teacher?.account?.firstName} {activeSlip.teacher?.account?.lastName}
                                    </p>
                                    <p className="text-[11px] text-muted-foreground">
                                        {activeSlip.teacher?.designation || "Faculty"} • {activeSlip.teacher?.department}
                                    </p>
                                </div>
                                <Badge className={activeSlip.paymentStatus === "paid" ? "bg-emerald-500/10 text-emerald-600" : "bg-amber-500/10 text-amber-600"}>
                                    {activeSlip.paymentStatus?.toUpperCase()}
                                </Badge>
                            </div>

                            <div className="space-y-2 border-t border-b border-border/60 py-3">
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Base Salary</span>
                                    <span className="font-semibold text-foreground">${Number(activeSlip.baseSalary || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Allowances</span>
                                    <span className="font-semibold text-emerald-600">+${Number(activeSlip.totalAllowances || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Deductions</span>
                                    <span className="font-semibold text-rose-600">-${Number(activeSlip.totalDeductions || 0).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between pt-2 border-t border-border font-bold text-sm">
                                    <span>Net Payable</span>
                                    <span className="text-primary">${Number(activeSlip.netSalary || 0).toLocaleString()}</span>
                                </div>
                            </div>
                        </div>
                    )}

                    <DialogFooter className="flex items-center justify-between sm:justify-between">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => window.print()}
                            className="rounded-xl text-xs gap-1.5"
                        >
                            <Printer className="h-3.5 w-3.5" /> Print
                        </Button>

                        <div className="flex items-center gap-2">
                            {activeSlip?.paymentStatus !== "paid" && (
                                <Button
                                    size="sm"
                                    onClick={() => statusMutation.mutate({ slipId: activeSlip.id, status: "paid" })}
                                    disabled={statusMutation.isPending}
                                    className="rounded-xl text-xs bg-emerald-600 hover:bg-emerald-700 font-bold"
                                >
                                    Mark as Paid
                                </Button>
                            )}
                            <Button variant="ghost" size="sm" onClick={() => setActiveSlip(null)} className="rounded-xl text-xs">
                                Close
                            </Button>
                        </div>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
