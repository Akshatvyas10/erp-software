import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import feeApi, { type StudentInvoice } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { IndianRupee, Banknote, AlertTriangle, Layers } from 'lucide-react';
import { DatePicker } from '@/components/common/DatePicker';

const paymentFormSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'DEMAND_DRAFT', 'OTHER']),
  paymentDate: z.string().min(1, 'Date is required'),
  allocationStrategy: z.enum(['SELECTED_INVOICE', 'FIFO_AUTO']),
  transactionReference: z.string().optional(),
  upiId: z.string().optional(),
  payerName: z.string().optional(),
  chequeNumber: z.string().optional(),
  chequeDate: z.string().optional(),
  bankName: z.string().optional(),
  cardRef: z.string().optional(),
  cardLast4: z.string().optional(),
  authCode: z.string().optional(),
  notes: z.string().optional(),
  // Below-minimum exception
  isBelowMinimum: z.boolean(),
  belowMinimumReasonCode: z.string().optional(),
  belowMinimumReasonText: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface CollectPaymentDialogProps {
  invoice: StudentInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccessPayment?: (receiptId: string) => void;
  minimumAmount?: number;
}

export const CollectPaymentDialog: React.FC<CollectPaymentDialogProps> = ({
  invoice,
  isOpen,
  onClose,
  onSuccessPayment,
  minimumAmount = 500,
}) => {
  const queryClient = useQueryClient();

  const balance = Number(invoice?.balanceAmount || 0);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors },
  } = useForm<PaymentFormValues>({
    resolver: zodResolver(paymentFormSchema),
    defaultValues: {
      amount: balance,
      paymentMode: 'CASH',
      paymentDate: new Date().toISOString().split('T')[0],
      allocationStrategy: 'SELECTED_INVOICE',
      transactionReference: '',
      upiId: '',
      payerName: '',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      cardRef: '',
      cardLast4: '',
      authCode: '',
      notes: '',
      isBelowMinimum: false,
      belowMinimumReasonCode: '',
      belowMinimumReasonText: '',
    },
  });

  // Keep form amount synced when opening invoice
  React.useEffect(() => {
    if (invoice) {
      setValue('amount', Number(invoice.balanceAmount));
      setValue('paymentDate', new Date().toISOString().split('T')[0]);
    }
  }, [invoice, setValue]);

  const selectedMode = watch('paymentMode');
  const enteredAmount = Number(watch('amount') || 0);
  const selectedStrategy = watch('allocationStrategy');
  const belowMinReasonCode = watch('belowMinimumReasonCode');

  // Evaluate if amount is below minimum rule
  const isBelowMin = minimumAmount > 0 && enteredAmount > 0 && enteredAmount < minimumAmount;

  React.useEffect(() => {
    setValue('isBelowMinimum', isBelowMin);
  }, [isBelowMin, setValue]);

  const mutation = useMutation({
    mutationFn: (values: PaymentFormValues) => {
      if (!invoice) throw new Error('No invoice selected');
      return feeApi.collectPayment({
        invoiceId: invoice.id,
        amount: values.amount,
        paymentMode: values.paymentMode,
        paymentDate: values.paymentDate,
        allocationStrategy: values.allocationStrategy,
        transactionReference: values.transactionReference || undefined,
        upiId: values.upiId || undefined,
        payerName: values.payerName || undefined,
        chequeNumber: values.chequeNumber || undefined,
        chequeDate: values.chequeDate || undefined,
        bankName: values.bankName || undefined,
        cardRef: values.cardRef || undefined,
        cardLast4: values.cardLast4 || undefined,
        authCode: values.authCode || undefined,
        notes: values.notes || undefined,
        isBelowMinimum: values.isBelowMinimum,
        belowMinimumReasonCode: values.belowMinimumReasonCode || undefined,
        belowMinimumReasonText: values.belowMinimumReasonText || undefined,
      });
    },
    onSuccess: (payment) => {
      toast.success(`Payment of ₹${payment.amountPaid ?? payment.amount} recorded! Receipt: ${payment.receiptNumber}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.all });
      reset();
      onClose();
      if (onSuccessPayment) {
        onSuccessPayment(payment.id);
      }
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to record fee payment');
    },
  });

  const onSubmit = (values: PaymentFormValues) => {
    if (isBelowMin && !values.belowMinimumReasonCode) {
      toast.error(`Amount ₹${values.amount} is below the minimum required installment of ₹${minimumAmount}. A valid reason code must be specified.`);
      return;
    }
    mutation.mutate(values);
  };

  if (!invoice) return null;

  const studentUser = invoice.student?.user || invoice.student?.account;
  const studentName = studentUser
    ? `${studentUser.firstName || ''} ${studentUser.lastName || ''}`.trim()
    : 'Student';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-lg sm:text-xl font-bold flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              Collect Fee Payment
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {invoice.invoiceNumber}
            </Badge>
          </div>
          <DialogDescription className="text-slate-600 text-xs">
            Record a partial, installment, or full payment for {studentName} ({invoice.student?.admissionNumber})
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Summary Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs flex justify-between items-center my-1">
          <div>
            <p className="font-semibold text-slate-800 line-clamp-1">{invoice.title}</p>
            <p className="text-slate-500 mt-0.5">
              Class: {invoice.classroom ? `${invoice.classroom.name} (${invoice.classroom.section})` : 'All'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-slate-500">Current Due:</span>
            <div className="text-sm sm:text-base font-bold font-mono text-amber-700">₹{balance.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-3.5">
          {/* Allocation Strategy Selection */}
          <div>
            <Label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              Payment Allocation Rule
            </Label>
            <Select
              value={selectedStrategy}
              onValueChange={(val: any) => setValue('allocationStrategy', val)}
            >
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Select allocation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="SELECTED_INVOICE" className="text-xs">
                  Pay against this invoice only ({invoice.invoiceNumber})
                </SelectItem>
                <SelectItem value="FIFO_AUTO" className="text-xs">
                  Auto FIFO Allocation (Clear oldest overdue installments first)
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Amount & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="flex justify-between items-center">
                <Label className="text-xs font-semibold text-slate-700">Amount (₹) *</Label>
                {minimumAmount > 0 && (
                  <span className="text-[10px] text-slate-400">Min: ₹{minimumAmount}</span>
                )}
              </div>
              <div className="relative mt-1">
                <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="number"
                  step="any"
                  className="pl-9 font-semibold text-xs h-9"
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              {errors.amount && <p className="text-[11px] text-red-500 mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Payment Date *</Label>
              <div className="mt-1">
                <DatePicker
                  value={watch('paymentDate')}
                  onChange={(date) => setValue('paymentDate', date, { shouldValidate: true })}
                  placeholder="Select payment date"
                />
              </div>
              {errors.paymentDate && (
                <p className="text-[11px] text-red-500 mt-1">{errors.paymentDate.message}</p>
              )}
            </div>
          </div>

          {/* Below Minimum Rule Exception Warning & Reason Form */}
          {isBelowMin && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5 text-xs text-amber-900">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold">Below-Minimum Installment Warning</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Entered amount ₹{enteredAmount} is lower than standard policy minimum of ₹{minimumAmount}. An audit justification is required.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-200/60">
                <div>
                  <Label className="text-[11px] font-semibold text-amber-900">Exception Reason Code *</Label>
                  <Select
                    value={belowMinReasonCode}
                    onValueChange={(val: any) => setValue('belowMinimumReasonCode', val)}
                  >
                    <SelectTrigger className="mt-1 h-8 text-[11px] bg-white border-amber-300">
                      <SelectValue placeholder="Select reason" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="FINANCIAL_HARDSHIP" className="text-xs">Financial Hardship</SelectItem>
                      <SelectItem value="MANAGEMENT_APPROVAL" className="text-xs">Principal / Management Approval</SelectItem>
                      <SelectItem value="STAFF_CONCESSION" className="text-xs">Staff Concession / Token Payment</SelectItem>
                      <SelectItem value="SYSTEM_ADJUSTMENT" className="text-xs">Installment Adjustment</SelectItem>
                      <SelectItem value="OTHER" className="text-xs">Other Special Reason</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-[11px] font-semibold text-amber-900">Remarks / Approval Ref</Label>
                  <Input
                    placeholder="e.g. Approved by Director via note #42"
                    className="mt-1 h-8 text-xs bg-white border-amber-300"
                    {...register('belowMinimumReasonText')}
                  />
                </div>
              </div>
            </div>
          )}

          {/* Payment Tender / Mode */}
          <div>
            <Label className="text-xs font-semibold text-slate-700">Payment Tender / Mode *</Label>
            <Select
              value={selectedMode}
              onValueChange={(val: any) => setValue('paymentMode', val)}
            >
              <SelectTrigger className="mt-1 h-9 text-xs">
                <SelectValue placeholder="Select mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash Counter</SelectItem>
                <SelectItem value="UPI">UPI / QR Code</SelectItem>
                <SelectItem value="BANK_TRANSFER">Bank IMPS / NEFT / RTGS</SelectItem>
                <SelectItem value="CHEQUE">Bank Cheque</SelectItem>
                <SelectItem value="CARD">POS Debit / Credit Card</SelectItem>
                <SelectItem value="DEMAND_DRAFT">Demand Draft (DD)</SelectItem>
                <SelectItem value="OTHER">Other / Voucher</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Conditional Fields based on Payment Mode */}
          {selectedMode === 'UPI' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-indigo-50/50 border border-indigo-100 rounded-lg">
              <div>
                <Label className="text-xs font-semibold text-slate-700">UPI Ref / UTR No. *</Label>
                <Input
                  placeholder="e.g. 432109876543"
                  className="mt-1 bg-white font-mono text-xs h-8"
                  {...register('transactionReference')}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">UPI ID / Number (Optional)</Label>
                <Input
                  placeholder="e.g. mobile@upi"
                  className="mt-1 bg-white text-xs h-8"
                  {...register('upiId')}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs font-semibold text-slate-700">Payer Name (Optional)</Label>
                <Input
                  placeholder="e.g. Rajesh Kumar"
                  className="mt-1 bg-white text-xs h-8"
                  {...register('payerName')}
                />
              </div>
            </div>
          )}

          {selectedMode === 'BANK_TRANSFER' && (
            <div className="grid grid-cols-2 gap-3 p-3 bg-sky-50/50 border border-sky-100 rounded-lg">
              <div>
                <Label className="text-xs font-semibold text-slate-700">IMPS / NEFT / UTR Ref *</Label>
                <Input
                  placeholder="e.g. SBIN12345678"
                  className="mt-1 bg-white font-mono text-xs h-8"
                  {...register('transactionReference')}
                />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Remitter Bank Name</Label>
                <Input
                  placeholder="e.g. State Bank of India"
                  className="mt-1 bg-white text-xs h-8"
                  {...register('bankName')}
                />
              </div>
            </div>
          )}

          {['CHEQUE', 'DEMAND_DRAFT'].includes(selectedMode) && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-amber-50/50 border border-amber-100 rounded-lg">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Cheque / DD No. *</Label>
                <Input placeholder="123456" className="mt-1 bg-white font-mono text-xs h-8" {...register('chequeNumber')} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Cheque / DD Date</Label>
                <div className="mt-1">
                  <DatePicker
                    value={watch('chequeDate')}
                    onChange={(date) => setValue('chequeDate', date)}
                    placeholder="Select cheque date"
                    className="h-8"
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Bank Name</Label>
                <Input placeholder="e.g. HDFC Bank" className="mt-1 bg-white text-xs h-8" {...register('bankName')} />
              </div>
            </div>
          )}

          {selectedMode === 'CARD' && (
            <div className="grid grid-cols-3 gap-2 p-3 bg-purple-50/50 border border-purple-100 rounded-lg">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Txn / RRN Ref</Label>
                <Input placeholder="e.g. 9876543210" className="mt-1 bg-white font-mono text-xs h-8" {...register('transactionReference')} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Card Last 4 Digits</Label>
                <Input placeholder="4321" maxLength={4} className="mt-1 bg-white font-mono text-xs h-8" {...register('cardLast4')} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Auth Code</Label>
                <Input placeholder="e.g. 543210" className="mt-1 bg-white text-xs h-8" {...register('authCode')} />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-700">Receipt Remarks / Notes</Label>
            <Textarea
              placeholder="e.g. Term installment 2, paid cash at desk"
              rows={2}
              className="mt-1 text-xs"
              {...register('notes')}
            />
          </div>

          {/* Remaining Balance or Advance Credit Preview */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex justify-between items-center text-xs">
            <span className="text-slate-600">
              {enteredAmount > balance ? 'Advance credit to next cycle:' : 'Remaining balance after payment:'}
            </span>
            <span className={`font-bold font-mono ${enteredAmount > balance ? 'text-indigo-700' : 'text-emerald-700'}`}>
              ₹{enteredAmount > balance
                ? (enteredAmount - balance).toLocaleString('en-IN')
                : Math.max(0, balance - enteredAmount).toLocaleString('en-IN')}
            </span>
          </div>

          <DialogFooter className="pt-2 border-t border-border flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-xl text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              className="rounded-xl text-xs font-bold shadow-xs gap-1.5"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Processing...' : 'Confirm & Generate Receipt'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CollectPaymentDialog;
