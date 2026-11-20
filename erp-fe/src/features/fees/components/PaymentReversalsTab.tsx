import React from 'react';
import { useQuery } from '@tanstack/react-query';
import feeApi, { type FeePaymentReversal } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { formatMoney } from '../utils/moneyUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ShieldAlert, RefreshCw, Clock } from 'lucide-react';

export const PaymentReversalsTab: React.FC = () => {
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.fees.reversalsLog(),
    queryFn: () => feeApi.getReversedPaymentsLog(),
  });

  const reversals = data?.items || [];
  const totalReversedAmount = reversals.reduce((acc, r) => acc + Number(r.reversedAmount || 0), 0);

  return (
    <div className="space-y-5">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-600" /> Reversed Payments & Audit Log
            </h2>
            <Badge variant="secondary" className="text-xs font-semibold">
              Immutable Financial Trail
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Audit cancelled receipts, bounced cheques, and restored invoice balances with authorizer sign-offs.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-8 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* 2. Summary KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="text-xs font-medium text-muted-foreground">Total Reversed Transactions</div>
            <div className="text-xl font-bold text-foreground mt-1">{reversals.length}</div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="text-xs font-medium text-muted-foreground">Total Reversed Amount</div>
            <div className="text-xl font-bold text-rose-600 mt-1">{formatMoney(totalReversedAmount)}</div>
            <div className="text-[11px] text-muted-foreground mt-1">Re-opened back into dues ledger</div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="text-xs font-medium text-muted-foreground">Integrity Protection</div>
            <div className="text-xs font-semibold text-emerald-700 mt-2 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 100% Parameterized Double-Entry Audit
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Reversals Table */}
      <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-bold">Reversal Voucher</TableHead>
              <TableHead className="text-xs font-bold">Original Payment</TableHead>
              <TableHead className="text-xs font-bold">Student</TableHead>
              <TableHead className="text-xs font-bold text-right">Reversed Amount</TableHead>
              <TableHead className="text-xs font-bold text-right">Penalty</TableHead>
              <TableHead className="text-xs font-bold">Reason & Justification</TableHead>
              <TableHead className="text-xs font-bold text-right">Authorized By</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                  Loading payment reversal audit logs...
                </TableCell>
              </TableRow>
            ) : reversals.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                  No payment reversals recorded. Zero financial clawbacks!
                </TableCell>
              </TableRow>
            ) : (
              reversals.map((r: FeePaymentReversal) => (
                <TableRow key={r.id} className="text-xs hover:bg-muted/30">
                  <TableCell className="py-2.5">
                    <div className="font-mono font-bold text-rose-700">{r.reversalReceiptNumber}</div>
                    <div className="text-[10px] text-muted-foreground">
                      {new Date(r.createdAt).toLocaleString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 font-mono text-[11px]">
                    {r.payment?.receiptNumber || 'N/A'}
                  </TableCell>
                  <TableCell className="py-2.5 font-semibold">
                    {r.payment?.student
                      ? `${r.payment.student.account?.firstName || ''} ${r.payment.student.account?.lastName || ''}`.trim()
                      : 'Student'}
                    <span className="block text-[10px] text-muted-foreground font-mono font-normal">
                      {r.payment?.student?.admissionNumber || ''}
                    </span>
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-bold text-rose-600">
                    {formatMoney(r.reversedAmount)}
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-medium text-slate-700">
                    {Number(r.bouncePenaltyAmount) > 0 ? formatMoney(r.bouncePenaltyAmount) : '—'}
                  </TableCell>
                  <TableCell className="py-2.5 max-w-[200px] truncate text-muted-foreground">
                    {r.reason}
                  </TableCell>
                  <TableCell className="py-2.5 text-right text-[11px] text-muted-foreground">
                    {r.authorizedBy ? `${r.authorizedBy.firstName} ${r.authorizedBy.lastName || ''}`.trim() : 'Admin'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default PaymentReversalsTab;

