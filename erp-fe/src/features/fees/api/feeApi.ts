import api from '@/lib/api';

export interface FeeHead {
  id: string;
  name: string;
  code: string;
  description?: string | null;
  category?: 'TUITION' | 'ADMISSION' | 'EXAM' | 'LAB' | 'TRANSPORT' | 'ACTIVITY' | 'LIBRARY' | 'HOSTEL' | 'FINE' | 'OTHER';
  isOptional?: boolean;
  isRefundable?: boolean;
  status?: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructureItem {
  id?: string;
  feeStructureId?: string;
  feeHeadId: string;
  amount: number;
  frequency?: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'TERM' | 'ONE_TIME';
  isEnabled?: boolean;
  feeHead?: FeeHead;
}

export interface FeeStructureDiscount {
  id?: string;
  feeStructureId?: string;
  quota: 'GENERAL' | 'STAFF_CHILD' | 'SCHOLARSHIP_HALF' | 'SCHOLARSHIP_FULL' | 'SIBLING_DISCOUNT' | 'RTE' | 'OTHER';
  discountType: 'PERCENTAGE' | 'FIXED_AMOUNT';
  discountValue: number;
  scope: 'ALL_HEADS' | 'SPECIFIC_HEADS';
  applicableFeeHeadIds?: string[];
}

export interface FeeStructure {
  id: string;
  name: string;
  academicYearId: string;
  academicClassId?: string;
  classroomId?: string | null;
  activeFrequencies?: string[];
  frequency?: string;
  totalAmount?: number;
  dueDayOfMonth?: number;
  lateFinePerDay?: number;
  lateFineAmount?: number;
  minimumPaymentAmount?: number;
  allowBelowMinimum?: boolean;
  status: 'ACTIVE' | 'INACTIVE';
  isActive?: boolean;
  academicYear?: { id: string; name: string; isCurrent: boolean };
  academicClass?: { id: string; name: string; code: string; orderIndex: number };
  classroom?: { id: string; name: string; grade: number; section: string };
  items?: FeeStructureItem[];
  discounts?: FeeStructureDiscount[];
  createdAt: string;
  updatedAt: string;
}

export interface StudentInvoiceItem {
  id: string;
  studentInvoiceId?: string;
  feeHeadId?: string;
  headName?: string;
  title?: string;
  amount: number;
  discountAmount?: number;
  netAmount?: number;
  notes?: string | null;
  feeHead?: FeeHead;
}

export interface FeePaymentDetails {
  paymentMode?: string;
  upiId?: string | null;
  payerName?: string | null;
  transactionReference?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  chequeBank?: string | null;
  chequeStatus?: string | null;
  bankName?: string | null;
  transferDate?: string | null;
  cardRef?: string | null;
  cardLast4?: string | null;
  authCode?: string | null;
  notes?: string | null;
  [key: string]: unknown;
}

export interface FeePayment {
  id: string;
  receiptNumber: string;
  studentInvoiceId?: string;
  invoiceId?: string;
  studentId: string;
  amountPaid?: number;
  amount?: number;
  paymentMode: 'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHEQUE' | 'CARD' | 'DEMAND_DRAFT' | 'ONLINE' | 'OTHER';
  paymentDate: string;
  status?: 'SUCCESS' | 'BOUNCED' | 'REVERSED' | 'CANCELLED';
  isBelowMinimum?: boolean;
  belowMinimumReasonCode?: string | null;
  belowMinimumReasonText?: string | null;
  advanceCreditAmount?: number;
  referenceNumber?: string | null;
  transactionReference?: string | null;
  chequeNumber?: string | null;
  chequeDate?: string | null;
  bankName?: string | null;
  notes?: string | null;
  paymentDetails?: FeePaymentDetails | null;
  collectedBy?: { id: string; firstName: string; lastName: string; email?: string };
  invoice?: StudentInvoice;
  isReversed?: boolean;
  reversedAt?: string | null;
  reversedById?: string | null;
  reversalReason?: string | null;
  student?: {
    id: string;
    admissionNumber: string;
    account?: {
      firstName: string;
      lastName: string;
      email: string;
      phone?: string;
    };
  };
  createdAt: string;
}

export interface StudentInvoice {
  id: string;
  invoiceNumber: string;
  studentId: string;
  classroomId?: string | null;
  academicYearId: string;
  feeStructureId?: string | null;
  title: string;
  description?: string | null;
  dueDate: string;
  subtotalAmount: number;
  discountAmount: number;
  fineAmount: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  status: 'DRAFT' | 'ISSUED' | 'PARTIALLY_PAID' | 'PAID' | 'CANCELLED';
  periodKey?: string | null;
  frequency?: string | null;
  issuedDate: string;
  notes?: string | null;
  student?: {
    id: string;
    admissionNumber: string;
    rollNumber: string;
    user?: { id: string; firstName: string; lastName: string; email: string; avatar?: string };
    account?: { id: string; firstName: string; lastName: string; email: string; avatar?: string };
  };
  classroom?: { id: string; name: string; grade: number; section: string };
  academicYear?: { id: string; name: string; code: string; isCurrent: boolean };
  items?: StudentInvoiceItem[];
  payments?: FeePayment[];
  createdAt: string;
  updatedAt: string;
}

export interface FeeSummaryStats {
  totals: {
    totalBilled: string | number;
    totalCollected: string | number;
    totalPending: string | number;
  };
  today: {
    todayTotal: string | number;
    todayCash: string | number;
    todayUpi: string | number;
    todayBankTransfer: string | number;
  };
  statusBreakdown: Array<{ status: string; count: string | number }>;
}

export interface StudentLedgerData {
  student: {
    id: string;
    admissionNumber: string;
    rollNumber: string;
    user?: { firstName: string; lastName: string; email: string; phone?: string; avatar?: string };
    classroom?: { id: string; name: string; grade: number; section: string };
  };
  assignedStructure?: {
    id: string;
    name: string;
    className?: string;
    monthlyDues: number;
    quarterlyDues: number;
    annualDues: number;
    headsCount: number;
  } | null;
  summary: {
    totalBilled: number;
    totalPaid: number;
    outstandingBalance: number;
    invoicesCount: number;
    paymentsCount: number;
  };
  invoices: StudentInvoice[];
  payments: FeePayment[];
}

export interface BulkClassInvoicePreviewStudent {
  studentId: string;
  name: string;
  admissionNumber: string;
  rollNumber: string;
  quota: string;
  subtotal: number;
  discount: number;
  netPayable: number;
  eligible: boolean;
  skipReason?: string | null;
  existingInvoice?: { id: string; number: string } | null;
  lineItems: Array<{ feeHeadId: string; headName: string; amount: number; discountAmount: number; netAmount: number }>;
}

export interface BulkClassInvoicePreviewResponse {
  structure: {
    id: string;
    name: string;
    frequency: string;
    periodLabel: string;
    activeFrequencies?: string[];
    chargedHeads: Array<{ feeHeadId: string; name: string; code?: string; amount: number }>;
    discounts?: FeeStructureDiscount[];
  };
  students: BulkClassInvoicePreviewStudent[];
  summary: {
    totalStudents: number;
    eligibleCount: number;
    skippedCount: number;
    totalGross: number;
    totalDiscount: number;
    totalNet: number;
  };
}

export interface BulkClassInvoicePayload {
  classroomId: string;
  academicYearId: string;
  feeStructureId: string;
  frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'TERM' | 'ONE_TIME';
  periodLabel?: string;
  title: string;
  description?: string;
  dueDate: string;
  notes?: string;
  selectedStudentIds?: string[];
}

export interface BulkClassInvoiceResult {
  message: string;
  count: number;
  skippedCount: number;
  createdInvoices: Array<{ id: string; invoiceNumber: string; studentId: string; amount: number }>;
  skippedStudents: Array<{ studentId?: string; reason: string }>;
}

export const feeApi = {
  // Summary
  getSummaryStats: async (): Promise<FeeSummaryStats> => {
    const res = await api.get('/fees/summary');
    return res.data.data;
  },

  // Fee Heads
  getFeeHeads: async (params?: { isActive?: boolean; category?: string }): Promise<FeeHead[]> => {
    const res = await api.get('/fees/heads', { params });
    return res.data.data;
  },

  createFeeHead: async (payload: Partial<FeeHead>): Promise<FeeHead> => {
    const res = await api.post('/fees/heads', payload);
    return res.data.data;
  },

  updateFeeHead: async (id: string, payload: Partial<FeeHead>): Promise<FeeHead> => {
    const res = await api.put(`/fees/heads/${id}`, payload);
    return res.data.data;
  },

  deleteFeeHead: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete(`/fees/heads/${id}`);
    return res.data.data;
  },

