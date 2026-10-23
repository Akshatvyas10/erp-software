export interface Role {
    id: number;
    name: string;
    description: string | null;
    isActive: boolean;
}

export interface User {
    id: string;
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    gender?: 'MALE' | 'FEMALE' | 'OTHER' | null;
    dob?: string | null;
    phone?: string | null;
    mfaEnabled?: boolean;
    isActive: boolean;
    lastLoginAt: string | null;
    createdAt: string;
    updatedAt: string;
    Roles?: Role[];
    studentProfile?: StudentProfile | null;
    teacherProfile?: TeacherProfile | null;
    teacherId?: string;
}

export interface TeacherProfile {
    id: string;
    teacherId: string;
    employeeNumber: string | null;
    department: string | null;
    designation: string | null;
    departmentName?: string | null;
    designationName?: string | null;
    qualification: string | null;
    joiningDate: string | null;
    phone: string | null;
    subjects: string[];
    userId: string;
    createdAt: string;
}

export interface StudentProfile {
    id: string;
    studentId: string;
    enrollmentNumber: string | null;
    grade: string | null;
    section: string | null;
    dateOfBirth: string | null;
    guardianName: string | null;
    guardianPhone: string | null;
    address: string | null;
    userId: string;
}

export interface Teacher {
    id: string;
    teacherId: string;
    employeeNumber: string | null;
    department: string | null;
    designation: string | null;
    departmentName: string | null;
    designationName: string | null;
    qualification: string | null;
    joiningDate: string | null;
    phone: string | null;
    subjects: string[];
    userId: string;
    createdAt: string;
    updatedAt: string;
    account: {
        id: string;
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        lastLoginAt: string | null;
        Roles?: Role[];
    };
}

export interface Pagination {
    total: number;
    page: number;
    limit: number;
    pages: number;
}

// ─── Classroom Management Types ───────────────────────────────────────────────

export type ClassroomStatus = 'ACTIVE' | 'INACTIVE';
export type DayOfWeek = 'Monday' | 'Tuesday' | 'Wednesday' | 'Thursday' | 'Friday' | 'Saturday' | 'Sunday';

export const CLASSROOM_SECTIONS = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type ClassroomSection = (typeof CLASSROOM_SECTIONS)[number];

export interface DepartmentIncharge {
    id: string;
    teacherId: string;
    employeeNumber?: string;
    account?: {
        firstName: string;
        lastName: string;
        email?: string;
    };
}

export interface Department {
    id: string;
    name: string;
    code?: string;
    headId?: string | null;
    inchargeTeacherId?: string | null;
    inchargeStaffId?: string | null;
    head?: DepartmentIncharge | null;
    incharge?: DepartmentIncharge | null;
    inchargeTeacher?: DepartmentIncharge | null;
}

export interface AcademicClass {
    id: string;
    name: string;
    code: string;
    orderIndex: number;
    departmentId?: string | null;
    department?: Department | null;
    status: 'ACTIVE' | 'INACTIVE';
    sections?: Classroom[];
    totalStudents?: number;
    sectionCount?: number;
    createdAt?: string;
    updatedAt?: string;
}

export interface ClassSetupStatus {
    isInitialized: boolean;
    classCount: number;
}

export interface BulkSetupClassItem {
    name: string;
    code?: string;
    category?: string;
    orderIndex?: number;
    departmentId?: string;
    sections?: string[];
}

export interface BulkSetupPayload {
    classes: BulkSetupClassItem[];
    defaultSections?: string[];
    departments?: Record<string, { inchargeId?: string | null }>;
    academicYear?: string;
}

export interface Classroom {
    id: string;
    classId?: string | null;
    academicClass?: AcademicClass | null;
    name: string;
    section: string;
    academicYear: string;
    roomNumber: string | null;
    status: ClassroomStatus;
    department?: string | null;
    departmentRef?: Department | null;
    buildingBlock?: string | null;
    blockId?: string | null;
    roomId?: string | null;
    departmentId?: string | null;
    maxCapacity?: number;
    monitorMaleId?: string | null;
    monitorFemaleId?: string | null;
    maleMonitor?: {
        id: string;
        studentId: string;
        admissionNumber?: string | null;
        account: {
            id: string;
            userId: string;
            firstName: string;
            lastName: string;
        };
    } | null;
    femaleMonitor?: {
        id: string;
        studentId: string;
        admissionNumber?: string | null;
        account: {
            id: string;
            userId: string;
            firstName: string;
            lastName: string;
        };
    } | null;
    classTeacherId?: string | null;
    classTeacher?: {
        id: string;
        teacherId: string;
        account: {
            id: string;
            userId: string;
            firstName: string;
            lastName: string;
        };
    } | null;
    studentCount?: number;
    enrollments?: ClassroomEnrollment[];
    subjects?: ClassroomSubject[];
    periods?: ClassroomPeriod[];
    createdAt: string;
    updatedAt: string;
}

