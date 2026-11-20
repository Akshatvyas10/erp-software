import React, { useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';
import { useQuery } from '@tanstack/react-query';
import feeApi from '@/features/fees/api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { Receipt, CheckCircle2, AlertTriangle, ArrowUpRight, Layers, Printer, Wallet } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatMoney, toMoney } from '../utils/moneyUtils';
import PrintReceiptModal from './PrintReceiptModal';

interface StudentFeeSummarySectionProps {
  studentId: string;
}

export const StudentFeeSummarySection: React.FC<StudentFeeSummarySectionProps> = ({ studentId }) => {
  const navigate = useNavigate();
  const [printReceiptId, setPrintReceiptId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.fees.studentLedger(studentId),
    queryFn: () => feeApi.getStudentFeeLedger(studentId),
    enabled: !!studentId,
  });

  if (isLoading) {
    return (
      <div className="p-6 text-center text-xs text-muted-foreground animate-pulse">
        Loading financial ledger & invoice dues...
      </div>
    );
  }

  const summary = data?.summary || {
    totalBilled: 0,
    totalPaid: 0,
    outstandingBalance: 0,
    advanceCredit: 0,
    paymentRatio: 0,
    invoicesCount: 0,
    paymentsCount: 0,
  };
  const assignedStructure = data?.assignedStructure;
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];
  const paymentRatio = typeof summary.paymentRatio === 'number'
    ? summary.paymentRatio
    : (summary.totalBilled > 0 ? Math.min(100, Math.round((summary.totalPaid / summary.totalBilled) * 100)) : 0);

  return (
    <div className="p-6 space-y-6">
      {/* Assigned Class Fee Structure Banner */}
      {assignedStructure && (
        <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-primary text-primary-foreground shrink-0">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <div className="text-xs font-bold text-foreground flex items-center gap-2">
                  <span>Class Structure: {assignedStructure.name}</span>
                  <Badge variant="outline" className="text-[10px] bg-background">
                    {assignedStructure.headsCount} Heads Active
                  </Badge>
                </div>
                <div className="text-[11px] text-muted-foreground mt-0.5">
                  Standard Monthly: <strong className="text-foreground">{formatMoney(assignedStructure.monthlyDues)}</strong> • Quarterly: <strong className="text-foreground">{formatMoney(assignedStructure.quarterlyDues)}</strong> • Annual: <strong className="text-foreground">{formatMoney(assignedStructure.annualDues)}</strong>
                </div>
              </div>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 rounded-xl font-semibold gap-1.5 shrink-0"
              onClick={() => navigate('/dashboard/fees')}
            >
              <span>Issue Class Invoice</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Payment Progress Bar */}
          <div className="pt-2 border-t border-primary/10">
            <div className="flex justify-between items-center text-xs mb-1.5">
              <span className="font-semibold text-muted-foreground">Session Payment Completion</span>
              <span className="font-bold font-mono text-foreground">{paymentRatio}%</span>
            </div>
            <Progress value={paymentRatio} className="h-2 rounded-full" />
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3.5">
        <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Invoiced</div>
            <div className="text-lg font-bold font-mono text-foreground mt-0.5">
              {formatMoney(summary.totalBilled)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">{summary.invoicesCount} total invoices</div>
          </div>
          <div className="p-2.5 rounded-xl bg-primary/10 text-primary">
            <Receipt className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-muted/30 border border-border/80 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Total Received</div>
            <div className="text-lg font-bold font-mono text-emerald-600 mt-0.5">
              {formatMoney(summary.totalPaid)}
            </div>
            <div className="text-[10px] text-emerald-600/80 mt-0.5">{summary.paymentsCount} cleared receipts</div>
          </div>
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className={`border rounded-xl p-3.5 flex items-center justify-between ${
          toMoney(summary.outstandingBalance) > 0
            ? 'bg-amber-500/5 border-amber-500/30'
            : 'bg-muted/30 border-border/80'
        }`}>
          <div>
            <div className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">Outstanding Dues</div>
            <div className={`text-lg font-bold font-mono mt-0.5 ${
              toMoney(summary.outstandingBalance) > 0 ? 'text-amber-600' : 'text-foreground'
            }`}>
              {formatMoney(summary.outstandingBalance)}
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              {toMoney(summary.outstandingBalance) > 0 ? 'Payment pending' : 'Zero balance / settled'}
            </div>
          </div>
          <div className={`p-2.5 rounded-xl ${
            toMoney(summary.outstandingBalance) > 0 ? 'bg-amber-500/10 text-amber-600' : 'bg-muted text-muted-foreground'
          }`}>
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-purple-500/5 border border-purple-500/20 rounded-xl p-3.5 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Advance Credit</div>
            <div className="text-lg font-bold font-mono text-purple-600 mt-0.5">
              {formatMoney(summary.advanceCredit || data?.student?.feeAdvanceCredit || 0)}
            </div>
            <div className="text-[10px] text-purple-600/80 mt-0.5">Prepaid credit balance</div>
          </div>
          <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600">
            <Wallet className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Invoices & Dues</h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/dashboard/fees')}
            className="text-xs h-7 text-primary hover:text-primary gap-1"
          >
            <span>Open Fees Hub</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Button>
        </div>

        <div className="rounded-xl border border-border/80 overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="text-xs font-semibold">
                <TableHead>Invoice #</TableHead>
                <TableHead>Period / Title</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-center">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-xs text-muted-foreground">
                    No fee invoices generated yet for this student.
                  </TableCell>
                </TableRow>
              ) : (
                invoices.map((inv) => (
                  <TableRow key={inv.id} className="text-xs">
                    <TableCell className="font-mono font-semibold text-primary">{inv.invoiceNumber}</TableCell>
                    <TableCell className="font-medium text-foreground">{inv.title}</TableCell>
                    <TableCell className="text-muted-foreground">{inv.dueDate}</TableCell>
                    <TableCell className="text-right font-mono">{formatMoney(inv.totalAmount)}</TableCell>
                    <TableCell className={`text-right font-mono font-bold ${
                      toMoney(inv.balanceAmount) > 0 ? 'text-amber-600' : 'text-emerald-600'
                    }`}>
                      {formatMoney(inv.balanceAmount)}
                    </TableCell>
                    <TableCell className="text-center">
                      <Badge
                        variant="outline"
                        className={`text-[10px] font-semibold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/30'
                            : inv.status === 'PARTIALLY_PAID'
                            ? 'bg-amber-500/10 text-amber-600 border-amber-500/30'
                            : 'bg-muted text-muted-foreground border-border'
                        }`}
                      >
                        {inv.status === 'PAID' ? 'Settled' : inv.status === 'PARTIALLY_PAID' ? 'Partial' : 'Unpaid'}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Recent Payments / Receipts */}
      {payments.length > 0 && (
        <div className="space-y-2.5">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Payment Receipts History</h3>
          <div className="rounded-xl border border-border/80 overflow-hidden bg-card">
            <Table>
              <TableHeader className="bg-muted/40">
                <TableRow className="text-xs font-semibold">
                  <TableHead>Receipt #</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Mode & Ref</TableHead>
                  <TableHead className="text-right">Amount Paid</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => {
                  const ref = p.transactionReference || p.referenceNumber || p.paymentDetails?.transactionReference || p.chequeNumber;
                  return (
                    <TableRow key={p.id} className="text-xs">
                      <TableCell className="font-mono font-semibold text-foreground">{p.receiptNumber}</TableCell>
                      <TableCell className="text-muted-foreground">{p.paymentDate}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge variant="outline" className="text-[10px]">
                            {p.paymentMode}
                          </Badge>
                          {ref && <span className="font-mono text-[10px] text-muted-foreground">Ref: {ref}</span>}
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono font-bold text-emerald-600">
                        {formatMoney(p.amountPaid ?? p.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-[11px] px-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 gap-1"
                          onClick={() => setPrintReceiptId(p.id)}
                        >
                          <Printer className="w-3 h-3" /> Re-print
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      {/* Re-print Receipt Modal */}
      <PrintReceiptModal
        receiptId={printReceiptId}
        isOpen={!!printReceiptId}
        onClose={() => setPrintReceiptId(null)}
      />
    </div>
  );
};

export default StudentFeeSummarySection;
