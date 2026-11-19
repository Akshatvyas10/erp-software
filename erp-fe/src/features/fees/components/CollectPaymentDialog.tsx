import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ResponsiveModal } from '@/components/common/ResponsiveModal';
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
import type { AxiosError } from 'axios';
import feeApi, { type StudentInvoice } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import {
  IndianRupee,
  AlertTriangle,
  Layers,
  CreditCard,
  QrCode,
  Building2,
  FileCheck2,
  Sparkles,
} from 'lucide-react';
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
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err?.response?.data?.message || 'Failed to record fee payment');
    },
  });

  const onSubmit = (values: PaymentFormValues) => {
    mutation.mutate(values);
  };

  if (!invoice) return null;

  const studentUser = invoice.student?.user || invoice.student?.account;
  const studentName = studentUser
    ? `${studentUser.firstName || ''} ${studentUser.lastName || ''}`.trim()
    : 'Student';

  const modes: Array<{ id: PaymentFormValues['paymentMode']; label: string; icon: React.ElementType }> = [
    { id: 'CASH', label: 'Cash', icon: IndianRupee },
    { id: 'UPI', label: 'UPI / QR', icon: QrCode },
    { id: 'CARD', label: 'Card POS', icon: CreditCard },
    { id: 'CHEQUE', label: 'Cheque', icon: FileCheck2 },
    { id: 'BANK_TRANSFER', label: 'Bank Transfer', icon: Building2 },
  ];

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={(open) => !open && onClose()}
      maxWidth="sm:max-w-xl"
      title={
        <div className="flex items-center justify-between w-full pr-2">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-foreground">Collect Fee Payment</h3>
              <p className="text-xs text-muted-foreground font-normal">
                {studentName} • Adm: {invoice.student?.admissionNumber || '—'}
              </p>
            </div>
          </div>
          <Badge variant="outline" className="font-mono text-[11px] rounded-lg">
            {invoice.invoiceNumber}
          </Badge>
        </div>
      }
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <div className="text-left hidden sm:block">
            <span className="text-[11px] text-muted-foreground block">Net to Collect</span>
            <span className="font-mono font-bold text-sm text-foreground">₹{enteredAmount.toLocaleString('en-IN')}</span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={mutation.isPending}
              className="rounded-xl text-xs font-semibold flex-1 sm:flex-initial"
            >
              Cancel
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleSubmit(onSubmit)}
              className="rounded-xl text-xs font-bold shadow-xs gap-1.5 flex-1 sm:flex-initial"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Processing...' : 'Confirm & Receipt'}
            </Button>
          </div>
        </div>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
        {/* Compact Student & Invoice Financial Summary Card */}
        <div className="p-3 bg-muted/40 border border-border/80 rounded-xl space-y-2">
          <div className="flex justify-between items-start text-xs">
            <div>
              <span className="font-semibold text-foreground line-clamp-1">{invoice.title}</span>
              <span className="text-muted-foreground text-[11px]">
                Class: {invoice.classroom ? `${invoice.classroom.name} (${invoice.classroom.section})` : 'All'} • Due: {invoice.dueDate}
              </span>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground block">Current Due</span>
              <span className="text-base font-bold font-mono text-amber-700 dark:text-amber-400">
                ₹{balance.toLocaleString('en-IN')}
              </span>
            </div>
          </div>

          {/* Quick Preset Amount Buttons */}
          <div className="flex items-center gap-1.5 pt-1 border-t border-border/60">
            <span className="text-[11px] text-muted-foreground mr-1">Presets:</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-6 text-[11px] rounded-lg px-2 font-medium bg-background"
              onClick={() => setValue('amount', balance, { shouldValidate: true })}
            >
              Full (₹{balance.toLocaleString('en-IN')})
            </Button>
            {balance > 2000 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[11px] rounded-lg px-2 font-medium bg-background"
                onClick={() => setValue('amount', Math.round(balance / 2), { shouldValidate: true })}
              >
                Half (₹{Math.round(balance / 2).toLocaleString('en-IN')})
              </Button>
            )}
            {minimumAmount > 0 && balance > minimumAmount && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-6 text-[11px] rounded-lg px-2 font-medium bg-background"
                onClick={() => setValue('amount', minimumAmount, { shouldValidate: true })}
              >
                Min (₹{minimumAmount})
              </Button>
            )}
          </div>
        </div>

        {/* Amount & Date Row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <div className="flex justify-between items-center mb-1">
              <Label className="text-xs font-semibold text-foreground">Amount to Tender (₹) *</Label>
              {minimumAmount > 0 && (
                <span className="text-[10px] text-muted-foreground">Min limit: ₹{minimumAmount}</span>
              )}
            </div>
            <div className="relative">
              <IndianRupee className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
              <Input
                type="number"
                step="any"
                className="pl-9 font-mono font-bold text-sm h-9 rounded-xl"
                {...register('amount', { valueAsNumber: true })}
              />
            </div>
            {errors.amount && <p className="text-[11px] text-destructive mt-1">{errors.amount.message}</p>}
          </div>

          <div>
            <Label className="text-xs font-semibold text-foreground mb-1 block">Collection Date *</Label>
            <DatePicker
              value={watch('paymentDate')}
              onChange={(date) => setValue('paymentDate', date, { shouldValidate: true })}
              placeholder="Select payment date"
              className="h-9 rounded-xl text-xs"
            />
            {errors.paymentDate && (
              <p className="text-[11px] text-destructive mt-1">{errors.paymentDate.message}</p>
            )}
          </div>
        </div>

        {/* Payment Tender Selection - Segmented Style */}
        <div>
          <Label className="text-xs font-semibold text-foreground mb-1.5 block">Payment Tender Mode *</Label>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-1.5">
            {modes.map((m) => {
              const Icon = m.icon;
              const isSelected = selectedMode === m.id;
              return (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setValue('paymentMode', m.id)}
                  className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs transition-all ${
                    isSelected
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/50'
                  }`}
                >
                  <Icon className="w-4 h-4 mb-1" />
                  <span className="text-[11px]">{m.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Allocation Strategy Dropdown */}
        <div>
          <Label className="text-xs font-semibold text-foreground flex items-center gap-1.5 mb-1">
            <Layers className="w-3.5 h-3.5 text-primary" />
            Allocation Strategy
          </Label>
          <Select
            value={selectedStrategy}
            onValueChange={(val: 'SELECTED_INVOICE' | 'FIFO_AUTO') => setValue('allocationStrategy', val)}
          >
            <SelectTrigger className="h-9 text-xs rounded-xl">
              <SelectValue placeholder="Select allocation rule" />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="SELECTED_INVOICE" className="text-xs">
                Apply to this invoice only ({invoice.invoiceNumber})
              </SelectItem>
              <SelectItem value="FIFO_AUTO" className="text-xs">
                FIFO Cascade (Clears oldest unpaid arrears first)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Below Minimum Rule Exception Warning & Reason Form */}
        {isBelowMin && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl space-y-2 text-xs text-amber-900 dark:text-amber-200">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Below-Minimum Installment Warning</span>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Tender amount ₹{enteredAmount} is lower than standard threshold of ₹{minimumAmount}. Please provide audit concession details.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-amber-500/20">
              <div>
                <Label className="text-[11px] font-semibold">Concession Code *</Label>
                <Select
                  value={belowMinReasonCode}
                  onValueChange={(val: string) => setValue('belowMinimumReasonCode', val)}
                >
                  <SelectTrigger className="mt-1 h-8 text-[11px] bg-background rounded-lg border-amber-500/30">
                    <SelectValue placeholder="Select reason" />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="FINANCIAL_HARDSHIP" className="text-xs">Financial Hardship</SelectItem>
                    <SelectItem value="MANAGEMENT_APPROVAL" className="text-xs">Principal / Director Note</SelectItem>
                    <SelectItem value="STAFF_CONCESSION" className="text-xs">Staff Concession / Token</SelectItem>
                    <SelectItem value="SYSTEM_ADJUSTMENT" className="text-xs">Installment Adjustment</SelectItem>
                    <SelectItem value="OTHER" className="text-xs">Other Special Reason</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-[11px] font-semibold">Approval Reference</Label>
                <Input
                  placeholder="e.g. Note signed by Principal"
                  className="mt-1 h-8 text-xs bg-background rounded-lg border-amber-500/30"
                  {...register('belowMinimumReasonText')}
                />
              </div>
            </div>
          </div>
        )}

        {/* Mode Dependent Fields with Progressive Disclosure */}
        {selectedMode === 'UPI' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-muted/30 border border-border/80 rounded-xl">
            <div>
              <Label className="text-xs font-semibold text-foreground">UPI Ref / UTR No. *</Label>
              <Input
                placeholder="e.g. 432109876543"
                className="mt-1 font-mono text-xs h-8 rounded-lg"
                {...register('transactionReference')}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground">UPI ID / Mobile</Label>
              <Input
                placeholder="e.g. parent@upi"
                className="mt-1 text-xs h-8 rounded-lg"
                {...register('upiId')}
              />
            </div>
          </div>
        )}

        {selectedMode === 'CARD' && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-muted/30 border border-border/80 rounded-xl">
            <div>
              <Label className="text-xs font-semibold text-foreground">Txn / RRN Ref</Label>
              <Input placeholder="e.g. 9876543210" className="mt-1 font-mono text-xs h-8 rounded-lg" {...register('transactionReference')} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground">Card Last 4</Label>
              <Input placeholder="4321" maxLength={4} className="mt-1 font-mono text-xs h-8 rounded-lg" {...register('cardLast4')} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground">Auth Code</Label>
              <Input placeholder="e.g. 543210" className="mt-1 text-xs h-8 rounded-lg" {...register('authCode')} />
            </div>
          </div>
        )}

        {['CHEQUE', 'DEMAND_DRAFT'].includes(selectedMode) && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-muted/30 border border-border/80 rounded-xl">
            <div>
              <Label className="text-xs font-semibold text-foreground">Cheque / DD No. *</Label>
              <Input placeholder="123456" className="mt-1 font-mono text-xs h-8 rounded-lg" {...register('chequeNumber')} />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground">Cheque Date</Label>
              <div className="mt-1">
                <DatePicker
                  value={watch('chequeDate')}
                  onChange={(date) => setValue('chequeDate', date)}
                  placeholder="Select date"
                  className="h-8 rounded-lg text-xs"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground">Bank Name</Label>
              <Input placeholder="e.g. HDFC Bank" className="mt-1 text-xs h-8 rounded-lg" {...register('bankName')} />
            </div>
          </div>
        )}

        {selectedMode === 'BANK_TRANSFER' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-3 bg-muted/30 border border-border/80 rounded-xl">
            <div>
              <Label className="text-xs font-semibold text-foreground">IMPS / NEFT / UTR *</Label>
              <Input
                placeholder="e.g. SBIN12345678"
                className="mt-1 font-mono text-xs h-8 rounded-lg"
                {...register('transactionReference')}
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground">Remitter Bank</Label>
              <Input
                placeholder="e.g. State Bank of India"
                className="mt-1 text-xs h-8 rounded-lg"
                {...register('bankName')}
              />
            </div>
          </div>
        )}

        {/* Live Remaining Balance Projection Bar */}
        <div className="p-3 rounded-xl bg-muted/40 border border-border/80 flex justify-between items-center text-xs">
          <div className="flex items-center gap-1.5 text-muted-foreground">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>{enteredAmount > balance ? 'Advance Credit Generated:' : 'Projected Balance Post-Payment:'}</span>
          </div>
          <span className={`font-bold font-mono text-sm ${enteredAmount > balance ? 'text-primary' : 'text-emerald-600 dark:text-emerald-400'}`}>
            ₹{enteredAmount > balance
              ? (enteredAmount - balance).toLocaleString('en-IN')
              : Math.max(0, balance - enteredAmount).toLocaleString('en-IN')}
          </span>
        </div>

        <div>
          <Label className="text-xs font-semibold text-foreground mb-1 block">Notes / Counter Remarks (Optional)</Label>
          <Textarea
            placeholder="e.g. Quarter 2 installment paid by father"
            rows={2}
            className="text-xs rounded-xl"
            {...register('notes')}
          />
        </div>
      </form>
    </ResponsiveModal>
  );
};

export default CollectPaymentDialog;
