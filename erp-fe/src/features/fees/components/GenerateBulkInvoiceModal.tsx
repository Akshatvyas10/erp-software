import React, { useState, useMemo, useEffect } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AxiosError } from 'axios';
import feeApi, {
  type FeeStructure,
  type BulkClassInvoicePreviewResponse,
} from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { DatePicker } from '@/components/common/DatePicker';
import {
  Users,
  CheckCircle2,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  Loader2,
  Check,
  Percent,
} from 'lucide-react';

interface ClassroomOption {
  id: string;
  name: string;
  grade?: number;
  section: string;
  academicClassId?: string;
  classId?: string;
}

interface GenerateBulkInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  feeStructures: FeeStructure[];
  classrooms: ClassroomOption[];
  academicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
}

type FrequencyOption = 'MONTHLY' | 'QUARTERLY' | 'ANNUAL';

const FREQUENCY_LABELS: Record<FrequencyOption, string> = {
  MONTHLY: 'Monthly',
  QUARTERLY: 'Quarterly',
  ANNUAL: 'Annual / One-Time',
};

export const GenerateBulkInvoiceModal: React.FC<GenerateBulkInvoiceModalProps> = ({
  isOpen,
  onClose,
  feeStructures,
  classrooms,
  academicYears,
}) => {
  const queryClient = useQueryClient();
  const currentAcademicYear = academicYears.find((y) => y.isCurrent) || academicYears[0];

  // Wizard Step: 1 (Scope) -> 2 (Structure & Rules) -> 3 (Preview) -> 4 (Confirm)
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);

  // Step 1: Scope Form State
  const [academicYearId, setAcademicYearId] = useState('');
  const [classroomId, setClassroomId] = useState('');
  const [frequency, setFrequency] = useState<FrequencyOption>('MONTHLY');
  const [periodLabel, setPeriodLabel] = useState('');
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [description, setDescription] = useState('');

  // Step 2: Structure State
  const [feeStructureId, setFeeStructureId] = useState('');

  // Step 3: Student Selection & Filtering
  const [previewData, setPreviewData] = useState<BulkClassInvoicePreviewResponse | null>(null);
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(new Set());
  const [hideSkipped, setHideSkipped] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');

  // Step 4: Final Generation Results
  const [generationSummary, setGenerationSummary] = useState<{
    count: number;
    skippedCount: number;
    totalAmount: number;
  } | null>(null);

  // Reset & initialize defaults when dialog opens
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setAcademicYearId(currentAcademicYear?.id || '');
      setClassroomId(classrooms[0]?.id || '');
      setFrequency('MONTHLY');
      const now = new Date();
      const currentMonth = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      setPeriodLabel(currentMonth);
      setTitle(`Monthly Tuition Fee - ${currentMonth}`);
      setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0]);
      setDescription('Standard tuition and curriculum fee invoice.');
      setPreviewData(null);
      setGenerationSummary(null);
    }
  }, [isOpen, currentAcademicYear, classrooms]);

  // Auto-suggest Period Label and Title when frequency or classroom changes
  useEffect(() => {
    const selectedClass = classrooms.find((c) => c.id === classroomId);
    const className = selectedClass ? `${selectedClass.name} (${selectedClass.section})` : 'Class';
    const now = new Date();

    if (frequency === 'MONTHLY') {
      const monthYear = now.toLocaleString('en-US', { month: 'short', year: 'numeric' });
      setPeriodLabel(monthYear);
      setTitle(`${className} Tuition - ${monthYear}`);
    } else if (frequency === 'QUARTERLY') {
      const quarter = `Q${Math.floor(now.getMonth() / 3) + 1} ${now.getFullYear()}`;
      setPeriodLabel(quarter);
      setTitle(`${className} Tuition - ${quarter}`);
    } else {
      const yearName = currentAcademicYear?.name || `${now.getFullYear()}-${now.getFullYear() + 1}`;
      setPeriodLabel(`Annual ${yearName}`);
      setTitle(`${className} Annual Fee (${yearName})`);
    }
  }, [frequency, classroomId, classrooms, currentAcademicYear]);

  // Auto-select structure matching the classroom/academic year
  useEffect(() => {
    if (feeStructures.length > 0 && !feeStructureId) {
      const activeStructures = feeStructures.filter((s) => s.status === 'ACTIVE');
      if (activeStructures.length > 0) {
        setFeeStructureId(activeStructures[0].id);
      }
    }
  }, [feeStructures, feeStructureId]);

  const selectedStructure = useMemo(() => {
    return feeStructures.find((s) => s.id === feeStructureId);
  }, [feeStructures, feeStructureId]);

  // Fetch Preview Mutation
  const previewMutation = useMutation({
    mutationFn: () =>
      feeApi.previewBulkClassInvoices({
        classroomId,
        academicYearId,
        feeStructureId,
        frequency,
        periodLabel,
      }),
    onSuccess: (res) => {
      setPreviewData(res);
      // Default: select all eligible students
      const eligibleIds = new Set(
        res.students.filter((s) => s.eligible).map((s) => s.studentId)
      );
      setSelectedStudentIds(eligibleIds);
      setStep(3);
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to generate preview');
    },
  });

  // Commit Generation Mutation
  const generateMutation = useMutation({
    mutationFn: () =>
      feeApi.generateBulkClassInvoices({
        classroomId,
        academicYearId,
        feeStructureId,
        frequency,
        periodLabel,
        title,
        dueDate,
        description,
        selectedStudentIds: Array.from(selectedStudentIds),
      }),
    onSuccess: (res) => {
      const totalAmt = (previewData?.students || [])
        .filter((s) => selectedStudentIds.has(s.studentId))
        .reduce((sum, s) => sum + s.netPayable, 0);

      setGenerationSummary({
        count: res.count,
        skippedCount: res.skippedCount,
        totalAmount: totalAmt,
      });

      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.all });
      setStep(4);
    },
    onError: (err: AxiosError<{ message?: string }>) => {
      toast.error(err?.response?.data?.message || err?.message || 'Invoice generation failed');
    },
  });

  // Filtered students in Step 3
  const displayedStudents = useMemo(() => {
    if (!previewData) return [];
    return previewData.students.filter((s) => {
      if (hideSkipped && !s.eligible) return false;
      if (studentSearch.trim()) {
        const query = studentSearch.toLowerCase();
        const matchesName = s.name.toLowerCase().includes(query);
        const matchesAdm = s.admissionNumber.toLowerCase().includes(query);
        const matchesRoll = s.rollNumber.toLowerCase().includes(query);
        if (!matchesName && !matchesAdm && !matchesRoll) return false;
      }
      return true;
    });
  }, [previewData, hideSkipped, studentSearch]);

  // Selected student live totals
  const selectionTotals = useMemo(() => {
    if (!previewData) return { count: 0, gross: 0, discount: 0, net: 0 };
    const selected = previewData.students.filter((s) => selectedStudentIds.has(s.studentId));
    return {
      count: selected.length,
      gross: selected.reduce((sum, s) => sum + s.subtotal, 0),
      discount: selected.reduce((sum, s) => sum + s.discount, 0),
      net: selected.reduce((sum, s) => sum + s.netPayable, 0),
    };
  }, [previewData, selectedStudentIds]);

  const toggleSelectAllEligible = (checked: boolean) => {
    if (!previewData) return;
    if (checked) {
      const allEligible = new Set(
        previewData.students.filter((s) => s.eligible).map((s) => s.studentId)
      );
      setSelectedStudentIds(allEligible);
    } else {
      setSelectedStudentIds(new Set());
    }
  };

  const toggleStudent = (id: string, eligible: boolean) => {
    if (!eligible) return;
    const next = new Set(selectedStudentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedStudentIds(next);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:w-[92vw] md:max-w-3xl lg:max-w-4xl max-h-[88vh] p-0 flex flex-col gap-0 overflow-hidden border border-border bg-card">
        {/* Sticky Dialog Header */}
        <DialogHeader className="p-4 sm:p-5 border-b border-border bg-card shrink-0">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-primary/10 text-primary">
                <Users className="w-4 h-4" />
              </div>
              <div>
                <DialogTitle className="text-base font-bold text-foreground">
                  Generate Bulk Class Invoices
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Issue itemized fee invoices from templates with preview and quota deductions.
                </DialogDescription>
              </div>
            </div>

            {/* Step Indicators */}
            <div className="flex items-center gap-1.5 self-start sm:self-auto bg-muted/60 p-1 rounded-lg border border-border text-[11px] font-medium">
              {[
                { num: 1, label: 'Scope' },
                { num: 2, label: 'Structure' },
                { num: 3, label: 'Preview' },
                { num: 4, label: 'Done' },
              ].map((s) => (
                <div
                  key={s.num}
                  className={`flex items-center gap-1 px-2 py-0.5 rounded ${
                    step === s.num
                      ? 'bg-primary text-primary-foreground font-semibold shadow-xs'
                      : step > s.num
                      ? 'text-foreground'
                      : 'text-muted-foreground'
                  }`}
                >
                  {step > s.num ? (
                    <Check className="w-3 h-3 text-emerald-500" />
                  ) : (
                    <span>{s.num}.</span>
                  )}
                  <span className="hidden sm:inline">{s.label}</span>
                </div>
              ))}
            </div>
          </div>
        </DialogHeader>

        {/* Scrollable Step Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 text-xs">
          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 1: SELECT SCOPE & BILLING PERIOD                             */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-4">
              <Card className="border border-border shadow-none bg-card">
                <CardHeader className="py-2.5 px-3.5 bg-muted/40 border-b border-border">
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Target Class & Frequency
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 sm:p-4 space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-semibold text-foreground">Target Classroom *</Label>
                      <Select value={classroomId} onValueChange={setClassroomId}>
                        <SelectTrigger className="mt-1 h-9 text-xs bg-background">
                          <SelectValue placeholder="Choose classroom" />
                        </SelectTrigger>
                        <SelectContent>
                          {classrooms.map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              {c.name} (Section {c.section})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-foreground">Academic Year *</Label>
                      <Select value={academicYearId} onValueChange={setAcademicYearId}>
                        <SelectTrigger className="mt-1 h-9 text-xs bg-background">
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
                  </div>

                  {/* Billing Frequency Radio Tiles */}
                  <div>
                    <Label className="text-xs font-semibold text-foreground block mb-1.5">
                      Billing Frequency to Generate *
                    </Label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['MONTHLY', 'QUARTERLY', 'ANNUAL'] as FrequencyOption[]).map((f) => (
                        <button
                          key={f}
                          type="button"
                          onClick={() => setFrequency(f)}
                          className={`p-2.5 rounded-lg border text-left transition flex flex-col gap-0.5 ${
                            frequency === f
                              ? 'bg-primary/10 border-primary text-foreground font-semibold shadow-xs'
                              : 'bg-muted/30 border-border text-muted-foreground hover:bg-muted'
                          }`}
                        >
                          <span className="text-xs">{FREQUENCY_LABELS[f]}</span>
                          <span className="text-[10px] text-muted-foreground font-normal">
                            {f === 'MONTHLY' ? '12 cycles/yr' : f === 'QUARTERLY' ? '4 terms/yr' : 'One-time bill'}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <Label className="text-xs font-semibold text-foreground">Billing Period Tag *</Label>
                      <Input
                        value={periodLabel}
                        onChange={(e) => setPeriodLabel(e.target.value)}
                        placeholder="e.g. Nov 2026 or Q2"
                        className="mt-1 h-9 text-xs bg-background"
                      />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Used to tag the invoice and prevent duplicate period billing.
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs font-semibold text-foreground">Payment Due Date *</Label>
                      <div className="mt-1">
                        <DatePicker
                          value={dueDate}
                          onChange={(date) => setDueDate(date)}
                          placeholder="Select due date"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground">Invoice Title *</Label>
                    <Input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="e.g. Grade 10 Monthly Tuition Fee - Nov 2026"
                      className="mt-1 h-9 text-xs bg-background"
                    />
                  </div>

                  <div>
                    <Label className="text-xs font-semibold text-foreground">Optional Notice / Description</Label>
                    <Textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={2}
                      placeholder="e.g. Invoices payable through net banking or school fee counter."
                      className="mt-1 text-xs bg-background"
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 2: STRUCTURE & RULES SUMMARY                                 */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-4">
              <Card className="border border-border shadow-none bg-card">
                <CardHeader className="py-2.5 px-3.5 bg-muted/40 border-b border-border">
                  <CardTitle className="text-xs font-semibold text-foreground uppercase tracking-wider">
                    Select Fee Structure Template
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-3.5 sm:p-4 space-y-3">
                  <div>
                    <Label className="text-xs font-semibold text-foreground">Active Fee Structure Template *</Label>
                    <Select value={feeStructureId} onValueChange={setFeeStructureId}>
                      <SelectTrigger className="mt-1 h-9 text-xs bg-background">
                        <SelectValue placeholder="Choose fee structure" />
                      </SelectTrigger>
                      <SelectContent>
                        {feeStructures.map((s) => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name} ({s.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedStructure && (
                    <div className="space-y-3 pt-2">
                      {/* Charged heads breakdown for selected frequency */}
                      <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-semibold text-xs text-foreground">
                            Heads charged under <Badge variant="outline">{FREQUENCY_LABELS[frequency]}</Badge>:
                          </span>
                          <span className="text-[11px] text-muted-foreground">
                            (Zero amount heads excluded)
                          </span>
                        </div>

                        <div className="space-y-1">
                          {selectedStructure.items
                            ?.filter(
                              (it) => it.frequency === frequency && it.isEnabled && Number(it.amount) > 0
                            )
                            .map((it) => (
                              <div
                                key={it.id || it.feeHeadId}
                                className="flex justify-between items-center py-1 border-b border-border/50 text-xs"
                              >
                                <span className="text-foreground">{it.feeHead?.name || 'Fee Head'}</span>
                                <span className="font-mono font-medium text-foreground">
                                  ₹{Number(it.amount).toLocaleString('en-IN')}
                                </span>
                              </div>
                            ))}
                        </div>
                      </div>

                      {/* Quota Discount Rules */}
                      {selectedStructure.discounts && selectedStructure.discounts.length > 0 && (
                        <div className="bg-muted/20 border border-border rounded-lg p-3 space-y-1.5">
                          <div className="font-semibold text-xs text-foreground flex items-center gap-1.5">
                            <Percent className="w-3.5 h-3.5 text-primary" />
                            Quota Concession Rules in this template:
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                            {selectedStructure.discounts.map((d, i) => (
                              <div
                                key={i}
                                className="text-[11px] bg-background p-2 rounded border border-border flex justify-between items-center"
                              >
                                <Badge variant="secondary" className="text-[10px]">
                                  {d.quota}
                                </Badge>
                                <span className="font-medium text-foreground">
                                  {d.discountType === 'PERCENTAGE'
                                    ? `${d.discountValue}% off`
                                    : `₹${Number(d.discountValue).toLocaleString('en-IN')} off`}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 3: PREVIEW & ELIGIBLE STUDENTS SELECTION                     */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {step === 3 && previewData && (
            <div className="space-y-3.5">
              {/* Summary Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                <Card className="border border-border p-3 bg-card shadow-none">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Selected Students</div>
                  <div className="text-lg font-bold text-foreground mt-0.5">
                    {selectionTotals.count}
                    <span className="text-xs font-normal text-muted-foreground"> / {previewData.summary.totalStudents}</span>
                  </div>
                </Card>

                <Card className="border border-border p-3 bg-card shadow-none">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Gross Fee</div>
                  <div className="text-lg font-mono font-bold text-foreground mt-0.5">
                    ₹{selectionTotals.gross.toLocaleString('en-IN')}
                  </div>
                </Card>

                <Card className="border border-border p-3 bg-card shadow-none">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Quota Discount</div>
                  <div className="text-lg font-mono font-bold text-emerald-600 mt-0.5">
                    -₹{selectionTotals.discount.toLocaleString('en-IN')}
                  </div>
                </Card>

                <Card className="border border-border p-3 bg-primary/5 border-primary/20 shadow-none">
                  <div className="text-[10px] text-primary uppercase font-semibold">Net Expected Receivable</div>
                  <div className="text-lg font-mono font-bold text-foreground mt-0.5">
                    ₹{selectionTotals.net.toLocaleString('en-IN')}
                  </div>
                </Card>
              </div>

              {/* Filter / Search Bar */}
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2 bg-muted/40 p-2.5 rounded-lg border border-border">
                <div className="flex items-center gap-2">
                  <Checkbox
                    id="select-all-preview"
                    checked={
                      selectedStudentIds.size > 0 &&
                      selectedStudentIds.size === previewData.students.filter((s) => s.eligible).length
                    }
                    onCheckedChange={toggleSelectAllEligible}
                  />
                  <Label htmlFor="select-all-preview" className="text-xs font-semibold cursor-pointer">
                    Select All Eligible ({previewData.summary.eligibleCount})
                  </Label>
                </div>

                <div className="flex items-center gap-2">
                  <Input
                    placeholder="Filter student by name or roll..."
                    value={studentSearch}
                    onChange={(e) => setStudentSearch(e.target.value)}
                    className="h-8 text-xs w-48 bg-background"
                  />
                  <Button
                    type="button"
                    size="sm"
                    variant={hideSkipped ? 'secondary' : 'outline'}
                    onClick={() => setHideSkipped(!hideSkipped)}
                    className="h-8 text-xs shrink-0"
                  >
                    {hideSkipped ? 'Showing Eligible' : 'Hide Ineligible'}
                  </Button>
                </div>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block border border-border rounded-lg overflow-hidden bg-card">
                <Table>
                  <TableHeader className="bg-muted/40">
                    <TableRow>
                      <TableHead className="w-10 text-center"></TableHead>
                      <TableHead className="text-xs font-semibold">Student</TableHead>
                      <TableHead className="text-xs font-semibold">Admission / Roll</TableHead>
                      <TableHead className="text-xs font-semibold">Quota</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Gross</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Discount</TableHead>
                      <TableHead className="text-xs font-semibold text-right">Net Payable</TableHead>
                      <TableHead className="text-xs font-semibold text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {displayedStudents.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-6 text-muted-foreground text-xs">
                          No students matched your filter.
                        </TableCell>
                      </TableRow>
                    ) : (
                      displayedStudents.map((s) => (
                        <TableRow
                          key={s.studentId}
                          className={`${
                            !s.eligible
                              ? 'opacity-50 bg-muted/30'
                              : selectedStudentIds.has(s.studentId)
                              ? 'bg-primary/5'
                              : ''
                          }`}
                        >
                          <TableCell className="text-center">
                            <Checkbox
                              checked={selectedStudentIds.has(s.studentId)}
                              disabled={!s.eligible}
                              onCheckedChange={() => toggleStudent(s.studentId, s.eligible)}
                            />
                          </TableCell>
                          <TableCell>
                            <div className="font-semibold text-foreground text-xs">{s.name}</div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {s.admissionNumber} <span className="text-[10px]">({s.rollNumber})</span>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {s.quota}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs">
                            ₹{s.subtotal.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-right font-mono text-xs text-emerald-600">
                            {s.discount > 0 ? `-₹${s.discount.toLocaleString('en-IN')}` : '₹0'}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold text-xs text-foreground">
                            ₹{s.netPayable.toLocaleString('en-IN')}
                          </TableCell>
                          <TableCell className="text-center">
                            {s.eligible ? (
                              <Badge className="bg-emerald-500/15 text-emerald-700 hover:bg-emerald-500/20 text-[10px] border-emerald-500/30">
                                Ready
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="text-muted-foreground text-[10px]" title={s.skipReason || ''}>
                                {s.skipReason?.includes('Already') ? 'Already Invoiced' : 'Skipped'}
                              </Badge>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile View: Cards */}
              <div className="sm:hidden space-y-2">
                {displayedStudents.map((s) => (
                  <div
                    key={s.studentId}
                    className={`p-3 rounded-lg border text-xs space-y-2 ${
                      !s.eligible
                        ? 'opacity-50 bg-muted/20 border-border'
                        : selectedStudentIds.has(s.studentId)
                        ? 'bg-primary/5 border-primary/30'
                        : 'bg-card border-border'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={selectedStudentIds.has(s.studentId)}
                          disabled={!s.eligible}
                          onCheckedChange={() => toggleStudent(s.studentId, s.eligible)}
                        />
                        <div>
                          <div className="font-semibold text-foreground">{s.name}</div>
                          <div className="text-[10px] text-muted-foreground font-mono">
                            {s.admissionNumber} • Roll: {s.rollNumber}
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-[10px]">
                        {s.quota}
                      </Badge>
                    </div>

                    <div className="flex justify-between items-center pt-1 border-t border-border text-[11px]">
                      <span className="text-muted-foreground">
                        Gross: ₹{s.subtotal} {s.discount > 0 && <span className="text-emerald-600">(-₹{s.discount})</span>}
                      </span>
                      <span className="font-bold font-mono text-foreground">
                        Net: ₹{s.netPayable.toLocaleString('en-IN')}
                      </span>
                    </div>

                    {!s.eligible && (
                      <div className="text-[10px] text-amber-600 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        <span>{s.skipReason}</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════════ */}
          {/* STEP 4: SUCCESS SUMMARY / CONFIRMATION                            */}
          {/* ══════════════════════════════════════════════════════════════════ */}
          {step === 4 && generationSummary && (
            <div className="py-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-7 h-7" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Invoices Successfully Generated!</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto">
                  {generationSummary.count} invoices were created in this batch for the chosen classroom.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2.5 max-w-md mx-auto pt-2">
                <div className="p-3 bg-muted/30 border border-border rounded-lg">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Generated</div>
                  <div className="text-base font-bold text-foreground mt-0.5">{generationSummary.count}</div>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded-lg">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Skipped</div>
                  <div className="text-base font-bold text-muted-foreground mt-0.5">{generationSummary.skippedCount}</div>
                </div>
                <div className="p-3 bg-muted/30 border border-border rounded-lg">
                  <div className="text-[10px] text-muted-foreground uppercase font-semibold">Total Net Billed</div>
                  <div className="text-base font-mono font-bold text-foreground mt-0.5">
                    ₹{generationSummary.totalAmount.toLocaleString('en-IN')}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sticky Dialog Footer Actions */}
        <DialogFooter className="p-3 sm:p-4 border-t border-border bg-card flex flex-col-reverse sm:flex-row justify-between items-center gap-2 shrink-0">
          <div>
            {step > 1 && step < 4 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full sm:w-auto text-xs gap-1.5 rounded-xl font-semibold"
                onClick={() => setStep((s) => (s - 1) as any)}
                disabled={previewMutation.isPending || generateMutation.isPending}
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {step < 4 ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full sm:w-auto text-xs rounded-xl font-semibold"
                  onClick={onClose}
                  disabled={previewMutation.isPending || generateMutation.isPending}
                >
                  Cancel
                </Button>

                {step === 1 && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto text-xs gap-1.5 rounded-xl font-bold shadow-xs"
                    disabled={!classroomId || !dueDate}
                    onClick={() => setStep(2)}
                  >
                    Next: Structure <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                )}

                {step === 2 && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto text-xs gap-1.5 rounded-xl font-bold shadow-xs"
                    disabled={!feeStructureId || previewMutation.isPending}
                    onClick={() => previewMutation.mutate()}
                  >
                    {previewMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Generating Preview...
                      </>
                    ) : (
                      <>
                        Preview Students <ChevronRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                )}

                {step === 3 && (
                  <Button
                    type="button"
                    size="sm"
                    className="w-full sm:w-auto text-xs gap-1.5 rounded-xl font-bold shadow-xs"
                    disabled={selectedStudentIds.size === 0 || generateMutation.isPending}
                    onClick={() => generateMutation.mutate()}
                  >
                    {generateMutation.isPending ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        Issuing Invoices...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Generate {selectedStudentIds.size} Invoices
                      </>
                    )}
                  </Button>
                )}
              </>
            ) : (
              <Button
                type="button"
                size="sm"
                className="w-full sm:w-auto text-xs rounded-xl font-bold shadow-xs"
                onClick={onClose}
              >
                Close & View Invoices
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GenerateBulkInvoiceModal;
