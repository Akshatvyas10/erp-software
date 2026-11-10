import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
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
import { Receipt, CheckCircle2, Clock, Printer, IndianRupee } from 'lucide-react';
import PrintReceiptModal from '@/features/fees/components/PrintReceiptModal';

export default function StudentFeesPage() {
  const [printReceiptId, setPrintReceiptId] = useState<string | null>(null);

  // 1. Fetch own student invoices (IDOR safe: backend filters by req.user.studentProfile.id)
  const { data: invoicesData, isLoading: isInvoicesLoading } = useQuery({
    queryKey: ['portal', 'student', 'fees', 'invoices'],
    queryFn: async () => {
      const res = await api.get('/fees/invoices');
      return res.data.data || [];
    },
  });

  const invoices = Array.isArray(invoicesData) ? invoicesData : invoicesData?.items || [];

  // Summary Totals
  const totalBilled = invoices
    .filter((inv: any) => inv.status !== 'CANCELLED')
    .reduce((sum: number, inv: any) => sum + Number(inv.totalAmount || 0), 0);

  const totalPaid = invoices
    .filter((inv: any) => inv.status !== 'CANCELLED')
    .reduce((sum: number, inv: any) => sum + Number(inv.paidAmount || 0), 0);

  const outstandingBalance = Math.max(0, totalBilled - totalPaid);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PAID':
        return <Badge className="bg-emerald-600 text-white font-medium">PAID</Badge>;
      case 'PARTIALLY_PAID':
        return <Badge className="bg-amber-500 text-white font-medium">PARTIAL</Badge>;
      case 'ISSUED':
        return <Badge className="bg-blue-600 text-white font-medium">PENDING</Badge>;
      case 'DRAFT':
        return <Badge variant="secondary">DRAFT</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">CANCELLED</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
          <Receipt className="w-6 h-6 text-indigo-600" />
          My School Fees & Receipts
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
          View your issued tuition fees, balance dues, payment records, and download official fee receipts.
        </p>
      </div>

      {/* KPI Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">Total Billed</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">₹{totalBilled.toLocaleString('en-IN')}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <IndianRupee className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-emerald-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-emerald-700 uppercase tracking-wider">Total Paid</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1">₹{totalPaid.toLocaleString('en-IN')}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-amber-50/30">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wider">Outstanding Dues</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1">₹{outstandingBalance.toLocaleString('en-IN')}</h3>
            </div>
            <div className="h-10 w-10 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-800">Fee Invoices & Breakdown</h3>

        {isInvoicesLoading ? (
          <div className="rounded-lg border border-slate-200 p-8 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-slate-100 rounded animate-pulse" />
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-300 p-12 text-center bg-white">
            <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-semibold text-slate-700">No invoices issued</h4>
            <p className="text-xs text-slate-500 mt-1">
              You currently have no pending or past fee invoices registered in the system.
            </p>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 overflow-hidden shadow-sm bg-white">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="text-xs font-semibold">Invoice No.</TableHead>
                  <TableHead className="text-xs font-semibold">Description</TableHead>
                  <TableHead className="text-xs font-semibold">Due Date</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Billed (₹)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Paid (₹)</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Balance (₹)</TableHead>
                  <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                  <TableHead className="text-xs font-semibold text-right">Receipts</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((inv: any) => (
                  <TableRow key={inv.id} className="text-xs">
                    <TableCell className="font-mono font-bold text-indigo-700">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-slate-900">{inv.title}</div>
                      {inv.description && <div className="text-[11px] text-slate-500">{inv.description}</div>}
                    </TableCell>
                    <TableCell className="text-slate-600">{inv.dueDate}</TableCell>
                    <TableCell className="text-right font-medium text-slate-800">
                      ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-medium text-emerald-600">
                      ₹{Number(inv.paidAmount).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-right font-bold text-amber-700">
                      ₹{Number(inv.balanceAmount).toLocaleString('en-IN')}
                    </TableCell>
                    <TableCell className="text-center">{getStatusBadge(inv.status)}</TableCell>
                    <TableCell className="text-right">
                      {inv.payments && inv.payments.length > 0 ? (
                        <div className="flex flex-col items-end gap-1">
                          {inv.payments.map((p: any) => (
                            <Button
                              key={p.id}
                              variant="outline"
                              size="sm"
                              className="h-6 text-[10px] gap-1 px-2 border-slate-300"
                              onClick={() => setPrintReceiptId(p.id)}
                            >
                              <Printer className="w-3 h-3 text-slate-500" />
                              {p.receiptNumber}
                            </Button>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-400">—</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
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
