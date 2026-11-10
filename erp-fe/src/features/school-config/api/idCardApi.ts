import api from "@/lib/api";
import { useQuery, useMutation } from "@tanstack/react-query";
import type { DocumentTemplateItem } from "./documentTemplateApi";

export interface StudentCardItem {
    studentId: string;
    admissionNumber: string;
    rollNumber: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    className: string;
    section: string;
    grade: string;
    academicYear: string;
    dob?: string;
    bloodGroup?: string;
    emergencyContact?: string;
    address?: string;
    busRoute?: string;
    schoolInfo: {
        schoolName: string;
        tagline: string;
        address: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
        phone: string;
        primaryPhone?: string;
        secondaryPhone?: string;
        email: string;
        website: string;
        logoUrl?: string;
        watermarkUrl?: string;
        boardType?: string;
        affiliationNumber?: string;
        schoolCode?: string;
        principalSignatureUrl?: string;
        stampUrl?: string;
        authorizedSignatoryName?: string;
        authorizedSignatoryDesignation?: string;
    };
}

export interface TeacherCardItem {
    teacherId: string;
    employeeId: string;
    fullName: string;
    firstName?: string;
    lastName?: string;
    photoUrl?: string;
    department: string;
    designation: string;
    phone: string;
    email: string;
    joiningDate?: string;
    bloodGroup?: string;
    schoolInfo: {
        schoolName: string;
        tagline: string;
        address: string;
        addressLine1?: string;
        addressLine2?: string;
        city?: string;
        state?: string;
        pincode?: string;
        country?: string;
        phone: string;
        primaryPhone?: string;
        secondaryPhone?: string;
        email: string;
        website: string;
        logoUrl?: string;
        watermarkUrl?: string;
        boardType?: string;
        affiliationNumber?: string;
        schoolCode?: string;
        principalSignatureUrl?: string;
        stampUrl?: string;
        authorizedSignatoryName?: string;
        authorizedSignatoryDesignation?: string;
    };
}

export interface GeneratedIdCardsResponse<T = StudentCardItem | TeacherCardItem> {
    template: DocumentTemplateItem | null;
    school: any;
    cards: T[];
    total: number;
}

export interface GenerateStudentCardsPayload {
    classroomId?: string;
    studentIds?: string[];
    templateId?: string;
}

export interface GenerateTeacherCardsPayload {
    teacherIds?: string[];
    templateId?: string;
}

export const idCardApi = {
    // Generate Student ID Cards (Single or Bulk)
    generateStudentCards: async (payload: GenerateStudentCardsPayload): Promise<GeneratedIdCardsResponse<StudentCardItem>> => {
        const res = await api.post("/id-cards/students/generate", payload);
        return res.data.data;
    },

    // Generate Teacher ID Cards (Single or Bulk)
    generateTeacherCards: async (payload: GenerateTeacherCardsPayload): Promise<GeneratedIdCardsResponse<TeacherCardItem>> => {
        const res = await api.post("/id-cards/teachers/generate", payload);
        return res.data.data;
    },

    // Student self-service: View own ID card
    getMyIdCard: async (): Promise<GeneratedIdCardsResponse<StudentCardItem>> => {
        const res = await api.get("/id-cards/my-card");
        return res.data.data;
    },

    // Audit logs
    getAuditLogs: async (documentType?: string) => {
        const res = await api.get("/id-cards/audit-logs", { params: { documentType } });
        return res.data.data;
    }
};

export function useGenerateStudentCards() {
    return useMutation({
        mutationFn: idCardApi.generateStudentCards
    });
}

export function useGenerateTeacherCards() {
    return useMutation({
        mutationFn: idCardApi.generateTeacherCards
    });
}

export function useMyIdCard() {
    return useQuery({
        queryKey: ["my-id-card"],
        queryFn: idCardApi.getMyIdCard
    });
}
