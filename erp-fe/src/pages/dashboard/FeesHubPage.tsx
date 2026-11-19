import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import feeApi, { type StudentInvoice } from '@/features/fees/api/feeApi';
import queryKeys from '@/lib/queryKeys';
import api from '@/lib/api';
import { PageHeader } from '@/components/common/PageHeader';
import FilterBar from '@/components/common/FilterBar';
import FeeSummaryCards from '@/features/fees/components/FeeSummaryCards';
import InvoicesTable from '@/features/fees/components/InvoicesTable';
import CollectPaymentDialog from '@/features/fees/components/CollectPaymentDialog';
import StudentLedgerDrawer from '@/features/fees/components/StudentLedgerDrawer';
import GenerateBulkInvoiceModal from '@/features/fees/components/GenerateBulkInvoiceModal';
import FeeStructuresTab from '@/features/fees/components/FeeStructuresTab';
import FeeHeadsTab from '@/features/fees/components/FeeHeadsTab';
import FeeRemindersTab from '@/features/fees/components/FeeRemindersTab';
import PrintReceiptModal from '@/features/fees/components/PrintReceiptModal';
import { Receipt, Plus, Layers, Tag, BellRing } from 'lucide-react';

export const FeesHubPage: React.FC = () => {
  // Query Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [classroomFilter, setClassroomFilter] = useState<string>('ALL');

  // Modals & Drawers
  const [isBulkInvoiceOpen, setIsBulkInvoiceOpen] = useState(false);
  const [paymentInvoice, setPaymentInvoice] = useState<StudentInvoice | null>(null);
  const [ledgerStudentId, setLedgerStudentId] = useState<string | null>(null);
  const [printReceiptId, setPrintReceiptId] = useState<string | null>(null);

  // 1. Fee Stats
  const { data: stats, isLoading: isStatsLoading } = useQuery({
    queryKey: queryKeys.fees.summary(),
    queryFn: feeApi.getSummaryStats,
  });

  // 2. Academic Classes, Classrooms & Academic Years list
  const { data: academicClasses = [] } = useQuery({
    queryKey: ['academic-classes'],
    queryFn: async () => {
      const res = await api.get('/classes');
      return res.data.data?.classes || res.data.data || [];
    },
  });

  const { data: classrooms = [] } = useQuery({
    queryKey: queryKeys.classrooms.list(),
    queryFn: async () => {
      const res = await api.get('/classrooms');
      return res.data.data?.classrooms || res.data.data || [];
    },
  });

  const { data: academicYears = [] } = useQuery({
    queryKey: ['academic-years'],
    queryFn: async () => {
      const res = await api.get('/academic-years');
      return res.data.data || [];
    },
  });

  // 3. Fee Heads & Fee Structures
  const { data: feeHeads = [] } = useQuery({
    queryKey: queryKeys.fees.heads(),
    queryFn: () => feeApi.getFeeHeads(),
  });

  const { data: feeStructures = [] } = useQuery({
    queryKey: queryKeys.fees.structures(),
    queryFn: () => feeApi.getFeeStructures(),
  });

  // 4. Invoices
  const { data: invoicesData, isLoading: isInvoicesLoading } = useQuery({
    queryKey: queryKeys.fees.invoices({
      status: statusFilter !== 'ALL' ? statusFilter : undefined,
      classroomId: classroomFilter !== 'ALL' ? classroomFilter : undefined,
      search: searchTerm || undefined,
    }),
    queryFn: () =>
      feeApi.getInvoices({
        status: statusFilter !== 'ALL' ? statusFilter : undefined,
        classroomId: classroomFilter !== 'ALL' ? classroomFilter : undefined,
        search: searchTerm || undefined,
      }),
  });

  const invoices = invoicesData?.items || [];
  const hasActiveFilters = searchTerm !== '' || statusFilter !== 'ALL' || classroomFilter !== 'ALL';

  const handleClearFilters = () => {
    setSearchTerm('');
    setStatusFilter('ALL');
    setClassroomFilter('ALL');
  };

  return (
    <div className="space-y-6">
      {/* Top Header matching ERP PageHeader standard */}
      <PageHeader
        title="Fees & Billing Management"
        description="Collect school fees, issue itemized invoices, configure fee tiers and audit student accounts."
      >
        <Button
          size="sm"
          className="rounded-xl font-bold shadow-xs gap-1.5 text-xs"
          onClick={() => setIsBulkInvoiceOpen(true)}
        >
          <Plus className="w-4 h-4" /> Issue Class Invoices
        </Button>
      </PageHeader>

      {/* KPI Stats Overview using standardized StatCards */}
      <FeeSummaryCards stats={stats} isLoading={isStatsLoading} />

      {/* Main Tabs matching ClassroomDetails executive tabs standard */}
      <Tabs defaultValue="invoices" className="w-full space-y-4">
        <TabsList className="w-full justify-start overflow-x-auto flex-nowrap whitespace-nowrap scrollbar-none bg-muted/40 p-1 sm:p-1.5 rounded-xl sm:rounded-2xl h-auto border border-border/70 gap-1 sm:gap-1.5">
          <TabsTrigger
            value="invoices"
            className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-state=active:bg-background data-state=active:shadow-xs"
          >
            <Receipt className="h-3.5 w-3.5 text-primary" /> Invoices & Dues
          </TabsTrigger>
          <TabsTrigger
            value="structures"
            className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-state=active:bg-background data-state=active:shadow-xs"
          >
            <Layers className="h-3.5 w-3.5 text-primary" /> Fee Structures
          </TabsTrigger>
          <TabsTrigger
            value="heads"
            className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-state=active:bg-background data-state=active:shadow-xs"
          >
            <Tag className="h-3.5 w-3.5 text-primary" /> Fee Heads Catalog
          </TabsTrigger>
          <TabsTrigger
            value="reminders"
            className="shrink-0 whitespace-nowrap text-xs sm:text-sm font-bold gap-1.5 sm:gap-2 rounded-lg sm:rounded-xl py-1.5 sm:py-2 px-3 sm:px-4 data-state=active:bg-background data-state=active:shadow-xs"
          >
            <BellRing className="h-3.5 w-3.5 text-primary" /> Fee Reminders
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Invoices */}
        <TabsContent value="invoices" className="space-y-4 mt-4">
          {/* Reusable FilterBar */}
          <FilterBar
            searchQuery={searchTerm}
            onSearchChange={setSearchTerm}
            searchPlaceholder="Search invoice number, title or student..."
            hasActiveFilters={hasActiveFilters}
            onClearFilters={handleClearFilters}
          >
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-36 h-9 text-xs bg-background">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Statuses</SelectItem>
                <SelectItem value="ISSUED">Issued / Unpaid</SelectItem>
                <SelectItem value="PARTIALLY_PAID">Partially Paid</SelectItem>
                <SelectItem value="PAID">Paid in Full</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={classroomFilter} onValueChange={setClassroomFilter}>
              <SelectTrigger className="w-44 h-9 text-xs bg-background">
                <SelectValue placeholder="Classroom" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Classrooms</SelectItem>
                {classrooms.map((c: any) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} (Grade {c.grade})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </FilterBar>

          {/* Reusable DataTable with Shared EmptyState & Mobile Cards */}
          <InvoicesTable
            invoices={invoices}
            isLoading={isInvoicesLoading}
            onCollectPayment={(inv) => setPaymentInvoice(inv)}
            onViewLedger={(sId) => setLedgerStudentId(sId)}
            onViewInvoiceDetails={(inv) => setLedgerStudentId(inv.studentId)}
            onIssueInvoiceClick={() => setIsBulkInvoiceOpen(true)}
          />
        </TabsContent>

        {/* Tab 2: Fee Structures */}
        <TabsContent value="structures" className="mt-4">
          <FeeStructuresTab
            structures={feeStructures}
            feeHeads={feeHeads}
            academicYears={academicYears}
            academicClasses={academicClasses}
          />
        </TabsContent>

        {/* Tab 3: Fee Heads */}
        <TabsContent value="heads" className="mt-4">
          <FeeHeadsTab feeHeads={feeHeads} />
        </TabsContent>

        {/* Tab 4: Fee Reminders Automation */}
        <TabsContent value="reminders" className="mt-4">
          <FeeRemindersTab
            classrooms={classrooms}
            onOpenLedger={(sId) => setLedgerStudentId(sId)}
          />
        </TabsContent>
      </Tabs>

      {/* Modals & Drawers */}
      <CollectPaymentDialog
        invoice={paymentInvoice}
        isOpen={!!paymentInvoice}
        onClose={() => setPaymentInvoice(null)}
        onSuccessPayment={(receiptId) => setPrintReceiptId(receiptId)}
      />

      <StudentLedgerDrawer
        studentId={ledgerStudentId}
        isOpen={!!ledgerStudentId}
        onClose={() => setLedgerStudentId(null)}
        onPrintReceipt={(receiptId) => setPrintReceiptId(receiptId)}
      />

      <GenerateBulkInvoiceModal
        isOpen={isBulkInvoiceOpen}
        onClose={() => setIsBulkInvoiceOpen(false)}
        feeStructures={feeStructures}
        classrooms={classrooms}
        academicYears={academicYears}
      />

      <PrintReceiptModal
        receiptId={printReceiptId}
        isOpen={!!printReceiptId}
        onClose={() => setPrintReceiptId(null)}
      />
    </div>
  );
};

export default FeesHubPage;
