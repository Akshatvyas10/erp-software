import api from "@/lib/api";

export type DocumentTemplateType =
    | "STUDENT_ID_CARD"
    | "TEACHER_ID_CARD"
    | "REPORT_CARD"
    | "TRANSFER_CERTIFICATE"
    | "LEAVING_CERTIFICATE"
    | "BONAFIDE_CERTIFICATE"
    | "CHARACTER_CERTIFICATE"
    | "FEE_RECEIPT"
    | "CUSTOM";

export type DocumentTemplateStatus = "DRAFT" | "ACTIVE" | "INACTIVE";
export type DocumentPaperSize = "CR80" | "A4" | "A5" | "LETTER" | "CUSTOM";
export type DocumentOrientation = "PORTRAIT" | "LANDSCAPE";

export interface TemplateFieldItem {
    key: string;
    label: string;
    visible: boolean;
    order: number;
    isBold?: boolean;
    format?: string;
}

export interface TemplateDesignConfig {
    designKey?: string;
    format?: "landscape" | "long";
    sideMode?: "front_only" | "both_sides";
    theme?: {
        primaryColor?: string;
        secondaryColor?: string;
        textColor?: string;
        accentColor?: string;
        backgroundColor?: string;
        fontFamily?: string;
    };
    header?: {
        size?: "S" | "M" | "L";
        style?: "solid" | "gradient" | "transparent" | "ribbon";
        showSchoolLogo?: boolean;
        showLogo?: boolean;
        logoPosition?: "LEFT" | "CENTER" | "RIGHT";
        showSchoolName?: boolean;
        showTagline?: boolean;
        showAffiliation?: boolean;
        showSchoolAddress?: boolean;
        showContactInfo?: boolean;
    };
    typography?: {
        nameSize?: "S" | "M" | "L";
        density?: "compact" | "comfortable";
        fontPreset?: "modern_sans" | "geometric" | "editorial" | "technical";
    };
    photoFrame?: {
        shape?: "squircle" | "circle" | "rounded_square" | "hex";
        border?: "plain" | "dual-ring" | "accent" | "none";
        position?: "left" | "right" | "top";
    };
    body?: {
        layout?: "SINGLE_COL" | "GRID_2_COL" | "COMPACT_HORIZONTAL";
        showStudentPhoto?: boolean;
        photoPosition?: "CENTER" | "TOP_LEFT" | "TOP_RIGHT";
        showBarcodeOrQr?: boolean;
        barcodeType?: "QR_CODE" | "BARCODE_CODE128" | "NONE";
        barcodeContent?: string;
    };
    backFields?: string[];
    idCardSides?: {
        hasBackSide?: boolean;
        backSideConfig?: {
            showPrincipalSignature?: boolean;
            showParentContact?: boolean;
            showBloodGroup?: boolean;
            showEmergencyAddress?: boolean;
            instructionsText?: string;
        };
    };
    watermark?: {
        enabled?: boolean;
        opacity?: number;
        type?: "SCHOOL_LOGO" | "CUSTOM_TEXT";
        customText?: string;
        placement?: "CENTER" | "TOP_CENTER";
        scale?: number;
        rotate?: boolean;
    };
    tableConfig?: {
        enabled?: boolean;
        headerBgColor?: string;
        headerTextColor?: string;
        borderColor?: string;
        alternateRowShading?: boolean;
        rowDensity?: "compact" | "normal" | "spacious";
        borderStyle?: "solid" | "subtle" | "none";
        columns?: Array<{
            key: string;
            label: string;
            width?: string;
            align?: "left" | "center" | "right";
        }>;
    };
    editableContent?: {
        certificateTitle?: string;
        leadText?: string;
        bodyTemplate?: string;
        closingDeclaration?: string;
        extraLines?: string[];
        footerNote?: string;
    };
    dimensions?: {
        widthMm?: number;
        heightMm?: number;
        showCutGuides?: boolean;
    };
    signatures?: {
        principal?: {
            enabled?: boolean;
            title?: string;
            showSignatureImage?: boolean;
            signatureUrl?: string;
        };
        classTeacher?: {
            enabled?: boolean;
            title?: string;
            showSignatureImage?: boolean;
            signatureUrl?: string;
        };
        institutionalSeal?: {
            enabled?: boolean;
            showStampImage?: boolean;
            stampUrl?: string;
            opacity?: number;
        };
    };
    footer?: {
        showIssueDate?: boolean;
        showAuthorizedSignature?: boolean;
        signatureTitle?: string;
        showClassTeacherSignature?: boolean;
        showInstitutionalSeal?: boolean;
    };
}

export interface DocumentTemplateItem {
    id: string;
    name: string;
    description?: string;
    type: DocumentTemplateType;
    status: DocumentTemplateStatus;
    paperSize: DocumentPaperSize;
    orientation: DocumentOrientation;
    isDefault: boolean;
    designConfig: TemplateDesignConfig;
    selectedFields: TemplateFieldItem[];
    updater?: {
        id: string;
        firstName: string;
        lastName: string;
    };
    createdAt: string;
    updatedAt: string;
}

export const documentTemplateApi = {
    getAll: async (params?: { type?: string; status?: string; search?: string }) => {
        const { data } = await api.get("/document-templates", { params });
        return (data.data?.templates || []) as DocumentTemplateItem[];
    },

    getById: async (id: string) => {
        const { data } = await api.get(`/document-templates/${id}`);
        return data.data?.template as DocumentTemplateItem;
    },

    create: async (payload: Partial<DocumentTemplateItem>) => {
        const { data } = await api.post("/document-templates", payload);
        return data.data?.template as DocumentTemplateItem;
    },

    update: async (id: string, payload: Partial<DocumentTemplateItem>) => {
        const { data } = await api.put(`/document-templates/${id}`, payload);
        return data.data?.template as DocumentTemplateItem;
    },

    duplicate: async (id: string) => {
        const { data } = await api.post(`/document-templates/${id}/duplicate`);
        return data.data?.template as DocumentTemplateItem;
    },

    setDefault: async (id: string) => {
        const { data } = await api.patch(`/document-templates/${id}/set-default`);
        return data.data?.template as DocumentTemplateItem;
    },

    delete: async (id: string) => {
        const { data } = await api.delete(`/document-templates/${id}`);
        return data;
    }
};
