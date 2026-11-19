import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import feeApi, { type FeePayment } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { formatMoney } from '../utils/moneyUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DatePicker } from '@/components/common/DatePicker';
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
import {
  Coins,
  Search,
  Download,
  Printer,
  RefreshCw,
  IndianRupee,
  CreditCard,
  QrCode,
  FileCheck2,
  UserCheck,
} from 'lucide-react';

interface CounterHistoryTabProps {
  classrooms?: Array<{ id: string; name: string }>;
  onPrintReceipt?: (receiptId: string) => void;
  onViewLedger?: (studentId: string) => void;
}

export const CounterHistoryTab: React.FC<CounterHistoryTabProps> = ({
  classrooms = [],
  onPrintReceipt,
  onViewLedger,
}) => {
  // Filters
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [selectedCollector, setSelectedCollector] = useState<string>('ALL');
  const [paymentMode, setPaymentMode] = useState<string>('ALL');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.fees.counterHistory({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      collectedById: selectedCollector !== 'ALL' ? selectedCollector : undefined,
      paymentMode: paymentMode !== 'ALL' ? paymentMode : undefined,
      classroomId: selectedClassroom !== 'ALL' ? selectedClassroom : undefined,
      search: searchTerm || undefined,
    }),
    queryFn: () =>
      feeApi.getCounterHistory({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        collectedById: selectedCollector !== 'ALL' ? selectedCollector : undefined,
        paymentMode: paymentMode !== 'ALL' ? paymentMode : undefined,
        classroomId: selectedClassroom !== 'ALL' ? selectedClassroom : undefined,
        search: searchTerm || undefined,
      }),
  });

  const payments = data?.items || [];
  const summary = data?.summary || {
    totalCollected: 0,
    cashTotal: 0,
    upiTotal: 0,
    chequeTotal: 0,
    cardTotal: 0,
    receiptsCount: 0,
    collectors: [],
  };

  const handleExportCSV = () => {
    if (payments.length === 0) return;

    const headers = [
      'Receipt No',
      'Payment Date',
      'Student Name',
      'Admission No',
      'Invoice / Period',
      'Amount Paid',
      'Payment Mode',
      'Collected By',
      'Status',
    ];

    const rows = payments.map((p: FeePayment) => [
      p.receiptNumber,
      p.paymentDate,
      p.student?.account
        ? `${p.student.account.firstName} ${p.student.account.lastName || ''}`.trim()
        : 'Unknown',
      p.student?.admissionNumber || 'N/A',
      p.invoice?.periodKey || p.invoice?.invoiceNumber || 'General',
      p.amountPaid,
      p.paymentMode,
      p.collectedBy ? `${p.collectedBy.firstName} ${p.collectedBy.lastName || ''}`.trim() : 'System',
      p.isReversed ? 'REVERSED' : p.status || 'SUCCESS',
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Counter_History_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const clearFilters = () => {
    setStartDate('');
    setEndDate('');
    setSelectedCollector('ALL');
    setPaymentMode('ALL');
    setSelectedClassroom('ALL');
    setSearchTerm('');
  };

  const hasActiveFilters =
    Boolean(startDate) ||
    Boolean(endDate) ||
    selectedCollector !== 'ALL' ||
    paymentMode !== 'ALL' ||
    selectedClassroom !== 'ALL' ||
    Boolean(searchTerm);

  return (
    <div className="space-y-4">
      {/* 1. Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> Cashier Counter History & Day-Book
            </h2>
            <Badge variant="outline" className="text-[11px] font-semibold rounded-lg">
              Live Audit
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit daily point-of-sale collections by cashier, verify cash in hand vs digital receipts, and reprint receipts.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={payments.length === 0}
            className="text-xs font-semibold gap-1.5 rounded-xl flex-1 sm:flex-initial"
          >
            <Download className="w-3.5 h-3.5" /> Export CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-8 text-xs px-2.5 rounded-xl"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. Standardized KPI Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
        <Card className="rounded-xl border border-border/70 shadow-2xs">
          <CardContent className="p-3">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-emerald-600" /> Total Collected
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-0.5">
              {formatMoney(summary.totalCollected)}
            </div>
            <span className="text-[10px] text-muted-foreground">{summary.receiptsCount} receipts</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/70 shadow-2xs">
          <CardContent className="p-3">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <IndianRupee className="w-3.5 h-3.5 text-amber-600" /> Cash in Hand
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5">
              {formatMoney(summary.cashTotal)}
            </div>
            <span className="text-[10px] text-muted-foreground">Physical tender</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/70 shadow-2xs">
          <CardContent className="p-3">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <QrCode className="w-3.5 h-3.5 text-indigo-600" /> UPI / QR
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5">
              {formatMoney(summary.upiTotal)}
            </div>
            <span className="text-[10px] text-muted-foreground">Digital bank credit</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/70 shadow-2xs">
          <CardContent className="p-3">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-purple-600" /> POS Card
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5">
              {formatMoney(summary.cardTotal)}
            </div>
            <span className="text-[10px] text-muted-foreground">Debit / Credit</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/70 shadow-2xs">
          <CardContent className="p-3">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <FileCheck2 className="w-3.5 h-3.5 text-sky-600" /> Cheque / DD
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5">
              {formatMoney(summary.chequeTotal)}
            </div>
            <span className="text-[10px] text-muted-foreground">Clearing balance</span>
          </CardContent>
        </Card>

        <Card className="rounded-xl border border-border/70 shadow-2xs">
          <CardContent className="p-3">
            <span className="text-[11px] font-medium text-muted-foreground flex items-center gap-1">
              <UserCheck className="w-3.5 h-3.5 text-teal-600" /> Cashiers Active
            </span>
            <div className="text-base sm:text-lg font-bold font-mono text-foreground mt-0.5">
              {summary.collectors?.length || 0}
            </div>
            <span className="text-[10px] text-muted-foreground">Counters reporting</span>
          </CardContent>
        </Card>
      </div>

      {/* 3. Sticky Filter Bar matching ERP FilterBar design standard */}
      <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs space-y-2.5">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
          {/* Search Input */}
          <div className="relative sm:col-span-2">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search receipt #, student name, admission #..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-8 rounded-xl bg-background"
            />
          </div>

          {/* Mode Selector */}
          <div>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger className="text-xs h-8 rounded-xl bg-background">
                <SelectValue placeholder="All Modes" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Payment Modes</SelectItem>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="UPI">UPI / QR</SelectItem>
                <SelectItem value="CARD">Card POS</SelectItem>
                <SelectItem value="CHEQUE">Bank Cheque</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank IMPS/NEFT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Classroom Selector */}
          <div>
            <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
              <SelectTrigger className="text-xs h-8 rounded-xl bg-background">
                <SelectValue placeholder="All Classrooms" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Classes</SelectItem>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Date Pickers */}
          <div>
            <DatePicker
              value={startDate}
              onChange={setStartDate}
              placeholder="From Date"
              className="h-8 text-xs rounded-xl"
            />
          </div>

          <div>
            <DatePicker
              value={endDate}
              onChange={setEndDate}
              placeholder="To Date"
              className="h-8 text-xs rounded-xl"
            />
          </div>
        </div>

        {hasActiveFilters && (
          <div className="flex items-center justify-between pt-1 border-t border-border/60 text-xs">
            <span className="text-muted-foreground text-[11px]">
              Showing filtered results ({payments.length} transactions)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="h-6 text-[11px] px-2 text-primary hover:text-primary font-semibold"
            >
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      {/* 4. Responsive Dual View: Desktop Table + Mobile Cards */}
      <div className="bg-card rounded-xl border border-border/70 shadow-2xs overflow-hidden">
        {/* Mobile View: Cards on screens < 768px */}
        <div className="block md:hidden divide-y divide-border/60">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
              Loading counter history...
            </div>
          ) : payments.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">
              No counter collection records found.
            </div>
          ) : (
            payments.map((p: FeePayment) => {
              const studentName = p.student?.account
                ? `${p.student.account.firstName} ${p.student.account.lastName || ''}`.trim()
                : 'Student';
              return (
                <div key={p.id} className="p-3.5 space-y-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-xs font-bold text-primary">{p.receiptNumber}</span>
                      <h4 className="text-xs font-bold text-foreground mt-0.5">{studentName}</h4>
                      <p className="text-[11px] text-muted-foreground font-mono">Adm: {p.student?.admissionNumber || '—'}</p>
                    </div>
                    {p.isReversed ? (
                      <Badge variant="destructive" className="text-[10px] font-bold rounded-lg">
                        REVERSED
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 rounded-lg">
                        SUCCESS
                      </Badge>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 p-2 rounded-lg bg-muted/40 text-xs">
                    <div>
                      <span className="text-[10px] text-muted-foreground block">Amount Paid</span>
                      <span className="font-mono font-bold text-sm text-emerald-600 dark:text-emerald-400">
                        {formatMoney(p.amountPaid)}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block">Mode & Date</span>
                      <span className="font-semibold text-foreground text-[11px] block">{p.paymentMode}</span>
                      <span className="text-[10px] text-muted-foreground">{p.paymentDate}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center pt-1 text-xs">
                    <span className="text-[11px] text-muted-foreground">
                      Collector: {p.collectedBy ? p.collectedBy.firstName : 'System'}
                    </span>
                    <div className="flex gap-1.5">
                      {onPrintReceipt && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onPrintReceipt(p.id)}
                          className="h-7 text-[11px] rounded-lg font-semibold gap-1"
                        >
                          <Printer className="w-3 h-3" /> Receipt
                        </Button>
                      )}
                      {onViewLedger && p.studentId && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewLedger(p.studentId)}
                          className="h-7 text-[11px] rounded-lg"
                        >
                          Ledger
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop View: Full Table on screens >= 768px */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="border-b border-border/80">
                <TableHead className="text-xs font-bold">Receipt / Date</TableHead>
                <TableHead className="text-xs font-bold">Student</TableHead>
                <TableHead className="text-xs font-bold">Period / Invoice</TableHead>
                <TableHead className="text-xs font-bold">Mode</TableHead>
                <TableHead className="text-xs font-bold text-right">Amount Paid</TableHead>
                <TableHead className="text-xs font-bold">Cashier / Desk</TableHead>
                <TableHead className="text-xs font-bold text-center">Status</TableHead>
                <TableHead className="text-xs font-bold text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                    <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-primary" />
                    Loading counter history records...
                  </TableCell>
                </TableRow>
              ) : payments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                    No counter collection records found matching criteria.
                  </TableCell>
                </TableRow>
              ) : (
                payments.map((p: FeePayment) => (
                  <TableRow key={p.id} className="text-xs hover:bg-muted/30">
                    <TableCell className="py-2.5">
                      <div className="font-mono font-bold text-primary">{p.receiptNumber}</div>
                      <div className="text-[10px] text-muted-foreground">{p.paymentDate}</div>
                    </TableCell>
                    <TableCell className="py-2.5 font-semibold">
                      {p.student?.account
                        ? `${p.student.account.firstName} ${p.student.account.lastName || ''}`.trim()
                        : 'Student'}
                      <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                        {p.student?.admissionNumber || ''}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className="text-[10px] font-semibold bg-muted/30 rounded-lg">
                        {p.invoice?.periodKey || 'Current Installment'}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className="text-[10px] font-semibold rounded-lg">
                        {p.paymentMode}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-bold font-mono text-emerald-600 dark:text-emerald-400">
                      {formatMoney(p.amountPaid)}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="font-medium text-foreground">
                        {p.collectedBy ? `${p.collectedBy.firstName} ${p.collectedBy.lastName || ''}`.trim() : 'System'}
                      </div>
                      <div className="text-[10px] text-muted-foreground">
                        {p.collectedBy?.email || ''}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      {p.isReversed ? (
                        <Badge variant="destructive" className="text-[9px] font-bold rounded-lg">
                          REVERSED
                        </Badge>
                      ) : (
                        <Badge variant="outline" className="text-[9px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border-emerald-300 rounded-lg">
                          SUCCESS
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {onPrintReceipt && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onPrintReceipt(p.id)}
                            className="h-7 text-[11px] px-2 text-primary gap-1 rounded-lg"
                          >
                            <Printer className="w-3 h-3" /> Receipt
                          </Button>
                        )}
                        {onViewLedger && p.studentId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onViewLedger(p.studentId)}
                            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground rounded-lg"
                          >
                            Ledger
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
};

export default CounterHistoryTab;
