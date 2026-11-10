import React, { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import feeApi, { type FeeHead, type FeeStructure } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { toast } from 'sonner';
import { Plus, Trash2, Layers } from 'lucide-react';

interface FeeStructuresTabProps {
  structures: FeeStructure[];
  feeHeads: FeeHead[];
  academicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
  classrooms: Array<{ id: string; name: string; grade: number; section: string }>;
  isLoading?: boolean;
}

export const FeeStructuresTab: React.FC<FeeStructuresTabProps> = ({
  structures,
  feeHeads,
  academicYears,
  classrooms,
}) => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [academicYearId, setAcademicYearId] = useState(academicYears[0]?.id || '');
  const [classroomId, setClassroomId] = useState<string>('');
  const [quota, setQuota] = useState('GENERAL');
  const [frequency, setFrequency] = useState('ANNUALLY');
  const [dueDayOfMonth] = useState(10);
  const [lateFineAmount] = useState(50);
  const [items, setItems] = useState<Array<{ feeHeadId: string; amount: number }>>([
    { feeHeadId: feeHeads[0]?.id || '', amount: 0 },
  ]);

  const addItemRow = () => {
    if (feeHeads.length > 0) {
      setItems([...items, { feeHeadId: feeHeads[0].id, amount: 0 }]);
    }
  };

  const removeItemRow = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItemRow = (index: number, field: 'feeHeadId' | 'amount', value: any) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    setItems(updated);
  };

  const totalCalculated = items.reduce((sum, it) => sum + (Number(it.amount) || 0), 0);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!name) throw new Error('Structure name is required');
      if (items.length === 0) throw new Error('Add at least one fee head');

      return feeApi.createFeeStructure({
        name,
        academicYearId,
        classroomId: classroomId || null,
        quota,
        frequency,
        dueDayOfMonth,
        lateFineAmount,
        items,
      });
    },
    onSuccess: () => {
      toast.success('Fee structure created successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.structures() });
      setIsCreateOpen(false);
      setName('');
      setItems([{ feeHeadId: feeHeads[0]?.id || '', amount: 0 }]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create fee structure');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Fee Structure Templates</h3>
          <p className="text-xs text-slate-500">
            Define grade/quota tuition rates and itemized heads for automated billing
          </p>
        </div>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-xs"
          onClick={() => setIsCreateOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" /> New Structure
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-semibold">Structure Name</TableHead>
              <TableHead className="text-xs font-semibold">Class / Target</TableHead>
              <TableHead className="text-xs font-semibold">Quota</TableHead>
              <TableHead className="text-xs font-semibold">Frequency</TableHead>
              <TableHead className="text-xs font-semibold text-right">Total Amount (₹)</TableHead>
              <TableHead className="text-xs font-semibold">Line Items</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {structures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-xs text-slate-500">
                  No fee structures created yet.
                </TableCell>
              </TableRow>
            ) : (
              structures.map((s) => (
                <TableRow key={s.id} className="text-xs">
                  <TableCell className="font-semibold text-slate-900">{s.name}</TableCell>
                  <TableCell>
                    {s.classroom ? `${s.classroom.name} (Grade ${s.classroom.grade})` : 'All Classes'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{s.quota}</Badge>
                  </TableCell>
                  <TableCell className="text-slate-600">{s.frequency}</TableCell>
                  <TableCell className="text-right font-bold text-slate-900">
                    ₹{Number(s.totalAmount).toLocaleString('en-IN')}
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.items?.map((it) => (
                        <span
                          key={it.id || it.feeHeadId}
                          className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[10px]"
                        >
                          {it.feeHead?.name}: ₹{Number(it.amount)}
                        </span>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Create Fee Structure Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              Create Fee Structure Template
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Structure Name *</Label>
              <Input
                placeholder="e.g. Class 10 General Annual Fee"
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Academic Year *</Label>
                <Select value={academicYearId} onValueChange={setAcademicYearId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Academic Year" />
                  </SelectTrigger>
                  <SelectContent>
                    {academicYears.map((y) => (
                      <SelectItem key={y.id} value={y.id}>
                        {y.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Applicable Classroom</Label>
                <Select value={classroomId} onValueChange={setClassroomId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="All Classrooms" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Classrooms</SelectItem>
                    {classrooms.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} (Grade {c.grade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Billing Frequency</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Frequency" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ANNUALLY">Annually</SelectItem>
                    <SelectItem value="TERMLY">Termly</SelectItem>
                    <SelectItem value="QUARTERLY">Quarterly</SelectItem>
                    <SelectItem value="MONTHLY">Monthly</SelectItem>
                    <SelectItem value="ONE_TIME">One-Time</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Student Quota</Label>
                <Select value={quota} onValueChange={setQuota}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Quota" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="GENERAL">General</SelectItem>
                    <SelectItem value="STAFF_CHILD">Staff Child</SelectItem>
                    <SelectItem value="SCHOLARSHIP">Scholarship</SelectItem>
                    <SelectItem value="SIBLING_DISCOUNT">Sibling Discount</SelectItem>
                    <SelectItem value="RTE">RTE Quota</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fee Item Rows */}
            <div className="pt-2 border-t">
              <div className="flex justify-between items-center mb-2">
                <Label className="text-xs font-semibold text-slate-700">Line Items Breakdown *</Label>
                <Button size="sm" variant="ghost" className="h-6 text-[11px] gap-1" onClick={addItemRow}>
                  <Plus className="w-3 h-3" /> Add Item
                </Button>
              </div>

              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {items.map((row, idx) => (
                  <div key={idx} className="flex gap-2 items-center">
                    <Select
                      value={row.feeHeadId}
                      onValueChange={(val) => updateItemRow(idx, 'feeHeadId', val)}
                    >
                      <SelectTrigger className="flex-1 h-8 text-xs">
                        <SelectValue placeholder="Fee Head" />
                      </SelectTrigger>
                      <SelectContent>
                        {feeHeads.map((h) => (
                          <SelectItem key={h.id} value={h.id}>
                            {h.name} ({h.category})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      type="number"
                      placeholder="Amount"
                      className="w-28 h-8 text-xs text-right"
                      value={row.amount}
                      onChange={(e) => updateItemRow(idx, 'amount', Number(e.target.value))}
                    />
                    {items.length > 1 && (
                      <Button
                        size="icon"
                        variant="ghost"
                        className="h-8 w-8 text-red-500"
                        onClick={() => removeItemRow(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                ))}
              </div>

              <div className="mt-2 text-right text-xs font-bold text-slate-800">
                Total Structure Amount: ₹{totalCalculated.toLocaleString('en-IN')}
              </div>
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Structure'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeStructuresTab;
