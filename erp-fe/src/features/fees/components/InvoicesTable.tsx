import React from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Receipt, UserCheck, Eye, IndianRupee } from 'lucide-react';
import { StatusBadge } from '@/components/common/StatusBadge';
import { DataTable, type Column } from '@/components/common/DataTable';
import type { StudentInvoice } from '../api/feeApi';

interface InvoicesTableProps {
  invoices: StudentInvoice[];
  isLoading: boolean;
  onCollectPayment: (invoice: StudentInvoice) => void;
  onViewLedger: (studentId: string) => void;
  onViewInvoiceDetails: (invoice: StudentInvoice) => void;
  onIssueInvoiceClick?: () => void;
}

export const InvoicesTable: React.FC<InvoicesTableProps> = ({
  invoices,
  isLoading,
  onCollectPayment,
  onViewLedger,
  onViewInvoiceDetails,
  onIssueInvoiceClick,
}) => {
  const columns: Column<StudentInvoice>[] = [
    {
      header: 'Invoice No.',
      cell: (inv) => (
        <span className="font-mono text-xs font-semibold text-primary">
          {inv.invoiceNumber}
        </span>
      ),
    },
    {
      header: 'Student',
      cell: (inv) => {
        const studentName = inv.student?.user
          ? `${inv.student.user.firstName} ${inv.student.user.lastName}`
          : 'Unknown Student';
        const admNo = inv.student?.admissionNumber || '—';
        return (
          <div>
            <div className="font-medium text-foreground text-xs">{studentName}</div>
            <div className="text-[11px] text-muted-foreground">Adm: {admNo}</div>
          </div>
        );
      },
    },
    {
      header: 'Class',
      cell: (inv) => (
        <span className="text-xs text-muted-foreground">
          {inv.classroom ? `${inv.classroom.name} (${inv.classroom.section})` : '—'}
        </span>
      ),
    },
    {
      header: 'Title & Due',
      cell: (inv) => (
        <div>
          <div className="text-xs font-medium text-foreground line-clamp-1">{inv.title}</div>
          <div className="text-[11px] text-muted-foreground">Due: {inv.dueDate}</div>
        </div>
      ),
    },
    {
      header: 'Total (₹)',
      className: 'text-right',
      cell: (inv) => (
        <div className="text-right text-xs font-semibold text-foreground">
          ₹{Number(inv.totalAmount).toLocaleString('en-IN')}
        </div>
      ),
    },
    {
      header: 'Paid (₹)',
      className: 'text-right',
      cell: (inv) => (
        <div className="text-right text-xs font-medium text-emerald-600 dark:text-emerald-400">
          ₹{Number(inv.paidAmount).toLocaleString('en-IN')}
        </div>
      ),
    },
    {
      header: 'Balance (₹)',
      className: 'text-right',
      cell: (inv) => (
        <div className="text-right text-xs font-bold text-amber-700 dark:text-amber-400">
          ₹{Number(inv.balanceAmount || 0).toLocaleString('en-IN')}
        </div>
      ),
    },
    {
      header: 'Status',
      className: 'text-center',
      cell: (inv) => (
        <div className="flex justify-center">
          <StatusBadge status={inv.status} />
        </div>
      ),
    },
    {
      header: 'Actions',
      className: 'text-right',
      cell: (inv) => {
        const balance = Number(inv.balanceAmount || 0);
        return (
          <div className="flex items-center justify-end gap-1">
            {balance > 0 && inv.status !== 'CANCELLED' && (
              <Button
                size="sm"
                className="h-7 text-xs px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white gap-1 shadow-xs"
                onClick={() => onCollectPayment(inv)}
              >
                <IndianRupee className="w-3.5 h-3.5" />
                Collect
              </Button>
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="text-xs">
                <DropdownMenuItem onClick={() => onViewInvoiceDetails(inv)}>
                  <Eye className="w-3.5 h-3.5 mr-2" /> View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onViewLedger(inv.studentId)}>
                  <UserCheck className="w-3.5 h-3.5 mr-2" /> View Student Ledger
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        );
      },
    },
  ];

  // Mobile card view representation
  const renderMobileCard = (inv: StudentInvoice) => {
    const studentName = inv.student?.user
      ? `${inv.student.user.firstName} ${inv.student.user.lastName}`
      : 'Unknown Student';
    const balance = Number(inv.balanceAmount || 0);

    return (
      <div className="p-4 bg-card border border-border/80 rounded-xl space-y-3 shadow-xs">
        <div className="flex justify-between items-start">
          <div>
            <span className="font-mono text-xs font-semibold text-primary">{inv.invoiceNumber}</span>
            <h4 className="text-sm font-semibold text-foreground mt-0.5">{studentName}</h4>
            <p className="text-xs text-muted-foreground">
              {inv.classroom ? `${inv.classroom.name} (${inv.classroom.section})` : '—'}
            </p>
          </div>
          <StatusBadge status={inv.status} />
        </div>

        <div className="grid grid-cols-3 gap-2 py-2 border-y border-border/50 text-xs">
          <div>
            <span className="text-[11px] text-muted-foreground block">Total</span>
            <span className="font-semibold text-foreground">₹{Number(inv.totalAmount).toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Paid</span>
            <span className="font-semibold text-emerald-600">₹{Number(inv.paidAmount).toLocaleString('en-IN')}</span>
          </div>
          <div>
            <span className="text-[11px] text-muted-foreground block">Balance</span>
            <span className="font-bold text-amber-700">₹{balance.toLocaleString('en-IN')}</span>
          </div>
        </div>

        <div className="flex justify-between items-center pt-1">
          <span className="text-xs text-muted-foreground">Due: {inv.dueDate}</span>
          <div className="flex gap-2">
            {balance > 0 && inv.status !== 'CANCELLED' && (
              <Button
                size="sm"
                className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => onCollectPayment(inv)}
              >
                Collect
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              className="h-7 text-xs"
              onClick={() => onViewLedger(inv.studentId)}
            >
              Ledger
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <DataTable
      columns={columns}
      data={invoices}
      keyExtractor={(inv) => inv.id}
      isLoading={isLoading}
      emptyTitle="No student invoices found"
      emptyDescription="Generate an invoice for an individual student or issue in bulk for an entire classroom to start collection."
      emptyIcon={Receipt}
      emptyActionLabel={onIssueInvoiceClick ? "Issue Class Invoices" : undefined}
      onEmptyAction={onIssueInvoiceClick}
      renderMobileCard={renderMobileCard}
    />
  );
};

export default InvoicesTable;
