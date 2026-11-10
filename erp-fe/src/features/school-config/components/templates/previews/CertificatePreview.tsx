import { School } from "lucide-react";
import type { DocumentTemplateItem, TemplateFieldItem } from "@/features/school-config/api/documentTemplateApi";
import { getDocumentDimensions } from "../templateSizeConfig";
import { DOCUMENT_CONTENT_DEFAULTS, replacePlaceholders } from "../documentContentTemplates";
import { cn, getImageUrl } from "@/lib/utils";

export type DocumentDownloadMode = "plain_empty" | "without_signature" | "digital_signed";

interface CertificatePreviewProps {
    template: Partial<DocumentTemplateItem>;
    schoolName?: string;
    logoUrl?: string;
    schoolInfo?: {
        schoolName?: string;
        tagline?: string;
        address?: string;
        phone?: string;
        primaryPhone?: string;
        secondaryPhone?: string;
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
    downloadMode?: DocumentDownloadMode;
    mockStudentData?: Record<string, string>;
}

export function CertificatePreview({
    template,
    schoolName,
    logoUrl,
    schoolInfo,
    downloadMode = "without_signature",
    mockStudentData = {}
}: CertificatePreviewProps) {
    const isPlainEmpty = downloadMode === "plain_empty";

    const paperSize = template.paperSize || "A4";
    const orientation = template.orientation || "PORTRAIT";
    const isLandscape = orientation === "LANDSCAPE";

    const dimensions = getDocumentDimensions(
        paperSize, 
        orientation, 
        template.designConfig?.dimensions?.widthMm, 
        template.designConfig?.dimensions?.heightMm
    );

    const design = template.designConfig || {};
    const theme = design.theme || {};
    const header = design.header || {};
    const watermark = design.watermark || {};
    const editable = design.editableContent || DOCUMENT_CONTENT_DEFAULTS[template.type || "TRANSFER_CERTIFICATE"] || DOCUMENT_CONTENT_DEFAULTS.CUSTOM;
    const tableConfig = design.tableConfig;
    const signatures = design.signatures || {};

    const primaryColor = theme.primaryColor || "#1E3A8A";
    const textColor = theme.textColor || "#0F172A";
    const backgroundColor = theme.backgroundColor || "#FFFFFF";

    const fields: TemplateFieldItem[] = (template.selectedFields || [])
        .filter((f: TemplateFieldItem) => f.visible)
        .sort((a: TemplateFieldItem, b: TemplateFieldItem) => a.order - b.order);

    const effectiveSchool = schoolInfo || {};
    const effectiveSchoolName = schoolName || effectiveSchool.schoolName || "Springfield International Academy";
    const cacheBuster = (effectiveSchool as any)?.updatedAt ? new Date((effectiveSchool as any).updatedAt).getTime() : undefined;
    const rawLogo = logoUrl || effectiveSchool.logoUrl;
    const effectiveLogo = getImageUrl(rawLogo, cacheBuster);
    const rawWatermark = effectiveSchool.watermarkUrl || rawLogo;
    const effectiveWatermark = getImageUrl(rawWatermark, cacheBuster);
    const effectiveAddress = effectiveSchool.address || "Institutional Campus, Knowledge Park V, Greater Noida, UP - 201306";
    const effectiveBoard = effectiveSchool.boardType || "CBSE";
    const effectiveAffiliation = effectiveSchool.affiliationNumber || "213094";
    const effectiveSchoolCode = effectiveSchool.schoolCode || "54092";
    const effectiveSignatoryName = effectiveSchool.authorizedSignatoryName || "Principal";
    const effectiveSignatoryDesignation = effectiveSchool.authorizedSignatoryDesignation || "Principal / Head of School";
    const principalSignature = getImageUrl(design.signatures?.principal?.signatureUrl || effectiveSchool.principalSignatureUrl, cacheBuster);
    const stampImage = getImageUrl(design.signatures?.institutionalSeal?.stampUrl || effectiveSchool.stampUrl, cacheBuster);

    // Dynamic replacement of body text with merged school + student tokens
    const mergedData = {
        ...mockStudentData,
        schoolName: effectiveSchoolName,
        schoolAddress: effectiveAddress,
        schoolContact: effectiveSchool.phone || effectiveSchool.primaryPhone || "+91 98765 43210",
        schoolEmail: effectiveSchool.email || "info@institution.edu",
        schoolWebsite: effectiveSchool.website || "www.institution.edu",
        schoolCode: effectiveSchoolCode,
        affiliationNumber: effectiveAffiliation,
        boardType: effectiveBoard,
    };

    const resolvedBodyText = replacePlaceholders(
        editable.bodyTemplate || "",
        mergedData,
        isPlainEmpty
    );

    // Sample Academic Marks Data for Report Card
    const sampleReportRows = [
        { subject: "English Language & Literature", max: 100, obtained: isPlainEmpty ? "" : 94, grade: isPlainEmpty ? "" : "A1", remarks: isPlainEmpty ? "" : "Outstanding" },
        { subject: "Mathematics (Standard)", max: 100, obtained: isPlainEmpty ? "" : 98, grade: isPlainEmpty ? "" : "A1", remarks: isPlainEmpty ? "" : "Exemplary" },
        { subject: "Science & Technology", max: 100, obtained: isPlainEmpty ? "" : 92, grade: isPlainEmpty ? "" : "A1", remarks: isPlainEmpty ? "" : "Very Good" },
        { subject: "Social Science", max: 100, obtained: isPlainEmpty ? "" : 88, grade: isPlainEmpty ? "" : "A2", remarks: isPlainEmpty ? "" : "Commendable" },
        { subject: "Computer Applications & AI", max: 100, obtained: isPlainEmpty ? "" : 99, grade: isPlainEmpty ? "" : "A1", remarks: isPlainEmpty ? "" : "Brilliant" }
    ];

    // Container sizing: Standard A4 (210mm x 297mm ratio is 1:1.414)
    // Landscape A4 (297mm x 210mm ratio is 1.414:1)
    const containerClasses = isLandscape 
        ? "w-[680px] min-h-[480px]" 
        : "w-[480px] min-h-[679px]";

    const extraLines = editable.extraLines || [];

    return (
        <div className="relative group my-auto">
            {/* Header Status Bar */}
            <div className="flex items-center justify-between text-[10px] text-muted-foreground font-mono px-1 mb-2">
                <span>{dimensions.label}</span>
                <span className="font-bold uppercase tracking-wider text-[9px] px-2 py-0.5 rounded bg-blue-100 text-blue-800 border border-blue-300 dark:bg-blue-950 dark:text-blue-300">
                    Without Signature (Wet-Ink Physical Signing)
                </span>
            </div>

            {/* A4 Sheet Surface */}
            <div 
                data-printable-document="true"
                className={cn(
                    "rounded-xl border-4 border-double shadow-2xl p-6 sm:p-7 flex flex-col justify-between text-xs transition-all relative overflow-hidden bg-white select-none",
                    containerClasses
                )}
                style={{ 
                    backgroundColor, 
                    color: textColor,
                    borderColor: primaryColor 
                }}
            >
                {/* 1. BACKGROUND WATERMARK LOGO */}
                {watermark.enabled !== false && (
                    <div 
                        className={cn(
                            "absolute inset-0 flex items-center justify-center pointer-events-none",
                            watermark.rotate && "rotate-[-25deg]"
                        )}
                        style={{ 
                            opacity: watermark.opacity ?? 0.08,
                            transform: `scale(${watermark.scale || 1.15})`
                        }}
                    >
                        {effectiveWatermark ? (
                            <img src={effectiveWatermark} alt="Watermark" className="w-64 h-64 object-contain" />
                        ) : (
                            <School className="w-64 h-64" style={{ color: primaryColor }} />
                        )}
                    </div>
                )}

                {/* 2. OFFICIAL HEADER */}
                <div className="text-center space-y-1.5 border-b pb-3 relative z-10 shrink-0" style={{ borderColor: `${primaryColor}30` }}>
                    {header.showSchoolLogo !== false && (
                        <div className="w-11 h-11 mx-auto rounded-lg bg-muted/60 flex items-center justify-center p-1.5 border shadow-2xs">
                            {effectiveLogo ? (
                                <img src={effectiveLogo} alt="Logo" className="w-full h-full object-contain" />
                            ) : (
                                <School className="w-6 h-6" style={{ color: primaryColor }} />
                            )}
                        </div>
                    )}
                    {header.showSchoolName !== false && (
                        <h2 className="text-base font-black tracking-tight uppercase line-clamp-1" style={{ color: primaryColor }}>
                            {effectiveSchoolName}
                        </h2>
                    )}
                    {header.showAffiliation !== false && (
                        <p className="text-[9px] text-muted-foreground font-medium truncate">
                            Affiliated to {effectiveBoard} • School Code: {effectiveSchoolCode} • Affiliation No: {effectiveAffiliation}
                        </p>
                    )}
                    {header.showSchoolAddress !== false && (
                        <p className="text-[8.5px] text-muted-foreground truncate">
                            Campus: {effectiveAddress}
                        </p>
                    )}

                    <div className="pt-1.5">
                        <span 
                            className="inline-block px-4 py-1 text-xs font-black tracking-wider uppercase rounded-md text-white shadow-xs"
                            style={{ backgroundColor: primaryColor }}
                        >
                            {editable.certificateTitle || template.name || "Official Certificate"}
                        </span>
                    </div>
                </div>

                {/* 3. BODY SECTION (CUSTOMIZABLE PARAGRAPHS OR MARKS TABLE) */}
                <div className="py-4 space-y-3 relative z-10 text-center flex-1 flex flex-col justify-center">
                    <p className="text-xs italic text-muted-foreground">
                        {editable.leadText || "This is to formally certify that:"}
                    </p>

                    {/* Student Name Display */}
                    <div>
                        <p className="text-lg font-black tracking-wide border-b-2 border-dotted inline-block px-5 pb-0.5" style={{ color: primaryColor }}>
                            {isPlainEmpty ? "____________________________" : (mockStudentData.studentName || "Aarav Sharma")}
                        </p>
                    </div>

                    {/* REPORT CARD: MARKS TABLE */}
                    {template.type === "REPORT_CARD" || tableConfig?.enabled ? (
                        <div className="w-full border rounded-lg overflow-hidden text-[9.5px] shrink-0 my-2">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr 
                                        className="border-b"
                                        style={{ 
                                            backgroundColor: tableConfig?.headerBgColor || `${primaryColor}15`,
                                            color: tableConfig?.headerTextColor || primaryColor
                                        }}
                                    >
                                        <th className="p-1.5 pl-2 font-bold">Subject</th>
                                        <th className="p-1.5 text-center font-bold">Max</th>
                                        <th className="p-1.5 text-center font-bold">Obtained</th>
                                        <th className="p-1.5 text-center font-bold">Grade</th>
                                        <th className="p-1.5 font-bold">Remarks</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sampleReportRows.map((row, idx) => (
                                        <tr 
                                            key={row.subject}
                                            className={cn(
                                                "border-b border-border/40",
                                                tableConfig?.alternateRowShading !== false && idx % 2 === 1 && "bg-muted/30"
                                            )}
                                        >
                                            <td className="p-1.5 pl-2 font-medium truncate max-w-[150px]">{row.subject}</td>
                                            <td className="p-1.5 text-center font-mono">{row.max}</td>
                                            <td className="p-1.5 text-center font-mono font-bold">{row.obtained}</td>
                                            <td className="p-1.5 text-center font-bold">{row.grade}</td>
                                            <td className="p-1.5 text-[9px] opacity-80">{row.remarks}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        /* CERTIFICATE: BODY PARAGRAPHS & DETAILS CAPSULES */
                        <div className="space-y-2.5 px-3">
                            <p className="text-[10.5px] leading-relaxed text-foreground/90 whitespace-pre-line text-justify">
                                {resolvedBodyText}
                            </p>

                            {/* Additional Custom Lines added by Admin */}
                            {extraLines.length > 0 && (
                                <div className="space-y-1.5 text-left pt-1">
                                    {extraLines.map((line, idx) => {
                                        const resolvedLine = replacePlaceholders(line, mockStudentData, isPlainEmpty);
                                        return (
                                            <p key={idx} className="text-[10px] text-foreground/85 leading-normal flex items-start gap-1.5">
                                                <span className="text-primary font-bold">•</span>
                                                <span>{resolvedLine}</span>
                                            </p>
                                        );
                                    })}
                                </div>
                            )}

                            {/* Optional quick grid tags for visible fields */}
                            {fields.length > 0 && (
                                <div className={cn(
                                    "gap-1.5 text-left text-[9.5px] bg-muted/20 p-2.5 rounded-lg border my-2",
                                    isLandscape ? "grid grid-cols-3" : "grid grid-cols-2"
                                )}>
                                    {fields.slice(0, 6).map((f) => (
                                        <div key={f.key} className="truncate">
                                            <span className="text-[8px] text-muted-foreground uppercase font-semibold mr-1">{f.label}:</span>
                                            <span className={cn("font-medium", f.isBold && "font-bold")}>
                                                {isPlainEmpty ? "________" : (mockStudentData[f.key] || "Sample Record")}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <p className="text-[9px] text-muted-foreground italic px-3 pt-1">
                        {editable.closingDeclaration || "Entered into institutional registers and verified according to school bye-laws."}
                    </p>
                </div>

                {/* 4. FOOTER SIGNATURES & STAMPS (RESPONDS TO DOWNLOAD MODE) */}
                <div className="pt-2 border-t flex items-end justify-between text-center relative z-10 shrink-0" style={{ borderColor: `${primaryColor}30` }}>
                    {/* Date / Issuer Block */}
                    <div className="space-y-0.5">
                        <div className="h-6 flex items-end justify-center">
                            <span className="text-[9px] font-mono">
                                {isPlainEmpty ? "____/____/2026" : "31/10/2026"}
                            </span>
                        </div>
                        <p className="text-[8px] font-bold uppercase text-muted-foreground border-t pt-0.5">
                            Issue Date
                        </p>
                    </div>

                    {/* Institutional Seal Stamp */}
                    <div className="space-y-0.5 relative">
                        <div className="h-8 flex items-end justify-center">
                            {stampImage ? (
                                <img 
                                    src={stampImage} 
                                    alt="School Stamp" 
                                    className="w-10 h-10 object-contain drop-shadow-xs" 
                                />
                            ) : (
                                /* Blank physical seal guide circle */
                                <div className="w-8 h-8 rounded-full border border-dashed border-border/80 flex items-center justify-center">
                                    <span className="text-[6.5px] uppercase font-bold text-muted-foreground/60">SEAL</span>
                                </div>
                            )}
                        </div>
                        <p className="text-[8px] font-bold uppercase text-muted-foreground border-t pt-0.5">
                            Institutional Seal
                        </p>
                    </div>

                    {/* Class Teacher Signature (If enabled) */}
                    {(signatures.classTeacher?.enabled || template.type === "REPORT_CARD") && (
                        <div className="space-y-0.5">
                            <div className="h-8 flex items-end justify-center">
                                {signatures.classTeacher?.signatureUrl ? (
                                    <img 
                                        src={signatures.classTeacher.signatureUrl} 
                                        alt="Teacher Signature" 
                                        className="h-7 max-w-[80px] object-contain" 
                                    />
                                ) : (
                                    <div className="w-16 border-b border-muted-foreground/40 mb-1" />
                                )}
                            </div>
                            <p className="text-[8px] font-bold uppercase text-muted-foreground border-t pt-0.5">
                                Class Teacher
                            </p>
                        </div>
                    )}

                    {/* Head / Principal Authorized Signatory */}
                    <div className="space-y-0.5">
                        <div className="h-8 flex items-end justify-center">
                            {principalSignature ? (
                                <div className="flex flex-col items-center">
                                    <img 
                                        src={principalSignature} 
                                        alt="Principal Signature" 
                                        className="h-7 max-w-[90px] object-contain" 
                                    />
                                    <span className="text-[7.5px] font-serif font-bold leading-tight" style={{ color: primaryColor }}>
                                        {effectiveSignatoryName}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center">
                                    <div className="w-20 border-b border-muted-foreground/40 mb-1" />
                                    <span className="text-[7.5px] font-serif font-bold leading-tight" style={{ color: primaryColor }}>
                                        {effectiveSignatoryName}
                                    </span>
                                </div>
                            )}
                        </div>
                        <p className="text-[8px] font-bold uppercase text-muted-foreground border-t pt-0.5">
                            {effectiveSignatoryDesignation}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
