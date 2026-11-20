import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import feeApi, { type StudentInvoice } from '@/features/fees/api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/common/PageHeader';
import { StatCard } from '@/components/common/StatCard';
import { EmptyState } from '@/components/common/EmptyState';
import {
  Receipt,
  CheckCircle2,
  Clock,
  Printer,
  AlertTriangle,
  History,
  Calendar,
  Layers,
  BellRing,
  Wallet,
  FileText,
} from 'lucide-react';
import { formatMoney, toMoney } from '@/features/fees/utils/moneyUtils';
import PrintReceiptModal from '@/features/fees/components/PrintReceiptModal';

export default function StudentFeesPage() {
  const [selectedAcademicYearId, setSelectedAcademicYearId] = useState<string>('CURRENT');
  const [printReceiptId, setPrintReceiptId] = useState<string | null>(null);

  // 1. Fetch authenticated student profile to resolve studentId securely
  const { data: profileData, isLoading: isProfileLoading } = useQuery({
    queryKey: ['portal', 'student', 'me'],
    queryFn: async () => {
      const res = await api.get('/portal/student/me');
      return res.data.data;
    },
  });

  const student = profileData?.student;
  const studentId = student?.id;

  // 2. Fetch full student fee ledger with academic session filtering
  const { data: ledgerData, isLoading: isLedgerLoading } = useQuery({
    queryKey: queryKeys.fees.studentLedger(studentId || '', { academicYearId: selectedAcademicYearId }),
    queryFn: () =>
      feeApi.getStudentFeeLedger(
        studentId!,
        selectedAcademicYearId !== 'CURRENT' && selectedAcademicYearId !== 'ALL'
          ? { academicYearId: selectedAcademicYearId }
          : undefined
      ),
    enabled: !!studentId,
  });

  const invoices = ledgerData?.invoices || [];
  const payments = ledgerData?.payments || [];
  const summary = ledgerData?.summary || {
    totalBilled: 0,
    totalPaid: 0,
    outstandingBalance: 0,
    totalLateFine: 0,
    advanceCredit: 0,
    paymentRatio: 0,
    invoicesCount: 0,
    paymentsCount: 0,
  };
  const academicSessions = ledgerData?.academicSessions || [];
  const activeReminders = ledgerData?.activeReminders || [];
  const advanceCredit = Number(student?.feeAdvanceCredit || summary.advanceCredit || 0);

  // Filter invoices for current selection
  const filteredInvoices = useMemo(() => {
    if (selectedAcademicYearId === 'ALL') return invoices;
    if (selectedAcademicYearId === 'CURRENT') {
      const currentYear = academicSessions.find((s) => s.isCurrent);
      if (!currentYear) return invoices;
      return invoices.filter((inv) => inv.academicYearId === currentYear.id);
    }
    return invoices.filter((inv) => inv.academicYearId === selectedAcademicYearId);
  }, [invoices, selectedAcademicYearId, academicSessions]);

  // Financial aggregates strictly computed from backend truth with Number() / toMoney()
  const totalBilled = filteredInvoices.reduce((sum, inv) => sum + toMoney(inv.totalAmount), 0);
  const totalPaid = filteredInvoices.reduce((sum, inv) => sum + toMoney(inv.paidAmount), 0);
  const totalDue = Math.max(0, totalBilled - totalPaid);
  const totalFines = filteredInvoices.reduce((sum, inv) => sum + toMoney(inv.fineAmount || inv.lateFineAmount || 0), 0);

  const getStatusBadge = (inv: StudentInvoice) => {
    if (inv.status === 'PAID') {
      return (
        <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 font-semibold text-[11px] py-0.5">
          <CheckCircle2 className="w-3 h-3 mr-1 text-emerald-500" /> Settled
        </Badge>
      );
    }
    if (inv.status === 'PARTIALLY_PAID') {
      return (
        <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 font-semibold text-[11px] py-0.5">
          <Clock className="w-3 h-3 mr-1 text-amber-500" /> Partial
        </Badge>
      );
    }
    if (inv.isOverdue) {
      return (
        <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 font-bold text-[11px] py-0.5">
          <AlertTriangle className="w-3 h-3 mr-1 text-destructive" /> Overdue ({inv.overdueDays}d)
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 font-semibold text-[11px] py-0.5">
        Due
      </Badge>
    );
  };

  if (isProfileLoading) {
    return (
      <div className="space-y-6">
        <div className="h-16 bg-muted/40 rounded-2xl animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header matching ERP standard with Academic Year Switcher */}
      <PageHeader
        title="Fees & Payment Ledger"
        description={`Adm #${student?.admissionNumber || '—'} • Class: ${student?.classroom?.name || 'Assigned Class'} • Track tuition dues, historical sessions, and payment receipts.`}
      >
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Calendar className="w-4 h-4 text-muted-foreground shrink-0" />
          <Select value={selectedAcademicYearId} onValueChange={setSelectedAcademicYearId}>
            <SelectTrigger className="w-full sm:w-60 h-9 text-xs rounded-xl bg-background border-border shadow-2xs font-medium">
              <SelectValue placeholder="Academic Session" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="CURRENT" className="font-semibold text-primary">
                Current Session (Active)
              </SelectItem>
              {academicSessions.map((session) => (
                <SelectItem key={session.id} value={session.id}>
                  {session.name} {session.isCurrent ? '★ (Current)' : '(Past History)'}
                </SelectItem>
              ))}
              <SelectItem value="ALL" className="font-semibold text-muted-foreground">
                All Sessions (Complete History)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageHeader>

      {/* Active Fee Reminders Alert Banner */}
      {activeReminders.length > 0 && totalDue > 0 && (
        <Alert className="rounded-2xl border-amber-500/30 bg-amber-500/10 text-amber-900 dark:text-amber-200">
          <BellRing className="h-4 w-4 text-amber-600 dark:text-amber-400" />
          <AlertTitle className="text-xs font-bold flex items-center gap-2">
            <span>Official Fee Reminder</span>
            <Badge variant="outline" className="text-[10px] bg-background/50 border-amber-500/30">
              Notice
            </Badge>
          </AlertTitle>
          <AlertDescription className="text-xs text-amber-800 dark:text-amber-300 mt-0.5">
            You have an outstanding session balance of <strong>{formatMoney(totalDue)}</strong>. Please review your pending installment breakdown below or visit the accounts department.
          </AlertDescription>
        </Alert>
      )}

      {/* Standard KPI Summary Cards using existing StatCard component */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Invoiced"
          value={formatMoney(totalBilled)}
          subtitle={`${filteredInvoices.length} installment(s) billed`}
          icon={Receipt}
          variant="default"
        />
        <StatCard
          title="Total Paid"
          value={formatMoney(totalPaid)}
          subtitle="Verified cleared receipts"
          icon={CheckCircle2}
          variant="success"
        />
        <StatCard
          title="Total Due / Balance"
          value={formatMoney(totalDue)}
          subtitle={totalDue > 0 ? 'Pending collection' : 'Zero balance settled'}
          icon={totalDue > 0 ? AlertTriangle : CheckCircle2}
          variant={totalDue > 0 ? 'warning' : 'default'}
        />
        <StatCard
          title="Advance Credit"
          value={formatMoney(advanceCredit)}
          subtitle="Available deposit"
          icon={Wallet}
          variant="info"
        />
      </div>

      {/* Invoices & Dues Section */}
      <div className="space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              Fee Installments & Dues Breakdown
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Itemized tuition schedules, accrued late fine penalties, and installment statuses
            </p>
          </div>
          {totalFines > 0 && (
            <Badge variant="outline" className="text-destructive border-destructive/20 bg-destructive/5 text-[11px] font-semibold py-0.5">
              Accrued Late Fine: {formatMoney(totalFines)}
            </Badge>
          )}
        </div>

        {isLedgerLoading ? (
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-16 rounded-xl" />
            ))}
          </div>
        ) : filteredInvoices.length === 0 ? (
          <EmptyState
            icon={Receipt}
            title="No fee invoices registered"
            description="There are no fee invoices or dues recorded for this student in the selected academic session."
          />
        ) : (
          <>
            {/* Desktop Table View (>= md) */}
            <div className="hidden md:block rounded-2xl border border-border/80 overflow-hidden shadow-2xs bg-card">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="text-xs">
                    <TableHead className="font-semibold">Invoice #</TableHead>
                    <TableHead className="font-semibold">Installment / Title</TableHead>
                    <TableHead className="font-semibold">Session</TableHead>
                    <TableHead className="font-semibold">Due Date</TableHead>
                    <TableHead className="font-semibold text-right">Base Fee</TableHead>
                    <TableHead className="font-semibold text-right">Late Fine</TableHead>
                    <TableHead className="font-semibold text-right">Total Payable</TableHead>
                    <TableHead className="font-semibold text-right">Balance Due</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInvoices.map((inv) => {
                    const balance = toMoney(inv.balanceAmount);
                    const fine = toMoney(inv.fineAmount || inv.lateFineAmount || 0);

                    return (
                      <TableRow key={inv.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-primary">
                          {inv.invoiceNumber}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-foreground">{inv.title}</div>
                          {inv.description && (
                            <div className="text-[11px] text-muted-foreground">{inv.description}</div>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground font-medium">
                          {inv.academicYear?.name || '—'}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {inv.dueDate}
                        </TableCell>
                        <TableCell className="text-right font-mono text-muted-foreground">
                          {formatMoney(inv.subtotal || inv.subtotalAmount || inv.totalAmount)}
                        </TableCell>
                        <TableCell className={`text-right font-mono ${fine > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                          {fine > 0 ? `+${formatMoney(fine)}` : '₹0'}
                        </TableCell>
                        <TableCell className="text-right font-mono font-semibold text-foreground">
                          {formatMoney(inv.totalAmount)}
                        </TableCell>
                        <TableCell className={`text-right font-mono font-bold ${
                          balance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                        }`}>
                          {formatMoney(balance)}
                        </TableCell>
                        <TableCell className="text-center">
                          {getStatusBadge(inv)}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Stacked Card View (< md) */}
            <div className="md:hidden space-y-3">
              {filteredInvoices.map((inv) => {
                const balance = toMoney(inv.balanceAmount);
                const fine = toMoney(inv.fineAmount || inv.lateFineAmount || 0);

                return (
                  <Card key={inv.id} className="border-border/80 bg-card shadow-2xs rounded-2xl">
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="font-mono text-xs font-bold text-primary">{inv.invoiceNumber}</span>
                          <h4 className="text-sm font-semibold text-foreground mt-0.5">{inv.title}</h4>
                          {inv.academicYear && (
                            <p className="text-[10px] text-muted-foreground">Session {inv.academicYear.name}</p>
                          )}
                        </div>
                        <div>{getStatusBadge(inv)}</div>
                      </div>

                      <div className="grid grid-cols-3 gap-2 py-2.5 my-1 border-y border-border/60 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Total</span>
                          <span className="font-mono font-semibold text-foreground">{formatMoney(inv.totalAmount)}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Late Fine</span>
                          <span className={`font-mono ${fine > 0 ? 'text-destructive font-semibold' : 'text-muted-foreground'}`}>
                            {fine > 0 ? `+${formatMoney(fine)}` : '₹0'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Balance</span>
                          <span className={`font-mono font-bold ${
                            balance > 0 ? 'text-amber-700 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {formatMoney(balance)}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center text-xs text-muted-foreground">
                        <span>Due Date: {inv.dueDate}</span>
                        {balance === 0 && (
                          <span className="text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Fully Settled
                          </span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Payment Receipts History */}
      <div className="space-y-3 pt-2">
        <div>
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <History className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Official Payment Receipts & Audit History
          </h3>
          <p className="text-[11px] text-muted-foreground">
            Verified transaction proofs with date, mode, reference UTR, and printable PDF receipts
          </p>
        </div>

        {payments.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No payment receipts found"
            description="No fee collection payments have been recorded for this student account yet."
          />
        ) : (
          <>
            {/* Desktop Receipts Table (>= md) */}
            <div className="hidden md:block rounded-2xl border border-border/80 overflow-hidden shadow-2xs bg-card">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow className="text-xs">
                    <TableHead className="font-semibold">Receipt No.</TableHead>
                    <TableHead className="font-semibold">Date</TableHead>
                    <TableHead className="font-semibold">Invoice Covered</TableHead>
                    <TableHead className="font-semibold">Payment Mode</TableHead>
                    <TableHead className="font-semibold">Reference / UTR</TableHead>
                    <TableHead className="font-semibold text-right">Amount Paid</TableHead>
                    <TableHead className="font-semibold text-center">Status</TableHead>
                    <TableHead className="font-semibold text-right">Voucher</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => {
                    const ref = p.transactionReference || p.referenceNumber || p.paymentDetails?.transactionReference || p.chequeNumber || '—';
                    const isReversed = Boolean(p.reversal || p.isReversed);

                    return (
                      <TableRow key={p.id} className="text-xs hover:bg-muted/30">
                        <TableCell className="font-mono font-bold text-foreground">
                          {p.receiptNumber}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {p.paymentDate}
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {p.invoice?.invoiceNumber ? (
                            <span>{p.invoice.invoiceNumber} • {p.invoice.title}</span>
                          ) : (
                            'General Ledger Settlement'
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-[10px] font-semibold bg-muted/40">
                            {p.paymentMode}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-mono text-muted-foreground text-[11px]">
                          {ref}
                        </TableCell>
                        <TableCell className="text-right font-mono font-bold text-emerald-600 dark:text-emerald-400">
                          {formatMoney(p.amountPaid || p.amount || 0)}
                        </TableCell>
                        <TableCell className="text-center">
                          {isReversed ? (
                            <Badge variant="destructive" className="text-[10px]">
                              Reversed
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">
                              Success
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs rounded-xl font-semibold gap-1.5 border-border shadow-2xs"
                            onClick={() => setPrintReceiptId(p.id)}
                          >
                            <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                            <span>Receipt</span>
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Stacked Receipts Cards (< md) */}
            <div className="md:hidden space-y-3">
              {payments.map((p) => {
                const ref = p.transactionReference || p.referenceNumber || p.paymentDetails?.transactionReference || p.chequeNumber || '—';
                const isReversed = Boolean(p.reversal || p.isReversed);

                return (
                  <Card key={p.id} className="border-border/80 bg-card shadow-2xs rounded-2xl">
                    <CardContent className="p-4 space-y-2.5">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono text-xs font-bold text-foreground">{p.receiptNumber}</span>
                          <p className="text-[11px] text-muted-foreground mt-0.5">{p.paymentDate}</p>
                        </div>
                        <div>
                          {isReversed ? (
                            <Badge variant="destructive" className="text-[10px]">Reversed</Badge>
                          ) : (
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px]">Success</Badge>
                          )}
                        </div>
                      </div>

                      <div className="text-xs">
                        <span className="text-muted-foreground block text-[10px] uppercase font-semibold">Invoice Covered</span>
                        <span className="font-medium text-foreground">
                          {p.invoice?.invoiceNumber ? `${p.invoice.invoiceNumber} • ${p.invoice.title}` : 'General Settlement'}
                        </span>
                      </div>

                      <div className="flex justify-between items-center pt-2 border-t border-border/60 text-xs">
                        <div>
                          <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Mode & Ref</span>
                          <span className="font-medium text-foreground">{p.paymentMode} ({ref})</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-muted-foreground uppercase block font-semibold">Amount Paid</span>
                          <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400 text-sm">
                            {formatMoney(p.amountPaid || p.amount || 0)}
                          </span>
                        </div>
                      </div>

                      <div className="pt-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full h-8 text-xs rounded-xl font-semibold gap-1.5 border-border shadow-2xs"
                          onClick={() => setPrintReceiptId(p.id)}
                        >
                          <Printer className="w-3.5 h-3.5 text-muted-foreground" />
                          <span>View / Print Receipt</span>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Printable Receipt Voucher */}
      <PrintReceiptModal
        receiptId={printReceiptId}
        isOpen={!!printReceiptId}
        onClose={() => setPrintReceiptId(null)}
      />
    </div>
  );
}
