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
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import feeApi, { type FeeHead } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { toast } from 'sonner';
import { Plus, Tag } from 'lucide-react';

interface FeeHeadsTabProps {
  feeHeads: FeeHead[];
  isLoading?: boolean;
}

export const FeeHeadsTab: React.FC<FeeHeadsTabProps> = ({ feeHeads }) => {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);

  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [category, setCategory] = useState<FeeHead['category']>('TUITION');
  const [description, setDescription] = useState('');
  const [isOptional] = useState(false);

  const createMutation = useMutation({
    mutationFn: () => {
      if (!name || !code) throw new Error('Name and code are required');
      return feeApi.createFeeHead({
        name,
        code: code.toUpperCase().trim(),
        category,
        description,
        isOptional,
        isRefundable: false,
        isActive: true,
      });
    },
    onSuccess: () => {
      toast.success('Fee Head created successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.heads() });
      setIsOpen(false);
      setName('');
      setCode('');
      setDescription('');
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create Fee Head');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold text-slate-800">Fee Head Catalog</h3>
          <p className="text-xs text-slate-500">
            Define individual fee components (e.g. Tuition, Science Lab, Examination, Annual Activity)
          </p>
        </div>
        <Button
          size="sm"
          className="bg-indigo-600 hover:bg-indigo-700 text-white gap-1 text-xs"
          onClick={() => setIsOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" /> Add Fee Head
        </Button>
      </div>

      <div className="rounded-lg border border-slate-200 overflow-hidden bg-white">
        <Table>
          <TableHeader className="bg-slate-50">
            <TableRow>
              <TableHead className="text-xs font-semibold">Head Code</TableHead>
              <TableHead className="text-xs font-semibold">Name</TableHead>
              <TableHead className="text-xs font-semibold">Category</TableHead>
              <TableHead className="text-xs font-semibold">Description</TableHead>
              <TableHead className="text-xs font-semibold">Optional?</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeHeads.map((h) => (
              <TableRow key={h.id} className="text-xs">
                <TableCell className="font-mono font-bold text-indigo-700">{h.code}</TableCell>
                <TableCell className="font-medium text-slate-900">{h.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{h.category}</Badge>
                </TableCell>
                <TableCell className="text-slate-500 max-w-xs truncate">{h.description || '—'}</TableCell>
                <TableCell>{h.isOptional ? <Badge variant="secondary">Optional</Badge> : 'Mandatory'}</TableCell>
                <TableCell>
                  <Badge className={h.isActive ? 'bg-emerald-600' : 'bg-slate-400'}>
                    {h.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Create Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2">
              <Tag className="w-5 h-5 text-indigo-600" />
              Add Fee Head
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 text-xs">
            <div>
              <Label className="text-xs font-semibold text-slate-700">Fee Head Name *</Label>
              <Input
                placeholder="e.g. Science Laboratory Fee"
                className="mt-1"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs font-semibold text-slate-700">Code (Unique) *</Label>
                <Input
                  placeholder="e.g. LAB_FEE"
                  className="mt-1 uppercase font-mono"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-slate-700">Category *</Label>
                <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="TUITION">Tuition</SelectItem>
                    <SelectItem value="ADMISSION">Admission</SelectItem>
                    <SelectItem value="EXAM">Exam</SelectItem>
                    <SelectItem value="LAB">Laboratory</SelectItem>
                    <SelectItem value="TRANSPORT">Transport</SelectItem>
                    <SelectItem value="ACTIVITY">Activity</SelectItem>
                    <SelectItem value="LIBRARY">Library</SelectItem>
                    <SelectItem value="HOSTEL">Hostel</SelectItem>
                    <SelectItem value="OTHER">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-xs font-semibold text-slate-700">Description</Label>
              <Textarea
                placeholder="Brief purpose of this fee head"
                rows={2}
                className="mt-1 text-xs"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter className="pt-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
              onClick={() => createMutation.mutate()}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? 'Saving...' : 'Save Fee Head'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeHeadsTab;
