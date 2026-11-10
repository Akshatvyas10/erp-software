import React from 'react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import feeApi from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { UserCheck } from 'lucide-react';

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
}) => {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.fees.studentLedger(studentId || ''),
    queryFn: () => feeApi.getStudentFeeLedger(studentId!),
    enabled: !!studentId && isOpen,
  });

  if (!studentId) return null;

  const student = data?.student;
  const summary = data?.summary;
  const invoices = data?.invoices || [];
  const payments = data?.payments || [];

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="sm:max-w-xl w-full overflow-y-auto">
        <SheetHeader className="pb-4 border-b">
          <SheetTitle className="flex items-center gap-2 text-lg font-bold">
            <UserCheck className="w-5 h-5 text-indigo-600" />
            Student Fee Ledger
          </SheetTitle>
          <SheetDescription>
            {student?.user ? `${student.user.firstName} ${student.user.lastName}` : 'Loading student profile...'}
            {student?.admissionNumber && ` • Adm: ${student.admissionNumber}`}
            {student?.classroom && ` • Class: ${student.classroom.name} (${student.classroom.section})`}
          </SheetDescription>
        </SheetHeader>

        {isLoading ? (
          <div className="py-8 space-y-4">
            <div className="h-20 bg-slate-100 rounded animate-pulse" />
            <div className="h-40 bg-slate-100 rounded animate-pulse" />
          </div>
        ) : (
          <div className="py-4 space-y-5">
            {/* Summary Highlights */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <Card className="border border-slate-200 p-3">
                <p className="text-[11px] font-medium text-slate-500 uppercase">Total Billed</p>
                <p className="text-base font-bold text-slate-900 mt-1">
                  ₹{Number(summary?.totalBilled || 0).toLocaleString('en-IN')}
                </p>
              </Card>

              <Card className="border border-slate-200 p-3 bg-emerald-50/50">
                <p className="text-[11px] font-medium text-emerald-700 uppercase">Total Paid</p>
                <p className="text-base font-bold text-emerald-700 mt-1">
                  ₹{Number(summary?.totalPaid || 0).toLocaleString('en-IN')}
                </p>
              </Card>

              <Card className="border border-slate-200 p-3 bg-amber-50/50">
                <p className="text-[11px] font-medium text-amber-700 uppercase">Net Balance</p>
                <p className="text-base font-bold text-amber-700 mt-1">
                  ₹{Number(summary?.outstandingBalance || 0).toLocaleString('en-IN')}
                </p>
              </Card>
            </div>

            {/* Invoices & Payments Tabs */}
            <Tabs defaultValue="invoices" className="w-full">
              <TabsList className="grid grid-cols-2 w-full">
                <TabsTrigger value="invoices">Invoices ({invoices.length})</TabsTrigger>
                <TabsTrigger value="payments">Receipts / Payments ({payments.length})</TabsTrigger>
              </TabsList>

              {/* Invoices Tab */}
              <TabsContent value="invoices" className="space-y-3 mt-4">
                {invoices.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No invoices issued for this student.</p>
                ) : (
                  invoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="border border-slate-200 rounded-lg p-3 text-xs space-y-2 bg-white hover:border-slate-300"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="font-mono font-semibold text-indigo-700">{inv.invoiceNumber}</span>
                          <h4 className="font-medium text-slate-900 mt-0.5">{inv.title}</h4>
                        </div>
                        <Badge
                          variant={
                            inv.status === 'PAID'
                              ? 'default'
                              : inv.status === 'PARTIALLY_PAID'
                              ? 'secondary'
                              : 'outline'
                          }
                          className="text-[10px]"
                        >
                          {inv.status}
                        </Badge>
                      </div>

                      <div className="flex justify-between text-slate-500 pt-1 border-t text-[11px]">
                        <span>Due: {inv.dueDate}</span>
                        <div className="space-x-2">
                          <span>Total: ₹{Number(inv.totalAmount).toLocaleString('en-IN')}</span>
                          <span className="font-semibold text-amber-700">
                            Bal: ₹{Number(inv.balanceAmount).toLocaleString('en-IN')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </TabsContent>

              {/* Payments Tab */}
              <TabsContent value="payments" className="space-y-3 mt-4">
                {payments.length === 0 ? (
                  <p className="text-xs text-slate-500 text-center py-6">No payment receipts recorded yet.</p>
                ) : (
                  payments.map((p) => (
                    <div
                      key={p.id}
                      className="border border-slate-200 rounded-lg p-3 text-xs space-y-2 bg-white"
                    >
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="font-mono font-bold text-emerald-700">{p.receiptNumber}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">Mode: {p.paymentMode}</div>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm text-slate-900">
                            ₹{Number(p.amount).toLocaleString('en-IN')}
                          </span>
                          <div className="text-[10px] text-slate-400">{p.paymentDate}</div>
                        </div>
                      </div>

                      {p.transactionReference && (
                        <div className="text-[11px] text-slate-500 bg-slate-50 p-1.5 rounded">
                          Ref: {p.transactionReference}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default StudentLedgerDrawer;
