import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import feeApi from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { Printer, CheckCircle2 } from 'lucide-react';
import type { StudentInvoiceItem } from '../api/feeApi';

interface PrintReceiptModalProps {
  receiptId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  receiptId,
  isOpen,
  onClose,
}) => {
  const printRef = useRef<HTMLDivElement>(null);

  const { data: receipt, isLoading } = useQuery({
    queryKey: queryKeys.fees.receiptDetail(receiptId || ''),
    queryFn: () => feeApi.getReceiptById(receiptId!),
    enabled: !!receiptId && isOpen,
  });

  const handlePrint = () => {
    window.print();
  };

  if (!receiptId) return null;

  const invoice = receipt?.invoice;
  const student = invoice?.student;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Official Fee Receipt Voucher
          </DialogTitle>
        </DialogHeader>

        {isLoading ? (
          <div className="py-12 text-center text-xs text-slate-500">Loading receipt details...</div>
        ) : receipt ? (
          <div>
            {/* Printable Voucher Card */}
            <div
              ref={printRef}
              className="border-2 border-slate-300 rounded-lg p-6 bg-white text-slate-900 space-y-4 print:border-none print:p-0"
            >
              {/* Receipt Header */}
              <div className="flex justify-between items-start border-b pb-4">
                <div>
                  <h2 className="text-xl font-bold tracking-tight text-slate-900">ACADEMIA MODERN SCHOOL</h2>
                  <p className="text-xs text-slate-500">Affiliation No. 123456 • Central Board of Secondary Education</p>
                  <p className="text-xs text-slate-500">Sector 12, Institutional Area, New Delhi - 110001</p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-1 rounded">
                    Payment Receipt
                  </span>
                  <div className="font-mono text-sm font-bold text-slate-900 mt-2">{receipt.receiptNumber}</div>
                  <div className="text-xs text-slate-500">Date: {receipt.paymentDate}</div>
                </div>
              </div>

              {/* Student & Invoice Meta */}
              <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-3 rounded">
                <div>
                  <p className="text-slate-500">Student Name:</p>
                  <p className="font-bold text-slate-800">
                    {student?.user ? `${student.user.firstName} ${student.user.lastName}` : 'Student'}
                  </p>
                  <p className="text-slate-500 mt-1">Admission No: <span className="font-medium text-slate-700">{student?.admissionNumber}</span></p>
                  <p className="text-slate-500">Class: <span className="font-medium text-slate-700">{invoice?.classroom?.name || '—'}</span></p>
                </div>
                <div>
                  <p className="text-slate-500">Invoice Number: <span className="font-mono font-medium text-slate-700">{invoice?.invoiceNumber}</span></p>
                  <p className="text-slate-500">Payment Mode: <span className="font-semibold text-slate-800">{receipt.paymentMode}</span></p>
                  {receipt.transactionReference && (
                    <p className="text-slate-500">Ref / Txn ID: <span className="font-mono text-slate-700">{receipt.transactionReference}</span></p>
                  )}
                  <p className="text-slate-500 mt-1">Cashier / Staff: <span className="text-slate-700">{receipt.collectedBy?.firstName} {receipt.collectedBy?.lastName}</span></p>
                </div>
              </div>

              {/* Invoice Breakdown */}
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-100 border-b">
                  <tr>
                    <th className="p-2 text-left font-semibold">Fee Head / Description</th>
                    <th className="p-2 text-right font-semibold">Amount (₹)</th>
                  </tr>
                </thead>
                <tbody>
                  {invoice?.items?.map((it: StudentInvoiceItem, idx: number) => (
                    <tr key={idx} className="border-b">
                      <td className="p-2">{it.title}</td>
                      <td className="p-2 text-right">₹{Number(it.netAmount).toLocaleString('en-IN')}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="p-2 text-right">Invoice Total Billed:</td>
                    <td className="p-2 text-right">₹{Number(invoice?.totalAmount).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-800 font-bold text-sm">
                    <td className="p-2 text-right">Amount Received:</td>
                    <td className="p-2 text-right">₹{Number(receipt.amount).toLocaleString('en-IN')}</td>
                  </tr>
                  <tr className="bg-amber-50 text-amber-800 font-medium">
                    <td className="p-2 text-right">Remaining Balance:</td>
                    <td className="p-2 text-right">₹{Number(invoice?.balanceAmount).toLocaleString('en-IN')}</td>
                  </tr>
                </tbody>
              </table>

              {/* Footer Stamp & Sign */}
              <div className="flex justify-between items-end pt-8 text-xs text-slate-500">
                <div>
                  <p className="italic">* Computer generated fee receipt. No physical signature required.</p>
                </div>
                <div className="text-center">
                  <div className="h-10 w-32 border-b border-dashed border-slate-400 mb-1 mx-auto" />
                  <p className="font-semibold text-slate-700">Accounts Department</p>
                </div>
              </div>
            </div>

            <DialogFooter className="mt-4">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button className="bg-slate-900 hover:bg-slate-800 text-white gap-1" onClick={handlePrint}>
                <Printer className="w-4 h-4" /> Print Receipt
              </Button>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PrintReceiptModal;
