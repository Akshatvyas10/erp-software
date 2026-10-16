import api from "@/lib/api";

export interface SchoolConfigData {
    schoolName: string;
    tagline?: string;
    logoUrl?: string;
    watermarkUrl?: string;
    primaryPhone?: string;
    secondaryPhone?: string;
    email?: string;
    website?: string;
    addressLine1?: string;
    addressLine2?: string;
    city?: string;
    state?: string;
    pincode?: string;
    country?: string;
    boardType?: "CBSE" | "ICSE" | "IB" | "STATE_BOARD" | "OTHER";
    affiliationNumber?: string;
    schoolCode?: string;
    taxId?: string;
    currencySymbol?: string;
    timezone?: string;
    owners?: any[];
    bankDetails?: Record<string, any>;
    smtpSettings?: SmtpSettings;
    activeTheme?: string;
}

export interface SmtpSettings {
    host: string;
    port: number;
    encryption: 'NONE' | 'SSL' | 'TLS';
    username: string;
    password?: string;
    fromName: string;
    fromEmail: string;
    replyTo?: string;
    isConfigured?: boolean;
    lastTestedAt?: string | null;
    connectionStatus?: 'SUCCESS' | 'FAILED' | 'UNTESTED';
}

export const getSchoolConfig = async (): Promise<SchoolConfigData> => {
    const response = await api.get("/school-config");
    return response.data.data;
};

export const updateSchoolConfig = async (formData: FormData): Promise<SchoolConfigData> => {
    const response = await api.post("/school-config", formData, {
        headers: {
            "Content-Type": "multipart/form-data",
        },
    });
    return response.data.data;
};

export const updateSmtpConfig = async (data: SmtpSettings): Promise<SmtpSettings> => {
    const response = await api.put("/school-config/smtp", data);
    return response.data.data;
};

export const testEmailConnection = async (recipientEmail: string): Promise<{ connectionStatus: string; lastTestedAt: string }> => {
    const response = await api.post("/school-config/test-email", { recipientEmail });
    return response.data.data;
};

export const updateActiveTheme = async (activeTheme: string): Promise<{ activeTheme: string }> => {
    const response = await api.put("/school-config/theme", { activeTheme });
    return response.data.data;
};

