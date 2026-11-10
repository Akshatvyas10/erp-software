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
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import feeApi, { type FeeStructure } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { Users } from 'lucide-react';

const bulkInvoiceFormSchema = z.object({
  classroomId: z.string().min(1, 'Please select a classroom'),
  academicYearId: z.string().min(1, 'Academic year is required'),
  feeStructureId: z.string().min(1, 'Please select a fee structure'),
  title: z.string().min(3, 'Title is required').max(150),
  description: z.string().optional(),
  dueDate: z.string().min(1, 'Due date is required'),
  notes: z.string().optional(),
});

type BulkInvoiceFormValues = z.infer<typeof bulkInvoiceFormSchema>;

interface GenerateBulkInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeStructures: FeeStructure[];
  classrooms: Array<{ id: string; name: string; grade: number; section: string }>;
  academicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
}

export const GenerateBulkInvoiceModal: React.FC<GenerateBulkInvoiceModalProps> = ({
  isOpen,
  onClose,
  feeStructures,
  classrooms,
  academicYears,
}) => {
  const queryClient = useQueryClient();
  const currentAcademicYear = academicYears.find((y) => y.isCurrent) || academicYears[0];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<BulkInvoiceFormValues>({
    resolver: zodResolver(bulkInvoiceFormSchema),
    defaultValues: {
      classroomId: '',
      academicYearId: currentAcademicYear?.id || '',
      feeStructureId: '',
      title: '',
      description: '',
      dueDate: new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
      notes: '',
    },
  });

  const selectedClassroomId = watch('classroomId');
  const selectedStructureId = watch('feeStructureId');

  const selectedStructure = feeStructures.find((s) => s.id === selectedStructureId);

  // Auto-populate title when structure selected
  const handleStructureChange = (id: string) => {
    setValue('feeStructureId', id);
    const struct = feeStructures.find((s) => s.id === id);
    if (struct) {
      setValue('title', `${struct.name} Invoice`);
    }
  };

  const mutation = useMutation({
    mutationFn: (values: BulkInvoiceFormValues) => feeApi.generateBulkClassInvoices(values),
    onSuccess: (res) => {
      toast.success(res.message || `Generated ${res.count} invoices!`);
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.all });
      reset();
      onClose();
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to generate bulk invoices');
    },
  });

  const onSubmit = (values: BulkInvoiceFormValues) => {
    mutation.mutate(values);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Users className="w-5 h-5 text-indigo-600" />
            Generate Bulk Class Invoices
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Automatically create individualized billing records for every enrolled student in the selected class.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Target Classroom *</Label>
            <Select value={selectedClassroomId} onValueChange={(val) => setValue('classroomId', val)}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose classroom" />
              </SelectTrigger>
              <SelectContent>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} (Grade {c.grade}-{c.section})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.classroomId && <p className="text-xs text-red-500 mt-1">{errors.classroomId.message}</p>}
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Fee Structure Template *</Label>
            <Select value={selectedStructureId} onValueChange={handleStructureChange}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Choose fee structure" />
              </SelectTrigger>
              <SelectContent>
                {feeStructures.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name} — ₹{Number(s.totalAmount).toLocaleString('en-IN')} ({s.frequency})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.feeStructureId && (
              <p className="text-xs text-red-500 mt-1">{errors.feeStructureId.message}</p>
            )}
          </div>

          {selectedStructure && (
            <div className="bg-slate-50 p-2.5 rounded border border-slate-200">
              <span className="font-semibold text-slate-700">Template items preview:</span>
              <div className="mt-1 space-y-1">
                {selectedStructure.items?.map((it) => (
                  <div key={it.id || it.feeHeadId} className="flex justify-between text-[11px] text-slate-600">
                    <span>{it.feeHead?.name || 'Fee Item'}</span>
                    <span>₹{Number(it.amount).toLocaleString('en-IN')}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <Label className="text-xs font-semibold text-slate-700">Invoice Title *</Label>
            <Input className="mt-1" placeholder="e.g. Term 1 Tuition & Lab Fees" {...register('title')} />
            {errors.title && <p className="text-xs text-red-500 mt-1">{errors.title.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Due Date *</Label>
              <Input type="date" className="mt-1" {...register('dueDate')} />
              {errors.dueDate && <p className="text-xs text-red-500 mt-1">{errors.dueDate.message}</p>}
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Academic Year</Label>
              <Input
                className="mt-1 bg-slate-100"
                disabled
                value={currentAcademicYear?.name || 'Current Year'}
              />
            </div>
          </div>

          <div>
            <Label className="text-xs font-semibold text-slate-700">Public Description / Remarks</Label>
            <Textarea
              className="mt-1 text-xs"
              rows={2}
              placeholder="e.g. Payable via NetBanking or School Fee Counter"
              {...register('description')}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              disabled={mutation.isPending}
            >
              {mutation.isPending ? 'Generating...' : 'Generate All Invoices'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateBulkInvoiceModal;
