import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import feeApi, { type FeeDefaulter } from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { usePermissions } from '@/store/hooks';
import { formatMoney, toMoney } from '../utils/moneyUtils';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import {
  AlertOctagon,
  Search,
  Filter,
  Send,
  CreditCard,
  Mail,
  RefreshCw,
} from 'lucide-react';

interface DefaultersTabProps {
  classrooms?: Array<{ id: string; name: string }>;
  onCollectPayment?: (studentId: string) => void;
  onViewLedger?: (studentId: string) => void;
}

export const DefaultersTab: React.FC<DefaultersTabProps> = ({
  classrooms = [],
  onCollectPayment,
  onViewLedger,
}) => {
  const queryClient = useQueryClient();
  const { can } = usePermissions();
  const canManage = can('fees', 'manage');
  const canCollect = can('fees', 'collect');

  // Filters
  const [selectedClassroom, setSelectedClassroom] = useState<string>('ALL');
  const [agingBracket, setAgingBracket] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  // 1. Fetch Defaulters
  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: queryKeys.fees.defaulters({
      classroomId: selectedClassroom !== 'ALL' ? selectedClassroom : undefined,
      agingBracket: agingBracket !== 'ALL' ? agingBracket : undefined,
      search: searchTerm || undefined,
    }),
    queryFn: () =>
      feeApi.getDefaulters({
        classroomId: selectedClassroom !== 'ALL' ? selectedClassroom : undefined,
        agingBracket: agingBracket !== 'ALL' ? agingBracket : undefined,
        search: searchTerm || undefined,
      }),
  });

  const defaulters = data?.items || [];

  // Derived KPIs
  const totalOutstanding = defaulters.reduce((acc, d) => acc + toMoney(d.totalOutstanding), 0);
  const criticalOverdueCount = defaulters.filter((d) => d.maxDaysOverdue > 60).length;
  const criticalOverdueAmount = defaulters
    .filter((d) => d.maxDaysOverdue > 60)
    .reduce((acc, d) => acc + toMoney(d.totalOutstanding), 0);

  // Bulk Reminders Mutation
  const bulkRemindMutation = useMutation({
    mutationFn: feeApi.sendBulkReminders,
    onSuccess: (res) => {
      toast.success(`Dispatched reminders to ${res.sentCount} defaulter(s).`);
      setSelectedStudentIds([]);
      queryClient.invalidateQueries({ queryKey: ['fees'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message || 'Failed to dispatch reminders';
      toast.error(msg);
    },
  });

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedStudentIds(defaulters.map((d) => d.studentId));
    } else {
      setSelectedStudentIds([]);
    }
  };

  const handleToggleStudent = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const getAgingBadge = (days: number) => {
    if (days > 90) {
      return (
        <Badge variant="destructive" className="text-[10px] font-bold">
          {days}d Overdue
        </Badge>
      );
    }
    if (days > 60) {
      return (
        <Badge variant="outline" className="text-[10px] font-bold bg-amber-50 text-amber-700 border-amber-300">
          {days}d Overdue
        </Badge>
      );
    }
    if (days > 30) {
      return (
        <Badge variant="outline" className="text-[10px] font-semibold bg-orange-50 text-orange-700 border-orange-200">
          {days}d Overdue
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="text-[10px] font-medium bg-slate-50 text-slate-700 border-slate-200">
        {days}d Overdue
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* 1. Header & Actions */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-card p-4 rounded-xl border border-border/80 shadow-2xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-foreground flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-600" /> Overdue Defaulters Workspace
            </h2>
            <Badge variant="secondary" className="text-xs font-semibold">
              Live Aging Engine
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Identify accounts with overdue balances past scheduled due dates, evaluate aging, and collect immediate dues.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          {canManage && (
            <Button
              size="sm"
              disabled={selectedStudentIds.length === 0 || bulkRemindMutation.isPending}
              onClick={() =>
                bulkRemindMutation.mutate({
                  studentIds: selectedStudentIds,
                  customNote: 'Immediate payment notice: Your school fee account has overdue balance.',
                })
              }
              className="text-xs font-bold gap-1.5 rounded-lg shadow-2xs"
            >
              <Send className="w-3.5 h-3.5" /> Remind Selected ({selectedStudentIds.length})
            </Button>
          )}
        </div>
      </div>

      {/* 2. KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="text-xs font-medium text-muted-foreground">Total Defaulters</div>
            <div className="text-xl sm:text-2xl font-bold text-foreground mt-1">
              {defaulters.length}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1">
              Active accounts with unpaid dues
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="text-xs font-medium text-muted-foreground">Total Overdue Balance</div>
            <div className="text-xl sm:text-2xl font-bold text-rose-600 mt-1">
              {formatMoney(totalOutstanding)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-medium">
              Gross outstanding from overdue cycles
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="text-xs font-medium text-muted-foreground">Critical Overdue (&gt;60 Days)</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-700 mt-1">
              {criticalOverdueCount}
            </div>
            <div className="text-[11px] text-amber-600 mt-1 font-medium">
              Requires immediate administrative review
            </div>
          </CardContent>
        </Card>

        <Card className="border border-border/70 shadow-2xs">
          <CardContent className="p-3.5">
            <div className="text-xs font-medium text-muted-foreground">Critical Dues Amount</div>
            <div className="text-xl sm:text-2xl font-bold text-rose-700 mt-1">
              {formatMoney(criticalOverdueAmount)}
            </div>
            <div className="text-[11px] text-muted-foreground mt-1 font-medium">
              Over 2 months past grace period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* 3. Filter Bar */}
      <div className="p-3.5 bg-muted/30 border border-border/70 rounded-xl space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Search Student / Parent</label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Name, admission no, email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="h-8 pl-8 text-xs bg-background"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Filter Classroom</label>
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

          <div className="space-y-1">
            <label className="text-[11px] font-semibold text-muted-foreground">Aging Bracket</label>
            <Select value={agingBracket} onValueChange={setAgingBracket}>
              <SelectTrigger className="h-8 text-xs bg-background">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Overdue Ages</SelectItem>
                <SelectItem value="1-30">1 - 30 Days Overdue</SelectItem>
                <SelectItem value="31-60">31 - 60 Days Overdue</SelectItem>
                <SelectItem value="61-90">61 - 90 Days Overdue</SelectItem>
                <SelectItem value="90+">Critical 90+ Days Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs pt-1 border-t border-border/50">
          <div className="text-muted-foreground text-[11px] flex items-center gap-1.5">
            <Filter className="w-3 h-3" /> Showing {defaulters.length} accounts with overdue balances
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

      {/* 4. Defaulters Table */}
      <div className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-2xs">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={
                    defaulters.length > 0 && selectedStudentIds.length === defaulters.length
                  }
                  onCheckedChange={handleSelectAll}
                  aria-label="Select all defaulters"
                />
              </TableHead>
              <TableHead className="text-xs font-bold">Student / Admission</TableHead>
              <TableHead className="text-xs font-bold">Class / Quota</TableHead>
              <TableHead className="text-xs font-bold">Parent Contact</TableHead>
              <TableHead className="text-xs font-bold text-center">Aging & Invoices</TableHead>
              <TableHead className="text-xs font-bold text-right">Arrears (&gt;30d)</TableHead>
              <TableHead className="text-xs font-bold text-right">Total Overdue</TableHead>
              <TableHead className="text-xs font-bold text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                  <RefreshCw className="w-4 h-4 animate-spin mx-auto mb-2 text-primary" />
                  Loading overdue defaulter accounts...
                </TableCell>
              </TableRow>
            ) : defaulters.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="text-center py-10 text-muted-foreground text-xs">
                  No fee defaulters found matching criteria. Excellent collection efficiency!
                </TableCell>
              </TableRow>
            ) : (
              defaulters.map((d: FeeDefaulter) => (
                <TableRow key={d.studentId} className="hover:bg-muted/40 transition-colors">
                  <TableCell>
                    <Checkbox
                      checked={selectedStudentIds.includes(d.studentId)}
                      onCheckedChange={() => handleToggleStudent(d.studentId)}
                      aria-label={`Select ${d.studentName}`}
                    />
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="font-semibold text-xs text-foreground">{d.studentName}</div>
                    <div className="text-[11px] text-muted-foreground font-mono">
                      {d.admissionNumber || 'No Adm No'}
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="text-xs font-medium text-foreground">{d.classroomName}</div>
                    <div className="text-[10px] text-muted-foreground uppercase">{d.feeQuota}</div>
                  </TableCell>
                  <TableCell className="py-2.5">
                    <div className="text-xs text-foreground flex items-center gap-1">
                      <Mail className="w-3 h-3 text-muted-foreground" />
                      <span className="truncate max-w-[130px]">{d.guardianEmail || 'None'}</span>
                    </div>
                    <div className="text-[10px] text-muted-foreground">{d.guardianPhone || ''}</div>
                  </TableCell>
                  <TableCell className="py-2.5 text-center">
                    <div className="flex flex-col items-center gap-0.5">
                      {getAgingBadge(d.maxDaysOverdue)}
                      <span className="text-[10px] text-muted-foreground">
                        {d.overdueInvoicesCount} overdue invoice(s)
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-medium text-xs text-rose-600">
                    {formatMoney(d.arrearsAmount)}
                  </TableCell>
                  <TableCell className="py-2.5 text-right font-bold text-xs text-rose-700">
                    {formatMoney(d.totalOutstanding)}
                  </TableCell>
                  <TableCell className="py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {onViewLedger && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onViewLedger(d.studentId)}
                          className="h-7 text-xs px-2 text-primary font-semibold hover:underline"
                        >
                          Ledger
                        </Button>
                      )}
                      {onCollectPayment && canCollect && (
                        <Button
                          size="sm"
                          onClick={() => onCollectPayment(d.studentId)}
                          className="h-7 text-xs px-2.5 font-bold gap-1 rounded-md"
                        >
                          <CreditCard className="w-3 h-3" /> Collect
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

export default DefaultersTab;