export interface ClassroomEnrollment {
    id: string;
    classroomId: string;
    studentId: string;
    rollNumber?: string | null;
    student: {
        id: string;
        studentId: string;
        admissionNumber?: string | null;
        grade: string | null;
        section: string | null;
        gender?: string | null;
        status: string;
        account: {
            id: string;
            userId: string;
            firstName: string;
            lastName: string;
            email: string;
            isActive: boolean;
        };
    };
    createdAt: string;
}

export interface TimetableSubstitute {
    id: string;
    classroomId: string;
    timetableId: string;
    originalTeacherId?: string | null;
    substituteTeacherId: string;
    date: string;
    reason?: string | null;
    status: 'ASSIGNED' | 'COMPLETED' | 'CANCELLED';
    assignedBy: string;
    substituteTeacher?: {
        id: string;
        teacherId: string;
        account: {
            id: string;
            firstName: string;
            lastName: string;
        };
    };
    originalTeacher?: {
        id: string;
        teacherId: string;
        account: {
            id: string;
            firstName: string;
            lastName: string;
        };
    };
    slot?: {
        id: string;
        dayOfWeek: string;
        startTime: string;
        endTime: string;
    };
    createdAt?: string;
}

export interface Subject {
    id: string;
    code: string;
    name: string;
    type: 'THEORY' | 'PRACTICAL' | 'LAB' | 'ELECTIVE';
    description?: string;
    isActive: boolean;
    createdAt?: string;
    updatedAt?: string;
}

export interface ClassroomSubject {
    id: string;
    classroomId: string;
    teacherId: string | null;
    subjectId: string;
    subject?: Subject;
    teacher: {
        id: string;
        teacherId: string;
        account: {
            id: string;
            userId: string;
            firstName: string;
            lastName: string;
        };
    } | null;
    schedule?: TimetableSlot[];
    createdAt: string;
    updatedAt: string;
}

export interface TimetableSlot {
    id: string;
    classroomSubjectId: string;
    dayOfWeek: DayOfWeek;
    startTime: string;  // "HH:mm:ss"
    endTime: string;    // "HH:mm:ss"
    createdAt: string;
    updatedAt: string;
}


export interface ClassroomPeriod {
    id: string;
    classroomId: string;
    name: string;
    startTime: string; // "HH:mm:ss"
    endTime: string;   // "HH:mm:ss"
    order: number;
    createdAt?: string;
    updatedAt?: string;
}

// =============================================================================
// Student Management Types
// =============================================================================

export type StudentStatus = 'ACTIVE' | 'SUSPENDED' | 'GRADUATED' | 'TRANSFERRED';
export type TransportMode = 'SCHOOL_BUS' | 'PRIVATE_TRANSPORT' | 'WALKER';
export type FeeQuota = 'REGULAR' | 'STAFF_CHILD' | 'SCHOLARSHIP_HALF' | 'SCHOLARSHIP_FULL';

/** Classroom info embedded inside a student's enrollment record */
export interface StudentEnrollment {
    id: string;
    classroomId: string;
    studentId: string;
    rollNumber: string | null;
    classroom: {
        id: string;
        name: string;
        section: string;
        academicYear: string;
        status: ClassroomStatus;
    };
    createdAt: string;
}

