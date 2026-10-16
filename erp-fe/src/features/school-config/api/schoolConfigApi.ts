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
