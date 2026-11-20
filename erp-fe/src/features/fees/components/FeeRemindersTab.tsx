import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feeApi, { type FeeReminderLog } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { usePermissions } from '@/store/hooks';
import { formatMoney, toMoney } from '../utils/moneyUtils';
import { DatePicker } from '@/components/common/DatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import {
  BellRing,
  Send,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Filter,
  History,
  ShieldCheck,
  UserX,
  Mail,
  RefreshCw,
  Search,
  Settings,
  CalendarDays,
  Sparkles,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';

interface FeeRemindersTabProps {
  classrooms?: Array<{ id: string; name: string }>;
  academicYears?: Array<{ id: string; name: string; isCurrent: boolean }>;
  onOpenLedger?: (studentId: string) => void;
}

export const FeeRemindersTab: React.FC<FeeRemindersTabProps> = ({
  classrooms = [],
  academicYears = [],
  onOpenLedger,
}) => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can('fees', 'manage');

  // Filters
  const [selectedClassroom, setSelectedClassroom] = useState<string>('ALL');
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>('');
  const [installmentNumber, setInstallmentNumber] = useState<string>('ALL');
  const [periodKey, setPeriodKey] = useState<string>('');
  const [asOfDate, setAsOfDate] = useState<string>('');
  const [eligibilityFilter, setEligibilityFilter] = useState<'ALL' | 'ELIGIBLE_ONLY' | 'SKIPPED_ONLY'>('ELIGIBLE_ONLY');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Selection
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // Bulk Dispatch Confirmation Modal
  const [isSendModalOpen, setIsSendModalOpen] = useState<boolean>(false);
  const [customNote, setCustomNote] = useState<string>('');
  const [isHistoryOpen, setIsHistoryOpen] = useState<boolean>(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);

  // 1. Fetch Eligible Reminder Students
  const {
    data: eligibleStudents = [],
    isLoading,
    isRefetching,
    refetch,
  } = useQuery({
    queryKey: queryKeys.fees.remindersEligible({
      classroomId: selectedClassroom !== 'ALL' ? selectedClassroom : undefined,
      academicYearId: selectedAcademicYear || undefined,
      installmentNumber: installmentNumber !== 'ALL' ? Number(installmentNumber) : undefined,
      periodKey: periodKey || undefined,
      asOfDate: asOfDate || undefined,
    }),
    queryFn: () =>
      feeApi.getEligibleReminders({
        classroomId: selectedClassroom !== 'ALL' ? selectedClassroom : undefined,
        academicYearId: selectedAcademicYear || undefined,
        installmentNumber: installmentNumber !== 'ALL' ? Number(installmentNumber) : undefined,
        periodKey: periodKey || undefined,
        asOfDate: asOfDate || undefined,
      }),
  });

  // 2. Fetch Audit Logs
  const { data: logsData, isLoading: isLogsLoading } = useQuery({
    queryKey: queryKeys.fees.reminderLogs(),
    queryFn: () => feeApi.getReminderLogs({ limit: 50 }),
    enabled: isHistoryOpen,
  });

  // 2b. Fetch Reminder Automation Settings
  const { data: settingsData } = useQuery({
    queryKey: queryKeys.fees.reminderSettings(),
    queryFn: feeApi.getReminderSettings,
  });

  const [localSettings, setLocalSettings] = useState({
    enabled: false,
    daysBeforeDue: '7, 3, 1',
    remindBeforeExam: false,
    defaultAdministrativeNote: '',
  });

  // Keep localSettings in sync when loaded
  React.useEffect(() => {
    if (settingsData) {
      setLocalSettings({
        enabled: !!settingsData.enabled,
        daysBeforeDue: (settingsData.daysBeforeDue || [7, 3, 1]).join(', '),
        remindBeforeExam: !!settingsData.remindBeforeExam,
        defaultAdministrativeNote: settingsData.defaultAdministrativeNote || '',
      });
    }
  }, [settingsData]);

  const updateSettingsMutation = useMutation({
    mutationFn: feeApi.updateReminderSettings,
    onSuccess: () => {
      toast.success('Reminder schedule & automation policies saved');
      setIsSettingsOpen(false);
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.reminderSettings() });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to update reminder settings';
      toast.error(msg);
    },
  });

  const triggerScheduledMutation = useMutation({
    mutationFn: feeApi.triggerScheduledReminders,
    onSuccess: (res) => {
      toast.success(
        res.executed
          ? `Automated job complete: ${res.sentCount || 0} sent, ${res.skippedCount || 0} skipped`
          : 'Automated job skipped (Reminders are disabled in settings)'
      );
      queryClient.invalidateQueries({ queryKey: ['fees', 'reminders'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Automated scheduler execution failed';
      toast.error(msg);
    },
  });

  // 3. Mutation: Send Bulk Reminders
  const sendMutation = useMutation({
    mutationFn: feeApi.sendBulkReminders,
    onSuccess: (data) => {
      toast.success(
        `Dispatched ${data.sentCount} reminder(s). ${data.skippedCount ? `${data.skippedCount} skipped.` : ''} ${data.failedCount ? `${data.failedCount} failed.` : ''}`
      );
      setIsSendModalOpen(false);
      setSelectedStudentIds([]);
      setCustomNote('');
      queryClient.invalidateQueries({ queryKey: ['fees', 'reminders'] });
      queryClient.invalidateQueries({ queryKey: queryKeys.fees.summary() });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to dispatch fee reminders';
      toast.error(msg);
    },
  });

  // Filtered dataset
  const filteredStudents = useMemo(() => {
    return eligibleStudents.filter((student) => {
      // Search
      if (searchTerm) {
        const query = searchTerm.toLowerCase();
        const matchesName = student.studentName.toLowerCase().includes(query);
        const matchesAdm = (student.admissionNumber || '').toLowerCase().includes(query);
        const matchesEmail = (student.parentEmail || '').toLowerCase().includes(query);
        if (!matchesName && !matchesAdm && !matchesEmail) return false;
      }

      // Eligibility
      if (eligibilityFilter === 'ELIGIBLE_ONLY' && !student.isEligible) return false;
      if (eligibilityFilter === 'SKIPPED_ONLY' && student.isEligible) return false;

      return true;
    });
  }, [eligibleStudents, searchTerm, eligibilityFilter]);

  // Derived Metrics
  const metrics = useMemo(() => {
    const total = eligibleStudents.length;
    const eligible = eligibleStudents.filter((s) => s.isEligible);
    const fullyPaid = eligibleStudents.filter((s) => s.skipReason === 'FULLY_PAID').length;
    const currentPaid = eligibleStudents.filter((s) => s.skipReason === 'CURRENT_PAID').length;
    const totalArrears = eligible.reduce((acc, s) => acc + toMoney(s.arrears), 0);
    const totalPayable = eligible.reduce((acc, s) => acc + toMoney(s.totalPayable), 0);

    return {
      total,
      eligibleCount: eligible.length,
      skippedCount: total - eligible.length,
      fullyPaid,
      currentPaid,
      totalArrears,
      totalPayable,
    };
  }, [eligibleStudents]);

  // Bulk Selection Handlers
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      const eligibleIds = filteredStudents.filter((s) => s.isEligible).map((s) => s.studentId);
      setSelectedStudentIds(eligibleIds);
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const handleConfirmSend = () => {
    if (selectedStudentIds.length === 0) {
      toast.error('Please select at least one student');
      return;
    }

    sendMutation.mutate({
      studentIds: selectedStudentIds,
      periodKey: periodKey || undefined,
      dueDate: asOfDate || undefined,
      customNote: customNote || undefined,
      administrativeNote: customNote || undefined,
    });
  };

  const getSkipReasonBadge = (reason: string | null) => {
    switch (reason) {
      case 'CURRENT_PAID':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px]">
            <CheckCircle2 className="w-3 h-3" /> Period Paid
          </Badge>
        );
      case 'FULLY_PAID':
        return (
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 text-[11px]">
            <ShieldCheck className="w-3 h-3" /> Zero Dues
          </Badge>
        );
      case 'INACTIVE':
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 gap-1 text-[11px]">
            <UserX className="w-3 h-3" /> Inactive
          </Badge>
        );
      case 'NO_EMAIL':
        return (
          <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200 gap-1 text-[11px]">
            <Mail className="w-3 h-3" /> No Email
          </Badge>
        );
      case 'ALREADY_REMINDED_TODAY':
        return (
          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 gap-1 text-[11px]">
            <Clock className="w-3 h-3" /> Reminded Today
          </Badge>
        );
      case 'NO_DUE':
      default:
        return (
          <Badge variant="outline" className="bg-slate-50 text-slate-500 border-slate-200 text-[11px]">
            No Due
          </Badge>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header / Action Bar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <BellRing className="w-4 h-4 text-primary" /> Fee Reminder Automation Center
            </h2>
            <Badge variant="secondary" className="text-xs font-semibold">
              BullMQ + Smart Skip Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Identify installment & arrears dues, automatically skip cleared accounts, and deliver batch payment statements.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          {canManage && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(true)}
              className="text-xs font-semibold gap-1.5 rounded-lg"
            >
              <Settings className="w-3.5 h-3.5" /> Automation Rules
            </Button>
          )}

          <Button
            variant="outline"
            size="sm"
            onClick={() => setIsHistoryOpen(true)}
            className="text-xs font-semibold gap-1.5 rounded-lg"
          >
            <History className="w-3.5 h-3.5" /> Dispatch History
          </Button>

          {canManage && (
            <Button
              size="sm"
              disabled={selectedStudentIds.length === 0 || sendMutation.isPending}
              onClick={() => setIsSendModalOpen(true)}
              className="text-xs font-bold gap-1.5 rounded-lg shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" /> Send Reminders ({selectedStudentIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* 2. Metric KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs font-medium text-muted-foreground">Actionable Students</div>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              {metrics.eligibleCount}
              <span className="text-xs font-normal text-muted-foreground ml-1.5">/ {metrics.total}</span>
            </div>
            <div className="text-[11px] text-emerald-600 mt-1 font-medium flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> {metrics.skippedCount} accounts auto-protected
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs font-medium text-muted-foreground">Total Actionable Payable</div>
            <div className="text-xl sm:text-2xl font-bold text-primary mt-1">
              {formatMoney(metrics.totalPayable)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-medium">
              Installments + carry-forwards
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs font-medium text-muted-foreground">Unpaid Arrears Portion</div>
            <div className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">
              {formatMoney(metrics.totalArrears)}
            </div>
            <div className="text-[11px] text-rose-500 mt-1 font-medium flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Past uncollected dues
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3 sm:p-4">
            <div className="text-xs font-medium text-muted-foreground">Skipped (Zero / Cleared)</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-700 mt-1">
              {metrics.fullyPaid + metrics.currentPaid}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-medium">
              {metrics.fullyPaid} zero dues • {metrics.currentPaid} period paid
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter Controls */}
      <div className="p-3.5 bg-muted/30 border border-border/70 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5 items-end">
          {/* Search */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Search Student / Parent</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Name, adm, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>

          {/* Academic Year */}
          {academicYears.length > 0 && (
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-muted-foreground">Session</label>
              <Select value={selectedAcademicYear} onValueChange={setSelectedAcademicYear}>
                <SelectTrigger className="h-8 text-xs bg-background">
                  <SelectValue placeholder="All Sessions" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Sessions</SelectItem>
                  {academicYears.map((y) => (
                    <SelectItem key={y.id} value={y.id} className="text-xs">
                      {y.name} {y.isCurrent ? '(Current)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Classroom */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Target Classroom</label>
            <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Classrooms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classrooms</SelectItem>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Period Key Tag */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Period Tag (Optional)</label>
            <Input
              placeholder="e.g. 2026-Q1, 2026-04"
              value={periodKey}
              onChange={(e) => setPeriodKey(e.target.value)}
              className="h-8 text-xs bg-background"
            />
          </div>

          {/* Installment Interval Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Installment Interval</label>
            <Select value={installmentNumber} onValueChange={setInstallmentNumber}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue placeholder="All Terms" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Installments</SelectItem>
                <SelectItem value="1">Inst 1 (e.g. 15 Jun)</SelectItem>
                <SelectItem value="2">Inst 2 (e.g. 15 Sep)</SelectItem>
                <SelectItem value="3">Inst 3 (e.g. 15 Dec)</SelectItem>
                <SelectItem value="4">Inst 4 (e.g. 15 Mar)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Date Picker using Shared ERP Component */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Due Date As Of</label>
            <DatePicker
              value={asOfDate}
              onChange={(val) => setAsOfDate(val || '')}
              placeholder="Select due cutoff"
              className="h-8 text-xs bg-background"
            />
          </div>

          {/* Eligibility Filter */}
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">List Filter</label>
            <Select
              value={eligibilityFilter}
              onValueChange={(val: 'ALL' | 'ELIGIBLE_ONLY' | 'SKIPPED_ONLY') => setEligibilityFilter(val)}
            >
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ELIGIBLE_ONLY">Actionable Only</SelectItem>
                <SelectItem value="SKIPPED_ONLY">Skipped / Cleared Only</SelectItem>
                <SelectItem value="ALL">Show All Students</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
          <div className="text-muted-foreground text-[11px] flex items-center gap-1.5">
            <Filter className="w-3 h-3" /> Showing {filteredStudents.length} of {eligibleStudents.length} students
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            disabled={isLoading || isRefetching}
            className="h-6 text-[11px] px-2 gap-1 text-muted-foreground hover:text-foreground"
          >
            <RefreshCw className={`w-3 h-3 ${isRefetching ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* 4. Eligible Students Table */}
      <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    filteredStudents.filter((s) => s.isEligible).length > 0 &&
                    selectedStudentIds.length === filteredStudents.filter((s) => s.isEligible).length
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all eligible students"
                />
              </TableHead>
              <TableHead className="text-xs font-bold">Student / Admission</TableHead>
              <TableHead className="text-xs font-bold">Class / Quota</TableHead>
              <TableHead className="text-xs font-bold">Parent Contact</TableHead>
              <TableHead className="text-xs font-bold text-right">Installment Due</TableHead>
              <TableHead className="text-xs font-bold text-right">Arrears</TableHead>
              <TableHead className="text-xs font-bold text-right">Total Payable</TableHead>
              <TableHead className="text-xs font-bold text-center">Status / Rule</TableHead>
              <TableHead className="text-xs font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                  Calculating installment and arrears balances...
                </TableCell>
              </TableRow>
            ) : filteredStudents.length === 0 ? (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-10 text-muted-foreground text-xs">
                  No students match the selected reminder criteria.
                </TableCell>
              </TableRow>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedStudentIds.includes(student.studentId);
                return (
                  <TableRow
                    key={student.studentId}
                    className={`hover:bg-muted/40 transition-colors ${
                      !student.isEligible ? 'opacity-70 bg-muted/10' : ''
                    }`}
                  >
                    <TableCell>
                      <Checkbox
                        checked={isSelected}
                        disabled={!student.isEligible}
                        onCheckedChange={() => handleToggleStudent(student.studentId)}
                        aria-label={`Select ${student.studentName}`}
                      />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="font-semibold text-xs text-foreground">{student.studentName}</div>
                      <div className="text-[11px] text-muted-foreground font-mono">
                        {student.admissionNumber || 'No Adm No'}
                      </div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="text-xs font-medium text-foreground">{student.classroomName}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">{student.feeQuota}</div>
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="text-xs text-foreground flex items-center gap-1">
                        <Mail className="w-3 h-3 text-muted-foreground" />
                        <span className="truncate max-w-[140px]">{student.parentEmail || 'None'}</span>
                      </div>
                      <div className="text-[10px] text-muted-foreground">{student.parentPhone || ''}</div>
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-medium text-xs">
                      {formatMoney(student.installmentDue)}
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-medium text-xs text-rose-600">
                      {toMoney(student.arrears) > 0 ? formatMoney(student.arrears) : '₹0.00'}
                    </TableCell>
                    <TableCell className="py-2.5 text-right font-bold text-xs text-primary">
                      {formatMoney(student.totalPayable)}
                    </TableCell>
                    <TableCell className="py-2.5 text-center">
                      {student.isEligible ? (
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[11px] font-semibold">
                          Actionable
                        </Badge>
                      ) : (
                        getSkipReasonBadge(student.skipReason)
                      )}
                    </TableCell>
                    <TableCell className="py-2.5 text-right">
                      {onOpenLedger && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onOpenLedger(student.studentId)}
                          className="h-7 text-xs px-2 text-primary font-semibold hover:underline"
                        >
                          Ledger
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* 5. Bulk Dispatch Confirmation Dialog */}
      <Dialog open={isSendModalOpen} onOpenChange={setIsSendModalOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" /> Dispatch Fee Reminder Emails
            </DialogTitle>
            <DialogDescription className="text-xs">
              Confirm sending itemized installment statements to parents.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            <div className="p-3 bg-muted/40 rounded-lg space-y-1.5 border border-border/70">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Recipients Selected:</span>
                <span className="font-bold text-foreground">{selectedStudentIds.length} students</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Target Period / Due Date:</span>
                <span className="font-semibold text-foreground">
                  {periodKey || 'Current Overdue'} • {asOfDate || 'Default Cutoff'}
                </span>
              </div>
              <div className="flex justify-between text-primary font-bold pt-1 border-t border-border/50">
                <span>Total Expected Collections:</span>
                <span>
                  {formatMoney(
                    filteredStudents
                      .filter((s) => selectedStudentIds.includes(s.studentId))
                      .reduce((sum, s) => sum + toMoney(s.totalPayable), 0)
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-foreground">Custom Administrative Note</label>
                <span className="text-[10px] text-muted-foreground">{customNote.length}/500</span>
              </div>
              <Textarea
                placeholder="e.g. Kindly clear outstanding dues before term examinations begin."
                value={customNote}
                maxLength={500}
                onChange={(e) => setCustomNote(e.target.value)}
                rows={3}
                className="text-xs resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                This note will be included in the fee reminder email.
              </p>
            </div>

            <div className="text-[11px] text-muted-foreground bg-blue-50/70 p-2.5 rounded-md border border-blue-100 flex items-start gap-1.5">
              <ShieldCheck className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <span>
                <strong>Smart Skip Guarantee:</strong> Even if selected by mistake, students who paid in the last 24 hours or have zero dues are automatically skipped.
              </span>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSendModalOpen(false)}
              className="text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmSend}
              disabled={sendMutation.isPending}
              className="text-xs font-bold rounded-lg gap-1.5"
            >
              {sendMutation.isPending ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Enqueuing...
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" /> Confirm & Send
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 6. Audit History Dialog */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-3xl rounded-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <History className="w-4 h-4 text-primary" /> Outbound Fee Reminder Audit History
            </DialogTitle>
            <DialogDescription className="text-xs">
              Complete dispatch log of automated and manual fee payment reminders.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto py-2">
            {isLogsLoading ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                Loading dispatch logs...
              </div>
            ) : !logsData?.items || logsData.items.length === 0 ? (
              <div className="py-10 text-center text-xs text-muted-foreground">
                No fee reminders dispatched yet.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="text-xs font-bold">
                    <TableHead>Date / Time</TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Recipient Email</TableHead>
                    <TableHead className="text-right">Payable</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead>Reason / Notes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logsData.items.map((log: FeeReminderLog) => (
                    <TableRow key={log.id} className="text-xs">
                      <TableCell className="py-2 text-[11px] text-muted-foreground">
                        {new Date(log.createdAt).toLocaleString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </TableCell>
                      <TableCell className="py-2 font-semibold">
                        {log.student ? `${log.student.firstName} ${log.student.lastName || ''}`.trim() : 'Unknown'}
                      </TableCell>
                      <TableCell className="py-2 text-[11px] font-mono text-muted-foreground truncate max-w-[150px]">
                        {log.recipientEmail || 'None'}
                      </TableCell>
                      <TableCell className="py-2 text-right font-bold text-primary">
                        {formatMoney(log.payableAmount)}
                      </TableCell>
                      <TableCell className="py-2 text-center">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            log.status === 'SENT'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : log.status === 'SKIPPED'
                              ? 'bg-slate-50 text-slate-600 border-slate-200'
                              : log.status === 'FAILED'
                              ? 'bg-rose-50 text-rose-700 border-rose-200'
                              : 'bg-amber-50 text-amber-700 border-amber-200'
                          }`}
                        >
                          {log.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-2 text-[11px] text-muted-foreground">
                        {log.skipReason || log.errorMessage || (log.metadata && typeof log.metadata === 'object' && 'note' in log.metadata ? String(log.metadata.note) : '') || 'Dispatched via BullMQ'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsHistoryOpen(false)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 7. Automation Settings Dialog */}
      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent className="max-w-md rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Settings className="w-4 h-4 text-primary" /> Automated Reminder Policy Settings
            </DialogTitle>
            <DialogDescription className="text-xs">
              Configure daily scheduled background reminders and skip criteria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2 text-xs">
            {/* Enable switch */}
            <div className="flex items-center justify-between p-3 bg-muted/40 rounded-lg border border-border/70">
              <div>
                <p className="font-semibold text-foreground">Enable Daily Automation</p>
                <p className="text-[11px] text-muted-foreground">
                  Automatically evaluate student dues and enqueue email reminders
                </p>
              </div>
              <Switch
                checked={localSettings.enabled}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({ ...prev, enabled: checked }))
                }
              />
            </div>

            {/* Days before due */}
            <div className="space-y-1.5">
              <label className="font-semibold text-foreground flex items-center gap-1.5">
                <CalendarDays className="w-3.5 h-3.5 text-primary" /> Days Before Due Date
              </label>
              <Input
                placeholder="e.g. 7, 3, 1"
                value={localSettings.daysBeforeDue}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, daysBeforeDue: e.target.value }))
                }
                className="text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Comma-separated integers. Reminders trigger on these lead days before the installment due date.
              </p>
            </div>

            {/* Exam toggle */}
            <div className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border/50">
              <div>
                <p className="font-medium text-foreground">Remind Before Exam Windows</p>
                <p className="text-[11px] text-muted-foreground">
                  Send reminder alert 5 days prior to published school term exam dates
                </p>
              </div>
              <Switch
                checked={localSettings.remindBeforeExam}
                onCheckedChange={(checked) =>
                  setLocalSettings((prev) => ({ ...prev, remindBeforeExam: checked }))
                }
              />
            </div>

            {/* Default Administrative Note */}
            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-semibold text-foreground">Default Administrative Note (Optional)</label>
                <span className="text-[10px] text-muted-foreground">{localSettings.defaultAdministrativeNote.length}/500</span>
              </div>
              <Textarea
                placeholder="e.g. Kindly clear all fee dues before exam week to avoid hall ticket suspension."
                value={localSettings.defaultAdministrativeNote}
                maxLength={500}
                onChange={(e) =>
                  setLocalSettings((prev) => ({ ...prev, defaultAdministrativeNote: e.target.value }))
                }
                rows={2}
                className="text-xs resize-none"
              />
              <p className="text-[11px] text-muted-foreground">
                This note will be included by default in scheduled automated reminder emails.
              </p>
            </div>

            {/* Manual Trigger Test Button */}
            <div className="p-3 bg-indigo-50/50 rounded-lg border border-indigo-100 flex items-center justify-between">
              <div>
                <p className="font-semibold text-indigo-950">Test Scheduler Run</p>
                <p className="text-[11px] text-indigo-800/80">Trigger background check manually right now</p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => triggerScheduledMutation.mutate()}
                disabled={triggerScheduledMutation.isPending}
                className="text-xs font-semibold gap-1 bg-white hover:bg-white"
              >
                <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                {triggerScheduledMutation.isPending ? 'Running...' : 'Run Now'}
              </Button>
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsSettingsOpen(false)}
              className="text-xs rounded-lg"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={() => {
                const days = localSettings.daysBeforeDue
                  .split(',')
                  .map((s) => parseInt(s.trim(), 10))
                  .filter((n) => !isNaN(n) && n >= 0);

                updateSettingsMutation.mutate({
                  enabled: localSettings.enabled,
                  daysBeforeDue: days.length > 0 ? days : [7, 3, 1],
                  remindBeforeExam: localSettings.remindBeforeExam,
                  maxRemindersPerDay: 1,
                  defaultAdministrativeNote: localSettings.defaultAdministrativeNote.trim() || null,
                });
              }}
              disabled={updateSettingsMutation.isPending}
              className="text-xs font-bold rounded-lg"
            >
              {updateSettingsMutation.isPending ? 'Saving...' : 'Save Settings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FeeRemindersTab;