/** Full student record returned by GET /api/students/:id or POST response */
export interface Student {
    id: string;
    userId: string;
    studentId: string;         // "STU-00001"
    enrollmentNumber: string | null;
    admissionNumber: string | null;  // auto-generated "ADM-2026-0014"
    grade: string | null;
    section: string | null;
    dateOfBirth: string | null;  // "YYYY-MM-DD"
    gender: string | null;
    religion: string | null;
    caste: string | null;
    motherTongue: string | null;
    bloodGroup: string | null;
    medicalNotes: string | null;
    bankAccountNumber: string | null;
    bankIfscCode: string | null;
    bankName: string | null;
    bankBranch: string | null;
    bankMicrNumber: string | null;
    profilePhotoUrl: string | null;  // "/uploads/students/stud-xxx.jpg"
    permanentAddress: string | null;
    currentAddress: string | null;
    transportationMode: TransportMode | null;
    guardianName: string | null;
    guardianRelationship: string | null;
    guardianPhone: string | null;
    guardianEmail: string | null;
    governmentId: string | null;
    feeQuota: FeeQuota;
    previousSchoolDetails: string | null;
    transferCertificateUrl: string | null;
    status: StudentStatus;
    createdAt: string;
    updatedAt: string;
    account: {
        id: string;
        userId: string;
        email: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
        lastLoginAt: string | null;
    };
    /** Present on detail view — classroom enrollments */
    classroomEnrollments?: StudentEnrollment[];
}

/**
 * Sent to POST /api/students via multipart/form-data.
 * admissionNumber omitted — server auto-generates it.
 * profilePhoto is a File, appended to FormData separately.
 */
export interface CreateStudentPayload {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    rollNumber?: string;
    previousSchoolDetails?: string;
    classroomId?: string;   // optional junction insert
    dateOfBirth?: string;
    gender?: string;
    religion?: string;
    caste?: string;
    motherTongue?: string;
    bloodGroup?: string;
    medicalNotes?: string;
    bankAccountNumber?: string;
    bankIfscCode?: string;
    bankName?: string;
    bankBranch?: string;
    bankMicrNumber?: string;
    guardianName?: string;
    guardianRelationship?: string;
    guardianPhone?: string;
    guardianEmail?: string;
    permanentAddress?: string;
    currentAddress?: string;
    governmentId?: string;
    transportationMode?: TransportMode;
    feeQuota?: FeeQuota;
    transferCertificateUrl?: string;
    birthCertificateUrl?: string;
    nationalIdProofUrl?: string;
    status?: StudentStatus;
}

/** Sent to PUT /api/students/:id via multipart/form-data */
export type UpdateStudentPayload = Partial<Omit<CreateStudentPayload, 'password' | 'classroomId'>>;

// ─── Form / Request Payloads ──────────────────────────────────────────────────

export interface CreateClassroomPayload {
    name: string;
    section: string;
    academicYear: string;
    roomNumber?: string;
    classTeacherId?: string;
    status: ClassroomStatus;
    department?: string;
    buildingBlock?: string;
    blockId?: string;
    roomId?: string;
    departmentId?: string;
    maxCapacity?: number;
    monitorMaleId?: string;
    monitorFemaleId?: string;
}

export interface AssignStudentsPayload {
    studentIds: string[];
}

export interface AddSubjectPayload {
    subjectId: string;
    teacherId?: string;
}

export interface UpsertTimetableSlotPayload {
    dayOfWeek: DayOfWeek;
    startTime: string;
    endTime: string;
}

// ─── Homework Management Types ────────────────────────────────────────────────
export type HomeworkStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type HomeworkSubmissionStatus = 'PENDING' | 'SUBMITTED' | 'REVIEWED' | 'OVERDUE';

export interface Homework {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    status: HomeworkStatus;
    classroomId: string;
    subjectId: string;
    teacherId: string;
    createdAt: string;
    updatedAt: string;
    classroom?: {
        id: string;
        name: string;
        section: string;
    };
    subject?: {
        id: string;
        name: string;
        code: string;
    };
    teacher?: {
        id: string;
        firstName: string;
        lastName: string;
    };
}

export interface HomeworkSubmission {
    id: string;
    homeworkId: string;
    studentId: string;
    status: HomeworkSubmissionStatus;
    submittedAt: string | null;
    feedback: string | null;
    grade: string | null;
    createdAt: string;
    updatedAt: string;
    student?: {
        id: string;
        firstName: string;
        lastName: string;
        admissionNumber: string | null;
    };
    homework?: Homework;
}

// =============================================================================
// Admission Feature Types
// =============================================================================

export type CustomFieldType = 'text' | 'number' | 'email' | 'date' | 'dropdown' | 'checkbox' | 'textarea';

