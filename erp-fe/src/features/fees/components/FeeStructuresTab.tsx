import React, { useState, useEffect, useMemo } from 'react';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import feeApi, { type FeeHead, type FeeStructure, type FeeStructureItem, type FeeStructureDiscount } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { toast } from 'sonner';
import { Plus, Trash2, Layers, CheckCircle, Percent, IndianRupee, Loader2, Copy, AlertCircle, Edit2 } from 'lucide-react';

interface FeeStructuresTabProps {
  structures: FeeStructure[];
  feeHeads: FeeHead[];
  academicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
  academicClasses: Array<{ id: string; name: string; code: string; orderIndex: number }>;
  isLoading?: boolean;
}

const SUPPORTED_FREQUENCIES = [
  { id: 'MONTHLY', label: 'Monthly' },
  { id: 'QUARTERLY', label: 'Quarterly' },
  { id: 'ANNUAL', label: 'Annual / One-Time' },
] as const;

type FrequencyKey = typeof SUPPORTED_FREQUENCIES[number]['id'];

const QUOTA_OPTIONS = [
  { value: 'GENERAL', label: 'General / Regular' },
  { value: 'STAFF_CHILD', label: 'Staff Child' },
  { value: 'SCHOLARSHIP_HALF', label: 'Scholarship (Half 50%)' },
  { value: 'SCHOLARSHIP_FULL', label: 'Scholarship (Full 100%)' },
  { value: 'SIBLING_DISCOUNT', label: 'Sibling Discount' },
  { value: 'RTE', label: 'RTE Quota' },
  { value: 'OTHER', label: 'Other Special' },
];

interface MatrixRowState {
  feeHeadId: string;
  name: string;
  code: string;
  isEnabled: boolean;
  amounts: Record<FrequencyKey, number>;
}

