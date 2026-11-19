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
import { Switch } from '@/components/ui/switch';
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
  const [category, setCategory] = useState<FeeHead['category']>('TUITION');
  const [description, setDescription] = useState('');
  const [isOptional] = useState(false);
  const [isRefundable, setIsRefundable] = useState(false);

  const toggleRefundableMutation = useMutation({
    mutationFn: ({ id, isRefundable }: { id: string; isRefundable: boolean }) =>
      feeApi.updateFeeHead(id, { isRefundable }),
    onSuccess: (_, vars) => {
      toast.success(`Refundable set to ${vars.isRefundable ? 'Yes' : 'No'}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.heads() });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to update refundable status');
    },
  });

  const createMutation = useMutation({
    mutationFn: () => {
      if (!name) throw new Error('Fee Head name is required');
      return feeApi.createFeeHead({
        name,
        category,
        description,
        isOptional,
        isRefundable,
        isActive: true,
      });
    },
    onSuccess: () => {
      toast.success('Fee Head created successfully');
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.heads() });
      setIsOpen(false);
      setName('');
      setDescription('');
      setIsRefundable(false);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || 'Failed to create Fee Head');
    },
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-xs">
        <div>
          <h3 className="text-sm font-bold text-foreground">Fee Head Catalog</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Define individual fee components (e.g. Tuition, Science Lab, Examination, Annual Activity)
          </p>
        </div>
        <Button
          size="sm"
          className="rounded-xl font-bold gap-1.5 text-xs shadow-xs self-start sm:self-auto"
          onClick={() => setIsOpen(true)}
        >
          <Plus className="w-3.5 h-3.5" /> Add Fee Head
        </Button>
      </div>

      <div className="rounded-2xl border border-border/80 overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-semibold">Head Code</TableHead>
              <TableHead className="text-xs font-semibold">Name</TableHead>
              <TableHead className="text-xs font-semibold">Description</TableHead>
              <TableHead className="text-xs font-semibold">Refundable</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {feeHeads.map((h) => {
              const active = h.status ? h.status === 'ACTIVE' : h.isActive ?? true;
              return (
                <TableRow key={h.id} className="text-xs">
                  <TableCell className="font-mono font-bold text-primary">
                    {h.code ? h.code.replace(/_/g, ' ') : '—'}
                  </TableCell>
                  <TableCell className="font-medium text-foreground">{h.name}</TableCell>
                  <TableCell className="text-muted-foreground max-w-xs truncate">{h.description || '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={Boolean(h.isRefundable)}
                        onCheckedChange={(checked) =>
                          toggleRefundableMutation.mutate({ id: h.id, isRefundable: checked })
                        }
                        disabled={toggleRefundableMutation.isPending}
                      />
                      <span className={`text-[11px] font-semibold ${h.isRefundable ? 'text-primary' : 'text-muted-foreground'}`}>
                        {h.isRefundable ? 'Yes' : 'No'}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={active ? 'default' : 'secondary'} className="text-[10px]">
                      {active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
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

          <div className="space-y-3.5 text-xs">
            <div>
              <Label className="text-xs font-semibold text-foreground">Fee Head Name *</Label>
              <Input
                placeholder="e.g. Science Laboratory Fee"
                className="mt-1 h-9 rounded-xl text-xs bg-background"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <Label className="text-xs font-semibold text-foreground">Category *</Label>
              <Select value={category} onValueChange={(val: any) => setCategory(val)}>
                <SelectTrigger className="mt-1 h-9 rounded-xl text-xs bg-background">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
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

            <div>
              <Label className="text-xs font-semibold text-foreground">Description</Label>
              <Textarea
                placeholder="Brief purpose of this fee head"
                rows={2}
                className="mt-1 text-xs rounded-xl bg-background"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="flex items-center justify-between p-3 rounded-xl border border-border bg-muted/20">
              <div>
                <div className="font-semibold text-foreground text-xs">Refundable Fee Head</div>
                <div className="text-[11px] text-muted-foreground">Is this fee eligible for return/refund (e.g. Caution deposit)?</div>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={isRefundable}
                  onCheckedChange={setIsRefundable}
                />
                <span className="text-xs font-semibold">{isRefundable ? 'Yes' : 'No'}</span>
              </div>
            </div>
          </div>

          <DialogFooter className="pt-3 border-t border-border flex justify-end gap-2">
            <Button variant="outline" size="sm" onClick={() => setIsOpen(false)} className="rounded-xl text-xs font-semibold">
              Cancel
            </Button>
            <Button
              size="sm"
              className="rounded-xl text-xs font-bold shadow-xs gap-1.5"
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
