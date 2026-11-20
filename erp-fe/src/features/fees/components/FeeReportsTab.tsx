import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import feeApi, { type FeePayment } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { formatMoney, toMoney } from '../utils/moneyUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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
  BarChart3,
  Download,
  Calendar,
  CreditCard,
  Building,
  RefreshCw,
} from 'lucide-react';

interface FeeReportsTabProps {
  onViewLedger?: (studentId: string) => void;
}

export const FeeReportsTab: React.FC<FeeReportsTabProps> = () => {
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.fees.reports({
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    }),
    queryFn: () =>
      feeApi.getFinancialReports({
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      }),
  });

  const modeBreakup = data?.modeBreakup || [];
  const dailyRegister = data?.dailyRegister || [];
  const classEfficiency = data?.classEfficiency || [];

  const totalCollectedFiltered = modeBreakup.reduce((sum, m) => sum + toMoney(m.totalAmount), 0);
  const totalTxCount = modeBreakup.reduce((sum, m) => sum + Number(m.transactionCount || 0), 0);

  // CSV Export Generator
  const handleExportCSV = () => {
    if (dailyRegister.length === 0) return;

    const headers = ['Receipt No', 'Payment Date', 'Student Name', 'Admission No', 'Invoice No', 'Amount Paid', 'Mode', 'Collected By'];
    const rows = dailyRegister.map((p: FeePayment) => [
      p.receiptNumber,
      p.paymentDate,
      p.student ? `${p.student.account?.firstName || ''} ${p.student.account?.lastName || ''}`.trim() : 'N/A',
      p.student?.admissionNumber || 'N/A',
      p.invoice?.invoiceNumber || 'N/A',
      p.amountPaid,
      p.paymentMode,
      p.collectedBy ? `${p.collectedBy.firstName} ${p.collectedBy.lastName || ''}`.trim() : 'System',
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Fee_Collection_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" /> Fee Intelligence & Financial Reports
            </h2>
            <Badge variant="secondary" className="text-xs font-semibold">
              Live Reconciliation
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit daily receipts, cross-tabulate payment modes, evaluate class collection targets, and export reports.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            disabled={dailyRegister.length === 0}
            className="text-xs font-semibold gap-1.5 rounded-lg"
          >
            <Download className="w-3.5 h-3.5" /> Export Register CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-8 text-xs px-2 gap-1"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* 2. Date Range Filter */}
      <div className="p-3.5 bg-muted/30 border border-border/70 rounded-xl flex flex-wrap items-center gap-3">
        <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5" /> Filter Date Range:
        </span>
        <div className="flex items-center gap-2">
          <DatePicker
            value={startDate}
            onChange={(val) => setStartDate(val || '')}
            placeholder="From Date"
            className="h-8 text-xs bg-background w-36"
          />
          <span className="text-xs text-muted-foreground">to</span>
          <DatePicker
            value={endDate}
            onChange={(val) => setEndDate(val || '')}
            placeholder="To Date"
            className="h-8 text-xs bg-background w-36"
          />
        </div>
        {(startDate || endDate) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setStartDate('');
              setEndDate('');
            }}
            className="h-7 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear Dates
          </Button>
        )}
      </div>

      {/* 3. Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="text-xs font-medium text-muted-foreground">Filtered Collection</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
              {formatMoney(totalCollectedFiltered)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              {totalTxCount} cleared receipts
            </div>
          </CardContent>
        </Card>

        {modeBreakup.slice(0, 3).map((m) => (
          <Card key={m.paymentMode} className="border border-border/70 shadow-2xs">
            <CardContent className="p-3.5">
              <div className="text-xs font-medium text-muted-foreground">{m.paymentMode} Collections</div>
              <div className="text-xl sm:text-2xl font-bold text-primary mt-1">
                {formatMoney(m.totalAmount)}
              </div>
              <div className="text-[11px] text-muted-foreground mt-1">
                {m.transactionCount} transactions
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 4. Class-wise Collection Efficiency */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <Building className="w-3.5 h-3.5 text-primary" /> Class Collection Efficiency
        </h3>
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold">Classroom</TableHead>
                <TableHead className="text-xs font-bold text-right">Total Billed</TableHead>
                <TableHead className="text-xs font-bold text-right">Total Collected</TableHead>
                <TableHead className="text-xs font-bold text-right">Outstanding Dues</TableHead>
                <TableHead className="text-xs font-bold text-center">Collection Rate</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {classEfficiency.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                    No classroom invoice records found.
                  </TableCell>
                </TableRow>
              ) : (
                classEfficiency.map((c) => {
                  const billed = toMoney(c.totalBilled);
                  const collected = toMoney(c.totalCollected);
                  const rate = billed > 0 ? Math.round((collected / billed) * 100) : 0;
                  return (
                    <TableRow key={c.classroomId} className="text-xs hover:bg-muted/30">
                      <TableCell className="font-semibold">{c.classroomName} ({c.section})</TableCell>
                      <TableCell className="text-right font-medium">{formatMoney(billed)}</TableCell>
                      <TableCell className="text-right font-semibold text-emerald-700">{formatMoney(collected)}</TableCell>
                      <TableCell className="text-right font-semibold text-rose-600">{formatMoney(c.totalPending)}</TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-bold ${
                            rate >= 80 ? 'bg-emerald-50 text-emerald-700 border-emerald-300' : 'bg-amber-50 text-amber-700 border-amber-300'
                          }`}
                        >
                          {rate}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 5. Daily Collection Register */}
      <div className="space-y-2">
        <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-1.5">
          <CreditCard className="w-3.5 h-3.5 text-primary" /> Daily Receipt Register (Latest 100 Transactions)
        </h3>
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-bold">Receipt / Date</TableHead>
                <TableHead className="text-xs font-bold">Student</TableHead>
                <TableHead className="text-xs font-bold">Invoice</TableHead>
                <TableHead className="text-xs font-bold">Payment Mode</TableHead>
                <TableHead className="text-xs font-bold text-right">Amount Paid</TableHead>
                <TableHead className="text-xs font-bold text-right">Cashier</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {dailyRegister.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-8 text-xs text-muted-foreground">
                    No receipt transactions in selected date window.
                  </TableCell>
                </TableRow>
              ) : (
                dailyRegister.map((p: FeePayment) => (
                  <TableRow key={p.id} className="text-xs hover:bg-muted/30">
                    <TableCell className="py-2.5">
                      <div className="font-mono font-bold text-primary">{p.receiptNumber}</div>
                      <div className="text-[10px] text-muted-foreground">{p.paymentDate}</div>
                    </TableCell>
                    <TableCell className="py-2.5 font-semibold">
                      {p.student ? `${p.student.account?.firstName || ''} ${p.student.account?.lastName || ''}`.trim() : 'Unknown'}
                      <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                        {p.student?.admissionNumber || ''}
                      </span>
                    </TableCell>
                    <TableCell className="py-2.5 font-mono text-[11px] text-muted-foreground">
                      {p.invoice?.invoiceNumber || 'Manual'}
                    </TableCell>
                    <TableCell className="py-2.5">
                      <Badge variant="outline" className="text-[10px] font-semibold">
                        {p.paymentMode}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-bold text-emerald-700">
                      {formatMoney(p.amountPaid)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right text-muted-foreground text-[11px]">
                      {p.collectedBy ? `${p.collectedBy.firstName} ${p.collectedBy.lastName || ''}`.trim() : 'System'}
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

export default FeeReportsTab;