  // Fee Structures
  getFeeStructures: async (params?: { academicYearId?: string; classroomId?: string; quota?: string; isActive?: boolean }): Promise<FeeStructure[]> => {
    const res = await api.get('/fees/structures', { params });
    return res.data.data;
  },

  getFeeStructureById: async (id: string): Promise<FeeStructure> => {
    const res = await api.get(`/fees/structures/${id}`);
    return res.data.data;
  },

  createFeeStructure: async (payload: {
    name: string;
    academicYearId: string;
    academicClassId?: string;
    classroomId?: string | null;
    quota?: string;
    frequency?: string;
    activeFrequencies?: string[];
    dueDayOfMonth?: number;
    lateFinePerDay?: number;
    lateFineAmount?: number;
    lateFineGraceDays?: number;
    minimumPaymentAmount?: number;
    allowBelowMinimum?: boolean;
    status?: 'ACTIVE' | 'INACTIVE';
    isActive?: boolean;
    items: Array<{ feeHeadId: string; amount: number; frequency?: string; isEnabled?: boolean; isMandatory?: boolean; notes?: string }>;
    discounts?: Array<{
      quota: string;
      discountType: string;
      discountValue: number;
      scope: string;
      applicableFeeHeadIds?: string[];
    }>;
  }): Promise<FeeStructure> => {
    const res = await api.post('/fees/structures', payload);
    return res.data.data;
  },

