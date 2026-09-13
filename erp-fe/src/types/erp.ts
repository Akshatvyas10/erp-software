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

export interface Classroom {
    id: string;
    name: string;
    section: string;
    academicYear: string;
    roomNumber: string | null;
    status: ClassroomStatus;
    department?: string | null;
    buildingBlock?: string | null;
    maxCapacity?: number;
    monitorMaleId?: string | null;
    monitorFemaleId?: string | null;
    maleMonitor?: {
        id: string;
        studentId: string;
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
    student: {
        id: string;
        studentId: string;
        grade: string | null;
        section: string | null;
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
