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
import { IndianRupee, Banknote } from 'lucide-react';

const paymentFormSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  paymentMode: z.enum(['CASH', 'UPI', 'BANK_TRANSFER', 'CHEQUE', 'CARD', 'DEMAND_DRAFT', 'OTHER']),
  paymentDate: z.string().min(1, 'Date is required'),
  transactionReference: z.string().optional(),
  chequeNumber: z.string().optional(),
  chequeDate: z.string().optional(),
  bankName: z.string().optional(),
  notes: z.string().optional(),
});

type PaymentFormValues = z.infer<typeof paymentFormSchema>;

interface CollectPaymentDialogProps {
  invoice: StudentInvoice | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccessPayment?: (receiptId: string) => void;
}

export const CollectPaymentDialog: React.FC<CollectPaymentDialogProps> = ({
  invoice,
  isOpen,
  onClose,
  onSuccessPayment,
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
      transactionReference: '',
      chequeNumber: '',
      chequeDate: '',
      bankName: '',
      notes: '',
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
  const enteredAmount = watch('amount');

  const mutation = useMutation({
    mutationFn: (values: PaymentFormValues) => {
      if (!invoice) throw new Error('No invoice selected');
      return feeApi.collectPayment({
        invoiceId: invoice.id,
        amount: values.amount,
        paymentMode: values.paymentMode,
        paymentDate: values.paymentDate,
        transactionReference: values.transactionReference || undefined,
        chequeNumber: values.chequeNumber || undefined,
        chequeDate: values.chequeDate || undefined,
        bankName: values.bankName || undefined,
        notes: values.notes || undefined,
      });
    },
    onSuccess: (payment) => {
      toast.success(`Payment of ₹${payment.amount} recorded! Receipt: ${payment.receiptNumber}`);
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
    if (values.amount > balance) {
      toast.error(`Entered amount ₹${values.amount} exceeds outstanding balance ₹${balance}`);
      return;
    }
    mutation.mutate(values);
  };

  if (!invoice) return null;

  const studentName = invoice.student?.user
    ? `${invoice.student.user.firstName} ${invoice.student.user.lastName}`
    : 'Unknown Student';

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center justify-between pr-6">
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Banknote className="w-5 h-5 text-emerald-600" />
              Collect Fee Payment
            </DialogTitle>
            <Badge variant="outline" className="font-mono text-xs">
              {invoice.invoiceNumber}
            </Badge>
          </div>
          <DialogDescription className="text-slate-600">
            Record a cash, UPI or bank receipt for {studentName} ({invoice.student?.admissionNumber})
          </DialogDescription>
        </DialogHeader>

        {/* Invoice Summary Box */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-sm flex justify-between items-center my-2">
          <div>
            <p className="text-xs text-slate-500 font-medium">Invoice: {invoice.title}</p>
            <p className="text-xs text-slate-500">
              Class: {invoice.classroom ? `${invoice.classroom.name} (Grade ${invoice.classroom.grade})` : 'All'}
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-500">Pending Dues:</span>
            <div className="text-base font-bold text-amber-700">₹{balance.toLocaleString('en-IN')}</div>
          </div>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Payment Amount (₹) *</Label>
              <div className="relative mt-1">
                <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <Input
                  type="number"
                  step="any"
                  className="pl-9 font-semibold"
                  {...register('amount', { valueAsNumber: true })}
                />
              </div>
              {errors.amount && <p className="text-xs text-red-500 mt-1">{errors.amount.message}</p>}
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Payment Date *</Label>
              <Input type="date" className="mt-1" {...register('paymentDate')} />
              {errors.paymentDate && (
                <p className="text-xs text-red-500 mt-1">{errors.paymentDate.message}</p>
              )}
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Payment Tender / Mode *</Label>
            <Select
              value={selectedMode}
              onValueChange={(val: any) => setValue('paymentMode', val)}
            >
              <SelectTrigger className="mt-1">
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
          {['UPI', 'BANK_TRANSFER', 'CARD'].includes(selectedMode) && (
            <div>
              <Label className="text-xs font-semibold text-slate-700">Transaction UTR / Ref Number</Label>
              <Input
                placeholder="e.g. UPI Ref / UTR / Txn ID"
                className="mt-1"
                {...register('transactionReference')}
              />
            </div>
          )}

          {['CHEQUE', 'DEMAND_DRAFT'].includes(selectedMode) && (
            <div className="grid grid-cols-3 gap-2">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Cheque / DD No.</Label>
                <Input placeholder="123456" className="mt-1" {...register('chequeNumber')} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Cheque Date</Label>
                <Input type="date" className="mt-1" {...register('chequeDate')} />
              </div>
              <div>
                <Label className="text-xs font-semibold text-slate-700">Bank Name</Label>
                <Input placeholder="e.g. SBI" className="mt-1" {...register('bankName')} />
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-700">Receipt Remarks / Notes</Label>
            <Textarea
              placeholder="e.g. Received from Father, Term-1 partial payment"
              rows={2}
              className="mt-1 text-xs"
              {...register('notes')}
            />
          </div>

          {/* Remaining Balance Preview */}
          <div className="p-2.5 rounded bg-emerald-50 border border-emerald-100 flex justify-between items-center text-xs text-emerald-800">
            <span>Remaining balance after payment:</span>
            <span className="font-bold">
              ₹{Math.max(0, balance - (Number(enteredAmount) || 0)).toLocaleString('en-IN')}
            </span>
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
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
