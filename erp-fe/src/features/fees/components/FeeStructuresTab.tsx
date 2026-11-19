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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { usePermissions } from '@/store/hooks';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import feeApi, {
  type FeeHead,
  type FeeStructure,
  type FeeStructureItem,
  type FeeStructureDiscount,
} from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { toast } from 'sonner';
import {
  Plus,
  Trash2,
  Layers,
  CheckCircle,
  Percent,
  IndianRupee,
  Loader2,
  Copy,
  AlertCircle,
  Edit2,
  ChevronDown,
  ChevronRight,
  Power,
  Search,
} from 'lucide-react';
import { formatMoney } from '../utils/moneyUtils';

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
  { id: 'TERM', label: 'Term (Semester)' },
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
  const { can } = usePermissions();

  const canManageFees = can('fees', 'manage');
  const canDeleteFees = can('fees', 'delete');

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingStructureId, setEditingStructureId] = useState<string | null>(null);

  // Confirmation Modal States
  const [deactivateTarget, setDeactivateTarget] = useState<FeeStructure | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<FeeStructure | null>(null);

  // Filter States
  const [filterYearId, setFilterYearId] = useState<string>('ALL');
  const [filterClassId, setFilterClassId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedStructureIds, setExpandedStructureIds] = useState<string[]>([]);

  // Section 1: Basic Info
  const [name, setName] = useState('');
  const [academicYearId, setAcademicYearId] = useState('');
  const [academicClassId, setAcademicClassId] = useState('');
  const [selectedFrequencies, setSelectedFrequencies] = useState<FrequencyKey[]>([
    'MONTHLY',
    'QUARTERLY',
    'ANNUAL',
  ]);

  // Section 2: Fee Heads Matrix
  const [matrixRows, setMatrixRows] = useState<MatrixRowState[]>([]);
  const [quickFillValues, setQuickFillValues] = useState<Record<string, string>>({});

  // Section 3: Quota Discounts
  const [discounts, setDiscounts] = useState<
    Array<Omit<FeeStructureDiscount, 'id' | 'feeStructureId'>>
  >([]);

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
            TERM: 0,
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
    const activeFreqs: FrequencyKey[] =
      structure.activeFrequencies && structure.activeFrequencies.length > 0
        ? (structure.activeFrequencies.filter((f): f is FrequencyKey =>
            ['MONTHLY', 'QUARTERLY', 'ANNUAL', 'TERM'].includes(f)
          ) as FrequencyKey[])
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
        TERM: 0,
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

  const handleDuplicateStructure = (structure: FeeStructure) => {
    handleEditStructure(structure);
    setEditingStructureId(null);
    setName(`${structure.name} (Copy)`);
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
          TERM: 0,
        },
      }))
    );
    setQuickFillValues({});
    setIsCreateOpen(true);
  };

  // Toggle active frequencies
  const toggleFrequency = (freq: FrequencyKey) => {
    if (selectedFrequencies.includes(freq)) {
      if (selectedFrequencies.length === 1) {
        toast.error('At least one frequency cycle must be active');
        return;
      }
      setSelectedFrequencies(selectedFrequencies.filter((f) => f !== freq));
    } else {
      setSelectedFrequencies([...selectedFrequencies, freq]);
    }
  };

  // Toggle fee head row active
  const toggleHeadEnabled = (feeHeadId: string, isEnabled: boolean) => {
    setMatrixRows((prev) =>
      prev.map((r) => (r.feeHeadId === feeHeadId ? { ...r, isEnabled } : r))
    );
  };

  // Numeric input change handler for matrix cells
  const handleAmountChange = (feeHeadId: string, freq: FrequencyKey, rawValue: string) => {
    const digitsOnly = rawValue.replace(/\D/g, '');
    const num = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);
    setMatrixRows((prev) =>
      prev.map((r) =>
        r.feeHeadId === feeHeadId
          ? {
              ...r,
              amounts: {
                ...r.amounts,
                [freq]: num,
              },
            }
          : r
      )
    );
  };

  // Quick fill: copy single value across all active frequencies
  const handleApplyToAllFrequencies = (feeHeadId: string) => {
    const rawVal = quickFillValues[feeHeadId] || '';
    const digitsOnly = rawVal.replace(/\D/g, '');
    const num = digitsOnly === '' ? 0 : parseInt(digitsOnly, 10);

    setMatrixRows((prev) =>
      prev.map((r) => {
        if (r.feeHeadId !== feeHeadId) return r;
        const newAmounts = { ...r.amounts };
        selectedFrequencies.forEach((f) => {
          newAmounts[f] = num;
        });
        return { ...r, amounts: newAmounts };
      })
    );
    toast.success(`Applied ₹${num.toLocaleString('en-IN')} across active cycles.`);
  };

  // Quota discounts helpers
  const handleAddDiscount = () => {
    setDiscounts((prev) => [
      ...prev,
      {
        quota: 'STAFF_CHILD',
        discountType: 'PERCENTAGE',
        discountValue: 25,
        scope: 'ALL_HEADS',
        applicableFeeHeadIds: [],
      },
    ]);
  };

  const handleRemoveDiscount = (idx: number) => {
    setDiscounts((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateDiscountRule = (
    idx: number,
    updates: Partial<Omit<FeeStructureDiscount, 'id' | 'feeStructureId'>>
  ) => {
    setDiscounts((prev) =>
      prev.map((d, i) => (i === idx ? { ...d, ...updates } : d))
    );
  };

  // Compute live totals per frequency cycle
  const frequencyTotals = useMemo(() => {
    const totals: Record<FrequencyKey, number> = {
      MONTHLY: 0,
      QUARTERLY: 0,
      ANNUAL: 0,
      TERM: 0,
    };
    for (const row of matrixRows) {
      if (!row.isEnabled) continue;
      for (const f of selectedFrequencies) {
        totals[f] += Number(row.amounts[f] || 0);
      }
    }
    return totals;
  }, [matrixRows, selectedFrequencies]);

  const getApplicableMaxAmount = (rule: (typeof discounts)[number]) => {
    const activeFreq = selectedFrequencies[0] || 'ANNUAL';
    if (rule.scope === 'SPECIFIC_HEADS' && rule.applicableFeeHeadIds?.length) {
      return matrixRows
        .filter((r) => r.isEnabled && rule.applicableFeeHeadIds?.includes(r.feeHeadId))
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
          errors[idx] = 'Percent discount cannot exceed 100%';
        } else if (rule.discountValue < 0) {
          errors[idx] = 'Percent discount cannot be negative';
        }
      } else if (rule.discountType === 'FIXED_AMOUNT') {
        const maxFee = getApplicableMaxAmount(rule);
        if (maxFee > 0 && rule.discountValue >= maxFee) {
          errors[idx] = `Fixed discount (₹${rule.discountValue.toLocaleString(
            'en-IN'
          )}) must be less than applicable fee amount (₹${maxFee.toLocaleString('en-IN')})`;
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
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to save fee structure');
    },
  });

  // Toggle Structure Active/Inactive Mutation
  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'ACTIVE' | 'INACTIVE' }) =>
      feeApi.updateFeeStructureStatus(id, status),
    onSuccess: (_, vars) => {
      toast.success(`Template marked as ${vars.status}`);
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.structures() });
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err?.response?.data?.message || 'Failed to update status');
    },
  });

  // Delete Structure Mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => feeApi.deleteFeeStructure(id),
    onSuccess: () => {
      toast.success('Fee structure template deleted');
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.structures() });
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err?.response?.data?.message || 'Failed to delete fee structure');
    },
  });

  const toggleExpand = (id: string) => {
    setExpandedStructureIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Helper to compute totals for any structure from its items
  const computeStructureCycleTotals = (s: FeeStructure) => {
    const totals: Record<string, number> = {};
    const items = s.items || [];
    items.forEach((it) => {
      if (it.isEnabled !== false && Number(it.amount) > 0) {
        const freq = it.frequency || 'MONTHLY';
        totals[freq] = (totals[freq] || 0) + Number(it.amount);
      }
    });
    return totals;
  };

  // Count charged heads (amount > 0 for at least one active frequency)
  const getChargedHeadsCount = (s: FeeStructure) => {
    const items = s.items || [];
    const chargedHeadIds = new Set(
      items
        .filter((it) => it.isEnabled !== false && Number(it.amount) > 0)
        .map((it) => it.feeHeadId)
    );
    return chargedHeadIds.size;
  };

  // Filtered structures
  const filteredStructures = useMemo(() => {
    return structures.filter((s) => {
      if (filterYearId !== 'ALL' && s.academicYearId !== filterYearId) return false;
      if (filterClassId !== 'ALL' && s.academicClassId !== filterClassId) return false;
      if (filterStatus !== 'ALL' && s.status !== filterStatus) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(q);
        const matchesClass = (s.academicClass?.name || '').toLowerCase().includes(q);
        if (!matchesName && !matchesClass) return false;
      }
      return true;
    });
  }, [structures, filterYearId, filterClassId, filterStatus, searchTerm]);

  return (
    <div className="space-y-4">
      {/* 1. Header with Actions */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-card p-4 rounded-xl border border-border/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" /> Fee Structure Templates
            </h3>
            <Badge variant="outline" className="text-[11px] font-semibold rounded-lg">
              {filteredStructures.length} Configured
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Configure multi-frequency rate cards (Monthly, Quarterly, Annual, Term) and quota concession rules.
          </p>
        </div>
        {canManageFees && (
          <Button
            size="sm"
            className="gap-1.5 text-xs font-bold rounded-xl shadow-xs self-start sm:self-auto"
            onClick={handleOpenCreateNew}
          >
            <Plus className="w-3.5 h-3.5" /> Create Template
          </Button>
        )}
      </div>

      {/* 2. Filter Bar matching ERP standard */}
      <div className="bg-card p-3 rounded-xl border border-border/70 shadow-2xs space-y-2">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-muted-foreground" />
            <Input
              placeholder="Search template name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8 text-xs h-8 rounded-xl bg-background"
            />
          </div>

          <div>
            <Select value={filterYearId} onValueChange={setFilterYearId}>
              <SelectTrigger className="text-xs h-8 rounded-xl bg-background">
                <SelectValue placeholder="All Academic Years" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Academic Years</SelectItem>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id}>
                    {y.name} {y.isCurrent ? '(Current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filterClassId} onValueChange={setFilterClassId}>
              <SelectTrigger className="text-xs h-8 rounded-xl bg-background">
                <SelectValue placeholder="All Academic Classes" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Academic Classes</SelectItem>
                {academicClasses.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="text-xs h-8 rounded-xl bg-background">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ACTIVE">Active Templates</SelectItem>
                <SelectItem value="INACTIVE">Draft / Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* 3. Existing Structures Table with Expandable Breakdowns */}
      <div className="rounded-xl border border-border/80 overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="border-b border-border/80">
              <TableHead className="w-8"></TableHead>
              <TableHead className="text-xs font-bold">Template & Class</TableHead>
              <TableHead className="text-xs font-bold">Fee Cycles & Net Rates</TableHead>
              <TableHead className="text-xs font-bold text-center">Charged Heads</TableHead>
              <TableHead className="text-xs font-bold">Quota Discounts</TableHead>
              <TableHead className="text-xs font-bold text-center">Status</TableHead>
              <TableHead className="text-xs font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredStructures.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-10 text-xs text-muted-foreground">
                  No fee structure templates found matching criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredStructures.map((s) => {
                const totals = computeStructureCycleTotals(s);
                const isExpanded = expandedStructureIds.includes(s.id);
                const chargedCount = getChargedHeadsCount(s);
                const activeFreqs = s.activeFrequencies || ['MONTHLY', 'QUARTERLY', 'ANNUAL'];

                return (
                  <React.Fragment key={s.id}>
                    <TableRow className="text-xs hover:bg-muted/30 transition-colors">
                      <TableCell className="text-center p-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-muted-foreground"
                          onClick={() => toggleExpand(s.id)}
                          title="Toggle Head Breakdown"
                        >
                          {isExpanded ? (
                            <ChevronDown className="w-3.5 h-3.5" />
                          ) : (
                            <ChevronRight className="w-3.5 h-3.5" />
                          )}
                        </Button>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="font-bold text-foreground text-xs">{s.name}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-primary">{s.academicClass?.name || 'All Classes'}</span>
                          <span>•</span>
                          <span>{s.academicYear?.name || ''}</span>
                        </div>
                      </TableCell>
                      <TableCell className="py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          {activeFreqs.map((freq) => {
                            const amt = totals[freq] || 0;
                            return (
                              <Badge
                                key={freq}
                                variant="outline"
                                className="text-[10px] py-0.5 px-2 font-mono rounded-lg bg-muted/30"
                              >
                                <span className="text-muted-foreground font-sans font-medium mr-1">
                                  {freq === 'MONTHLY'
                                    ? 'Monthly'
                                    : freq === 'QUARTERLY'
                                    ? 'Quarterly'
                                    : freq === 'ANNUAL'
                                    ? 'Annual'
                                    : 'Term'}
                                  :
                                </span>
                                <strong className="text-foreground">{formatMoney(amt)}</strong>
                              </Badge>
                            );
                          })}
                        </div>
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <Badge variant="secondary" className="font-mono text-[10px] rounded-lg">
                          {chargedCount} fee head(s)
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3">
                        {s.discounts && s.discounts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {s.discounts.map((d, i) => {
                              const quotaLabel =
                                QUOTA_OPTIONS.find((q) => q.value === d.quota)?.label ||
                                d.quota.replace(/_/g, ' ');
                              return (
                                <Badge
                                  key={i}
                                  variant="outline"
                                  className="text-[10px] bg-primary/5 text-primary border-primary/20 rounded-lg"
                                >
                                  {quotaLabel}: {d.discountValue}
                                  {d.discountType === 'PERCENTAGE' ? '%' : '₹'}
                                </Badge>
                              );
                            })}
                          </div>
                        ) : (
                          <span className="text-muted-foreground text-[11px]">No concessions</span>
                        )}
                      </TableCell>
                      <TableCell className="py-3 text-center">
                        <Badge
                          variant={s.status === 'ACTIVE' ? 'default' : 'secondary'}
                          className="text-[10px] font-bold rounded-lg"
                        >
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canManageFees && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs rounded-xl font-semibold gap-1"
                                onClick={() => handleEditStructure(s)}
                                title="Edit Structure"
                              >
                                <Edit2 className="w-3 h-3" /> Edit
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs rounded-xl font-semibold gap-1 text-muted-foreground"
                                onClick={() => handleDuplicateStructure(s)}
                                title="Duplicate as new template"
                              >
                                <Copy className="w-3 h-3" /> Copy
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 w-7 p-0 rounded-xl text-muted-foreground hover:text-foreground"
                                onClick={() => setDeactivateTarget(s)}
                                title={s.status === 'ACTIVE' ? 'Deactivate Template' : 'Activate Template'}
                              >
                                <Power className={`w-3.5 h-3.5 ${s.status === 'ACTIVE' ? 'text-emerald-600' : 'text-slate-400'}`} />
                              </Button>
                            </>
                          )}
                          {canDeleteFees && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 w-7 p-0 rounded-xl text-destructive hover:bg-destructive/10"
                              onClick={() => setDeleteTarget(s)}
                              title="Delete Template"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>

                    {/* Expandable Breakdown Drawer */}
                    {isExpanded && (
                      <TableRow className="bg-muted/15 border-b border-border/60">
                        <TableCell colSpan={7} className="p-3">
                          <div className="rounded-xl border border-border/70 bg-card p-3 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-foreground">
                                Fee Head Breakdown by Cycle for {s.name}
                              </span>
                              <span className="text-[11px] text-muted-foreground">
                                Active Frequencies: {activeFreqs.join(', ')}
                              </span>
                            </div>

                            <Table>
                              <TableHeader className="bg-muted/40">
                                <TableRow>
                                  <TableHead className="text-[11px] font-bold">Fee Head</TableHead>
                                  {activeFreqs.map((f) => (
                                    <TableHead key={f} className="text-[11px] font-bold text-right">
                                      {f}
                                    </TableHead>
                                  ))}
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {feeHeads
                                  .filter((h) => {
                                    const headItems = (s.items || []).filter((it) => it.feeHeadId === h.id);
                                    return headItems.some((it) => it.isEnabled !== false && Number(it.amount) > 0);
                                  })
                                  .map((h) => {
                                    const headItems = (s.items || []).filter((it) => it.feeHeadId === h.id);
                                    return (
                                      <TableRow key={h.id} className="text-xs">
                                        <TableCell className="py-1.5 font-medium">
                                          {h.name}
                                          <span className="text-[10px] text-muted-foreground font-mono ml-1.5">
                                            ({h.code})
                                          </span>
                                        </TableCell>
                                        {activeFreqs.map((f) => {
                                          const item = headItems.find((it) => it.frequency === f);
                                          const amt = Number(item?.amount || 0);
                                          return (
                                            <TableCell key={f} className="py-1.5 text-right font-mono font-semibold">
                                              {amt > 0 ? formatMoney(amt) : '—'}
                                            </TableCell>
                                          );
                                        })}
                                      </TableRow>
                                    );
                                  })}
                              </TableBody>
                            </Table>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* CREATE / EDIT FEE STRUCTURE TEMPLATE MODAL */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="w-[95vw] sm:w-[90vw] md:max-w-3xl lg:max-w-4xl max-h-[85vh] p-0 flex flex-col gap-0 overflow-hidden border border-border bg-card rounded-2xl">
          {/* Sticky Dialog Header */}
          <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card shrink-0">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Layers className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  {editingStructureId ? 'Edit Fee Structure Template' : 'Create Fee Structure Template'}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Configure grade-level tuition rates, multi-frequency pricing cycles, and quota concessions.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Scrollable Form Body with controlled height */}
          <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
            {/* ── Section 1: Basic Information ── */}
            <Card className="border border-border/80 shadow-none bg-card rounded-xl">
              <CardHeader className="py-2.5 px-3.5 bg-muted/40 border-b border-border/80">
                <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                  1. Basic Details & Billing Cycles
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <div className="sm:col-span-2 lg:col-span-1">
                    <Label className="text-xs font-semibold text-foreground">Template Name *</Label>
                    <Input
                      placeholder="e.g. Primary Grade 1-5 Standard"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1 h-9 text-xs rounded-xl"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground">Academic Year *</Label>
                    <Select value={academicYearId} onValueChange={setAcademicYearId}>
                      <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                        <SelectValue placeholder="Select Year" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {academicYears.map((y) => (
                          <SelectItem key={y.id} value={y.id} className="text-xs">
                            {y.name} {y.isCurrent ? '(Current)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground">Target Grade Class *</Label>
                    <Select value={academicClassId} onValueChange={setAcademicClassId}>
                      <SelectTrigger className="mt-1 h-9 text-xs rounded-xl">
                        <SelectValue placeholder="Select Class" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {academicClasses.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-xs">
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Enabled Frequencies Checkbox Group */}
                <div className="pt-2 border-t border-border/60">
                  <Label className="text-xs font-semibold text-foreground block mb-2">
                    Supported Fee Billing Cycles *
                  </Label>
                  <div className="flex flex-wrap gap-2">
                    {SUPPORTED_FREQUENCIES.map((freq) => {
                      const isChecked = selectedFrequencies.includes(freq.id);
                      return (
                        <label
                          key={freq.id}
                          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                            isChecked
                              ? 'border-primary bg-primary/10 text-primary shadow-xs'
                              : 'border-border/80 bg-background text-muted-foreground hover:bg-muted/50'
                          }`}
                        >
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => toggleFrequency(freq.id)}
                            className="hidden"
                          />
                          <span>{freq.label}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Section 2: Fee Heads Amount Matrix ── */}
            <Card className="border border-border/80 shadow-none bg-card rounded-xl">
              <CardHeader className="py-2.5 px-3.5 bg-muted/40 border-b border-border/80 flex flex-col sm:flex-row justify-between sm:items-center gap-1.5">
                <div>
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    2. Fee Heads Amount Matrix
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground font-normal">
                    Enter digits only (0-9). Heads with amount ₹0 will not be billed under that cycle.
                  </p>
                </div>
                <div className="text-[11px] text-muted-foreground">
                  Tip: Use <strong className="text-foreground">Apply to all</strong> when a fee head shares the same rate across cycles.
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
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
                            {f === 'MONTHLY'
                              ? 'Monthly (₹)'
                              : f === 'QUARTERLY'
                              ? 'Quarterly (₹)'
                              : f === 'ANNUAL'
                              ? 'Annual (₹)'
                              : 'Term (₹)'}
                          </TableHead>
                        ))}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {matrixRows.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={selectedFrequencies.length + 3}
                            className="text-center py-6 text-muted-foreground"
                          >
                            No active fee heads found in catalog.
                          </TableCell>
                        </TableRow>
                      ) : (
                        matrixRows.map((row) => (
                          <TableRow
                            key={row.feeHeadId}
                            className={!row.isEnabled ? 'opacity-40 bg-muted/20' : ''}
                          >
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
                                <div className="relative flex-1">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    placeholder="Rate"
                                    disabled={!row.isEnabled}
                                    value={quickFillValues[row.feeHeadId] || ''}
                                    onChange={(e) =>
                                      setQuickFillValues({
                                        ...quickFillValues,
                                        [row.feeHeadId]: e.target.value.replace(/\D/g, ''),
                                      })
                                    }
                                    className="h-8 text-xs bg-background font-mono rounded-lg"
                                  />
                                </div>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  disabled={!row.isEnabled}
                                  onClick={() => handleApplyToAllFrequencies(row.feeHeadId)}
                                  className="h-8 text-[11px] px-2 rounded-lg font-semibold shrink-0"
                                >
                                  Apply
                                </Button>
                              </div>
                            </TableCell>

                            {/* Dynamic Frequency Inputs */}
                            {selectedFrequencies.map((f) => (
                              <TableCell key={f} className="text-right">
                                <div className="relative inline-block w-full">
                                  <Input
                                    type="text"
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    disabled={!row.isEnabled}
                                    value={row.amounts[f] === 0 ? '' : String(row.amounts[f])}
                                    placeholder="0"
                                    onChange={(e) =>
                                      handleAmountChange(row.feeHeadId, f, e.target.value)
                                    }
                                    className="h-8 text-xs text-right font-mono font-semibold bg-background rounded-lg pl-6"
                                  />
                                  <span className="absolute left-2 top-2 text-muted-foreground pointer-events-none select-none text-[11px]">
                                    ₹
                                  </span>
                                </div>
                              </TableCell>
                            ))}
                          </TableRow>
                        ))
                      )}

                      {/* Live Totals Row */}
                      <TableRow className="bg-muted/40 font-bold border-t-2 border-border/80">
                        <TableCell colSpan={3} className="text-right text-xs uppercase tracking-wider text-foreground">
                          Total Rate per Cycle:
                        </TableCell>
                        {selectedFrequencies.map((f) => (
                          <TableCell key={f} className="text-right font-mono text-sm text-primary">
                            {formatMoney(frequencyTotals[f])}
                          </TableCell>
                        ))}
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* ── Section 3: Quota Discounts ── */}
            <Card className="border border-border/80 shadow-none bg-card rounded-xl">
              <CardHeader className="py-2.5 px-3.5 bg-muted/40 border-b border-border/80 flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    3. Quota Concessions & Scholarships
                  </CardTitle>
                  <p className="text-[11px] text-muted-foreground font-normal">
                    Concessions apply automatically based on student profile quota (e.g. Staff Child, RTE, Scholarship).
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 text-xs font-semibold gap-1 rounded-lg"
                  onClick={handleAddDiscount}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Concession
                </Button>
              </CardHeader>
              <CardContent className="p-3.5 sm:p-4 space-y-3">
                {discounts.length === 0 ? (
                  <div className="text-center py-5 text-muted-foreground border border-dashed border-border/80 rounded-xl">
                    No quota discount rules added. Standard rates will apply for all students.
                  </div>
                ) : (
                  discounts.map((rule, idx) => (
                    <div
                      key={idx}
                      className="p-3 border border-border/80 rounded-xl bg-muted/20 space-y-2.5"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                        <div>
                          <Label className="text-[11px] font-semibold text-foreground">Target Quota</Label>
                          <Select
                            value={rule.quota}
                            onValueChange={(val: FeeStructureDiscount['quota']) =>
                              updateDiscountRule(idx, { quota: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs mt-1 bg-background rounded-lg">
                              <SelectValue placeholder="Quota" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
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
                            onValueChange={(val: FeeStructureDiscount['discountType']) =>
                              updateDiscountRule(idx, { discountType: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs mt-1 bg-background rounded-lg">
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
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
                              className={`h-8 text-xs bg-background pr-7 font-mono rounded-lg ${
                                discountErrors[idx]
                                  ? 'border-destructive focus-visible:ring-destructive'
                                  : ''
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
                            onValueChange={(val: FeeStructureDiscount['scope']) =>
                              updateDiscountRule(idx, { scope: val })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs mt-1 bg-background rounded-lg">
                              <SelectValue placeholder="Scope" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="ALL_HEADS">All Fee Heads</SelectItem>
                              <SelectItem value="SPECIFIC_HEADS">Selected Fee Heads</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {/* Error text if any */}
                      {discountErrors[idx] && (
                        <div className="flex items-center gap-1.5 text-[11px] text-destructive font-medium pt-1">
                          <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                          <span>{discountErrors[idx]}</span>
                        </div>
                      )}

                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveDiscount(idx)}
                          className="h-6 text-[11px] text-destructive hover:bg-destructive/10 rounded-lg"
                        >
                          <Trash2 className="w-3 h-3 mr-1" /> Remove Rule
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sticky Dialog Footer */}
          <DialogFooter className="p-3 sm:p-4 border-t border-border bg-card shrink-0 flex flex-row items-center justify-between gap-2">
            <div className="text-left hidden sm:block">
              <span className="text-[11px] text-muted-foreground block">Active Frequencies</span>
              <span className="text-xs font-bold text-foreground">{selectedFrequencies.join(' • ')}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-xs rounded-xl"
                onClick={() => setIsCreateOpen(false)}
                disabled={saveMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                type="button"
                size="sm"
                className="text-xs font-bold rounded-xl gap-1.5 shadow-xs"
                onClick={() => saveMutation.mutate('ACTIVE')}
                disabled={saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-3.5 h-3.5" />
                    {editingStructureId ? 'Update Template' : 'Save & Activate'}
                  </>
                )}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* DEACTIVATE / ACTIVATE CONFIRMATION DIALOG */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <AlertDialog
        open={Boolean(deactivateTarget)}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
      >
        <AlertDialogContent className="max-w-md rounded-2xl bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-foreground">
              {deactivateTarget?.status === 'ACTIVE'
                ? 'Deactivate Fee Structure Template?'
                : 'Activate Fee Structure Template?'}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Template: <strong className="text-foreground">{deactivateTarget?.name}</strong> (
                {deactivateTarget?.academicClass?.name || 'Class'} • {deactivateTarget?.academicYear?.name || 'Year'})
              </p>
              {deactivateTarget?.status === 'ACTIVE' ? (
                <p className="p-2.5 rounded-lg bg-amber-500/10 text-amber-800 dark:text-amber-200 border border-amber-500/20">
                  New invoice batches will be blocked from using this structure. Historical invoices and collected ledgers will remain completely unaffected.
                </p>
              ) : (
                <p>
                  This template will be restored to active status and will become available for issuing new classroom invoices.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="text-xs rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={`text-xs font-bold rounded-xl ${
                deactivateTarget?.status === 'ACTIVE'
                  ? 'bg-amber-600 hover:bg-amber-700 text-white'
                  : 'bg-primary text-primary-foreground'
              }`}
              onClick={() => {
                if (deactivateTarget) {
                  toggleStatusMutation.mutate({
                    id: deactivateTarget.id,
                    status: deactivateTarget.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE',
                  });
                  setDeactivateTarget(null);
                }
              }}
            >
              {deactivateTarget?.status === 'ACTIVE' ? 'Confirm Deactivate' : 'Confirm Activate'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ═════════════════════════════════════════════════════════════════════════ */}
      {/* PERMANENT DELETE CONFIRMATION DIALOG */}
      {/* ═════════════════════════════════════════════════════════════════════════ */}
      <AlertDialog
        open={Boolean(deleteTarget)}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent className="max-w-md rounded-2xl bg-card border border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base font-bold text-destructive flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-destructive" /> Delete Fee Structure Template?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground space-y-2">
              <p>
                Are you sure you want to permanently delete{' '}
                <strong className="text-foreground">{deleteTarget?.name}</strong>?
              </p>
              <p className="p-2.5 rounded-lg bg-destructive/10 text-destructive border border-destructive/20 font-medium">
                Warning: If this template is currently in use by any issued invoices or student ledger records, deletion will be blocked by system security rules. In that case, deactivate it instead.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-0">
            <AlertDialogCancel className="text-xs rounded-xl">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="text-xs font-bold rounded-xl bg-destructive hover:bg-destructive/90 text-destructive-foreground"
              onClick={() => {
                if (deleteTarget) {
                  deleteMutation.mutate(deleteTarget.id);
                  setDeleteTarget(null);
                }
              }}
            >
              Delete Permanently
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default FeeStructuresTab;
