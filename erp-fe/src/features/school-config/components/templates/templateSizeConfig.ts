/**
 * Document Template Paper Sizes & Dimension Constants
 * 
 * Central standard definitions for print and digital previews.
 * Millimeter measurements correspond directly to ISO 216 and ISO 7810 standards.
 */

export type DocumentPaperSize = "CR80" | "A4" | "A5" | "LETTER" | "CUSTOM";
export type DocumentOrientation = "PORTRAIT" | "LANDSCAPE";

export interface PaperDimensions {
    widthMm: number;
    heightMm: number;
    name: string;
    description: string;
    standard: string;
}

/**
 * Dimensions in Portrait mode (mm).
 * Landscape simply swaps width & height.
 */
export const PAPER_DIMENSIONS: Record<Exclude<DocumentPaperSize, "CUSTOM">, PaperDimensions> = {
    CR80: {
        widthMm: 53.98, // Standard ISO/IEC 7810 ID-1 card (commonly rounded to 54mm x 85.6mm)
        heightMm: 85.60,
        name: "CR80 PVC Card",
        description: "Standard Credit / PVC ID Card (85.6mm × 54mm)",
        standard: "ISO/IEC 7810 ID-1"
    },
    A4: {
        widthMm: 210,
        heightMm: 297,
        name: "A4 Standard",
        description: "Official Letterhead / Certificate (210mm × 297mm)",
        standard: "ISO 216"
    },
    A5: {
        widthMm: 148,
        heightMm: 210,
        name: "A5 Compact",
        description: "Compact Certificate / Report (148mm × 210mm)",
        standard: "ISO 216"
    },
    LETTER: {
        widthMm: 215.9,
        heightMm: 279.4,
        name: "US Letter",
        description: "North American Standard (8.5in × 11in)",
        standard: "ANSI/ASME Y14.1"
    }
};

/**
 * Returns physical dimensions in mm taking orientation into account.
 */
export function getDocumentDimensions(
    paperSize: DocumentPaperSize,
    orientation: DocumentOrientation,
    customWidth?: number,
    customHeight?: number
): { widthMm: number; heightMm: number; aspectRatio: number; label: string } {
    if (paperSize === "CUSTOM") {
        const w = customWidth || 210;
        const h = customHeight || 297;
        const widthMm = orientation === "LANDSCAPE" ? Math.max(w, h) : Math.min(w, h);
        const heightMm = orientation === "LANDSCAPE" ? Math.min(w, h) : Math.max(w, h);
        return {
            widthMm,
            heightMm,
            aspectRatio: widthMm / heightMm,
            label: `Custom (${widthMm}mm × ${heightMm}mm)`
        };
    }

    const base = PAPER_DIMENSIONS[paperSize] || PAPER_DIMENSIONS.A4;
    const isLandscape = orientation === "LANDSCAPE";

    // In portrait: base.widthMm is width, base.heightMm is height
    // In landscape: base.heightMm is width, base.widthMm is height
    const widthMm = isLandscape ? base.heightMm : base.widthMm;
    const heightMm = isLandscape ? base.widthMm : base.heightMm;

    return {
        widthMm,
        heightMm,
        aspectRatio: widthMm / heightMm,
        label: `${base.name} - ${widthMm.toFixed(1)}mm × ${heightMm.toFixed(1)}mm (${orientation.toLowerCase()})`
    };
}

/**
 * Enforced paper size and orientation defaults by document type
 */
export const DOCUMENT_TYPE_DEFAULTS = {
    STUDENT_ID_CARD: {
        paperSize: "CR80" as DocumentPaperSize,
        orientation: "LANDSCAPE" as DocumentOrientation,
        allowedSizes: ["CR80"] as DocumentPaperSize[],
        supportsBackSide: true,
        label: "Student ID Card"
    },
    TEACHER_ID_CARD: {
        paperSize: "CR80" as DocumentPaperSize,
        orientation: "LANDSCAPE" as DocumentOrientation,
        allowedSizes: ["CR80"] as DocumentPaperSize[],
        supportsBackSide: true,
        label: "Teacher / Faculty Badge"
    },
    REPORT_CARD: {
        paperSize: "A4" as DocumentPaperSize,
        orientation: "PORTRAIT" as DocumentOrientation,
        allowedSizes: ["A4", "A5", "LETTER"] as DocumentPaperSize[],
        supportsBackSide: false,
        label: "Report Card / Scorecard"
    },
    TRANSFER_CERTIFICATE: {
        paperSize: "A4" as DocumentPaperSize,
        orientation: "PORTRAIT" as DocumentOrientation,
        allowedSizes: ["A4", "LETTER"] as DocumentPaperSize[],
        supportsBackSide: false,
        label: "Transfer Certificate (TC)"
    },
    LEAVING_CERTIFICATE: {
        paperSize: "A4" as DocumentPaperSize,
        orientation: "PORTRAIT" as DocumentOrientation,
        allowedSizes: ["A4", "LETTER"] as DocumentPaperSize[],
        supportsBackSide: false,
        label: "Leaving Certificate"
    },
    BONAFIDE_CERTIFICATE: {
        paperSize: "A4" as DocumentPaperSize,
        orientation: "PORTRAIT" as DocumentOrientation,
        allowedSizes: ["A4", "LETTER"] as DocumentPaperSize[],
        supportsBackSide: false,
        label: "Bonafide Certificate"
    },
    CHARACTER_CERTIFICATE: {
        paperSize: "A4" as DocumentPaperSize,
        orientation: "PORTRAIT" as DocumentOrientation,
        allowedSizes: ["A4", "LETTER"] as DocumentPaperSize[],
        supportsBackSide: false,
        label: "Character Certificate"
    },
    FEE_RECEIPT: {
        paperSize: "A4" as DocumentPaperSize,
        orientation: "PORTRAIT" as DocumentOrientation,
        allowedSizes: ["A4", "A5", "LETTER"] as DocumentPaperSize[],
        supportsBackSide: false,
        label: "Official Fee Receipt"
    },
    CUSTOM: {
        paperSize: "A4" as DocumentPaperSize,
        orientation: "PORTRAIT" as DocumentOrientation,
        allowedSizes: ["CR80", "A4", "A5", "LETTER", "CUSTOM"] as DocumentPaperSize[],
        supportsBackSide: true,
        label: "Custom Document"
    }
};

/**
 * Standard Fields available per document type for selection
 */
export interface DefaultFieldDefinition {
    key: string;
    label: string;
    defaultVisible: boolean;
    defaultBold?: boolean;
    category: "IDENTITY" | "ACADEMIC" | "INSTITUTION" | "CONTACT";
}

export const DEFAULT_FIELDS_BY_TYPE: Record<string, DefaultFieldDefinition[]> = {
    STUDENT_ID_CARD: [
        { key: "fullName", label: "Student Full Name", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "admissionNumber", label: "Admission / Reg No", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "className", label: "Class & Section", defaultVisible: true, defaultBold: true, category: "ACADEMIC" },
        { key: "rollNumber", label: "Roll Number", defaultVisible: true, category: "ACADEMIC" },
        { key: "dateOfBirth", label: "Date of Birth", defaultVisible: false, category: "IDENTITY" },
        { key: "bloodGroup", label: "Blood Group", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "emergencyContact", label: "Emergency Phone", defaultVisible: true, category: "CONTACT" },
        { key: "transportBusNumber", label: "Bus Route / Walker", defaultVisible: false, category: "CONTACT" },
        { key: "academicSession", label: "Academic Session", defaultVisible: true, category: "ACADEMIC" }
    ],
    TEACHER_ID_CARD: [
        { key: "fullName", label: "Faculty Full Name", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "employeeId", label: "Employee ID", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "designation", label: "Designation / Role", defaultVisible: true, defaultBold: true, category: "ACADEMIC" },
        { key: "department", label: "Department", defaultVisible: true, category: "ACADEMIC" },
        { key: "bloodGroup", label: "Blood Group", defaultVisible: true, category: "IDENTITY" },
        { key: "contactNumber", label: "Contact Phone", defaultVisible: true, category: "CONTACT" },
        { key: "dateOfJoining", label: "Joining Date", defaultVisible: false, category: "ACADEMIC" }
    ],
    REPORT_CARD: [
        { key: "fullName", label: "Student Name", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "admissionNumber", label: "Admission No", defaultVisible: true, category: "IDENTITY" },
        { key: "className", label: "Class & Section", defaultVisible: true, defaultBold: true, category: "ACADEMIC" },
        { key: "rollNumber", label: "Roll No", defaultVisible: true, category: "ACADEMIC" },
        { key: "academicYear", label: "Academic Session", defaultVisible: true, category: "ACADEMIC" },
        { key: "termName", label: "Term / Assessment Name", defaultVisible: true, category: "ACADEMIC" },
        { key: "attendancePercentage", label: "Attendance Record", defaultVisible: true, category: "ACADEMIC" },
        { key: "rankInClass", label: "Class Rank / Percentile", defaultVisible: false, category: "ACADEMIC" },
        { key: "teacherRemarks", label: "Teacher's Evaluation", defaultVisible: true, category: "ACADEMIC" }
    ],
    TRANSFER_CERTIFICATE: [
        { key: "fullName", label: "Student Name", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "fatherName", label: "Father's Name", defaultVisible: true, category: "IDENTITY" },
        { key: "motherName", label: "Mother's Name", defaultVisible: true, category: "IDENTITY" },
        { key: "admissionNumber", label: "Admission Number", defaultVisible: true, category: "IDENTITY" },
        { key: "lastClassPassed", label: "Class Last Studied", defaultVisible: true, defaultBold: true, category: "ACADEMIC" },
        { key: "dateOfLeaving", label: "Date of Leaving", defaultVisible: true, category: "ACADEMIC" },
        { key: "reasonForLeaving", label: "Reason for Departure", defaultVisible: true, category: "ACADEMIC" },
        { key: "generalConduct", label: "General Conduct & Behavior", defaultVisible: true, defaultBold: true, category: "ACADEMIC" },
        { key: "feesClearedStatus", label: "Fee Dues Cleared", defaultVisible: true, category: "ACADEMIC" }
    ],
    LEAVING_CERTIFICATE: [
        { key: "fullName", label: "Student Full Name", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "admissionNumber", label: "Registration / Adm No", defaultVisible: true, category: "IDENTITY" },
        { key: "dateOfBirth", label: "Date of Birth (Words & Figures)", defaultVisible: true, category: "IDENTITY" },
        { key: "lastSchoolExam", label: "Course / Exam Passed", defaultVisible: true, defaultBold: true, category: "ACADEMIC" },
        { key: "dateOfLeaving", label: "Date of Leaving", defaultVisible: true, category: "ACADEMIC" },
        { key: "generalConduct", label: "Conduct & Character", defaultVisible: true, defaultBold: true, category: "ACADEMIC" }
    ],
    BONAFIDE_CERTIFICATE: [
        { key: "fullName", label: "Student Full Name", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "fatherName", label: "Father's Name", defaultVisible: true, category: "IDENTITY" },
        { key: "admissionNumber", label: "Admission Number", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "className", label: "Current Class & Section", defaultVisible: true, defaultBold: true, category: "ACADEMIC" },
        { key: "rollNumber", label: "Roll Number", defaultVisible: true, category: "ACADEMIC" },
        { key: "academicSession", label: "Academic Session", defaultVisible: true, category: "ACADEMIC" },
        { key: "dateOfBirth", label: "Date of Birth", defaultVisible: false, category: "IDENTITY" },
        { key: "bonafidePurpose", label: "Issued For (Purpose)", defaultVisible: true, category: "ACADEMIC" }
    ],
    CHARACTER_CERTIFICATE: [
        { key: "fullName", label: "Student Full Name", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "fatherName", label: "Father's Name", defaultVisible: true, category: "IDENTITY" },
        { key: "admissionNumber", label: "Admission / Reg No", defaultVisible: true, category: "IDENTITY" },
        { key: "academicSession", label: "Tenure / Years Attended", defaultVisible: true, category: "ACADEMIC" },
        { key: "generalConduct", label: "Moral Character & Demeanor", defaultVisible: true, defaultBold: true, category: "ACADEMIC" },
        { key: "coCurricularRecord", label: "Co-Curricular Activities", defaultVisible: true, category: "ACADEMIC" }
    ],
    FEE_RECEIPT: [
        { key: "fullName", label: "Student Name", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "admissionNumber", label: "Admission Number", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "className", label: "Class & Section", defaultVisible: true, category: "ACADEMIC" },
        { key: "receiptNumber", label: "Official Receipt No", defaultVisible: true, defaultBold: true, category: "ACADEMIC" },
        { key: "paymentDate", label: "Payment Date", defaultVisible: true, category: "ACADEMIC" },
        { key: "paymentMode", label: "Payment Mode (UPI/Cash/Bank)", defaultVisible: true, category: "ACADEMIC" },
        { key: "totalPaidAmount", label: "Total Amount Received", defaultVisible: true, defaultBold: true, category: "ACADEMIC" }
    ],
    CUSTOM: [
        { key: "fullName", label: "Full Name", defaultVisible: true, defaultBold: true, category: "IDENTITY" },
        { key: "referenceNumber", label: "Reference Number", defaultVisible: true, category: "IDENTITY" },
        { key: "issueDate", label: "Date of Issue", defaultVisible: true, category: "ACADEMIC" },
        { key: "notes", label: "Institutional Remarks", defaultVisible: true, category: "ACADEMIC" }
    ]
};