export const FeeStructuresTab: React.FC<FeeStructuresTabProps> = ({
  structures,
  feeHeads,
  academicYears,
  academicClasses,
}) => {
  const queryClient = useQueryClient();
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);

  // Section 1: Basic Info
  const [name, setName] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [academicClassId, setAcademicClassId] = useState('');
  const [selectedFrequencies, setSelectedFrequencies] = useState<FrequencyKey[]>(['MONTHLY', 'QUARTERLY', 'ANNUAL']);

  // Section 2: Fee Heads Matrix (every catalog head preloaded with 0)
  const [matrixRows, setMatrixRows] = useState<MatrixRowState[]>([]);
  // Quick fill base inputs per head for "Apply to all frequencies"
  const [quickFillValues, setQuickFillValues] = useState<Record<string, string>>({});

  // Section 3: Quota Discounts
  const [discounts, setDiscounts] = useState<Array<Omit<FeeStructureDiscount, 'id' | 'feeStructureId'>>>([]);

  // Auto-init state when dialog opens or dependencies load
  useEffect(() => {
    if (academicYears.length > 0 && !academicYearId) {
      const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];
      setAcademicYearId(currentYear.id);
    }
    if (academicClasses.length > 0 && !academicClassId) {
      setAcademicClassId(academicClasses[0].id);
    }
  }, [academicYears, academicClasses, academicYearId, academicClassId]);

  useEffect(() => {
    if (feeHeads.length > 0 && isCreateOpen && !editingStructureId) {
      setMatrixRows(
        feeHeads.map((h) => ({
          feeHeadId: h.id,
          name: h.name,
          code: h.code || 'HEAD',
          isEnabled: true,
          amounts: {
            MONTHLY: 0,
            QUARTERLY: 0,
            ANNUAL: 0,
          },
        }))
      );
      setQuickFillValues({});
    }
  }, [feeHeads, isCreateOpen, editingStructureId]);

  // Open Edit Mode for an existing structure
  const handleEditStructure = (structure: FeeStructure) => {
    setEditingStructureId(structure.id);
    setName(structure.name || '');
    setAcademicYearId(structure.academicYearId || '');
    setAcademicClassId(structure.academicClassId || '');
    const activeFreqs: FrequencyKey[] = (structure.activeFrequencies && structure.activeFrequencies.length > 0)
      ? (structure.activeFrequencies.filter((f): f is FrequencyKey => ['MONTHLY', 'QUARTERLY', 'ANNUAL'].includes(f)))
      : ['MONTHLY', 'QUARTERLY', 'ANNUAL'];
    setSelectedFrequencies(activeFreqs);

    // Populate matrix rows mapping structure items
    const rows: MatrixRowState[] = feeHeads.map((h) => {
      const headItems = (structure.items || []).filter((it) => it.feeHeadId === h.id);
      const isAnyEnabled = headItems.some((it) => it.isEnabled !== false);
      const amounts: Record<FrequencyKey, number> = {
        MONTHLY: 0,
        QUARTERLY: 0,
        ANNUAL: 0,
      };
      headItems.forEach((it) => {
        const freq = it.frequency as FrequencyKey;
        if (freq && amounts[freq] !== undefined) {
          amounts[freq] = Number(it.amount) || 0;
        }
      });
      return {
        feeHeadId: h.id,
        name: h.name,
        code: h.code || 'HEAD',
        isEnabled: headItems.length > 0 ? isAnyEnabled : true,
        amounts,
      };
    });

    setMatrixRows(rows);
    setQuickFillValues({});

    // Populate quota discounts
    const existingDiscounts = (structure.discounts || []).map((d) => ({
      quota: d.quota,
      discountType: d.discountType,
      discountValue: Number(d.discountValue) || 0,
      scope: d.scope,
      applicableFeeHeadIds: d.applicableFeeHeadIds || [],
    }));
    setDiscounts(existingDiscounts);

    setIsCreateOpen(true);
  };

  const handleOpenCreateNew = () => {
    setEditingStructureId(null);
    setName('');
    const currentYear = academicYears.find((y) => y.isCurrent) || academicYears[0];
    if (currentYear) setAcademicYearId(currentYear.id);
    if (academicClasses.length > 0) setAcademicClassId(academicClasses[0].id);
    setSelectedFrequencies(['MONTHLY', 'QUARTERLY', 'ANNUAL']);
    setDiscounts([]);
    setMatrixRows(
      feeHeads.map((h) => ({
        feeHeadId: h.id,
        name: h.name,
        code: h.code || 'HEAD',
        isEnabled: true,
        amounts: {
          MONTHLY: 0,
          QUARTERLY: 0,
          ANNUAL: 0,
        },
      }))
    );
    setQuickFillValues({});
    setIsCreateOpen(true);
  };

  // Frequency Toggle Handler
  const toggleFrequency = (freq: FrequencyKey) => {
    if (selectedFrequencies.includes(freq)) {
      if (selectedFrequencies.length === 1) {
        toast.warning('At least one billing frequency must remain enabled');
        return;
      }
      setSelectedFrequencies(selectedFrequencies.filter((f) => f !== freq));
    } else {
      setSelectedFrequencies([...selectedFrequencies, freq]);
    }
  };

  // Matrix cell update with strict digits-only (0-9) parsing
  const updateMatrixAmount = (feeHeadId: string, freq: FrequencyKey, rawDigits: string) => {
    const sanitized = rawDigits.replace(/\D/g, '');
    const num = sanitized === '' ? 0 : parseInt(sanitized, 10);
    setMatrixRows((prev) =>
      prev.map((row) =>
        row.feeHeadId === feeHeadId
          ? { ...row, amounts: { ...row.amounts, [freq]: num } }
          : row
      )
    );
  };

  // "Apply to all frequencies" for a fee head
  const applyAmountToAllFrequencies = (feeHeadId: string, baseAmountRaw?: string) => {
    const targetRow = matrixRows.find((r) => r.feeHeadId === feeHeadId);
    if (!targetRow) return;

    let numVal: number;
    if (baseAmountRaw !== undefined) {
      const sanitized = baseAmountRaw.replace(/\D/g, '');
      numVal = sanitized === '' ? 0 : parseInt(sanitized, 10);
    } else {
      const firstEnabled = selectedFrequencies[0] || 'MONTHLY';
      numVal = targetRow.amounts[firstEnabled] || 0;
    }

    setMatrixRows((prev) =>
      prev.map((row) => {
        if (row.feeHeadId !== feeHeadId) return row;
        const updatedAmounts = { ...row.amounts };
        for (const freq of selectedFrequencies) {
          updatedAmounts[freq] = numVal;
        }
        return { ...row, amounts: updatedAmounts };
      })
    );
    toast.info(`Applied ₹${numVal.toLocaleString('en-IN')} across all frequencies for ${targetRow.name}`);
  };

  const toggleHeadEnabled = (feeHeadId: string, checked: boolean) => {
    setMatrixRows((prev) =>
      prev.map((row) => (row.feeHeadId === feeHeadId ? { ...row, isEnabled: checked } : row))
    );
  };

  // Live Frequency Totals calculation
  const frequencyTotals = useMemo(() => {
    const totals: Record<FrequencyKey, number> = {
      MONTHLY: 0,
      QUARTERLY: 0,
      ANNUAL: 0,
    };
    for (const row of matrixRows) {
      if (row.isEnabled) {
        for (const freq of selectedFrequencies) {
          totals[freq] += Number(row.amounts[freq] || 0);
        }
      }
    }
    return totals;
  }, [matrixRows, selectedFrequencies]);

  // Quota Discounts Management & Validation
  const addDiscountRule = () => {
    setDiscounts((prev) => [
      ...prev,
      {
        quota: 'STAFF_CHILD',
        discountType: 'PERCENTAGE',
        discountValue: 50,
        scope: 'ALL_HEADS',
        applicableFeeHeadIds: [],
      },
    ]);
  };

  const removeDiscountRule = (index: number) => {
    setDiscounts((prev) => prev.filter((_, i) => i !== index));
  };

  const updateDiscountRule = (index: number, updates: Partial<FeeStructureDiscount>) => {
    setDiscounts((prev) => {
      const clone = [...prev];
      clone[index] = { ...clone[index], ...updates };
      return clone;
    });
  };

  // Calculate maximum applicable fee amount for a fixed discount rule
  const getApplicableMaxAmount = (rule: Omit<FeeStructureDiscount, 'id' | 'feeStructureId'>) => {
    const activeFreq = selectedFrequencies[0] || 'MONTHLY';
    if (rule.scope === 'SPECIFIC_HEADS' && rule.applicableFeeHeadIds && rule.applicableFeeHeadIds.length > 0) {
      const selectedHeadIds = new Set(rule.applicableFeeHeadIds);
      return matrixRows
        .filter((r) => r.isEnabled && selectedHeadIds.has(r.feeHeadId))
        .reduce((sum, r) => sum + (r.amounts[activeFreq] || 0), 0);
    }
    return frequencyTotals[activeFreq] || 0;
  };

  // Validate discount rules
  const discountErrors = useMemo(() => {
    const errors: Record<number, string | null> = {};
    discounts.forEach((rule, idx) => {
      if (rule.discountType === 'PERCENTAGE') {
        if (rule.discountValue > 100) {
          errors[idx] = 'Percent discount cannot exceed 100% (must be 0 to 100)';
        } else if (rule.discountValue < 0) {
          errors[idx] = 'Percent discount cannot be negative';
        }
      } else if (rule.discountType === 'FIXED_AMOUNT') {
        const maxFee = getApplicableMaxAmount(rule);
        if (maxFee > 0 && rule.discountValue >= maxFee) {
          errors[idx] = `Fixed discount (₹${rule.discountValue.toLocaleString('en-IN')}) must be less than applicable fee amount (₹${maxFee.toLocaleString('en-IN')})`;
        } else if (rule.discountValue < 0) {
          errors[idx] = 'Fixed discount cannot be negative';
        }
      }
    });
    return errors;
  }, [discounts, matrixRows, selectedFrequencies, frequencyTotals]);

  const hasValidationErrors = useMemo(() => {
    return Object.values(discountErrors).some((err) => err !== null);
  }, [discountErrors]);

  // Create or Update Mutation
  const saveMutation = useMutation({
    mutationFn: (targetStatus: 'ACTIVE' | 'INACTIVE' = 'ACTIVE') => {
      if (!name.trim()) throw new Error('Structure Template Name is required');
      if (!academicYearId) throw new Error('Please select an Academic Year');
      if (!academicClassId) throw new Error('Please select an Academic Class');
      if (hasValidationErrors) throw new Error('Please resolve discount validation errors before saving');

      // Flatten matrix into structure items
      const itemsPayload: FeeStructureItem[] = [];

      for (const row of matrixRows) {
        for (const freq of selectedFrequencies) {
          itemsPayload.push({
            feeHeadId: row.feeHeadId,
            amount: Number(row.amounts[freq] || 0),
            frequency: freq,
            isEnabled: row.isEnabled,
          });
        }
      }

      const payload = {
        name: name.trim(),
        academicYearId,
        academicClassId,
        activeFrequencies: selectedFrequencies,
        dueDayOfMonth: 10,
        lateFinePerDay: 0,
        status: targetStatus,
        items: itemsPayload,
        discounts,
      };

      if (editingStructureId) {
        return feeApi.updateFeeStructure(editingStructureId, payload);
      }
      return feeApi.createFeeStructure(payload);
    },
    onSuccess: (_, targetStatus) => {
      toast.success(
        editingStructureId
          ? 'Fee Structure Template updated successfully'
          : targetStatus === 'ACTIVE'
          ? 'Fee Structure Template created & activated'
          : 'Fee Structure saved as draft'
      );
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.structures() });
      setIsCreateOpen(false);
      setEditingStructureId(null);
      setName('');
      setDiscounts([]);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save fee structure');
    },
  });

  return (
    <div className="space-y-4">
      {/* Tab Header using Theme Tokens */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Fee Structure Templates</h3>
          <p className="text-xs text-muted-foreground">
            Define multi-frequency rate cards (Monthly, Quarterly, Annual) and quota concession rules
          </p>
        </div>
        <Button
          size="sm"
          className="gap-1.5 text-xs font-bold rounded-xl shadow-xs self-start sm:self-auto"
          onClick={handleOpenCreateNew}
        >
          <Plus className="w-3.5 h-3.5" /> Create Structure Template
        </Button>
      </div>

      {/* Existing Structures Table */}
      <div className="rounded-2xl border border-border overflow-hidden bg-card shadow-xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="text-xs font-semibold">Template Name</TableHead>
              <TableHead className="text-xs font-semibold">Academic Class</TableHead>
              <TableHead className="text-xs font-semibold">Active Frequencies</TableHead>
              <TableHead className="text-xs font-semibold">Quota Concessions</TableHead>
              <TableHead className="text-xs font-semibold">Status</TableHead>
              <TableHead className="text-xs font-semibold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {structures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-10 text-xs text-muted-foreground">
                  No fee structure templates configured yet. Click above to create one.
                </TableCell>
              </TableRow>
            ) : (
              structures.map((s) => (
                <TableRow key={s.id} className="text-xs hover:bg-muted/40 transition-colors">
                  <TableCell className="font-semibold text-foreground">{s.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="font-mono text-[11px]">
                      {s.academicClass?.name || 'All Classes'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-wrap gap-1">
                      {s.activeFrequencies?.map((freq) => (
                        <Badge key={freq} variant="secondary" className="text-[10px]">
                          {freq}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    {s.discounts && s.discounts.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {s.discounts.map((d, i) => {
                          const quotaLabel = QUOTA_OPTIONS.find((q) => q.value === d.quota)?.label || d.quota.replace(/_/g, ' ');
                          return (
                            <Badge key={i} variant="outline" className="text-[10px] bg-primary/5 text-primary border-primary/20">
                              {quotaLabel}: {d.discountValue}{d.discountType === 'PERCENTAGE' ? '%' : '₹'}
                            </Badge>
                          );
                        })}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === 'ACTIVE' ? 'default' : 'secondary'}>
                      {s.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs rounded-xl font-semibold gap-1"
                      onClick={() => handleEditStructure(s)}
                    >
                      <Edit2 className="w-3 h-3" /> Edit
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* CREATE FEE STRUCTURE TEMPLATE MODAL (Properly sized & responsive) */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-3xl lg:max-w-4xl max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden border border-border bg-card">
          {/* Sticky Dialog Header */}
          <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-primary/10 text-primary">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingStructureId ? 'Edit Fee Structure Template' : 'Create Fee Structure Template'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  {editingStructureId
                    ? 'Update grade-level tuition rates, multi-frequency pricing, and quota concessions.'
                    : 'Configure grade-level tuition rates, multi-frequency pricing, and quota concessions.'}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Form Body with controlled height */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 text-xs">
            {/* ── Section 1: Basic Information ── */}
            <Card className="border border-border shadow-none bg-card">
              <CardHeader className="py-2.5 px-3.5 bg-muted/40 border-b border-border">
                <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  1. Basic Details & Frequencies
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs font-semibold text-foreground">Template Name *</Label>
                    <Input
                      placeholder="e.g. Class 10 Standard 2026-27"
                      className="mt-1 text-xs h-9 bg-background"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground">Academic Year *</Label>
                    <Select value={academicYearId} onValueChange={setAcademicYearId}>
                      <SelectTrigger className="mt-1 text-xs h-9 bg-background">
                        <SelectValue placeholder="Academic Year" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicYears.map((y) => (
                          <SelectItem key={y.id} value={y.id}>
                            {y.name} {y.isCurrent ? '(Current)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground">Academic Class / Grade *</Label>
                    <Select value={academicClassId} onValueChange={setAcademicClassId}>
                      <SelectTrigger className="mt-1 text-xs h-9 bg-background">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent>
                        {academicClasses.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name} ({c.code})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Enabled Frequencies Checkbox Group */}
                <div className="pt-2 border-t border-border">
                  <Label className="text-xs font-semibold text-foreground mb-1.5 block">
                    Enabled Billing Frequencies
                  </Label>
                  <div className="flex flex-wrap gap-2.5">
                    {SUPPORTED_FREQUENCIES.map((freq) => (
                      <label
                        key={freq.id}
                        className={`flex items-center gap-2 cursor-pointer border rounded-lg px-3 py-1.5 transition text-xs font-medium ${
                          selectedFrequencies.includes(freq.id)
                            ? 'bg-primary/5 border-primary/40 text-foreground'
                            : 'bg-muted/40 border-border text-muted-foreground hover:bg-muted'
                        }`}
                      >
                        <Checkbox
                          checked={selectedFrequencies.includes(freq.id)}
                          onCheckedChange={() => toggleFrequency(freq.id)}
                        />
                        <span>{freq.label}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Section 2: Fee Heads Amount Matrix ── */}
            <Card className="border border-border shadow-none bg-card">
              <CardHeader className="py-2.5 px-3.5 bg-muted/40 border-b border-border flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                <div>
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    2. Fee Heads Amount Matrix
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground font-normal">
                    Enter digits only (0-9). Heads with amount ₹0 will not be billed under that frequency.
                  </p>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Quick tip: Use <strong className="text-foreground">Apply to all</strong> when a fee head (e.g. Transport/Tuition) shares the same rate.
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {/* Desktop/Tablet: Clean Table Matrix with Quick Fill */}
                <div className="hidden md:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-muted/30">
                      <TableRow>
                        <TableHead className="text-xs font-semibold w-12 text-center">Active</TableHead>
                        <TableHead className="text-xs font-semibold">Fee Head</TableHead>
                        <TableHead className="text-xs font-semibold min-w-[170px]">
                          Quick Fill All
                        </TableHead>
                        {selectedFrequencies.map((f) => (
                          <TableHead key={f} className="text-xs font-semibold text-right min-w-[125px]">
                            {f === 'MONTHLY' ? 'Monthly' : f === 'QUARTERLY' ? 'Quarterly' : 'Annual / One-Time'}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrixRows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={selectedFrequencies.length + 3} className="text-center py-6 text-muted-foreground">
                            No active fee heads found in catalog.
                          </TableCell>
                        </TableRow>
                      ) : (
                        matrixRows.map((row) => (
                          <TableRow key={row.feeHeadId} className={!row.isEnabled ? 'opacity-40 bg-muted/20' : ''}>
                            <TableCell className="text-center">
                              <Switch
                                checked={row.isEnabled}
                                onCheckedChange={(val) => toggleHeadEnabled(row.feeHeadId, val)}
                              />
                            </TableCell>
                            <TableCell>
                              <div className="font-semibold text-foreground">{row.name}</div>
                              <div className="font-mono text-[10px] text-muted-foreground">
                                {row.code ? row.code.replace(/_/g, ' ') : ''}
                              </div>
                            </TableCell>
                            {/* Quick fill column */}
                            <TableCell>
                              <div className="flex items-center gap-1.5">
                                <div className="relative w-24">
                                  <span className="absolute left-2 top-2 text-[10px] text-muted-foreground select-none">₹</span>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    disabled={!row.isEnabled}
                                    placeholder="0"
                                    value={quickFillValues[row.feeHeadId] ?? ''}
                                    onChange={(e) => {
                                      const digitsOnly = e.target.value.replace(/\D/g, '');
                                      setQuickFillValues((prev) => ({ ...prev, [row.feeHeadId]: digitsOnly }));
                                    }}
                                    className="h-8 pl-5 pr-2 text-right font-medium text-xs bg-background"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={!row.isEnabled}
                                  onClick={() => applyAmountToAllFrequencies(row.feeHeadId, quickFillValues[row.feeHeadId])}
                                  title="Copy this amount across all enabled frequencies"
                                  className="h-8 px-2 text-[11px] gap-1 shrink-0 bg-background hover:bg-muted"
                                >
                                  <Copy className="w-3 h-3" />
                                  <span>Apply all</span>
                                </Button>
                              </div>
                            </TableCell>
                            {selectedFrequencies.map((freq) => (
                              <TableCell key={freq} className="text-right">
                                <div className="relative inline-block w-full">
                                  <span className="absolute left-2.5 top-2 text-[10px] text-muted-foreground select-none">₹</span>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    disabled={!row.isEnabled}
                                    value={row.amounts[freq] === 0 ? '' : String(row.amounts[freq])}
                                    placeholder="0"
                                    onChange={(e) => updateMatrixAmount(row.feeHeadId, freq, e.target.value)}
                                    className="h-8 pl-6 pr-2 text-right font-mono font-medium text-xs bg-background"
                                  />
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}

                      {/* Live Calculated Subtotals Footer */}
                      <TableRow className="bg-primary/5 font-bold border-t-2 border-primary/20">
                        <TableCell colSpan={3} className="text-xs text-foreground pl-4">
                          Calculated Standard Subtotal:
                        </TableCell>
                        {selectedFrequencies.map((freq) => (
                          <TableCell key={freq} className="text-right text-xs text-foreground font-mono">
                            ₹{frequencyTotals[freq].toLocaleString('en-IN')}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile & Small Tablet View: Touch-Friendly Accordion per Head */}
                <div className="md:hidden p-3 divide-y divide-border">
                  {matrixRows.map((row) => (
                    <div key={row.feeHeadId} className="py-3 space-y-2.5">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium text-foreground text-xs">{row.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">
                            {row.code ? row.code.replace(/_/g, ' ') : ''}
                          </div>
                        </div>
                        <Switch
                          checked={row.isEnabled}
                          onCheckedChange={(val) => toggleHeadEnabled(row.feeHeadId, val)}
                        />
                      </div>
                      {row.isEnabled && (
                        <div className="space-y-2 pt-1 bg-muted/20 p-2.5 rounded-lg border border-border">
                          {/* Mobile Quick Fill row */}
                          <div className="flex items-center gap-2 pb-1 border-b border-border/50">
                            <div className="relative flex-1">
                              <span className="absolute left-2.5 top-2 text-[10px] text-muted-foreground select-none">₹</span>
                              <Input
                                type="text"
                                inputMode="numeric"
                                pattern="[0-9]*"
                                placeholder="Amount to copy"
                                value={quickFillValues[row.feeHeadId] ?? ''}
                                onChange={(e) => {
                                  const digitsOnly = e.target.value.replace(/\D/g, '');
                                  setQuickFillValues((prev) => ({ ...prev, [row.feeHeadId]: digitsOnly }));
                                }}
                                className="h-8 pl-6 pr-2 text-right text-xs bg-background"
                              />
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() => applyAmountToAllFrequencies(row.feeHeadId, quickFillValues[row.feeHeadId])}
                              className="h-8 px-2.5 text-xs gap-1 bg-background"
                            >
                              <Copy className="w-3 h-3" />
                              Apply to all
                            </Button>
                          </div>

                          {/* Individual frequency amount inputs */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            {selectedFrequencies.map((freq) => (
                              <div key={freq} className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">
                                  {freq === 'MONTHLY' ? 'Monthly' : freq === 'QUARTERLY' ? 'Quarterly' : 'Annual'}
                                </Label>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-2 text-[10px] text-muted-foreground select-none">₹</span>
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    value={row.amounts[freq] === 0 ? '' : String(row.amounts[freq])}
                                    placeholder="0"
                                    onChange={(e) => updateMatrixAmount(row.feeHeadId, freq, e.target.value)}
                                    className="h-8 pl-6 pr-2 text-xs text-right font-mono bg-background"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                  {/* Mobile Subtotals Card */}
                  <div className="pt-3 mt-2 bg-primary/5 p-2.5 rounded-lg border border-primary/20 space-y-1.5">
                    <div className="text-[11px] font-bold text-foreground">Standard Subtotals:</div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                      {selectedFrequencies.map((f) => (
                        <span key={f}>
                          {f}: <strong className="text-foreground font-mono">₹{frequencyTotals[f].toLocaleString('en-IN')}</strong>
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Section 3: Quota-Based Discounts ── */}
            <Card className="border border-border shadow-none bg-card">
              <CardHeader className="py-2.5 px-3.5 bg-muted/40 border-b border-border flex flex-row justify-between items-center">
                <div>
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    3. Quota-Based Concessions & Discounts
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground font-normal">
                    Apply automatic fee reductions based on student quota (Staff child, Scholarship, etc.)
                  </p>
                </div>
                <Button size="sm" variant="outline" className="h-7 text-xs gap-1 bg-background" onClick={addDiscountRule}>
                  <Plus className="w-3 h-3" /> Add Quota Rule
                </Button>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 space-y-3">
                {discounts.length === 0 ? (
                  <div className="text-center py-4 text-xs text-muted-foreground">
                    No quota discount rules added. Standard rates will apply for all students.
                  </div>
                ) : (
                  discounts.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-muted/30 border border-border rounded-lg space-y-3 relative"
                    >
                      <div className="flex justify-between items-center">
                        <Badge variant="outline" className="text-[11px] font-semibold bg-background">
                          Rule #{idx + 1}
                        </Badge>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          onClick={() => removeDiscountRule(idx)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div>
                          <Label className="text-[11px] font-semibold text-foreground">Target Quota</Label>
                          <Select
                            value={rule.quota}
                            onValueChange={(val: any) => updateDiscountRule(idx, { quota: val })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1 bg-background">
                              <SelectValue placeholder="Quota" />
                            </SelectTrigger>
                            <SelectContent>
                              {QUOTA_OPTIONS.map((q) => (
                                <SelectItem key={q.value} value={q.value}>
                                  {q.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[11px] font-semibold text-foreground">Discount Type</Label>
                          <Select
                            value={rule.discountType}
                            onValueChange={(val: any) => updateDiscountRule(idx, { discountType: val })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1 bg-background">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PERCENTAGE">Percentage (%)</SelectItem>
                              <SelectItem value="FIXED_AMOUNT">Fixed Amount (₹)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label className="text-[11px] font-semibold text-foreground">Discount Value</Label>
                          <div className="relative mt-1">
                            <Input
                              type="text"
                              inputMode="numeric"
                              pattern="[0-9]*"
                              className={`h-8 text-xs bg-background pr-7 font-mono ${
                                discountErrors[idx] ? 'border-destructive focus-visible:ring-destructive' : ''
                              }`}
                              value={rule.discountValue === 0 ? '' : String(rule.discountValue)}
                              placeholder="0"
                              onChange={(e) => {
                                const digitsOnly = e.target.value.replace(/\D/g, '');
                                const num = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
                                updateDiscountRule(idx, { discountValue: num });
                              }}
                            />
                            <span className="absolute right-2 top-2 text-muted-foreground select-none">
                              {rule.discountType === 'PERCENTAGE' ? (
                                <Percent className="w-3.5 h-3.5" />
                              ) : (
                                <IndianRupee className="w-3.5 h-3.5" />
                              )}
                            </span>
                          </div>
                        </div>

                        <div>
                          <Label className="text-[11px] font-semibold text-foreground">Applicable Scope</Label>
                          <Select
                            value={rule.scope}
                            onValueChange={(val: any) => updateDiscountRule(idx, { scope: val })}
                          >
                            <SelectTrigger className="h-8 text-xs mt-1 bg-background">
                              <SelectValue placeholder="Scope" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="ALL_HEADS">All Fee Heads</SelectItem>
                              <SelectItem value="SPECIFIC_HEADS">Selected Fee Heads</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Inline Validation Error or Helper Text */}
                      {discountErrors[idx] ? (
                        <div className="flex items-center gap-1.5 text-[11px] text-destructive bg-destructive/10 px-2.5 py-1.5 rounded-md border border-destructive/20 font-medium">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{discountErrors[idx]}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-muted-foreground">
                          {rule.discountType === 'PERCENTAGE'
                            ? 'Percent must be between 0 and 100.'
                            : `Fixed amount must be strictly less than applicable fee (max ₹${getApplicableMaxAmount(rule).toLocaleString('en-IN')}).`}
                        </div>
                      )}

                      {/* If specific heads selected */}
                      {rule.scope === 'SPECIFIC_HEADS' && (
                        <div className="pt-2 border-t border-border">
                          <Label className="text-[10px] font-semibold text-muted-foreground block mb-1">
                            Select Fee Heads to discount:
                          </Label>
                          <div className="flex flex-wrap gap-1.5">
                            {feeHeads.map((h) => {
                              const isSelected = (rule.applicableFeeHeadIds || []).includes(h.id);
                              return (
                                <button
                                  key={h.id}
                                  type="button"
                                  onClick={() => {
                                    const current = rule.applicableFeeHeadIds || [];
                                    const next = isSelected
                                      ? current.filter((id) => id !== h.id)
                                      : [...current, h.id];
                                    updateDiscountRule(idx, { applicableFeeHeadIds: next });
                                  }}
                                  className={`px-2 py-0.5 rounded text-[10px] border transition ${
                                    isSelected
                                      ? 'bg-primary text-primary-foreground border-primary font-medium'
                                      : 'bg-background text-foreground border-border hover:bg-muted'
                                  }`}
                                >
                                  {h.name}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sticky Dialog Footer Actions */}
          <DialogFooter className="p-3 sm:p-4 border-t border-border bg-card flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0">
            <Button
              variant="outline"
              size="sm"
              className="w-full sm:w-auto text-xs rounded-xl font-semibold"
              onClick={() => setIsCreateOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="secondary"
              size="sm"
              className="w-full sm:w-auto text-xs rounded-xl font-semibold"
              onClick={() => saveMutation.mutate('INACTIVE')}
              disabled={saveMutation.isPending || hasValidationErrors}
            >
              Save Draft
            </Button>
            <Button
              size="sm"
              className="w-full sm:w-auto text-xs gap-1.5 rounded-xl font-bold shadow-xs"
              onClick={() => saveMutation.mutate('ACTIVE')}
              disabled={saveMutation.isPending || hasValidationErrors}
            >
              {saveMutation.isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-3.5 h-3.5" />
                  {editingStructureId ? 'Update Template' : 'Save & Activate Template'}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeStructuresTab;
