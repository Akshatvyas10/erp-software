import { QrCode, School, User, Bus, Phone, MapPin, ShieldCheck, Sparkles } from "lucide-react";
import type { DocumentTemplateItem, TemplateFieldItem } from "@/features/school-config/api/documentTemplateApi";
import { getModernPreset } from "../modernIdCardPresets";
import { cn, getImageUrl } from "@/lib/utils";

interface StudentIdCardPreviewProps {
    template: Partial<DocumentTemplateItem>;
    schoolName?: string;
    logoUrl?: string;
    activeSide?: "FRONT" | "BACK";
    schoolInfo?: {
        schoolName?: string;
        tagline?: string;
        address?: string;
        phone?: string;
        email?: string;
        website?: string;
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
    data?: {
        fullName?: string;
        photoUrl?: string;
        admissionNumber?: string;
        employeeId?: string;
        teacherId?: string;
        teacherCode?: string;
        rollNumber?: string;
        className?: string;
        grade?: string;
        section?: string;
        bloodGroup?: string;
        emergencyContact?: string;
        phone?: string;
        busRoute?: string;
        department?: string;
        designation?: string;
        academicYear?: string;
        address?: string;
        schoolInfo?: any;
    };
}

export function StudentIdCardPreview({
    template,
    schoolName,
    logoUrl,
    activeSide = "FRONT",
    schoolInfo,
    data
}: StudentIdCardPreviewProps) {
    const design = template.designConfig || {};
    const format = design.format || "landscape"; // 'landscape' | 'long'
    const isLandscape = format === "landscape";
    const preset = getModernPreset(design.designKey as any);

    // Customization overrides or preset defaults
    const headerSize = design.header?.size || preset.headerSize; // 'S' | 'M' | 'L'
    const headerStyle = design.header?.style || preset.headerStyle; // 'solid' | 'gradient' | 'transparent' | 'ribbon'
    const showLogo = design.header?.showLogo !== false && design.header?.showSchoolLogo !== false;
    const showSchoolName = design.header?.showSchoolName !== false;

    const photoShape = design.photoFrame?.shape || preset.photoShape; // 'squircle' | 'circle' | 'rounded_square' | 'hex'
    const photoBorder = design.photoFrame?.border || preset.photoBorder; // 'plain' | 'dual-ring' | 'accent' | 'none'
    const photoPosition = design.photoFrame?.position || (isLandscape ? "left" : "top"); // 'left' | 'right' | 'top'

    const nameSize = design.typography?.nameSize || preset.nameSize; // 'S' | 'M' | 'L'
    const density = design.typography?.density || "compact";
    const fontPreset = design.typography?.fontPreset || preset.fontPreset;

    const primaryColor = design.theme?.primaryColor || preset.primaryColor;
    const secondaryColor = design.theme?.secondaryColor || preset.secondaryColor;
    const accentColor = design.theme?.accentColor || preset.accentColor;
    const textColor = design.theme?.textColor || preset.textColor;

    const showCutGuides = design.dimensions?.showCutGuides ?? true;

    // Filtered selected fields
    const fields: TemplateFieldItem[] = (template.selectedFields || [])
        .filter((f: TemplateFieldItem) => f.visible)
        .sort((a: TemplateFieldItem, b: TemplateFieldItem) => a.order - b.order);

    // Dimensions: Landscape CR80 is 380x240, Long Card is 240x380
    const containerClasses = isLandscape ? "w-[380px] h-[240px]" : "w-[240px] h-[380px]";

    // Photo shape classes
    const getPhotoShapeClass = () => {
        switch (photoShape) {
            case "circle":
                return "rounded-full aspect-square";
            case "squircle":
                return "rounded-2xl";
            case "hex":
                return "rounded-xl rotate-1 border-2";
            case "rounded_square":
            default:
                return "rounded-xl";
        }
    };

    // Photo border styling
    const getPhotoBorderClass = () => {
        switch (photoBorder) {
            case "dual-ring":
                return "ring-2 ring-white/80 ring-offset-2 shadow-md";
            case "accent":
                return "border-2 shadow-sm";
            case "none":
                return "border-0 shadow-none";
            case "plain":
            default:
                return "border border-border/80 shadow-xs";
        }
    };

    // Header container height class
    const getHeaderHeightClass = () => {
        if (headerSize === "S") return "py-1.5 px-3";
        if (headerSize === "L") return "py-3 px-3.5";
        return "py-2 px-3";
    };

    // Typography styling
    const getFontPresetClass = () => {
        if (fontPreset === "editorial") return "font-serif";
        if (fontPreset === "technical") return "font-mono";
        if (fontPreset === "geometric") return "font-sans tracking-wide";
        return "font-sans";
    };

    const getNameSizeClass = () => {
        if (nameSize === "S") return cn("text-xs font-bold", getFontPresetClass());
        if (nameSize === "L") return cn("text-sm font-black tracking-tight", getFontPresetClass());
        return cn("text-[13px] font-extrabold", getFontPresetClass());
    };

    const effectiveSchool = schoolInfo || data?.schoolInfo || {};
    const effectiveSchoolName = schoolName || effectiveSchool.schoolName || "Springfield International Academy";
    const cacheBuster = (effectiveSchool as any)?.updatedAt ? new Date((effectiveSchool as any).updatedAt).getTime() : undefined;
    const rawLogo = logoUrl || effectiveSchool.logoUrl;
    const effectiveLogo = getImageUrl(rawLogo, cacheBuster);
    const effectiveAddress = effectiveSchool.address || "Institutional Campus, Knowledge City";
    const effectivePhone = effectiveSchool.phone || effectiveSchool.primaryPhone || "+91 98765 43210";
    const effectiveSignatoryName = effectiveSchool.authorizedSignatoryName || "Principal";
    const effectiveSignatoryDesignation = effectiveSchool.authorizedSignatoryDesignation || "Authorized Signatory";
    const principalSignature = getImageUrl(design.signatures?.principal?.signatureUrl || effectiveSchool.principalSignatureUrl, cacheBuster);
    const stampImage = getImageUrl(design.signatures?.institutionalSeal?.stampUrl || effectiveSchool.stampUrl, cacheBuster);
    const showPrincipalSignature = design.signatures?.principal?.enabled !== false && design.idCardSides?.backSideConfig?.showPrincipalSignature !== false;
    const showStamp = design.signatures?.institutionalSeal?.enabled !== false;

    const resolvedPhotoUrl = getImageUrl(data?.photoUrl);

    // -------------------------------------------------------------
    // BACK SIDE RENDERING (When sideMode is both_sides and activeSide is BACK)
    // -------------------------------------------------------------
    if (activeSide === "BACK") {
        return (
            <div className="relative group">
                <div className="absolute -top-6 left-0 right-0 flex items-center justify-between text-[10px] text-muted-foreground font-mono px-1">
                    <span>{isLandscape ? "Landscape CR80 (85.6 × 54mm)" : "Long Card (54 × 85.6mm)"}</span>
                    <span className="font-semibold text-primary">Back Side Canvas</span>
                </div>

                <div 
                    data-printable-document="true"
                    className={cn(
                        "rounded-xl border border-border/80 shadow-lg flex flex-col justify-between text-xs transition-all relative overflow-hidden bg-white p-3.5 select-none",
                        containerClasses,
                        showCutGuides && "ring-1 ring-dashed ring-primary/40 ring-offset-2",
                        preset.cardBackgroundCss
                    )}
                >
                    {/* Top strip */}
                    <div 
                        className="h-1.5 absolute top-0 left-0 right-0"
                        style={{ backgroundColor: primaryColor }}
                    />

                    <div className="space-y-1.5 pt-1 flex-1 overflow-hidden">
                        <div className="flex items-center justify-between border-b pb-1.5 border-border/40">
                            <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground flex items-center gap-1">
                                <ShieldCheck className="w-3.5 h-3.5 text-primary" /> Institutional Guidelines
                            </span>
                            <span className="text-[8px] font-mono opacity-60">CR80-SEC</span>
                        </div>

                        <p className="text-[8.5px] leading-relaxed opacity-80 italic bg-black/5 dark:bg-white/5 p-1.5 rounded-lg border border-border/40 line-clamp-2">
                            {design.idCardSides?.backSideConfig?.instructionsText || "This credential badge certifies bona fide institutional enrollment. If lost or discovered unattended, kindly deliver to the institution front desk."}
                        </p>

                        <div className="space-y-1 pt-0.5 text-[9px]">
                            <div className="flex items-start gap-1.5">
                                <MapPin className="w-3 h-3 text-primary shrink-0 mt-0.5" />
                                <span className="opacity-80 text-[8px] line-clamp-1">{effectiveAddress}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Phone className="w-3 h-3 text-primary shrink-0" />
                                <span className="font-bold text-[8.5px]">{effectivePhone} • Official Helpdesk</span>
                            </div>
                            {data?.busRoute && (
                                <div className="flex items-center gap-1.5">
                                    <Bus className="w-3 h-3 text-amber-500 shrink-0" />
                                    <span className="text-[8px] font-semibold opacity-90">{data.busRoute}</span>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom barcode & principal signature / stamp */}
                    <div className="pt-1.5 border-t border-border/50 flex items-end justify-between shrink-0 relative">
                        <div className="flex items-center gap-1.5">
                            <QrCode className="w-6 h-6 opacity-80" />
                            <span className="text-[8px] font-mono opacity-70">
                                {data?.admissionNumber || data?.employeeId || "AUTH-SEC"}
                            </span>
                        </div>

                        {/* Optional School Stamp watermark */}
                        {showStamp && stampImage && (
                            <div className="absolute right-16 bottom-0.5 pointer-events-none opacity-20">
                                <img src={stampImage} alt="Stamp" className="w-10 h-10 object-contain" />
                            </div>
                        )}

                        {/* Signature block with graceful fallback */}
                        {showPrincipalSignature && (
                            <div className="text-right flex flex-col items-end">
                                <div className="h-6 flex items-end justify-end">
                                    {principalSignature ? (
                                        <img 
                                            src={principalSignature} 
                                            alt="Principal Signature" 
                                            className="h-6 max-w-[80px] object-contain" 
                                        />
                                    ) : (
                                        <div className="w-16 border-b border-foreground/50 mb-0.5" />
                                    )}
                                </div>
                                <span className="text-[8px] font-serif font-bold block leading-tight" style={{ color: primaryColor }}>
                                    {effectiveSignatoryName}
                                </span>
                                <span className="text-[6.5px] uppercase tracking-wider font-semibold opacity-60">
                                    {effectiveSignatoryDesignation}
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // -------------------------------------------------------------
    // FRONT SIDE RENDERING
    // -------------------------------------------------------------
    return (
        <div className="relative group">
            {/* Header info badge */}
            <div className="absolute -top-6 left-0 right-0 flex items-center justify-between text-[10px] text-muted-foreground font-mono px-1">
                <span>{isLandscape ? "CR80 Landscape (85.6 × 54mm)" : "Long Card Vertical (54 × 85.6mm)"}</span>
                <span className="font-semibold text-primary">{preset.name}</span>
            </div>

            <div 
                data-printable-document="true"
                className={cn(
                    "rounded-xl border border-border/80 shadow-lg flex flex-col justify-between text-xs transition-all relative overflow-hidden select-none",
                    containerClasses,
                    showCutGuides && "ring-1 ring-dashed ring-primary/40 ring-offset-2",
                    preset.cardBackgroundCss
                )}
                style={{
                    backgroundColor: design.designKey === "neon_glass" ? undefined : (design.theme?.backgroundColor || preset.backgroundColor),
                    color: textColor
                }}
            >
                {/* 1. HEADER SECTION */}
                <div 
                    className={cn(
                        "relative shrink-0 flex items-center justify-between overflow-hidden",
                        getHeaderHeightClass(),
                        headerStyle === "gradient" && "bg-gradient-to-r text-white shadow-xs",
                        headerStyle === "solid" && "text-white shadow-xs",
                        headerStyle === "ribbon" && "border-b-2 text-white shadow-sm",
                        headerStyle === "transparent" && "bg-transparent border-b border-border/30"
                    )}
                    style={{
                        backgroundColor: headerStyle === "solid" ? primaryColor : 
                                         headerStyle === "ribbon" ? primaryColor : undefined,
                        backgroundImage: headerStyle === "gradient" ? `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` : undefined,
                        borderColor: headerStyle === "ribbon" ? accentColor : undefined
                    }}
                >
                    <div className="flex items-center gap-2 overflow-hidden flex-1">
                        {showLogo && (
                            <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center p-0.5 backdrop-blur-xs shrink-0 border border-white/20 shadow-2xs">
                                {effectiveLogo ? (
                                    <img src={effectiveLogo} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <School className="w-3.5 h-3.5" style={{ color: headerStyle === "transparent" ? primaryColor : "#FFFFFF" }} />
                                )}
                            </div>
                        )}
                        <div className="overflow-hidden">
                            {showSchoolName && (
                                <h4 className="font-black text-[11px] tracking-tight leading-tight truncate">
                                    {effectiveSchoolName}
                                </h4>
                            )}
                            <p className="text-[7.5px] opacity-75 font-medium truncate">
                                {template.type === "TEACHER_ID_CARD" ? "Faculty Identity Badge" : "Student Identity Badge"} • 2026-27
                            </p>
                        </div>
                    </div>

                    <div className="shrink-0 pl-1">
                        <span 
                            className="text-[7.5px] font-extrabold uppercase px-1.5 py-0.5 rounded-full"
                            style={{ 
                                backgroundColor: headerStyle === "transparent" ? `${primaryColor}20` : "rgba(255,255,255,0.25)",
                                color: headerStyle === "transparent" ? primaryColor : "#FFFFFF"
                            }}
                        >
                            {template.type === "TEACHER_ID_CARD" ? "Faculty" : "Student"}
                        </span>
                    </div>
                </div>

                {/* 2. BODY SECTION (ADAPTS TO LANDSCAPE VS LONG VERTICAL) */}
                {isLandscape ? (
                    /* ----------------- LANDSCAPE LAYOUT ----------------- */
                    <div className={cn(
                        "px-3.5 py-1.5 flex items-center gap-3 flex-1 overflow-hidden",
                        photoPosition === "right" && "flex-row-reverse"
                    )}>
                        {/* Student / Faculty Photo */}
                        <div 
                            className={cn(
                                "w-16 h-20 bg-muted/60 flex items-center justify-center overflow-hidden shrink-0",
                                getPhotoShapeClass(),
                                getPhotoBorderClass()
                            )}
                            style={{ 
                                borderColor: photoBorder === "accent" ? primaryColor : undefined,
                                backgroundColor: design.designKey === "neon_glass" ? "rgba(255,255,255,0.08)" : undefined 
                            }}
                        >
                            {resolvedPhotoUrl ? (
                                <img src={resolvedPhotoUrl} alt="Photo" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-8 h-8 opacity-40" />
                            )}
                        </div>

                        {/* Fields & Student Name */}
                        <div className="flex-1 space-y-1 overflow-hidden text-left">
                            <div className="leading-tight">
                                <h3 className={cn("truncate text-foreground", getNameSizeClass())}>
                                    {data?.fullName || "Aarav Sharma"}
                                </h3>
                                <span className="text-[9px] font-mono font-bold opacity-75 uppercase" style={{ color: primaryColor }}>
                                    {template.type === "TEACHER_ID_CARD" || data?.employeeId || data?.teacherId 
                                        ? `EMP: ${data?.employeeId || data?.teacherCode || data?.teacherId || "TCH-001"}` 
                                        : `ADM: ${data?.admissionNumber || "2026-042"}`}
                                </span>
                            </div>

                            <div className={cn("space-y-0.5 pt-0.5", density === "compact" ? "space-y-0.5" : "space-y-1")}>
                                {fields.slice(0, 4).map((f) => {
                                    let val = "Sample Value";
                                    if (f.key === "fullName") val = data?.fullName || "Aarav Sharma";
                                    else if (f.key === "admissionNumber") val = data?.admissionNumber || "ADM-2026-042";
                                    else if (f.key === "employeeId" || f.key === "teacherId") val = data?.employeeId || data?.teacherCode || data?.teacherId || "TCH-001";
                                    else if (f.key === "className") val = data?.className || "Grade 10 - Section A";
                                    else if (f.key === "rollNumber") val = data?.rollNumber || "14";
                                    else if (f.key === "bloodGroup") val = data?.bloodGroup || "O+";
                                    else if (f.key === "emergencyContact") val = data?.emergencyContact || "+91 98765 43210";
                                    else if (f.key === "department") val = data?.department || "Academics";
                                    else if (f.key === "designation") val = data?.designation || "Faculty";
                                    else if (f.key === "transportBusNumber") val = data?.busRoute || "Route 12 (Walker)";
                                    else if (data && (data as any)[f.key]) val = String((data as any)[f.key]);

                                    return (
                                        <div key={f.key} className="text-[9.5px] leading-tight truncate flex items-center gap-1">
                                            <span className="opacity-60 text-[8px] uppercase font-bold shrink-0">{f.label}:</span>
                                            <span className={cn("font-medium truncate", f.isBold && "font-bold")}>
                                                {val}
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        {/* QR Code */}
                        <div className="shrink-0 flex flex-col items-center">
                            <div className="p-0.5 rounded-md bg-white border border-border/60 shadow-2xs">
                                <QrCode className="w-7 h-7 text-slate-900" />
                            </div>
                            <span className="text-[7px] font-mono opacity-60 mt-0.5">SEC-ID</span>
                        </div>
                    </div>
                ) : (
                    /* ----------------- LONG VERTICAL LAYOUT ----------------- */
                    <div className="px-3.5 py-2 flex flex-col items-center flex-1 justify-between overflow-hidden text-center space-y-1.5">
                        {/* Student Photo */}
                        <div 
                            className={cn(
                                "w-20 h-22 bg-muted/60 flex items-center justify-center overflow-hidden shrink-0 mt-1",
                                getPhotoShapeClass(),
                                getPhotoBorderClass()
                            )}
                            style={{ 
                                borderColor: photoBorder === "accent" ? primaryColor : undefined,
                                backgroundColor: design.designKey === "neon_glass" ? "rgba(255,255,255,0.08)" : undefined 
                            }}
                        >
                            {resolvedPhotoUrl ? (
                                <img src={resolvedPhotoUrl} alt="Photo" className="w-full h-full object-cover" />
                            ) : (
                                <User className="w-10 h-10 opacity-40" />
                            )}
                        </div>

                        {/* Name and Admission Pill */}
                        <div className="w-full">
                            <h3 className={cn("truncate text-foreground", getNameSizeClass())}>
                                {data?.fullName || "Aarav Sharma"}
                            </h3>
                            <span className="inline-block mt-0.5 px-2 py-0.5 rounded-full text-[8.5px] font-mono font-bold tracking-wider" style={{ backgroundColor: `${primaryColor}20`, color: primaryColor }}>
                                {template.type === "TEACHER_ID_CARD" || data?.employeeId || data?.teacherId
                                    ? `EMP: ${data?.employeeId || data?.teacherCode || data?.teacherId || "TCH-001"}`
                                    : `ADM: ${data?.admissionNumber || "2026-042"}`}
                            </span>
                        </div>

                        {/* Fields List */}
                        <div className="w-full space-y-1 px-1">
                            {fields.slice(0, 4).map((f) => {
                                let val = "Sample";
                                if (f.key === "fullName") val = data?.fullName || "Aarav Sharma";
                                else if (f.key === "admissionNumber") val = data?.admissionNumber || "ADM-2026-042";
                                else if (f.key === "employeeId" || f.key === "teacherId") val = data?.employeeId || data?.teacherCode || data?.teacherId || "TCH-001";
                                else if (f.key === "className") val = data?.className || "Grade 10 - A";
                                else if (f.key === "rollNumber") val = data?.rollNumber || "14";
                                else if (f.key === "bloodGroup") val = data?.bloodGroup || "O+";
                                else if (f.key === "emergencyContact") val = data?.emergencyContact || "+91 98765 43210";
                                else if (f.key === "department") val = data?.department || "Academics";
                                else if (f.key === "designation") val = data?.designation || "Faculty";
                                else if (data && (data as any)[f.key]) val = String((data as any)[f.key]);

                                return (
                                    <div key={f.key} className="text-[9px] flex items-center justify-between border-b border-border/30 pb-0.5 leading-tight">
                                        <span className="opacity-60 text-[8px] uppercase font-bold">{f.label}</span>
                                        <span className={cn("font-medium truncate max-w-[120px]", f.isBold && "font-bold")}>
                                            {val}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>

                        {/* QR Code */}
                        <div className="flex items-center gap-1.5 pt-0.5">
                            <div className="p-0.5 rounded bg-white border shadow-2xs">
                                <QrCode className="w-6 h-6 text-slate-900" />
                            </div>
                            <span className="text-[7.5px] font-mono opacity-70">VALID 2026-27</span>
                        </div>
                    </div>
                )}

                {/* 3. FOOTER STRIP */}
                <div 
                    className="py-1 px-3 border-t text-[8px] flex items-center justify-between shrink-0"
                    style={{ 
                        backgroundColor: design.designKey === "neon_glass" ? "rgba(255,255,255,0.06)" : `${secondaryColor}15`,
                        borderColor: `${primaryColor}20`
                    }}
                >
                    <span className="font-semibold opacity-75">Academic Session 2026-27</span>
                    <span className="font-black uppercase tracking-wider text-[7.5px] flex items-center gap-1" style={{ color: primaryColor }}>
                        <Sparkles className="w-2.5 h-2.5" /> Verified ID
                    </span>
                </div>
            </div>
        </div>
    );
}