export interface CustomFieldDefinition {
    name: string;
    label: string;
    type: CustomFieldType;
    required: boolean;
    options?: string[]; // for dropdowns
}

export interface AdmissionForm {
    id: string;
    classroomId: string;
    token: string;
    isActive: boolean;
    expiresAt: string | null;
    createdBy: string;
    customFields: CustomFieldDefinition[];
    classroom?: {
        name: string;
        section: string;
        academicYear: string;
    };
    createdAt: string;
    updatedAt: string;
}

export type AdmissionStatus = 'Pending' | 'Admitted' | 'Rejected';

export interface AdmissionApplication {
    id: string;
    formId: string;
    
    // Student Info
    studentFirstName: string;
    studentLastName: string;
    dateOfBirth: string;
    gender: string;
    bloodGroup?: string | null;
    aadhaarNumber?: string | null;
    previousSchoolName?: string | null;
    previousClass?: string | null;
    currentAddress: string;
    permanentAddress: string;
    
    // Parent Info
    fatherName: string;
    motherName: string;
    guardianName?: string | null;
    primaryContactNumber: string;
    alternateContactNumber?: string | null;
    parentEmail: string;
    fatherOccupation?: string | null;
    motherOccupation?: string | null;
    annualFamilyIncome?: string | null;
    
    // Additional
    preferredClassId?: string | null;
    medicalNotes?: string | null;
    declarationAccepted: boolean;
    
    // Bank Details
    bankAccountNumber?: string | null;
    bankIfscCode?: string | null;
    bankName?: string | null;
    bankBranch?: string | null;
    bankMicrNumber?: string | null;
    
    // Custom Fields
    customFieldResponses: Record<string, any>;
    
    // System
    status: AdmissionStatus;
    rejectionReason?: string | null;
    actionBy?: string | null;
    actionAt?: string | null;
    
    form?: AdmissionForm;
    createdAt: string;
    updatedAt: string;
}

export type AttendanceStatusType = 'PRESENT' | 'ABSENT' | 'LATE' | 'HALF_DAY' | 'LEAVE';

export interface StudentAttendanceRecord {
    id: string;
    studentId: string;
    classroomId: string;
    academicYearId?: string | null;
    attendanceDate: string;
    status: AttendanceStatusType;
    remarks?: string | null;
    student?: Student;
}

export interface AttendanceSummary {
    present: number;
    absent: number;
    late: number;
    halfDay: number;
    leave: number;
    total: number;
    percentage: number;
}

export interface StudentAcademicHistory {
    id: string;
    studentId: string;
    classroomId?: string | null;
    academicClassId?: string | null;
    className: string;
    sectionName: string;
    academicYear: string;
    rollNumber?: number | null;
    attendancePercentage?: number | string | null;
    overallPercentage?: number | string | null;
    overallGrade?: string | null;
    resultStatus: 'PASSED' | 'FAILED' | 'PROMOTED' | 'RETAINED' | 'GRADUATED' | 'TRANSFERRED';
    teacherRemarks?: string | null;
    appraisalNotes?: string | null;
    finalExamResults: Array<{
        subjectName?: string;
        marksObtained?: number;
        maxMarks?: number;
        grade?: string;
    }>;
    testBreakdown?: Array<{
        testName?: string;
        marksObtained?: number;
        maxMarks?: number;
    }>;
    createdAt?: string;
    updatedAt?: string;
}

export interface PromotionLogRecord {
    id: string;
    studentId: string;
    sourceClassroomId?: string | null;
    targetClassroomId?: string | null;
    sourceAcademicYear?: string;
    targetAcademicYear?: string;
    academicYear?: string;
    action?: 'PROMOTE' | 'RETAIN' | 'GRADUATE' | 'TRANSFER' | string;
    promotionStatus?: 'PROMOTED' | 'RETAINED' | 'GRADUATED' | 'TRANSFERRED' | 'PROMOTED_WITH_WARNING' | string;
    isManualOverride?: boolean;
    overrideReason?: string | null;
    finalPercentage?: number | string | null;
    remarks?: string | null;
    promotedBy?: string | null;
    createdAt?: string;
    sourceClassroom?: {
        id: string;
        name: string;
        section: string;
        academicYear: string;
    };
    targetClassroom?: {
        id: string;
        name: string;
        section: string;
        academicYear: string;
    };
}

