import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feeApi, { type FeeRefund } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { usePermissions } from '@/store/hooks';
import { formatMoney } from '../utils/moneyUtils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  RotateCcw,
  Plus,
  CheckCircle,
  XCircle,
  Clock,
  Printer,
  RefreshCw,
  Search,
} from 'lucide-react';

export const FeeRefundsTab: React.FC = () => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canRefund = can('fees', 'refund');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Dialogs
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [selectedRefundForPrint, setSelectedRefundForPrint] = useState<FeeRefund | null>(null);

  // Form State
  const [studentId, setStudentId] = useState('');
  const [refundType, setRefundType] = useState('SECURITY_DEPOSIT');
  const [amount, setAmount] = useState('');
  const [paymentMode, setPaymentMode] = useState('BANK_TRANSFER');
  const [reason, setReason] = useState('');

  // 1. Fetch Refunds
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.fees.refunds({ status: statusFilter !== 'ALL' ? statusFilter : undefined }),
    queryFn: () => feeApi.getRefunds({ status: statusFilter !== 'ALL' ? statusFilter : undefined }),
  });

  const refunds = data?.items || [];

  // Mutations
  const requestMutation = useMutation({
    mutationFn: feeApi.requestRefund,
    onSuccess: () => {
      toast.success('Fee refund voucher requested successfully');
      setIsRequestModalOpen(false);
      setStudentId('');
      setAmount('');
      setReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.refunds() });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to request refund';
      toast.error(msg);
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'APPROVED' | 'PAID' | 'REJECTED' }) =>
      feeApi.updateRefundStatus(id, { status }),
    onSuccess: (_, vars) => {
      toast.success(`Refund voucher status updated to ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.refunds() });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update refund status';
      toast.error(msg);
    },
  });

  const filteredRefunds = refunds.filter((r: FeeRefund) => {
    if (!searchTerm) return true;
    const q = searchTerm.toLowerCase();
    const adm = (r.student?.admissionNumber || '').toLowerCase();
    const voucher = (r.refundVoucherNumber || '').toLowerCase();
    return adm.includes(q) || voucher.includes(q);
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 gap-1 text-[10px]">
            <CheckCircle className="w-3 h-3" /> Paid / Disbursed
          </Badge>
        );
      case 'APPROVED':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300 gap-1 text-[10px]">
            <Clock className="w-3 h-3" /> Approved
          </Badge>
        );
      case 'REJECTED':
        return (
          <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-300 gap-1 text-[10px]">
            <XCircle className="w-3 h-3" /> Rejected
          </Badge>
        );
      case 'REQUESTED':
      default:
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300 gap-1 text-[10px]">
            <Clock className="w-3 h-3" /> Requested
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" /> Fee Refund Management
            </h2>
            <Badge variant="secondary" className="text-xs font-semibold">
              Voucher Lifecycle
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Process security deposit returns, admission cancel disbursements, and print official refund vouchers.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {canRefund && (
            <Button
              size="sm"
              onClick={() => setIsRequestModalOpen(true)}
              className="text-xs font-bold gap-1.5 rounded-lg shadow-2xs"
            >
              <Plus className="w-3.5 h-3.5" /> Request Refund Voucher
            </Button>
          )}
        </div>
      </div>

      {/* 2. Filters */}
      <div className="p-3.5 bg-muted/30 border border-border/70 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 max-w-sm">
          <div className="relative w-full">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search voucher or admission no..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-8 pl-8 text-xs bg-background"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs bg-background w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Statuses</SelectItem>
              <SelectItem value="REQUESTED">Requested</SelectItem>
              <SelectItem value="APPROVED">Approved</SelectItem>
              <SelectItem value="PAID">Disbursed / Paid</SelectItem>
              <SelectItem value="REJECTED">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-8 text-xs px-2"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 3. Refunds Table */}
      <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-bold">Voucher No / Date</TableHead>
              <TableHead className="text-xs font-bold">Student / Admission</TableHead>
              <TableHead className="text-xs font-bold">Refund Type</TableHead>
              <TableHead className="text-xs font-bold text-right">Amount (₹)</TableHead>
              <TableHead className="text-xs font-bold text-center">Status</TableHead>
              <TableHead className="text-xs font-bold">Reason & Notes</TableHead>
              <TableHead className="text-xs font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                  Loading refund vouchers...
                </TableCell>
              </TableRow>
            ) : filteredRefunds.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                  No fee refund vouchers matching the selected criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredRefunds.map((r: FeeRefund) => (
                <TableRow key={r.id} className="text-xs hover:bg-muted/30">
                  <TableCell className="py-2.5">
                    <div className="font-mono font-bold text-primary">{r.refundVoucherNumber}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 font-semibold">
                    {r.student?.account ? `${r.student.account.firstName} ${r.student.account.lastName || ''}`.trim() : 'Student'}
                    <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                      {r.student?.admissionNumber || ''}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <Badge variant="outline" className="text-[10px] font-semibold">
                      {r.refundType.replace('_', ' ')}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-bold text-rose-600">
                    {formatMoney(r.amount)}
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    {getStatusBadge(r.status)}
                  </TableCell>
                  <TableCell className="py-2.5 max-w-[180px] truncate text-muted-foreground">
                    {r.reason}
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {canRefund && r.status === 'REQUESTED' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'APPROVED' })}
                          className="h-7 text-[11px] px-2 text-blue-600 hover:text-blue-700"
                        >
                          Approve
                        </Button>
                      )}
                      {canRefund && r.status === 'APPROVED' && (
                        <Button
                          size="sm"
                          onClick={() => updateStatusMutation.mutate({ id: r.id, status: 'PAID' })}
                          className="h-7 text-[11px] px-2 font-bold bg-emerald-600 hover:bg-emerald-700 text-white"
                        >
                          Disburse
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedRefundForPrint(r)}
                        className="h-7 text-[11px] px-2 text-primary"
                      >
                        <Printer className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* 4. Request Modal */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-primary" /> Request Fee Refund Voucher
            </DialogTitle>
            <DialogDescription className="text-xs">
              Authorize return of caution money, excess payments, or canceled admissions.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="space-y-1">
              <label className="font-semibold text-foreground">Student UUID / ID</label>
              <Input
                placeholder="Enter Student UUID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="font-semibold text-foreground">Refund Type</label>
                <Select value={refundType} onValueChange={setRefundType}>
                  <SelectTrigger className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="SECURITY_DEPOSIT">Security Deposit</SelectItem>
                    <SelectItem value="EXCESS_PAYMENT">Excess Payment</SelectItem>
                    <SelectItem value="ADMISSION_CANCEL">Admission Cancel</SelectItem>
                    <SelectItem value="OTHER">Other Adjustment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Refund Amount (₹)</label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Disbursement Mode</label>
              <Select value={paymentMode} onValueChange={setPaymentMode}>
                <SelectTrigger className="text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BANK_TRANSFER">Bank Transfer / NEFT</SelectItem>
                  <SelectItem value="CHEQUE">Cheque</SelectItem>
                  <SelectItem value="UPI">UPI</SelectItem>
                  <SelectItem value="CASH">Cash Counter</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <label className="font-semibold text-foreground">Mandatory Reason</label>
              <Textarea
                placeholder="Explain justification for refund..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" size="sm" onClick={() => setIsRequestModalOpen(false)} className="text-xs">
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                if (!studentId || !amount || !reason) {
                  toast.error('Please fill all required refund fields');
                  return;
                }
                requestMutation.mutate({
                  studentId,
                  refundType,
                  amount: Number(amount),
                  paymentMode,
                  reason,
                });
              }}
              disabled={requestMutation.isPending}
              className="text-xs font-bold"
            >
              {requestMutation.isPending ? 'Requesting...' : 'Submit Voucher'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 5. Printable Voucher Preview */}
      <Dialog open={!!selectedRefundForPrint} onOpenChange={(open) => !open && setSelectedRefundForPrint(null)}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Printer className="w-4 h-4 text-primary" /> Official Fee Refund Voucher
            </DialogTitle>
          </DialogHeader>

          {selectedRefundForPrint && (
            <div className="p-4 border rounded-xl space-y-3 bg-muted/20 text-xs">
              <div className="flex justify-between border-b pb-2">
                <span className="font-bold text-foreground">{selectedRefundForPrint.refundVoucherNumber}</span>
                <span className="text-muted-foreground">{selectedRefundForPrint.createdAt.split('T')[0]}</span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Beneficiary:</span>
                  <span className="font-semibold text-foreground">
                    {selectedRefundForPrint.student?.account
                      ? `${selectedRefundForPrint.student.account.firstName} ${selectedRefundForPrint.student.account.lastName || ''}`.trim()
                      : 'Student'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Type:</span>
                  <span className="font-medium text-foreground">{selectedRefundForPrint.refundType}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Mode:</span>
                  <span className="font-medium text-foreground">{selectedRefundForPrint.paymentMode}</span>
                </div>
                <div className="flex justify-between text-rose-700 font-bold pt-2 border-t text-sm">
                  <span>Refunded Amount:</span>
                  <span>{formatMoney(selectedRefundForPrint.amount)}</span>
                </div>
              </div>
              <div className="pt-2 text-[11px] text-muted-foreground italic border-t">
                Reason: {selectedRefundForPrint.reason}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button size="sm" onClick={() => window.print()} className="text-xs font-bold gap-1.5">
              <Printer className="w-3.5 h-3.5" /> Print Voucher
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeRefundsTab;
