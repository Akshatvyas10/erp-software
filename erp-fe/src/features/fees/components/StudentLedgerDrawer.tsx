import React, { useState } from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feeApi, { type FeePayment, type FeeReminderLog } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { toast } from 'sonner';
import {
  UserCheck,
  Printer,
  Eye,
  CreditCard,
  FileText,
  User,
  ShieldCheck,
  Receipt,
  Calendar,
  BellRing,
  RotateCcw,
} from 'lucide-react';
import { formatMoney, toMoney } from '../utils/moneyUtils';
import { usePermissions } from '@/store/hooks';

interface StudentLedgerDrawerProps {
  studentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onPrintReceipt?: (receiptId: string) => void;
}

export const StudentLedgerDrawer: React.FC<StudentLedgerDrawerProps> = ({
  studentId,
  isOpen,
  onClose,
  onPrintReceipt,
}) => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canAdjust = can('fees', 'adjust');
  const [selectedPaymentDetail, setSelectedPaymentDetail] = useState<FeePayment | null>(null);
  const [reversalPayment, setReversalPayment] = useState<FeePayment | null>(null);
  const [reversalReason, setReversalReason] = useState<string>('');

  const reverseMutation = useMutation({
    mutationFn: ({ paymentId, reason }: { paymentId: string; reason: string }) =>
      feeApi.reversePayment(paymentId, { reason }),
    onSuccess: () => {
      toast.success('Payment successfully reversed and invoice balance restored');
      setReversalPayment(null);
      setReversalReason('');
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.all });
      if (studentId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.fees.studentLedger(studentId) });
      }
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to reverse payment';
      toast.error(msg);
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.fees.studentLedger(studentId || ''),
    queryFn: () => feeApi.getStudentFeeLedger(studentId!),
    enabled: !!studentId && isOpen,
  });

  const { data: reminderLogsData } = useQuery({
    queryKey: queryKeys.fees.reminderLogs({ studentId: studentId || '' }),
    queryFn: () => feeApi.getReminderLogs({ studentId: studentId || '', limit: 20 }),
    enabled: !!studentId && isOpen,
  });

  if (!studentId) return null;

  const student = data?.student;
  const summary = data?.summary;
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];

  const getModeBadgeClass = (mode: string) => {
    switch (mode) {
      case 'CASH':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'UPI':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'BANK_TRANSFER':
        return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'CHEQUE':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'CARD':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'DEMAND_DRAFT':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const getStatusBadgeClass = (status?: string) => {
    switch (status) {
      case 'SUCCESS':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'REVERSED':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      case 'BOUNCED':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'CANCELLED':
        return 'bg-slate-100 text-slate-800 border-slate-200';
      default:
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    }
  };

  const renderModeSummary = (p: FeePayment) => {
    const details = p.paymentDetails || {};
    const ref = p.transactionReference || p.referenceNumber || details.transactionReference;
    const chequeNo = p.chequeNumber || details.chequeNumber;
    const bank = p.bankName || details.bankName || details.chequeBank;

    switch (p.paymentMode) {
      case 'UPI':
        return (
          <div className="text-[11px] text-slate-600 space-y-0.5">
            <div className="flex items-center gap-1.5 flex-wrap">
              {ref && (
                <span className="font-mono text-slate-800 font-medium break-all">
                  UTR: {ref}
                </span>
              )}
              {details.upiId && (
                <span className="text-slate-500 break-all">• {details.upiId}</span>
              )}
            </div>
            {details.payerName && (
              <div className="text-[10px] text-slate-500 truncate">
                Payer: <span className="font-medium text-slate-700">{details.payerName}</span>
              </div>
            )}
          </div>
        );
      case 'CHEQUE':
        return (
          <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
            {chequeNo && <span className="font-mono text-slate-800 font-medium">Chq #{chequeNo}</span>}
            {bank && <span className="text-slate-600">• {bank}</span>}
            {(p.chequeDate || details.chequeDate) && (
              <span className="text-slate-500 text-[10px]">• Dt: {p.chequeDate || details.chequeDate}</span>
            )}
          </div>
        );
      case 'CASH':
        return (
          <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-slate-700">Cash Counter</span>
            {p.collectedBy && (
              <span className="text-slate-500 text-[10px]">
                • Recd by: {p.collectedBy.firstName} {p.collectedBy.lastName || ''}
              </span>
            )}
          </div>
        );
      case 'CARD':
        return (
          <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
            <span className="font-medium text-slate-700">POS Card</span>
            {details.cardLast4 && (
              <span className="font-mono text-slate-700 font-medium">• •••• {details.cardLast4}</span>
            )}
            {ref && <span className="font-mono text-slate-600 text-[10px] break-all">• Ref: {ref}</span>}
          </div>
        );
      case 'BANK_TRANSFER':
      case 'DEMAND_DRAFT':
        return (
          <div className="text-[11px] text-slate-600 flex items-center gap-1.5 flex-wrap">
            {ref && <span className="font-mono text-slate-800 font-medium break-all">Ref: {ref}</span>}
            {bank && <span className="text-slate-600">• {bank}</span>}
          </div>
        );
      default:
        return ref ? (
          <div className="text-[11px] text-slate-600 break-all">
            <span className="font-mono text-slate-700">Ref: {ref}</span>
          </div>
        ) : null;
    }
  };

  const studentFullName = student?.user
    ? `${student.user.firstName || ''} ${student.user.lastName || ''}`.trim()
    : student && 'account' in student && student.account && typeof student.account === 'object'
    ? `${(student.account as { firstName?: string; lastName?: string }).firstName || ''} ${(student.account as { firstName?: string; lastName?: string }).lastName || ''}`.trim()
    : 'Student Profile';

  return (
    <>
      <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-xl md:max-w-2xl p-0 flex flex-col h-full bg-slate-50/50"
        >
          {/* Header */}
          <SheetHeader className="p-4 sm:p-5 border-b bg-white shrink-0 pr-12">
            <div className="flex items-start gap-3">
              <div className="p-2 sm:p-2.5 rounded-xl bg-indigo-50 text-indigo-600 shrink-0 mt-0.5">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <SheetTitle className="text-base sm:text-lg font-bold text-slate-900 truncate">
                  Student Fee Ledger
                </SheetTitle>
                <SheetDescription className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                    {studentFullName}
                  </span>
                  {student?.admissionNumber && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 font-mono">
                      Adm: {student.admissionNumber}
                    </Badge>
                  )}
                  {student?.classroom && (
                    <span className="text-[11px] text-slate-600">
                      • {student.classroom.name} ({student.classroom.section})
                    </span>
                  )}
                </SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {/* Scrollable Body */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4 sm:space-y-5">
            {isLoading ? (
              <div className="py-8 space-y-4">
                <div className="h-24 bg-white border rounded-xl animate-pulse" />
                <div className="h-44 bg-white border rounded-xl animate-pulse" />
              </div>
            ) : (
              <>
                {/* Responsive KPI Summary Cards: 1 col on xs, 3 cols on sm+ */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <Card className="border border-slate-200 p-3 sm:p-3.5 bg-white shadow-xs">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      Total Invoiced
                    </p>
                    <p className="text-base sm:text-lg font-bold font-mono text-slate-900 mt-1">
                      {formatMoney(summary?.totalBilled)}
                    </p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {summary?.invoicesCount || invoices.length} issued invoices
                    </p>
                  </Card>

                  <Card className="border border-emerald-200/80 p-3 sm:p-3.5 bg-emerald-50/40 shadow-xs">
                    <p className="text-[10px] sm:text-[11px] font-semibold text-emerald-800 uppercase tracking-wider">
                      Total Received
                    </p>
                    <p className="text-base sm:text-lg font-bold font-mono text-emerald-700 mt-1">
                      {formatMoney(summary?.totalPaid)}
                    </p>
                    <p className="text-[10px] text-emerald-700/80 mt-0.5">
                      {summary?.paymentsCount || payments.length} cleared receipts
                    </p>
                  </Card>

                  <Card className={`border p-3 sm:p-3.5 shadow-xs ${
                    toMoney(summary?.outstandingBalance) > 0
                      ? 'border-amber-200 bg-amber-50/50'
                      : 'border-slate-200 bg-white'
                  }`}>
                    <p className="text-[10px] sm:text-[11px] font-semibold text-amber-800 uppercase tracking-wider">
                      Net Outstanding
                    </p>
                    <p className={`text-base sm:text-lg font-bold font-mono mt-1 ${
                      toMoney(summary?.outstandingBalance) > 0 ? 'text-amber-700' : 'text-slate-900'
                    }`}>
                      {formatMoney(summary?.outstandingBalance)}
                    </p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {toMoney(summary?.outstandingBalance) > 0 ? 'Dues pending' : 'Zero balance / settled'}
                    </p>
                  </Card>
                </div>

                {/* Tabs */}
                <Tabs defaultValue="invoices" className="w-full">
                  <TabsList className="grid grid-cols-3 w-full p-1 rounded-xl h-auto border border-slate-200 bg-slate-100/80 gap-1">
                    <TabsTrigger
                      value="invoices"
                      className="rounded-lg text-xs font-bold py-1.5 px-2 sm:px-3 data-state=active:bg-white data-state=active:shadow-xs"
                    >
                      Invoices ({invoices.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="payments"
                      className="rounded-lg text-xs font-bold py-1.5 px-2 sm:px-3 data-state=active:bg-white data-state=active:shadow-xs"
                    >
                      Receipts ({payments.length})
                    </TabsTrigger>
                    <TabsTrigger
                      value="reminders"
                      className="rounded-lg text-xs font-bold py-1.5 px-2 sm:px-3 data-state=active:bg-white data-state=active:shadow-xs"
                    >
                      Reminders ({reminderLogsData?.items?.length || 0})
                    </TabsTrigger>
                  </TabsList>

                  {/* Invoices Tab */}
                  <TabsContent value="invoices" className="space-y-3 mt-3">
                    {invoices.length === 0 ? (
                      <div className="text-center py-10 bg-white border border-dashed rounded-xl p-6">
                        <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium text-slate-600">No invoices issued for this student.</p>
                      </div>
                    ) : (
                      invoices.map((inv) => (
                        <div
                          key={inv.id}
                          className="border border-slate-200 rounded-xl p-3 sm:p-3.5 text-xs space-y-2 bg-white shadow-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5">
                            <div className="min-w-0">
                              <span className="font-mono font-bold text-indigo-700 text-xs">
                                {inv.invoiceNumber}
                              </span>
                              <h4 className="font-semibold text-slate-900 text-xs sm:text-sm mt-0.5 line-clamp-1">
                                {inv.title}
                              </h4>
                            </div>
                            <div className="shrink-0 self-start">
                              <Badge
                                variant="outline"
                                className={`text-[10px] font-semibold ${
                                  inv.status === 'PAID'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : inv.status === 'PARTIALLY_PAID'
                                    ? 'bg-amber-50 text-amber-700 border-amber-200'
                                    : 'bg-slate-100 text-slate-700 border-slate-200'
                                }`}
                              >
                                {inv.status}
                              </Badge>
                            </div>
                          </div>

                          <div className="flex flex-col sm:flex-row sm:items-center justify-between text-slate-500 pt-2 border-t border-slate-100 text-[11px] gap-1.5">
                            <div className="flex items-center gap-1 text-[11px]">
                              <Calendar className="w-3 h-3 text-slate-400" />
                              <span>Due: {inv.dueDate}</span>
                            </div>
                            <div className="flex items-center justify-between sm:justify-end gap-3 font-mono">
                              <span>Total: <strong>{formatMoney(inv.totalAmount)}</strong></span>
                              <span className="font-bold text-amber-700">
                                Bal: {formatMoney(inv.balanceAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Installments Breakdown (if present) */}
                          {inv.installments && inv.installments.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-slate-100 bg-slate-50/70 p-2 rounded-lg space-y-1.5">
                              <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                                Installment Schedule ({inv.installments.length})
                              </span>
                              <div className="space-y-1">
                                {inv.installments.map((inst) => {
                                  const instOverdue = inst.status === 'OVERDUE' || Number(inst.lateFineAmount || 0) > 0;
                                  return (
                                    <div
                                      key={inst.id}
                                      className={`flex justify-between items-center p-1.5 rounded text-[11px] border ${
                                        inst.status === 'PAID'
                                          ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800'
                                          : instOverdue
                                          ? 'bg-rose-50/60 border-rose-200 text-rose-800'
                                          : 'bg-white border-slate-200 text-slate-700'
                                      }`}
                                    >
                                      <div>
                                        <span className="font-semibold">
                                          Inst #{inst.installmentNumber}: {inst.title}
                                        </span>
                                        <span className="text-[10px] text-slate-500 ml-1.5">
                                          (Due: {inst.dueDate})
                                        </span>
                                      </div>
                                      <div className="flex items-center gap-2 font-mono">
                                        {Number(inst.lateFineAmount) > 0 && (
                                          <span className="text-[10px] text-rose-600 font-bold">
                                            +₹{Number(inst.lateFineAmount)} Fine
                                          </span>
                                        )}
                                        <span>Bal: <strong>₹{Number(inst.balanceAmount).toLocaleString('en-IN')}</strong></span>
                                        <Badge variant="outline" className="text-[9px] px-1 py-0">
                                          {inst.status}
                                        </Badge>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>

                  {/* Payments Tab */}
                  <TabsContent value="payments" className="space-y-3 mt-3">
                    {payments.length === 0 ? (
                      <div className="text-center py-10 bg-white border border-dashed rounded-xl p-6">
                        <FileText className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium text-slate-600">No payment receipts recorded yet.</p>
                      </div>
                    ) : (
                      payments.map((p) => {
                        const amount = p.amountPaid ?? p.amount;
                        return (
                          <div
                            key={p.id}
                            className="border border-slate-200 rounded-xl p-3 sm:p-3.5 text-xs bg-white shadow-xs space-y-2.5 hover:border-slate-300 transition-colors"
                          >
                            {/* Receipt Header Row: stacks cleanly on mobile */}
                            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5">
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-mono font-bold text-emerald-700 text-xs sm:text-sm">
                                    {p.receiptNumber}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className={`text-[10px] font-semibold border ${getModeBadgeClass(p.paymentMode)}`}
                                  >
                                    {p.paymentMode}
                                  </Badge>
                                  {Boolean(p.isBelowMinimum || p.paymentDetails?.isBelowMinimum) && (
                                    <Badge
                                      variant="outline"
                                      className="text-[9px] font-bold bg-amber-50 text-amber-800 border-amber-300"
                                      title="Below minimum policy concession granted"
                                    >
                                      Min-Waived
                                    </Badge>
                                  )}
                                  {p.status && p.status !== 'SUCCESS' && (
                                    <Badge
                                      variant="outline"
                                      className={`text-[9px] font-bold ${getStatusBadgeClass(p.status)}`}
                                    >
                                      {p.status}
                                    </Badge>
                                  )}
                                </div>
                                <div className="text-[10px] sm:text-[11px] text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
                                  <span>Date: {p.paymentDate}</span>
                                  {p.invoice?.invoiceNumber && (
                                    <span>• Inv: <strong className="text-slate-600 font-mono">{p.invoice.invoiceNumber}</strong></span>
                                  )}
                                </div>
                              </div>
                              <div className="self-start sm:self-auto sm:text-right">
                                <span className="font-bold text-sm sm:text-base text-slate-900 font-mono">
                                  {formatMoney(amount)}
                                </span>
                              </div>
                            </div>

                            {/* Short Mode-Specific Details Summary */}
                            <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 sm:p-2.5">
                              {renderModeSummary(p)}
                            </div>

                            {/* Actions: View Details + Re-print Receipt (full-width on mobile) */}
                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-1.5 pt-1.5 border-t border-slate-100">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 text-xs px-2.5 text-slate-600 hover:text-slate-900 gap-1.5 rounded-lg justify-center"
                                onClick={() => setSelectedPaymentDetail(p)}
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                View Details
                              </Button>
                              {onPrintReceipt && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-8 text-xs px-3 text-indigo-700 hover:bg-indigo-50 border-indigo-200 gap-1.5 rounded-lg font-semibold justify-center shadow-2xs"
                                  onClick={() => onPrintReceipt(p.id)}
                                >
                                  <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                  Re-print Receipt
                                </Button>
                              )}
                              {canAdjust && !p.isReversed && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-8 text-xs px-2.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 gap-1 rounded-lg justify-center"
                                  onClick={() => setReversalPayment(p)}
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  Reverse
                                </Button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </TabsContent>

                  {/* Reminders Tab */}
                  <TabsContent value="reminders" className="space-y-3 mt-3">
                    {!reminderLogsData?.items || reminderLogsData.items.length === 0 ? (
                      <div className="text-center py-10 bg-white border border-dashed rounded-xl p-6">
                        <BellRing className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                        <p className="text-xs font-medium text-slate-600">No fee reminders sent to this student yet.</p>
                      </div>
                    ) : (
                      reminderLogsData.items.map((log: FeeReminderLog) => (
                        <div
                          key={log.id}
                          className="border border-slate-200 rounded-xl p-3 sm:p-3.5 text-xs space-y-2 bg-white shadow-xs hover:border-slate-300 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-slate-900">
                                  {log.periodKey || 'Fee Cycle'}
                                </span>
                                <Badge
                                  variant="outline"
                                  className={`text-[10px] ${
                                    log.status === 'SENT'
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                      : log.status === 'SKIPPED'
                                      ? 'bg-slate-50 text-slate-600 border-slate-200'
                                      : log.status === 'FAILED'
                                      ? 'bg-rose-50 text-rose-700 border-rose-200'
                                      : 'bg-amber-50 text-amber-700 border-amber-200'
                                  }`}
                                >
                                  {log.status}
                                </Badge>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                Sent to: {log.recipientEmail || 'N/A'} • {new Date(log.createdAt).toLocaleString('en-IN', {
                                  day: '2-digit',
                                  month: 'short',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </p>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 block">Statement Due</span>
                              <span className="font-bold font-mono text-xs text-indigo-700">
                                {formatMoney(log.payableAmount)}
                              </span>
                            </div>
                          </div>
                          {(log.skipReason || log.errorMessage || (log.metadata && typeof log.metadata === 'object' && 'note' in log.metadata ? String(log.metadata.note) : '')) && (
                            <p className="text-[11px] text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100">
                              {log.skipReason ? `Skip Reason: ${log.skipReason}` : log.errorMessage || (log.metadata && typeof log.metadata === 'object' && 'note' in log.metadata ? String(log.metadata.note) : '')}
                            </p>
                          )}
                        </div>
                      ))
                    )}
                  </TabsContent>
                </Tabs>
              </>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Mode-Specific Payment Details Dialog */}
      <Dialog open={!!selectedPaymentDetail} onOpenChange={(open) => !open && setSelectedPaymentDetail(null)}>
        <DialogContent className="w-[95vw] sm:max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 rounded-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              Payment Transaction Details
            </DialogTitle>
            <DialogDescription className="font-mono text-xs text-slate-500">
              Receipt No: {selectedPaymentDetail?.receiptNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedPaymentDetail && (
            <div className="space-y-3.5 py-1 text-xs">
              {/* Financial Box */}
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex justify-between items-center">
                <div>
                  <span className="text-[11px] font-medium text-emerald-800">Amount Paid</span>
                  <div className="text-lg font-bold font-mono text-emerald-900">
                    {formatMoney(selectedPaymentDetail.amountPaid ?? selectedPaymentDetail.amount)}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className={`text-xs font-bold border ${getModeBadgeClass(selectedPaymentDetail.paymentMode)}`}>
                    {selectedPaymentDetail.paymentMode}
                  </Badge>
                  <div className="text-[10px] text-emerald-700 mt-1">{selectedPaymentDetail.paymentDate}</div>
                </div>
              </div>

              {/* Mode Breakdown Attributes */}
              <div className="border border-slate-200 rounded-xl p-3.5 space-y-2.5 bg-white">
                <div className="font-semibold text-slate-700 uppercase tracking-wider text-[10px] flex items-center gap-1.5 border-b pb-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" /> Mode Specific Info
                </div>

                {selectedPaymentDetail.paymentMode === 'UPI' && (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                      <span className="text-slate-500">UTR / Ref Number:</span>
                      <span className="font-mono font-semibold text-slate-800 break-all">
                        {selectedPaymentDetail.transactionReference || selectedPaymentDetail.referenceNumber || selectedPaymentDetail.paymentDetails?.transactionReference || '—'}
                      </span>
                    </div>
                    {selectedPaymentDetail.paymentDetails?.upiId && (
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                        <span className="text-slate-500">UPI ID / Number:</span>
                        <span className="font-mono font-medium text-slate-800 break-all">
                          {selectedPaymentDetail.paymentDetails.upiId}
                        </span>
                      </div>
                    )}
                    {selectedPaymentDetail.paymentDetails?.payerName && (
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                        <span className="text-slate-500">Payer Name:</span>
                        <span className="font-medium text-slate-800">
                          {selectedPaymentDetail.paymentDetails.payerName}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {selectedPaymentDetail.paymentMode === 'CHEQUE' && (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                      <span className="text-slate-500">Cheque Number:</span>
                      <span className="font-mono font-semibold text-slate-800 break-all">
                        {selectedPaymentDetail.chequeNumber || selectedPaymentDetail.paymentDetails?.chequeNumber || '—'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                      <span className="text-slate-500">Bank Name:</span>
                      <span className="font-medium text-slate-800">
                        {selectedPaymentDetail.bankName || selectedPaymentDetail.paymentDetails?.chequeBank || selectedPaymentDetail.paymentDetails?.bankName || '—'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                      <span className="text-slate-500">Cheque Date:</span>
                      <span className="font-medium text-slate-800">
                        {selectedPaymentDetail.chequeDate || selectedPaymentDetail.paymentDetails?.chequeDate || '—'}
                      </span>
                    </div>
                    {selectedPaymentDetail.paymentDetails?.chequeStatus && (
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                        <span className="text-slate-500">Deposit / Clear Status:</span>
                        <Badge variant="outline" className="text-[10px] w-fit">
                          {selectedPaymentDetail.paymentDetails.chequeStatus}
                        </Badge>
                      </div>
                    )}
                  </div>
                )}

                {selectedPaymentDetail.paymentMode === 'CASH' && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Counter Type:</span>
                      <span className="font-medium text-slate-800">School Cash Desk</span>
                    </div>
                    {selectedPaymentDetail.collectedBy && (
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500">Received By (Staff):</span>
                        <span className="font-semibold text-slate-800 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400" />
                          {selectedPaymentDetail.collectedBy.firstName} {selectedPaymentDetail.collectedBy.lastName}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {selectedPaymentDetail.paymentMode === 'CARD' && (
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Card Digits:</span>
                      <span className="font-mono font-semibold text-slate-800">
                        {selectedPaymentDetail.paymentDetails?.cardLast4 ? `•••• ${selectedPaymentDetail.paymentDetails.cardLast4}` : '—'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                      <span className="text-slate-500">Txn / RRN:</span>
                      <span className="font-mono font-medium text-slate-800 break-all">
                        {selectedPaymentDetail.transactionReference || selectedPaymentDetail.referenceNumber || '—'}
                      </span>
                    </div>
                    {selectedPaymentDetail.paymentDetails?.authCode && (
                      <div className="flex justify-between">
                        <span className="text-slate-500">Auth Code:</span>
                        <span className="font-mono text-slate-800">
                          {selectedPaymentDetail.paymentDetails.authCode}
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {['BANK_TRANSFER', 'DEMAND_DRAFT'].includes(selectedPaymentDetail.paymentMode) && (
                  <div className="space-y-2">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                      <span className="text-slate-500">Reference No:</span>
                      <span className="font-mono font-semibold text-slate-800 break-all">
                        {selectedPaymentDetail.transactionReference || selectedPaymentDetail.referenceNumber || '—'}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-0.5">
                      <span className="text-slate-500">Bank Name:</span>
                      <span className="font-medium text-slate-800">
                        {selectedPaymentDetail.bankName || selectedPaymentDetail.paymentDetails?.bankName || '—'}
                      </span>
                    </div>
                  </div>
                )}

                {selectedPaymentDetail.notes && (
                  <div className="pt-2 border-t text-slate-600">
                    <span className="text-slate-500 block mb-0.5 font-medium">Remarks / Counter Note:</span>
                    <p className="bg-slate-50 p-2 rounded text-[11px] italic text-slate-700">{selectedPaymentDetail.notes}</p>
                  </div>
                )}

                {/* Audit Below-Minimum Concession info */}
                {(selectedPaymentDetail.isBelowMinimum || selectedPaymentDetail.belowMinimumReasonCode) && (
                  <div className="p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-900 space-y-1">
                    <span className="font-bold text-[10px] uppercase tracking-wider block">Below-Minimum Concession Audit</span>
                    <div className="flex justify-between">
                      <span className="text-amber-700">Reason Code:</span>
                      <span className="font-semibold">{selectedPaymentDetail.belowMinimumReasonCode}</span>
                    </div>
                    {selectedPaymentDetail.belowMinimumReasonText && (
                      <div className="text-[11px] text-amber-800 italic">
                        "{selectedPaymentDetail.belowMinimumReasonText}"
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter className="border-t pt-3 flex flex-col-reverse sm:flex-row sm:justify-between gap-2 items-stretch sm:items-center">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedPaymentDetail(null)}
              className="rounded-xl text-xs w-full sm:w-auto"
            >
              Close
            </Button>
            {onPrintReceipt && selectedPaymentDetail && (
              <Button
                size="sm"
                className="rounded-xl text-xs font-bold gap-1.5 shadow-xs w-full sm:w-auto"
                onClick={() => {
                  const receiptId = selectedPaymentDetail.id;
                  setSelectedPaymentDetail(null);
                  onPrintReceipt(receiptId);
                }}
              >
                <Printer className="w-3.5 h-3.5" /> Re-print Receipt
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Reversal Confirmation Dialog */}
      <Dialog open={!!reversalPayment} onOpenChange={(open) => !open && setReversalPayment(null)}>
        <DialogContent className="w-[95vw] sm:max-w-md rounded-2xl p-5">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-rose-600">
              <RotateCcw className="w-5 h-5 text-rose-600" />
              Reverse Fee Payment
            </DialogTitle>
            <DialogDescription className="text-xs">
              This action will mark the receipt as reversed, re-open the invoice balance, and log an audit record.
            </DialogDescription>
          </DialogHeader>

          {reversalPayment && (
            <div className="space-y-3 py-2 text-xs">
              <div className="p-3 bg-muted/30 rounded-xl space-y-1.5 border">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt Number:</span>
                  <span className="font-mono font-bold text-foreground">{reversalPayment.receiptNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Reversal Amount:</span>
                  <span className="font-bold text-rose-600">{formatMoney(reversalPayment.amountPaid)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Original Mode:</span>
                  <span className="font-medium text-foreground">{reversalPayment.paymentMode}</span>
                </div>
              </div>

              <div className="space-y-1">
                <label className="font-semibold text-foreground">Mandatory Reversal Justification</label>
                <textarea
                  placeholder="e.g. Cheque returned unpaid / Bounced or duplicate entry correction..."
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  rows={3}
                  className="w-full text-xs p-2 rounded-lg border bg-background resize-none focus:outline-none focus:ring-1 focus:ring-rose-500"
                />
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setReversalPayment(null);
                setReversalReason('');
              }}
              className="rounded-xl text-xs"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              variant="destructive"
              disabled={!reversalReason.trim() || reverseMutation.isPending}
              onClick={() => {
                if (reversalPayment) {
                  reverseMutation.mutate({
                    paymentId: reversalPayment.id,
                    reason: reversalReason.trim(),
                  });
                }
              }}
              className="rounded-xl text-xs font-bold gap-1.5"
            >
              {reverseMutation.isPending ? 'Reversing...' : 'Confirm Reversal'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default StudentLedgerDrawer;
