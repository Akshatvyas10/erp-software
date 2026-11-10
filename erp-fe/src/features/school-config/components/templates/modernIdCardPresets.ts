/**
 * Modern & Unexpected Student ID Card Design Presets
 * 
 * 6 Ultra-Modern Designs:
 * 1. Neon Glass - Frosted glass card, soft blur backdrop, minimal typography
 * 2. Split Diagonal - Diagonal dual-tone color split, bold identity badge
 * 3. Orbital Photo - Circular/hex framing with modern status rings & badges
 * 4. Editorial Minimal - Magazine aesthetic, large editorial name, thin hairline accents
 * 5. Soft Gradient Mesh - Fluid subtle mesh background, clean card stack
 * 6. Ribbon Header Pro - Dynamic ribbon banner with compact grid metrics
 */

export interface ModernIdCardPreset {
    key: "neon_glass" | "split_diagonal" | "orbital_photo" | "editorial_minimal" | "gradient_mesh" | "ribbon_header_pro";
    name: string;
    label: string;
    tagline: string;
    description: string;
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    accentColor: string;
    headerStyle: "solid" | "gradient" | "transparent" | "ribbon";
    headerSize: "S" | "M" | "L";
    photoShape: "squircle" | "circle" | "rounded_square" | "hex";
    photoBorder: "plain" | "dual-ring" | "accent" | "none";
    fontPreset: "modern_sans" | "geometric" | "editorial" | "technical";
    nameSize: "S" | "M" | "L";
    cardBackgroundCss: string;
}

export const MODERN_STUDENT_ID_PRESETS: ModernIdCardPreset[] = [
    {
        key: "neon_glass",
        name: "Neon Glass",
        label: "Cyber Glassmorphism",
        tagline: "Frosted glass panels & subtle neon glow",
        description: "Translucent frosted acrylic panel over a rich dark indigo gradient with neon cyber accents and micro-badges.",
        primaryColor: "#6366F1",
        secondaryColor: "#06B6D4",
        backgroundColor: "#0F172A",
        textColor: "#F8FAFC",
        accentColor: "#38BDF8",
        headerStyle: "transparent",
        headerSize: "M",
        photoShape: "squircle",
        photoBorder: "dual-ring",
        fontPreset: "modern_sans",
        nameSize: "L",
        cardBackgroundCss: "bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 text-slate-100"
    },
    {
        key: "split_diagonal",
        name: "Split Diagonal",
        label: "Dynamic Geometry",
        tagline: "Diagonal split tone & sharp visual contrast",
        description: "Bold angled color-blocked header cutting across the card, giving an active collegiate and athletic identity.",
        primaryColor: "#2563EB",
        secondaryColor: "#F59E0B",
        backgroundColor: "#FFFFFF",
        textColor: "#0F172A",
        accentColor: "#F59E0B",
        headerStyle: "solid",
        headerSize: "L",
        photoShape: "rounded_square",
        photoBorder: "accent",
        fontPreset: "geometric",
        nameSize: "M",
        cardBackgroundCss: "bg-white text-slate-900"
    },
    {
        key: "orbital_photo",
        name: "Orbital Photo",
        label: "Tech-Bio Badge",
        tagline: "Circular halo framing & status orbit",
        description: "Centered or side circular portrait enclosed within an orbital ring status aura, accompanied by barcode metrics.",
        primaryColor: "#0D9488",
        secondaryColor: "#14B8A6",
        backgroundColor: "#F0FDFA",
        textColor: "#134E4A",
        accentColor: "#0F766E",
        headerStyle: "gradient",
        headerSize: "M",
        photoShape: "circle",
        photoBorder: "dual-ring",
        fontPreset: "technical",
        nameSize: "M",
        cardBackgroundCss: "bg-gradient-to-b from-teal-50 via-white to-emerald-50/40 text-teal-950"
    },
    {
        key: "editorial_minimal",
        name: "Editorial Minimal",
        label: "Swiss Magazine",
        tagline: "Large typography & fine hairline borders",
        description: "Monochrome gallery aesthetic with large sans-serif typography, clean hairline grids, and maximum white space clarity.",
        primaryColor: "#18181B",
        secondaryColor: "#52525B",
        backgroundColor: "#FFFFFF",
        textColor: "#09090B",
        accentColor: "#E4E4E7",
        headerStyle: "transparent",
        headerSize: "S",
        photoShape: "squircle",
        photoBorder: "plain",
        fontPreset: "editorial",
        nameSize: "L",
        cardBackgroundCss: "bg-white text-zinc-900"
    },
    {
        key: "gradient_mesh",
        name: "Soft Gradient Mesh",
        label: "Vibrant Fluidity",
        tagline: "Subtle mesh gradients & floating data cards",
        description: "Dreamy mesh aura background with floating rounded data capsules that make student information pop vibrantly.",
        primaryColor: "#8B5CF6",
        secondaryColor: "#EC4899",
        backgroundColor: "#FAF5FF",
        textColor: "#3B0764",
        accentColor: "#D946EF",
        headerStyle: "gradient",
        headerSize: "M",
        photoShape: "squircle",
        photoBorder: "dual-ring",
        fontPreset: "modern_sans",
        nameSize: "M",
        cardBackgroundCss: "bg-gradient-to-tr from-violet-100/70 via-fuchsia-50 to-pink-100/60 text-purple-950"
    },
    {
        key: "ribbon_header_pro",
        name: "Ribbon Header Pro",
        label: "Academic Prestige",
        tagline: "Embossed ribbon band & compact data table",
        description: "Layered 3D ribbon banner with gold institutional crest accents, optimized for fast barcode scanning and inspections.",
        primaryColor: "#991B1B",
        secondaryColor: "#D97706",
        backgroundColor: "#FFFFFF",
        textColor: "#450A0A",
        accentColor: "#F59E0B",
        headerStyle: "ribbon",
        headerSize: "L",
        photoShape: "rounded_square",
        photoBorder: "accent",
        fontPreset: "geometric",
        nameSize: "M",
        cardBackgroundCss: "bg-white text-rose-950"
    }
];

export function getModernPreset(key?: string): ModernIdCardPreset {
    return (
        MODERN_STUDENT_ID_PRESETS.find(p => p.key === key) ||
        MODERN_STUDENT_ID_PRESETS[0]
    );
}