  updateFeeStructure: async (id: string, payload: Partial<FeeStructure>): Promise<FeeStructure> => {
    const res = await api.put(`/fees/structures/${id}`, payload);
    return res.data.data;
  },

  updateFeeStructureStatus: async (id: string, status: 'ACTIVE' | 'INACTIVE'): Promise<FeeStructure> => {
    const res = await api.patch(`/fees/structures/${id}/status`, { status });
    return res.data.data;
  },

  deleteFeeStructure: async (id: string): Promise<{ message: string }> => {
    const res = await api.delete(`/fees/structures/${id}`);
    return res.data.data;
  },

  // Invoices
  getInvoices: async (params?: {
    studentId?: string;
    classroomId?: string;
    academicYearId?: string;
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ items: StudentInvoice[]; pagination: { total: number; page: number; limit: number; totalPages: number } }> => {
    const res = await api.get('/fees/invoices', { params });
    return {
      items: res.data.data || [],
      pagination: res.data.pagination || { total: 0, page: 1, limit: 20, totalPages: 1 },
    };
  },

  getInvoiceById: async (id: string): Promise<StudentInvoice> => {
    const res = await api.get(`/fees/invoices/${id}`);
    return res.data.data;
  },

  generateSingleInvoice: async (payload: {
    studentId: string;
    academicYearId: string;
    feeStructureId?: string | null;
    title: string;
    description?: string;
    dueDate: string;
    discountAmount?: number;
    fineAmount?: number;
    notes?: string;
    items: Array<{ feeHeadId: string; title: string; amount: number; discountAmount?: number; notes?: string }>;
  }): Promise<StudentInvoice> => {
    const res = await api.post('/fees/invoices/single', payload);
    return res.data.data;
  },

  previewBulkClassInvoices: async (payload: {
    classroomId: string;
    academicYearId: string;
    feeStructureId: string;
    frequency: 'MONTHLY' | 'QUARTERLY' | 'ANNUAL' | 'TERM' | 'ONE_TIME';
    periodLabel?: string;
  }): Promise<BulkClassInvoicePreviewResponse> => {
    const res = await api.post('/fees/invoices/bulk-preview', payload);
    return res.data.data;
  },

  generateBulkClassInvoices: async (payload: BulkClassInvoicePayload): Promise<BulkClassInvoiceResult> => {
    const res = await api.post('/fees/invoices/bulk-class', payload);
    return res.data.data;
  },

  // Payments
  collectPayment: async (payload: {
    invoiceId: string;
    amount: number;
    paymentMode: string;
    paymentDate?: string;
    transactionReference?: string;
    chequeNumber?: string;
    chequeDate?: string;
    bankName?: string;
    notes?: string;
    upiId?: string;
    payerName?: string;
    cardRef?: string;
    cardLast4?: string;
    authCode?: string;
    transferDate?: string;
    chequeStatus?: string;
    paymentDetails?: Record<string, unknown>;
    isBelowMinimum?: boolean;
    belowMinimumReasonCode?: string;
    belowMinimumReasonText?: string;
    allocationStrategy?: 'SELECTED_INVOICE' | 'FIFO_AUTO';
    studentId?: string;
  }): Promise<FeePayment> => {
    const res = await api.post('/fees/payments/collect', payload);
    return res.data.data;
  },

  getReceiptById: async (id: string): Promise<FeePayment> => {
    const res = await api.get(`/fees/receipts/${id}`);
    return res.data.data;
  },

  // Ledger
  getStudentFeeLedger: async (studentId: string): Promise<StudentLedgerData> => {
    const res = await api.get(`/fees/ledger/${studentId}`);
    return res.data.data;
  },

  // Fee Reminders Workflow
  getEligibleReminders: async (params?: {
    classroomId?: string;
    periodKey?: string;
    asOfDate?: string;
    academicYearId?: string;
  }): Promise<EligibleReminderStudent[]> => {
    const res = await api.get('/fees/reminders/eligible', { params });
    return res.data.data;
  },

  sendBulkReminders: async (payload: {
    studentIds: string[];
    periodKey?: string;
    dueDate?: string;
    customNote?: string;
    administrativeNote?: string;
  }): Promise<{
    totalSelected: number;
    sentCount: number;
    skippedCount: number;
    failedCount: number;
    details: Array<{
      studentId: string;
      studentName?: string;
      status: 'SENT' | 'SKIPPED' | 'FAILED';
      skipReason?: string;
      payableAmount?: number;
      errorMessage?: string;
    }>;
  }> => {
    const res = await api.post('/fees/reminders/bulk-send', payload);
    return res.data.data;
  },

  getReminderLogs: async (params?: {
    studentId?: string;
    periodKey?: string;
    status?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    total: number;
    items: FeeReminderLog[];
    limit: number;
    offset: number;
  }> => {
    const res = await api.get('/fees/reminders/logs', { params });
    return res.data.data;
  },

  getReminderSettings: async (): Promise<FeeReminderSettings> => {
    const res = await api.get('/fees/reminder-settings');
    return res.data.data;
  },

  updateReminderSettings: async (settings: Partial<FeeReminderSettings>): Promise<FeeReminderSettings> => {
    const res = await api.put('/fees/reminder-settings', settings);
    return res.data.data;
  },

  triggerScheduledReminders: async (): Promise<{
    executed: boolean;
    reason?: string;
    targetCount?: number;
    sentCount?: number;
    skippedCount?: number;
    failedCount?: number;
  }> => {
    const res = await api.post('/fees/reminders/trigger-scheduled');
    return res.data.data;
  },

  // ─── Phase 1: Defaulters, Reversals, Refunds, and Reports ────────────────────

  getDefaulters: async (params?: {
    classroomId?: string;
    agingBracket?: string;
    minAmount?: number;
    maxAmount?: number;
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    total: number;
    items: FeeDefaulter[];
    limit: number;
    offset: number;
  }> => {
    const res = await api.get('/fees/defaulters', { params });
    return res.data.data;
  },

  reversePayment: async (paymentId: string, payload: {
    reason: string;
    bouncePenaltyAmount?: number;
  }): Promise<{
    reversal: FeePaymentReversal;
    updatedInvoice: StudentInvoice;
  }> => {
    const res = await api.post(`/fees/payments/${paymentId}/reverse`, payload);
    return res.data.data;
  },

  getReversedPaymentsLog: async (params?: {
    limit?: number;
    offset?: number;
  }): Promise<{
    total: number;
    items: FeePaymentReversal[];
    limit: number;
    offset: number;
  }> => {
    const res = await api.get('/fees/payments-reversals', { params });
    return res.data.data;
  },

  waiveLateFine: async (invoiceId: string, payload: {
    waiveAmount: number;
    reason: string;
  }): Promise<StudentInvoice> => {
    const res = await api.post(`/fees/invoices/${invoiceId}/waive-fine`, payload);
    return res.data.data;
  },

  getRefunds: async (params?: {
    status?: string;
    studentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<{
    total: number;
    items: FeeRefund[];
    limit: number;
    offset: number;
  }> => {
    const res = await api.get('/fees/refunds', { params });
    return res.data.data;
  },

  requestRefund: async (payload: {
    studentId: string;
    paymentId?: string | null;
    refundType: string;
    amount: number;
    paymentMode?: string;
    transactionReference?: string | null;
    reason: string;
    notes?: string | null;
  }): Promise<FeeRefund> => {
    const res = await api.post('/fees/refunds', payload);
    return res.data.data;
  },

  updateRefundStatus: async (refundId: string, payload: {
    status: 'APPROVED' | 'PAID' | 'REJECTED';
    paymentMode?: string;
    transactionReference?: string | null;
    notes?: string | null;
  }): Promise<FeeRefund> => {
    const res = await api.patch(`/fees/refunds/${refundId}/status`, payload);
    return res.data.data;
  },

  getFinancialReports: async (params?: {
    startDate?: string;
    endDate?: string;
    classroomId?: string;
  }): Promise<{
    modeBreakup: Array<{ paymentMode: string; transactionCount: number; totalAmount: number }>;
    dailyRegister: FeePayment[];
    classEfficiency: Array<{
      classroomId: string;
      classroomName: string;
      section: string;
      totalBilled: number;
      totalCollected: number;
      totalPending: number;
    }>;
  }> => {
    const res = await api.get('/fees/reports', { params });
    return res.data.data;
  },

  getCounterHistory: async (params?: {
    startDate?: string;
    endDate?: string;
    collectedById?: string;
    paymentMode?: string;
    classroomId?: string;
    search?: string;
    includeReversed?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{
    total: number;
    items: FeePayment[];
    summary: {
      totalCollected: number;
      cashTotal: number;
      upiTotal: number;
      chequeTotal: number;
      cardTotal: number;
      receiptsCount: number;
      collectors: Array<{
        collectedById: string;
        txCount: number;
        totalCollected: number;
        collectedBy: { id: string; firstName: string; lastName: string };
      }>;
    };
    limit: number;
    offset: number;
  }> => {
    const res = await api.get('/fees/counter-history', { params });
    return res.data.data;
  },
};

export interface FeeDefaulter {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  guardianPhone: string | null;
  guardianEmail: string | null;
  classroomId: string | null;
  classroomName: string;
  feeQuota: string;
  overdueInvoicesCount: number;
  oldestDueDate: string;
  maxDaysOverdue: number;
  arrearsAmount: number;
  currentDueAmount: number;
  totalOutstanding: number;
  advanceCredit: number;
  lastPaymentDate: string | null;
}

export interface FeePaymentReversal {
  id: string;
  paymentId: string;
  reversalReceiptNumber: string;
  reversedAmount: number;
  bouncePenaltyAmount: number;
  reason: string;
  authorizedById: string;
  createdAt: string;
  payment?: FeePayment;
  authorizedBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface FeeRefund {
  id: string;
  refundVoucherNumber: string;
  studentId: string;
  paymentId: string | null;
  refundType: 'ADMISSION_CANCEL' | 'SECURITY_DEPOSIT' | 'EXCESS_PAYMENT' | 'SCHOLARSHIP_RETRO' | 'OTHER';
  amount: number;
  status: 'REQUESTED' | 'APPROVED' | 'PAID' | 'REJECTED';
  paymentMode: 'CASH' | 'CHEQUE' | 'BANK_TRANSFER' | 'UPI';
  transactionReference: string | null;
  reason: string;
  requestedById: string;
  approvedById: string | null;
  disbursedAt: string | null;
  notes: string | null;
  createdAt: string;
  student?: {
    id: string;
    admissionNumber: string;
    account?: {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
    };
  };
  requestedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
  approvedBy?: {
    id: string;
    firstName: string;
    lastName: string;
  };
}

export interface FeeReminderSettings {
  enabled: boolean;
  daysBeforeDue: number[];
  remindBeforeExam: boolean;
  maxRemindersPerDay: number;
  defaultAdministrativeNote?: string | null;
}

export interface EligibleReminderStudent {
  studentId: string;
  admissionNumber: string;
  studentName: string;
  parentName: string;
  parentEmail: string | null;
  parentPhone: string | null;
  classroomId: string | null;
  classroomName: string;
  academicClassName: string;
  feeQuota: string;
  periodKey: string;
  targetInvoiceId: string | null;
  targetInvoiceNumber: string | null;
  dueDate: string;
  installmentDue: number;
  arrears: number;
  advanceCredit: number;
  totalPayable: number;
  totalOutstanding: number;
  isEligible: boolean;
  skipReason: 'CURRENT_PAID' | 'FULLY_PAID' | 'NO_DUE' | 'INACTIVE' | 'ALREADY_REMINDED_TODAY' | 'NO_EMAIL' | null;
  lastRemindedToday: boolean;
}

export interface FeeReminderLog {
  id: string;
  studentId: string;
  classroomId: string | null;
  periodKey: string | null;
  dueDate: string | null;
  installmentDue: number;
  arrears: number;
  advanceCredit: number;
  payableAmount: number;
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP';
  recipientEmail: string | null;
  status: 'QUEUED' | 'SENT' | 'SKIPPED' | 'FAILED';
  skipReason: string | null;
  sentById: string | null;
  sentAt: string | null;
  errorMessage: string | null;
  metadata?: Record<string, unknown>;
  createdAt: string;
  student?: {
    id: string;
    admissionNumber: string;
    firstName: string;
    lastName: string;
    parentEmail?: string;
    parentPhone?: string;
  };
  classroom?: {
    id: string;
    name: string;
  };
  sentBy?: {
    id: string;
    name: string;
    email: string;
  };
}

export default feeApi;
