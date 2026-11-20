import React, { useRef, useState } from 'react';
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
import { Printer, CheckCircle2, Download, FileText } from 'lucide-react';
import type { StudentInvoiceItem } from '../api/feeApi';
import { formatMoney, toMoney } from '../utils/moneyUtils';
import { toast } from 'sonner';

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
  const [downloadingFormat, setDownloadingFormat] = useState<'A4' | '80mm' | null>(null);

  const { data: receipt, isLoading } = useQuery({
    queryKey: queryKeys.fees.receiptDetail(receiptId || ''),
    queryFn: () => feeApi.getReceiptById(receiptId!),
    enabled: !!receiptId && isOpen,
  });

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async (format: 'A4' | '80mm') => {
    if (!receiptId) return;
    try {
      setDownloadingFormat(format);
      const blob = await feeApi.downloadReceiptPdf(receiptId, format);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Receipt_${receipt?.receiptNumber || receiptId}_${format}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success(`${format === '80mm' ? '80mm POS Thermal' : 'A4 Voucher'} PDF generated successfully`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to generate receipt PDF');
    } finally {
      setDownloadingFormat(null);
    }
  };

  if (!receiptId) return null;

  const invoice = receipt?.invoice;
  const student = invoice?.student;
  const paidAmount = toMoney(receipt?.amountPaid ?? receipt?.amount);
  const totalBilled = toMoney(invoice?.totalAmount);
  const balanceRemaining = toMoney(invoice?.balanceAmount);

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
                    {student?.user
                      ? `${student.user.firstName} ${student.user.lastName}`
                      : student?.account
                      ? `${student.account.firstName} ${student.account.lastName}`
                      : 'Student'}
                  </p>
                  <p className="text-slate-500 mt-1">Admission No: <span className="font-medium text-slate-700">{student?.admissionNumber || '—'}</span></p>
                  <p className="text-slate-500">Class: <span className="font-medium text-slate-700">{invoice?.classroom?.name || '—'}</span></p>
                </div>
                <div>
                  <p className="text-slate-500">Invoice Number: <span className="font-mono font-medium text-slate-700">{invoice?.invoiceNumber || '—'}</span></p>
                  <p className="text-slate-500">Payment Mode: <span className="font-semibold text-slate-800">{receipt.paymentMode}</span></p>
                  
                  {/* Mode-specific receipt details */}
                  {receipt.paymentDetails?.upiId && (
                    <p className="text-slate-500">UPI ID: <span className="font-mono text-slate-700">{receipt.paymentDetails.upiId}</span></p>
                  )}
                  {(receipt.referenceNumber || receipt.transactionReference || receipt.paymentDetails?.transactionReference) && (
                    <p className="text-slate-500">Ref / UTR / Txn ID: <span className="font-mono text-slate-700">{receipt.referenceNumber || receipt.transactionReference || receipt.paymentDetails?.transactionReference}</span></p>
                  )}
                  {(receipt.chequeNumber || receipt.paymentDetails?.chequeNumber) && (
                    <p className="text-slate-500">Cheque/DD No: <span className="font-mono text-slate-700">{receipt.chequeNumber || receipt.paymentDetails?.chequeNumber}</span></p>
                  )}
                  {(receipt.bankName || receipt.paymentDetails?.chequeBank || receipt.paymentDetails?.bankName) && (
                    <p className="text-slate-500">Bank: <span className="text-slate-700">{receipt.bankName || receipt.paymentDetails?.chequeBank || receipt.paymentDetails?.bankName}</span></p>
                  )}
                  {(receipt.chequeDate || receipt.paymentDetails?.chequeDate) && (
                    <p className="text-slate-500">Cheque Date: <span className="text-slate-700">{receipt.chequeDate || receipt.paymentDetails?.chequeDate}</span></p>
                  )}
                  {receipt.paymentDetails?.cardLast4 && (
                    <p className="text-slate-500">Card: <span className="font-mono text-slate-700">•••• {receipt.paymentDetails.cardLast4}</span></p>
                  )}
                  {receipt.paymentDetails?.payerName && (
                    <p className="text-slate-500">Payer Name: <span className="text-slate-700">{receipt.paymentDetails.payerName}</span></p>
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
                  {(invoice?.items && invoice.items.length > 0) ? (
                    invoice.items.map((it: StudentInvoiceItem, idx: number) => {
                      const itemName = it.headName || it.title || it.feeHead?.name || 'Fee Item';
                      const itemAmount = toMoney(it.amount ?? it.netAmount);
                      return (
                        <tr key={idx} className="border-b">
                          <td className="p-2">{itemName}</td>
                          <td className="p-2 text-right">{formatMoney(itemAmount)}</td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr className="border-b">
                      <td className="p-2">{invoice?.title || 'Consolidated Tuition & School Fees'}</td>
                      <td className="p-2 text-right">{formatMoney(totalBilled)}</td>
                    </tr>
                  )}
                  <tr className="bg-slate-50 font-semibold">
                    <td className="p-2 text-right">Invoice Total Billed:</td>
                    <td className="p-2 text-right">{formatMoney(totalBilled)}</td>
                  </tr>
                  <tr className="bg-emerald-50 text-emerald-800 font-bold text-sm">
                    <td className="p-2 text-right">Amount Received:</td>
                    <td className="p-2 text-right">{formatMoney(paidAmount)}</td>
                  </tr>
                  <tr className="bg-amber-50 text-amber-800 font-medium">
                    <td className="p-2 text-right">Remaining Balance:</td>
                    <td className="p-2 text-right">{formatMoney(balanceRemaining)}</td>
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

            <DialogFooter className="mt-4 pt-3 border-t border-border flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPdf('A4')}
                  disabled={downloadingFormat !== null}
                  className="rounded-xl text-xs font-semibold gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-primary" />
                  {downloadingFormat === 'A4' ? 'Generating A4...' : 'A4 PDF Voucher'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownloadPdf('80mm')}
                  disabled={downloadingFormat !== null}
                  className="rounded-xl text-xs font-semibold gap-1.5"
                >
                  <Download className="w-3.5 h-3.5 text-primary" />
                  {downloadingFormat === '80mm' ? 'Generating 80mm...' : '80mm Thermal POS'}
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-semibold">
                  Close
                </Button>
                <Button size="sm" className="rounded-xl text-xs font-bold gap-1 shadow-xs" onClick={handlePrint}>
                  <Printer className="w-4 h-4" /> Print Receipt
                </Button>
              </div>
            </DialogFooter>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

export default PrintReceiptModal;
