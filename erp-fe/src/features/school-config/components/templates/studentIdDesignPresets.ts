/**
 * Student ID Card Dummy Design Presets
 * 
 * Standard Rules:
 * - Type: STUDENT_ID_CARD
 * - Size: CR80 (85.6mm x 54mm)
 * - Orientation: LANDSCAPE ONLY
 * - Sides: FRONT ONLY
 */

export interface IdCardDesignPreset {
    key: string;
    name: string;
    label: string;
    description: string;
    badgeStyle: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    headerStyle: "TOP_BAR" | "FULL_BAND" | "LEFT_ACCENT" | "MINIMAL_BORDER" | "CURVED_HEADER";
    photoPosition: "LEFT" | "CENTER_LEFT" | "RIGHT";
    photoShape: "ROUNDED" | "CIRCLE" | "SQUARE";
    accentTone: string;
}

export const STUDENT_ID_DESIGN_PRESETS: IdCardDesignPreset[] = [
    {
        key: "classic_blue",
        name: "Classic Blue",
        label: "Corporate & Formal",
        description: "Official institutional look with royal blue header band, photo on left, and clear tabular student fields.",
        badgeStyle: "bg-blue-100 text-blue-800 border-blue-200",
        primaryColor: "#1E3A8A",
        secondaryColor: "#3B82F6",
        backgroundColor: "#FFFFFF",
        textColor: "#0F172A",
        headerStyle: "FULL_BAND",
        photoPosition: "LEFT",
        photoShape: "ROUNDED",
        accentTone: "border-blue-600"
    },
    {
        key: "modern_compact",
        name: "Modern Compact",
        label: "Sleek & Contemporary",
        description: "Modern top accent bar, rounded student badge portrait, clean grid layout with QR verification code.",
        badgeStyle: "bg-indigo-100 text-indigo-800 border-indigo-200",
        primaryColor: "#4F46E5",
        secondaryColor: "#818CF8",
        backgroundColor: "#FAFAFA",
        textColor: "#1E293B",
        headerStyle: "TOP_BAR",
        photoPosition: "LEFT",
        photoShape: "CIRCLE",
        accentTone: "border-indigo-500"
    },
    {
        key: "centered_photo",
        name: "Centered Portrait",
        label: "Visual Identity",
        description: "Prominent centered student portrait with prominent admission badges, emerald school crest and clean tags.",
        badgeStyle: "bg-emerald-100 text-emerald-800 border-emerald-200",
        primaryColor: "#065F46",
        secondaryColor: "#10B981",
        backgroundColor: "#FFFFFF",
        textColor: "#064E3B",
        headerStyle: "CURVED_HEADER",
        photoPosition: "CENTER_LEFT",
        photoShape: "ROUNDED",
        accentTone: "border-emerald-600"
    },
    {
        key: "minimal_white",
        name: "Minimal White",
        label: "Clean & High Contrast",
        description: "Pure white surface, charcoal typography, elegant hairline borders with maximum readability.",
        badgeStyle: "bg-slate-100 text-slate-800 border-slate-200",
        primaryColor: "#18181B",
        secondaryColor: "#71717A",
        backgroundColor: "#FFFFFF",
        textColor: "#09090B",
        headerStyle: "MINIMAL_BORDER",
        photoPosition: "LEFT",
        photoShape: "SQUARE",
        accentTone: "border-zinc-800"
    },
    {
        key: "bold_header",
        name: "Bold Crimson Header",
        label: "Prestigious Academy",
        description: "Striking crimson banner with white embossed school title, structured two-column student profile fields.",
        badgeStyle: "bg-rose-100 text-rose-800 border-rose-200",
        primaryColor: "#991B1B",
        secondaryColor: "#EF4444",
        backgroundColor: "#FFF5F5",
        textColor: "#450A0A",
        headerStyle: "FULL_BAND",
        photoPosition: "LEFT",
        photoShape: "ROUNDED",
        accentTone: "border-rose-600"
    }
];

export function getDesignPreset(key?: string): IdCardDesignPreset {
    return (
        STUDENT_ID_DESIGN_PRESETS.find(p => p.key === key) ||
        STUDENT_ID_DESIGN_PRESETS[0]
    );
}
