import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import feeApi from '../api/feeApi';
import queryKeys from '@/lib/queryKeys';
import { formatMoney } from '../utils/moneyUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
import {
  Target,
  TrendingUp,
  CheckCircle2,
  Clock,
  Calendar,
  Layers,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

interface CollectionTargetsCardProps {
  academicYears: Array<{ id: string; name: string; isCurrent: boolean }>;
  classrooms: Array<{ id: string; name: string; section?: string; academicClassId?: string }>;
  academicClasses?: Array<{ id: string; name: string }>;
}

export const CollectionTargetsCard: React.FC<CollectionTargetsCardProps> = ({
  academicYears,
  classrooms,
  academicClasses = [],
}) => {
  const currentAcademicYear = academicYears.find((y) => y.isCurrent) || academicYears[0];
  const [selectedAcademicYear, setSelectedAcademicYear] = useState<string>(currentAcademicYear?.id || '');
  const [selectedClassroom, setSelectedClassroom] = useState<string>('ALL');
  const [selectedAcademicClass, setSelectedAcademicClass] = useState<string>('ALL');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await feeApi.exportCollectionTargetsCsv({
        academicYearId: selectedAcademicYear || undefined,
        classroomId: selectedClassroom !== 'ALL' ? selectedClassroom : undefined,
        academicClassId: selectedAcademicClass !== 'ALL' ? selectedAcademicClass : undefined,
      });

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Collection_Targets_${selectedAcademicYear || 'Session'}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Collection targets CSV exported successfully');
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to export targets CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const { data, isLoading } = useQuery({
    queryKey: queryKeys.fees.collectionTargets({
      academicYearId: selectedAcademicYear || undefined,
      classroomId: selectedClassroom !== 'ALL' ? selectedClassroom : undefined,
      academicClassId: selectedAcademicClass !== 'ALL' ? selectedAcademicClass : undefined,
    }),
    queryFn: () =>
      feeApi.getInstallmentCollectionTargets({
        academicYearId: selectedAcademicYear || undefined,
        classroomId: selectedClassroom !== 'ALL' ? selectedClassroom : undefined,
        academicClassId: selectedAcademicClass !== 'ALL' ? selectedAcademicClass : undefined,
      }),
  });

  const summary = data?.sessionSummary;
  const intervals = data?.intervals || [];

  return (
    <Card className="border border-border/80 bg-card shadow-xs rounded-2xl overflow-hidden mb-5">
      <CardHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Target className="w-5 h-5" />
            </div>
            <div>
              <CardTitle className="text-base font-bold text-foreground flex items-center gap-2">
                Interval-Wise Collection Target Tracker
                <Badge variant="outline" className="text-[10px] font-semibold bg-primary/5 text-primary border-primary/20">
                  Live Sync
                </Badge>
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                Session targets partitioned across installment intervals (15 Jun, 15 Sep, 15 Dec, 15 Mar) with shortfall analysis.
              </p>
            </div>
          </div>

          {/* Scope Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            <Select
              value={selectedAcademicYear || currentAcademicYear?.id || ''}
              onValueChange={setSelectedAcademicYear}
            >
              <SelectTrigger className="h-8 text-xs w-36 bg-background rounded-lg">
                <SelectValue placeholder="Academic Session" />
              </SelectTrigger>
              <SelectContent>
                {academicYears.map((y) => (
                  <SelectItem key={y.id} value={y.id} className="text-xs">
                    {y.name} {y.isCurrent ? '(Current)' : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {academicClasses.length > 0 && (
              <Select value={selectedAcademicClass} onValueChange={setSelectedAcademicClass}>
                <SelectTrigger className="h-8 text-xs w-32 bg-background rounded-lg">
                  <SelectValue placeholder="All Grades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL" className="text-xs">All Grades</SelectItem>
                  {academicClasses.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id} className="text-xs">
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <Select value={selectedClassroom} onValueChange={setSelectedClassroom}>
              <SelectTrigger className="h-8 text-xs w-36 bg-background rounded-lg">
                <SelectValue placeholder="Classroom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL" className="text-xs">All Sections</SelectItem>
                {classrooms.map((c) => (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {c.name} {c.section ? `(${c.section})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Button
              variant="outline"
              size="sm"
              onClick={handleExportCsv}
              disabled={isExporting || isLoading}
              className="h-8 text-xs gap-1.5 bg-background border-border"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Exporting...' : 'Export CSV'}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-4 sm:p-5 space-y-4">
        {/* KPI Session Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="p-3 bg-muted/40 border border-border/80 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Session Target</span>
              <Target className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-lg font-mono font-bold text-foreground mt-1">
              {formatMoney(summary?.totalTarget || 0)}
            </div>
            <span className="text-[10px] text-muted-foreground block mt-0.5">
              100% Billable Net
            </span>
          </div>

          <div className="p-3 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/60 dark:border-emerald-800/60 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-emerald-800 dark:text-emerald-300">Total Collected</span>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            </div>
            <div className="text-lg font-mono font-bold text-emerald-700 dark:text-emerald-400 mt-1">
              {formatMoney(summary?.totalCollected || 0)}
            </div>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block mt-0.5 font-medium">
              {summary?.overallPercentage || 0}% Cleared
            </span>
          </div>

          <div className="p-3 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-800/60 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-amber-800 dark:text-amber-300">Pending Shortfall</span>
              <Clock className="w-3.5 h-3.5 text-amber-600" />
            </div>
            <div className="text-lg font-mono font-bold text-amber-700 dark:text-amber-400 mt-1">
              {formatMoney(summary?.totalPending || 0)}
            </div>
            <span className="text-[10px] text-amber-700/80 dark:text-amber-400/80 block mt-0.5">
              Across open terms
            </span>
          </div>

          <div className="p-3 bg-muted/40 border border-border/80 rounded-xl">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase font-semibold text-muted-foreground">Overall Velocity</span>
              <TrendingUp className="w-3.5 h-3.5 text-primary" />
            </div>
            <div className="text-lg font-mono font-bold text-foreground mt-1">
              {summary?.overallPercentage || 0}%
            </div>
            <div className="w-full mt-1.5">
              <Progress value={summary?.overallPercentage || 0} className="h-1.5" />
            </div>
          </div>
        </div>

        {/* Intervals Table */}
        <div className="border border-border/80 rounded-xl overflow-hidden bg-card">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="text-xs font-semibold">Installment Interval</TableHead>
                <TableHead className="text-xs font-semibold">Due Date</TableHead>
                <TableHead className="text-xs font-semibold text-right">Target (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Collected (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-right">Pending (₹)</TableHead>
                <TableHead className="text-xs font-semibold text-center">Students (Paid / Total)</TableHead>
                <TableHead className="text-xs font-semibold min-w-[120px]">Completion</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-6 text-xs text-muted-foreground">
                    Loading interval targets...
                  </TableCell>
                </TableRow>
              ) : intervals.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-xs text-muted-foreground">
                    <Layers className="w-6 h-6 mx-auto mb-1 text-muted-foreground/60" />
                    No installment schedules generated for this selection. Generate bulk invoices to activate target tracking.
                  </TableCell>
                </TableRow>
              ) : (
                intervals.map((inv) => {
                  const isPastDue = inv.dueDate && new Date(inv.dueDate) < new Date();
                  const isFullyCollected = inv.collectionPercentage >= 100;

                  return (
                    <TableRow key={inv.installmentNumber} className="hover:bg-muted/30">
                      <TableCell>
                        <div className="font-semibold text-foreground text-xs flex items-center gap-1.5">
                          <span>Inst #{inv.installmentNumber}</span>
                          <span className="text-muted-foreground font-normal">({inv.title})</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 text-xs font-mono">
                          <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className={isPastDue && !isFullyCollected ? 'text-rose-600 font-semibold' : 'text-foreground'}>
                            {inv.dueDate}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-semibold text-foreground">
                        {formatMoney(inv.targetAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {formatMoney(inv.collectedAmount)}
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs font-bold text-amber-700 dark:text-amber-400">
                        {formatMoney(inv.pendingAmount)}
                      </TableCell>
                      <TableCell className="text-center text-xs">
                        <Badge variant="outline" className="font-mono text-[10px] font-medium">
                          {inv.paidStudentsCount} / {inv.totalStudents}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex justify-between text-[11px] font-mono">
                            <span className="font-bold text-foreground">{inv.collectionPercentage}%</span>
                            {isFullyCollected ? (
                              <span className="text-[10px] text-emerald-600 font-semibold">Complete</span>
                            ) : isPastDue ? (
                              <span className="text-[10px] text-rose-600 font-semibold">{inv.overdueStudentsCount} Overdue</span>
                            ) : (
                              <span className="text-[10px] text-muted-foreground">On Track</span>
                            )}
                          </div>
                          <Progress
                            value={inv.collectionPercentage}
                            className={`h-1.5 ${isFullyCollected ? '[&>div]:bg-emerald-600' : ''}`}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionTargetsCard;