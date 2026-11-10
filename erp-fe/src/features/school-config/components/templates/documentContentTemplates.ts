/**
 * Certificate & Document Content Templates with Dynamic Placeholders
 */

export interface DocumentContentPreset {
    certificateTitle: string;
    leadText: string;
    bodyTemplate: string;
    closingDeclaration: string;
    extraLines?: string[];
}

export const DOCUMENT_CONTENT_DEFAULTS: Record<string, DocumentContentPreset> = {
    TRANSFER_CERTIFICATE: {
        certificateTitle: "TRANSFER CERTIFICATE",
        leadText: "This is to formally certify the departure and academic standing of:",
        bodyTemplate: "This is to certify that {{studentName}}, son/daughter of Mr. {{fatherName}} and Mrs. {{motherName}}, was enrolled in this institution under Admission No: {{admissionNumber}}. The student was studying in {{className}} - {{section}} with Roll No: {{rollNumber}}.\n\nAll school fees, dues, and library obligations have been cleared in full up to the current session {{academicYear}}. Date of leaving: {{dateOfLeaving}}. Reason for leaving: {{reasonForLeaving}}.\n\nThe student bears {{generalConduct}} moral character and exemplary conduct during the course of study.",
        closingDeclaration: "Certified that the above particulars are in accordance with the official School Master Register."
    },
    LEAVING_CERTIFICATE: {
        certificateTitle: "SCHOOL LEAVING CERTIFICATE",
        leadText: "To whomsoever it may concern:",
        bodyTemplate: "Certified that {{studentName}} (Registration No: {{admissionNumber}}) attended this institution from Session {{academicSession}} until {{dateOfLeaving}}.\n\nDate of Birth according to the Admission Register is {{dateOfBirth}} (in words: {{dobWords}}).\n\nThe student appeared for the terminal examination of {{className}} and was awarded status: {{lastSchoolExam}}.\n\nConduct and Character: {{generalConduct}}.",
        closingDeclaration: "Issued under the seal of the institution and signature of the head of school."
    },
    BONAFIDE_CERTIFICATE: {
        certificateTitle: "BONAFIDE CERTIFICATE",
        leadText: "TO WHOMSOEVER IT MAY CONCERN",
        bodyTemplate: "This is to certify that {{studentName}}, son/daughter of Mr. {{fatherName}}, is a bona fide regular student of this institution, currently studying in {{className}} - {{section}} (Roll No: {{rollNumber}}, Admission No: {{admissionNumber}}) during the academic session {{academicYear}}.\n\nThis certificate is issued on the written request of the parent/guardian for the purpose of: {{bonafidePurpose}}.",
        closingDeclaration: "Verified and authenticated by the Office of the Principal."
    },
    CHARACTER_CERTIFICATE: {
        certificateTitle: "CHARACTER & CONDUCT CERTIFICATE",
        leadText: "CERTIFICATE OF MERIT & CONDUCT",
        bodyTemplate: "This is to certify that {{studentName}}, son/daughter of Mr. {{fatherName}} and Mrs. {{motherName}}, was a student of this school from {{academicSession}} up to {{dateOfLeaving}}.\n\nDuring his/her tenure at this academy, his/her general conduct, moral behavior, and discipline were found to be {{generalConduct}}.\n\nHe/she actively participated in co-curricular activities: {{coCurricularRecord}}.\n\nWe wish the student every success in all future academic pursuits.",
        closingDeclaration: "Given under the official hand and seal of the Principal."
    },
    REPORT_CARD: {
        certificateTitle: "ACADEMIC PERFORMANCE SCORECARD",
        leadText: "CONTINUOUS & COMPREHENSIVE TERM EVALUATION",
        bodyTemplate: "Student Evaluation Record for {{studentName}} (Admission No: {{admissionNumber}}), Class: {{className}} - {{section}}, Roll No: {{rollNumber}} for Session {{academicYear}}.",
        closingDeclaration: "Promoted to the next standard. Official assessment certified by Academic Board."
    },
    FEE_RECEIPT: {
        certificateTitle: "OFFICIAL FEE RECEIPT",
        leadText: "TRANSACTION RECORD & DUES CLEARANCE",
        bodyTemplate: "Received with thanks from {{studentName}} (Admission No: {{admissionNumber}}), Class: {{className}} the total amount against Receipt No: {{receiptNumber}} on {{paymentDate}} via {{paymentMode}}.",
        closingDeclaration: "Computer generated institutional receipt. No wet signature required if digitally sealed."
    },
    CUSTOM: {
        certificateTitle: "OFFICIAL INSTITUTIONAL DOCUMENT",
        leadText: "TO WHOMSOEVER IT MAY CONCERN",
        bodyTemplate: "This document certifies that {{studentName}} (Reg No: {{admissionNumber}}) of Class {{className}} is recorded in the institutional ledger for the academic session {{academicYear}}.\n\nNotes / Remarks: {{notes}}.",
        closingDeclaration: "Issued by order of the Head of the Institution."
    }
};

/**
 * Replaces dynamic token placeholders like {{studentName}} with sample or live data
 */
export function replacePlaceholders(
    templateText: string,
    data: Record<string, string | number | undefined | null>,
    isPlainEmpty: boolean = false
): string {
    if (!templateText) return "";

    return templateText.replace(/\{\{([a-zA-Z0-9_]+)\}\}/g, (_, key) => {
        if (isPlainEmpty) {
            // For blank certificates, replace placeholders with underlined blank spaces
            return "______________________";
        }

        const value = data[key];
        if (value !== undefined && value !== null && value !== "") {
            return String(value);
        }

        // Standard default fallbacks for visual realism
        switch (key) {
            case "studentName": return "Aarav Sharma";
            case "fatherName": return "Rajesh Sharma";
            case "motherName": return "Pooja Sharma";
            case "admissionNumber":
            case "admissionNo": return "ADM-2026-042";
            case "className": return "Grade 10";
            case "section": return "Section A";
            case "rollNumber":
            case "rollNo": return "14";
            case "academicYear":
            case "academicSession": return "2026-2027";
            case "dateOfBirth": return "14/08/2010";
            case "dobWords": return "Fourteenth of August Two Thousand Ten";
            case "dateOfLeaving": return "31/10/2026";
            case "reasonForLeaving": return "Parent Relocation / Out of State Transfer";
            case "generalConduct": return "Exemplary";
            case "bonafidePurpose": return "Passport Application / National Scholarship";
            case "coCurricularRecord": return "Captain of Debate Team, Inter-School Science Fair Winner";
            case "receiptNumber": return "RCPT-2026-8819";
            case "paymentDate": return "31/10/2026";
            case "paymentMode": return "UPI / Net Banking";
            case "lastSchoolExam": return "Passed with Grade A (Distinction)";
            case "notes": return "Official record validated in school database.";
            // School Identity Tokens
            case "schoolName": return "Springfield International Academy";
            case "schoolAddress": return "Institutional Campus, Knowledge Park V, Greater Noida, UP - 201306";
            case "schoolContact":
            case "schoolPhone": return "+91 98765 43210";
            case "schoolEmail": return "info@springfield.edu";
            case "schoolWebsite": return "www.springfield.edu";
            case "schoolCode": return "54092";
            case "affiliationNumber": return "213094";
            case "boardType": return "CBSE";
            default: return `[${key}]`;
        }
    });
}
