import { useState, useEffect } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { 
    Eye, Layout, FileText, Check, Loader2, 
    ArrowUp, ArrowDown, Bold, Layers,
    Sliders, CreditCard,
    Palette, PenTool
} from "lucide-react";
import type { 
    DocumentTemplateItem, 
    DocumentTemplateType, 
    DocumentPaperSize, 
    DocumentOrientation,
    TemplateFieldItem,
    TemplateDesignConfig
} from "../../api/documentTemplateApi";
import { 
    DEFAULT_FIELDS_BY_TYPE,
    DOCUMENT_TYPE_DEFAULTS,
    getDocumentDimensions 
} from "./templateSizeConfig";
import { DOCUMENT_CONTENT_DEFAULTS } from "./documentContentTemplates";
import { IdCardDesignGallery } from "./IdCardDesignGallery";
import { getModernPreset, type ModernIdCardPreset } from "./modernIdCardPresets";
import { StudentIdCardPreview } from "./previews/StudentIdCardPreview";
import { CertificatePreview } from "./previews/CertificatePreview";
import { ZoomableDocumentPreview } from "./previews/ZoomableDocumentPreview";
import { CertificateContentEditor } from "./CertificateContentEditor";
import { cn } from "@/lib/utils";

interface TemplateEditorModalProps {
    template: Partial<DocumentTemplateItem> | null;
    isOpen: boolean;
    onClose: () => void;
    onSave: (payload: Partial<DocumentTemplateItem>) => Promise<void>;
    schoolName?: string;
    logoUrl?: string;
    schoolInfo?: any;
    onBackToTypeSelect?: () => void;
}

export function TemplateEditorModal({
    template,
    isOpen,
    onClose,
    onSave,
    schoolName,
    logoUrl,
    schoolInfo,
    onBackToTypeSelect
}: TemplateEditorModalProps) {
    if (!template) return null;

    const isEditMode = Boolean(template.id);
    const type: DocumentTemplateType = template.type || "STUDENT_ID_CARD";
    const isIdCard = type === "STUDENT_ID_CARD" || type === "TEACHER_ID_CARD";
    const typeDefaults = DOCUMENT_TYPE_DEFAULTS[type] || DOCUMENT_TYPE_DEFAULTS.CUSTOM;

    // Navigation sections
    const [activeSection, setActiveSection] = useState<"FORMAT_SIDE" | "DESIGN_GALLERY" | "CUSTOMIZE" | "FIELDS" | "CONTENT" | "PREVIEW">("FORMAT_SIDE");

    // Form state
    const [name, setName] = useState(template.name || `New ${typeDefaults.label}`);
    const [description, setDescription] = useState(template.description || "");
    const [status, setStatus] = useState(template.status || "DRAFT");
    const [isDefault, setIsDefault] = useState(template.isDefault || false);

    // 1. Format: Landscape vs Long Vertical (for ID Cards)
    const [cardFormat, setCardFormat] = useState<"landscape" | "long">(
        template.designConfig?.format || "landscape"
    );

    // 2. Side Mode: Front Only vs Both Sides (for ID Cards)
    const [sideMode, setSideMode] = useState<"front_only" | "both_sides">(
        template.designConfig?.sideMode || "front_only"
    );
    const [activePreviewSide, setActivePreviewSide] = useState<"FRONT" | "BACK">("FRONT");

    // Standard paper size and orientation
    const [paperSize, setPaperSize] = useState<DocumentPaperSize>(
        template.paperSize || typeDefaults.paperSize
    );
    const [orientation, setOrientation] = useState<DocumentOrientation>(
        template.orientation || (isIdCard ? (cardFormat === "landscape" ? "LANDSCAPE" : "PORTRAIT") : typeDefaults.orientation)
    );

    // 3. Design Configs (Header, Typography, Photo Frame, Theme, EditableContent)
    const initialDesignKey = template.designConfig?.designKey || "neon_glass";
    const initialPreset = getModernPreset(initialDesignKey as any);
    const defaultContent = DOCUMENT_CONTENT_DEFAULTS[type] || DOCUMENT_CONTENT_DEFAULTS.CUSTOM;

    const [designConfig, setDesignConfig] = useState<TemplateDesignConfig>({
        ...template.designConfig,
        format: isIdCard ? cardFormat : undefined,
        sideMode: isIdCard ? sideMode : undefined,
        designKey: initialDesignKey,
        header: {
            size: template.designConfig?.header?.size || initialPreset.headerSize,
            style: template.designConfig?.header?.style || initialPreset.headerStyle,
            showLogo: template.designConfig?.header?.showLogo !== false,
            showSchoolLogo: template.designConfig?.header?.showSchoolLogo !== false,
            showSchoolName: template.designConfig?.header?.showSchoolName !== false,
            showAffiliation: template.designConfig?.header?.showAffiliation !== false,
            showSchoolAddress: template.designConfig?.header?.showSchoolAddress !== false,
            ...template.designConfig?.header
        },
        typography: {
            nameSize: template.designConfig?.typography?.nameSize || initialPreset.nameSize,
            density: template.designConfig?.typography?.density || "compact",
            fontPreset: template.designConfig?.typography?.fontPreset || initialPreset.fontPreset
        },
        photoFrame: {
            shape: template.designConfig?.photoFrame?.shape || initialPreset.photoShape,
            border: template.designConfig?.photoFrame?.border || initialPreset.photoBorder,
            position: template.designConfig?.photoFrame?.position || (cardFormat === "landscape" ? "left" : "top")
        },
        theme: {
            primaryColor: template.designConfig?.theme?.primaryColor || (isIdCard ? initialPreset.primaryColor : "#1E3A8A"),
            secondaryColor: template.designConfig?.theme?.secondaryColor || (isIdCard ? initialPreset.secondaryColor : "#D97706"),
            backgroundColor: template.designConfig?.theme?.backgroundColor || (isIdCard ? initialPreset.backgroundColor : "#FFFFFF"),
            textColor: template.designConfig?.theme?.textColor || (isIdCard ? initialPreset.textColor : "#0F172A"),
            accentColor: template.designConfig?.theme?.accentColor || initialPreset.accentColor
        },
        watermark: {
            enabled: template.designConfig?.watermark?.enabled ?? true,
            opacity: template.designConfig?.watermark?.opacity ?? 0.08,
            scale: template.designConfig?.watermark?.scale ?? 1.15,
            rotate: template.designConfig?.watermark?.rotate ?? true
        },
        editableContent: template.designConfig?.editableContent || {
            certificateTitle: defaultContent.certificateTitle,
            leadText: defaultContent.leadText,
            bodyTemplate: defaultContent.bodyTemplate,
            closingDeclaration: defaultContent.closingDeclaration,
            extraLines: defaultContent.extraLines || []
        }
    });

    const [selectedFields, setSelectedFields] = useState<TemplateFieldItem[]>(template.selectedFields || []);
    const [isSaving, setIsSaving] = useState(false);

    // Sync card format and side mode into orientation and paperSize for ID cards
    useEffect(() => {
        if (isIdCard) {
            setOrientation(cardFormat === "landscape" ? "LANDSCAPE" : "PORTRAIT");
            setPaperSize("CR80");
        }
    }, [cardFormat, isIdCard]);

    // Initialize fields if empty
    useEffect(() => {
        if (!template.id && selectedFields.length === 0) {
            const initialFields = (DEFAULT_FIELDS_BY_TYPE[type] || DEFAULT_FIELDS_BY_TYPE.CUSTOM).map((f: any, idx: number) => ({
                key: f.key,
                label: f.label,
                visible: f.defaultVisible !== false,
                order: idx + 1,
                isBold: Boolean(f.defaultBold)
            }));
            setSelectedFields(initialFields);
        }
    }, [type, template.id]);

    // Handle Modern Design Preset Selection
    const handleSelectPreset = (preset: ModernIdCardPreset) => {
        setDesignConfig(prev => ({
            ...prev,
            designKey: preset.key,
            header: {
                ...prev.header,
                style: preset.headerStyle,
                size: preset.headerSize
            },
            typography: {
                ...prev.typography,
                fontPreset: preset.fontPreset,
                nameSize: preset.nameSize
            },
            photoFrame: {
                ...prev.photoFrame,
                shape: preset.photoShape,
                border: preset.photoBorder
            },
            theme: {
                ...prev.theme,
                primaryColor: preset.primaryColor,
                secondaryColor: preset.secondaryColor,
                backgroundColor: preset.backgroundColor,
                textColor: preset.textColor,
                accentColor: preset.accentColor
            }
        }));
    };

    // Header customization helpers
    const updateHeaderConfig = (key: keyof NonNullable<TemplateDesignConfig["header"]>, val: any) => {
        setDesignConfig(prev => ({
            ...prev,
            header: {
                ...prev.header,
                [key]: val
            }
        }));
    };

    // Typography customization helpers
    const updateTypographyConfig = (key: keyof NonNullable<TemplateDesignConfig["typography"]>, val: any) => {
        setDesignConfig(prev => ({
            ...prev,
            typography: {
                ...prev.typography,
                [key]: val
            }
        }));
    };

    // Photo frame customization helpers
    const updatePhotoFrameConfig = (key: keyof NonNullable<TemplateDesignConfig["photoFrame"]>, val: any) => {
        setDesignConfig(prev => ({
            ...prev,
            photoFrame: {
                ...prev.photoFrame,
                [key]: val
            }
        }));
    };

    const handleFieldToggle = (index: number, visible: boolean) => {
        const next = [...selectedFields];
        next[index] = { ...next[index], visible };
        setSelectedFields(next);
    };

    const handleFieldBoldToggle = (index: number) => {
        const next = [...selectedFields];
        next[index] = { ...next[index], isBold: !next[index].isBold };
        setSelectedFields(next);
    };

    const moveFieldOrder = (index: number, direction: "UP" | "DOWN") => {
        const targetIndex = direction === "UP" ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= selectedFields.length) return;

        const next = [...selectedFields];
        const [moved] = next.splice(index, 1);
        next.splice(targetIndex, 0, moved);

        const reordered = next.map((f, i) => ({ ...f, order: i + 1 }));
        setSelectedFields(reordered);
    };

    const handleSave = async (andActivate: boolean = false) => {
        if (!name.trim()) {
            setActiveSection("FORMAT_SIDE");
            return;
        }

        try {
            setIsSaving(true);
            const payload: Partial<DocumentTemplateItem> = {
                name: name.trim(),
                description: description.trim(),
                type,
                paperSize,
                orientation,
                status: andActivate ? "ACTIVE" : status,
                isDefault,
                designConfig: {
                    ...designConfig,
                    format: isIdCard ? cardFormat : undefined,
                    sideMode: isIdCard ? sideMode : undefined
                },
                selectedFields
            };

            await onSave(payload);
            onClose();
        } catch (error) {
            console.error("Save error:", error);
        } finally {
            setIsSaving(false);
        }
    };

    const currentDimensions = getDocumentDimensions(paperSize, orientation);

    // Draft representation for Live Preview
    const currentDraft: Partial<DocumentTemplateItem> = {
        name,
        type,
        paperSize,
        orientation,
        designConfig: {
            ...designConfig,
            format: isIdCard ? cardFormat : undefined,
            sideMode: isIdCard ? sideMode : undefined
        },
        selectedFields
    };

    // Navigation Tabs Definition
    const navTabs = isIdCard
        ? [
            { key: "FORMAT_SIDE", label: "1. Format & Sides", icon: Layout },
            { key: "DESIGN_GALLERY", label: "2. Modern Gallery", icon: Layers },
            { key: "CUSTOMIZE", label: "3. Header & Frame", icon: Sliders },
            { key: "FIELDS", label: "4. Fields & Order", icon: FileText },
            { key: "PREVIEW", label: "5. Live Preview", icon: Eye }
        ]
        : [
            { key: "FORMAT_SIDE", label: "1. Dimensions & Paper", icon: Layout },
            { key: "CONTENT", label: "2. Document Content", icon: PenTool },
            { key: "CUSTOMIZE", label: "3. Styling & Watermark", icon: Palette },
            { key: "FIELDS", label: "4. Record Fields", icon: FileText },
            { key: "PREVIEW", label: "5. Live Preview", icon: Eye }
        ];

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="!max-w-7xl sm:!max-w-7xl !w-[94vw] h-[90vh] p-0 flex flex-col overflow-hidden rounded-2xl border-border/80 shadow-2xl bg-card">
                {/* Header */}
                <DialogHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 shrink-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="space-y-0.5">
                            <DialogTitle className="text-lg font-black text-foreground flex items-center gap-2">
                                {isIdCard ? (
                                    <CreditCard className="w-5 h-5 text-primary" />
                                ) : (
                                    <FileText className="w-5 h-5 text-primary" />
                                )}
                                {isEditMode ? `Edit Template: ${name || template.name}` : `Create ${typeDefaults.label} Template`}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground flex items-center gap-2">
                                <span className="font-semibold text-primary">{typeDefaults.label}</span>
                                <span>•</span>
                                <span>{paperSize} ({orientation.toLowerCase()})</span>
                                <span>•</span>
                                <span className="font-mono text-[11px]">{currentDimensions.label}</span>
                            </DialogDescription>
                        </div>

                        {/* Top Step Pill Navigation */}
                        <div className="flex items-center gap-1 bg-muted/70 p-1 rounded-xl border border-border/50 self-start sm:self-auto overflow-x-auto">
                            {navTabs.map(tab => {
                                const Icon = tab.icon;
                                const isActive = activeSection === tab.key;
                                return (
                                    <button
                                        key={tab.key}
                                        type="button"
                                        onClick={() => setActiveSection(tab.key as any)}
                                        className={cn(
                                            "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all shrink-0",
                                            isActive 
                                                ? "bg-primary text-primary-foreground shadow-2xs" 
                                                : "text-muted-foreground hover:bg-background/80 hover:text-foreground"
                                        )}
                                    >
                                        <Icon className="w-3.5 h-3.5" />
                                        <span>{tab.label}</span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </DialogHeader>

                {/* 2-Column Responsive Body */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
                    {/* Left Pane: Controls (7 columns) */}
                    <div className="lg:col-span-7 p-4 sm:p-6 overflow-y-auto max-h-full space-y-6">
                        {/* 1. FORMAT & SIDES / PAPER SIZE */}
                        {activeSection === "FORMAT_SIDE" && (
                            <div className="space-y-5 animate-in fade-in duration-150">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black text-foreground">
                                        1. {isIdCard ? "Card Format & Sides Specification" : "Document Dimensions & Paper Size"}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        {isIdCard 
                                            ? "Select card geometry and whether credentials print single or double-sided."
                                            : "Configure standard ISO sheet size and portrait/landscape orientation."
                                        }
                                    </p>
                                </div>

                                {/* Form Inputs */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                    <div className="space-y-1.5 sm:col-span-1">
                                        <Label className="text-xs font-bold">Template Title *</Label>
                                        <Input 
                                            value={name} 
                                            onChange={e => setName(e.target.value)} 
                                            placeholder={`e.g. Official ${typeDefaults.label} 2026`}
                                            className="h-10 text-xs rounded-xl"
                                        />
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-1">
                                        <Label className="text-xs font-bold">Internal Description</Label>
                                        <Input 
                                            value={description} 
                                            onChange={e => setDescription(e.target.value)} 
                                            placeholder="Standard institutional template with seal and authorization"
                                            className="h-10 text-xs rounded-xl"
                                        />
                                    </div>

                                    <div className="space-y-1.5 sm:col-span-1">
                                        <Label className="text-xs font-bold">Lifecycle Status</Label>
                                        <Select
                                            value={status}
                                            onValueChange={(val: any) => setStatus(val)}
                                        >
                                            <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border/70">
                                                <SelectValue placeholder="Select status" />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="DRAFT">Draft</SelectItem>
                                                <SelectItem value="ACTIVE">Active (Published)</SelectItem>
                                                <SelectItem value="INACTIVE">Archived</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                </div>

                                {isIdCard ? (
                                    <>
                                        {/* A. Card Format Picker */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                Card Format
                                            </Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {/* Landscape Format */}
                                                <div
                                                    onClick={() => setCardFormat("landscape")}
                                                    className={cn(
                                                        "p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 bg-card",
                                                        cardFormat === "landscape"
                                                            ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                                                            : "border-border/70 hover:border-primary/40 hover:bg-muted/20"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-xs text-foreground">Landscape Card</span>
                                                        <Badge variant="outline" className="text-[10px] font-mono">85.6 × 54 mm</Badge>
                                                    </div>
                                                    <div className="w-full h-14 bg-muted/60 border border-dashed border-primary/40 rounded-lg flex items-center justify-center">
                                                        <div className="w-16 h-8 bg-primary/20 border border-primary/40 rounded flex items-center justify-center text-[9px] font-bold text-primary">
                                                            CR80
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Standard wallet / PVC card format. Ideal for lanyards and badge clips.
                                                    </p>
                                                </div>

                                                {/* Long Vertical Format */}
                                                <div
                                                    onClick={() => setCardFormat("long")}
                                                    className={cn(
                                                        "p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 bg-card",
                                                        cardFormat === "long"
                                                            ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                                                            : "border-border/70 hover:border-primary/40 hover:bg-muted/20"
                                                    )}
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <span className="font-black text-xs text-foreground">Long Card (Vertical)</span>
                                                        <Badge variant="outline" className="text-[10px] font-mono">54 × 85.6 mm</Badge>
                                                    </div>
                                                    <div className="w-full h-14 bg-muted/60 border border-dashed border-primary/40 rounded-lg flex items-center justify-center">
                                                        <div className="w-8 h-12 bg-primary/20 border border-primary/40 rounded flex items-center justify-center text-[8px] font-bold text-primary">
                                                            VERTICAL
                                                        </div>
                                                    </div>
                                                    <p className="text-[10px] text-muted-foreground">
                                                        Modern smartphone-style vertical card with top-to-bottom identity layout.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* B. Side Mode Picker */}
                                        <div className="space-y-2">
                                            <Label className="text-xs font-black uppercase tracking-wider text-muted-foreground">
                                                Card Sides Mode
                                            </Label>
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div
                                                    onClick={() => setSideMode("front_only")}
                                                    className={cn(
                                                        "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 bg-card",
                                                        sideMode === "front_only"
                                                            ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                                                            : "border-border/70 hover:border-primary/40 hover:bg-muted/20"
                                                    )}
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                                                        1S
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-xs text-foreground">Front Side Only</h5>
                                                        <p className="text-[10px] text-muted-foreground">Quick single-sided card printing.</p>
                                                    </div>
                                                </div>

                                                <div
                                                    onClick={() => setSideMode("both_sides")}
                                                    className={cn(
                                                        "p-3.5 rounded-xl border transition-all cursor-pointer flex items-center gap-3 bg-card",
                                                        sideMode === "both_sides"
                                                            ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                                                            : "border-border/70 hover:border-primary/40 hover:bg-muted/20"
                                                    )}
                                                >
                                                    <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-black text-xs">
                                                        2S
                                                    </div>
                                                    <div>
                                                        <h5 className="font-bold text-xs text-foreground">Both Sides (Front + Back)</h5>
                                                        <p className="text-[10px] text-muted-foreground">Includes terms, barcode, and blood group.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    /* Non-ID Card: Paper Size & Orientation Controls */
                                    <div className="space-y-4 p-4 rounded-xl border border-border/60 bg-card">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold">Paper Size Standard</Label>
                                                <Select
                                                    value={paperSize}
                                                    onValueChange={(val: any) => setPaperSize(val)}
                                                >
                                                    <SelectTrigger className="h-10 text-xs rounded-xl bg-background border-border/70">
                                                        <SelectValue placeholder="Select paper size" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="A4">A4 Standard (210mm × 297mm) - Official</SelectItem>
                                                        <SelectItem value="A5">A5 Compact (148mm × 210mm)</SelectItem>
                                                        <SelectItem value="LETTER">US Letter (8.5in × 11in)</SelectItem>
                                                        <SelectItem value="CUSTOM">Custom Dimension</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>

                                            <div className="space-y-1.5">
                                                <Label className="text-xs font-bold">Page Orientation</Label>
                                                <div className="grid grid-cols-2 gap-2">
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={orientation === "PORTRAIT" ? "default" : "outline"}
                                                        onClick={() => setOrientation("PORTRAIT")}
                                                        className="h-10 text-xs font-bold rounded-xl"
                                                    >
                                                        Portrait
                                                    </Button>
                                                    <Button
                                                        type="button"
                                                        size="sm"
                                                        variant={orientation === "LANDSCAPE" ? "default" : "outline"}
                                                        onClick={() => setOrientation("LANDSCAPE")}
                                                        className="h-10 text-xs font-bold rounded-xl"
                                                    >
                                                        Landscape
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Default Template Toggle */}
                                <div className="flex items-center justify-between p-3.5 rounded-xl border border-border/60 bg-muted/20">
                                    <div className="space-y-0.5">
                                        <Label className="text-xs font-bold">Set as Default Template</Label>
                                        <p className="text-[11px] text-muted-foreground">
                                            Auto-selected when issuing documents of type <strong>{typeDefaults.label}</strong>.
                                        </p>
                                    </div>
                                    <Switch checked={isDefault} onCheckedChange={setIsDefault} />
                                </div>
                            </div>
                        )}

                        {/* 2. MODERN GALLERY (Only for ID Cards) */}
                        {isIdCard && activeSection === "DESIGN_GALLERY" && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black text-foreground">2. Select Design Style</h3>
                                    <p className="text-xs text-muted-foreground">
                                        Choose from high-aesthetic curated styles. Each preset configures colors, fonts, and header styling.
                                    </p>
                                </div>

                                <IdCardDesignGallery 
                                    selectedDesignKey={designConfig.designKey || "neon_glass"}
                                    onSelectDesign={handleSelectPreset}
                                />
                            </div>
                        )}

                        {/* 2. CERTIFICATE CONTENT EDITOR (Only for Certificates/Documents) */}
                        {!isIdCard && activeSection === "CONTENT" && (
                            <div className="animate-in fade-in duration-150">
                                <CertificateContentEditor
                                    designConfig={designConfig}
                                    documentTypeLabel={typeDefaults.label}
                                    onChange={(updatedEditable) => {
                                        setDesignConfig(prev => ({
                                            ...prev,
                                            editableContent: updatedEditable
                                        }));
                                    }}
                                />
                            </div>
                        )}

                        {/* 3. CUSTOMIZE HEADER, FRAME, STYLING & WATERMARK */}
                        {activeSection === "CUSTOMIZE" && (
                            <div className="space-y-5 animate-in fade-in duration-150">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black text-foreground">
                                        3. Visual Customization & Identity Styling
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                        Adjust brand colors, institutional logo watermark, and header banners.
                                    </p>
                                </div>

                                {/* Color Theme Customizer */}
                                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
                                    <span className="text-xs font-black uppercase tracking-wider text-foreground">Color Palette</span>
                                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-bold">Primary Brand Color</Label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="color" 
                                                    value={designConfig.theme?.primaryColor || "#1E3A8A"}
                                                    onChange={e => setDesignConfig(prev => ({ ...prev, theme: { ...prev.theme, primaryColor: e.target.value } }))}
                                                    className="w-8 h-8 rounded border cursor-pointer"
                                                />
                                                <span className="text-xs font-mono">{designConfig.theme?.primaryColor}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-bold">Secondary Accent</Label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="color" 
                                                    value={designConfig.theme?.secondaryColor || "#D97706"}
                                                    onChange={e => setDesignConfig(prev => ({ ...prev, theme: { ...prev.theme, secondaryColor: e.target.value } }))}
                                                    className="w-8 h-8 rounded border cursor-pointer"
                                                />
                                                <span className="text-xs font-mono">{designConfig.theme?.secondaryColor}</span>
                                            </div>
                                        </div>

                                        <div className="space-y-1">
                                            <Label className="text-[11px] font-bold">Background Tone</Label>
                                            <div className="flex items-center gap-2">
                                                <input 
                                                    type="color" 
                                                    value={designConfig.theme?.backgroundColor || "#FFFFFF"}
                                                    onChange={e => setDesignConfig(prev => ({ ...prev, theme: { ...prev.theme, backgroundColor: e.target.value } }))}
                                                    className="w-8 h-8 rounded border cursor-pointer"
                                                />
                                                <span className="text-xs font-mono">{designConfig.theme?.backgroundColor}</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Background Logo Watermark (for Certificates) */}
                                {!isIdCard && (
                                    <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
                                        <div className="flex items-center justify-between border-b pb-2">
                                            <span className="text-xs font-black uppercase tracking-wider text-foreground">Background Watermark Logo</span>
                                            <Switch 
                                                checked={designConfig.watermark?.enabled !== false}
                                                onCheckedChange={val => setDesignConfig(prev => ({
                                                    ...prev,
                                                    watermark: { ...prev.watermark, enabled: val }
                                                }))}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="space-y-1">
                                                <Label className="text-[11px] font-bold">Watermark Opacity ({Math.round((designConfig.watermark?.opacity ?? 0.08) * 100)}%)</Label>
                                                <input
                                                    type="range"
                                                    min="0.03"
                                                    max="0.25"
                                                    step="0.01"
                                                    value={designConfig.watermark?.opacity ?? 0.08}
                                                    onChange={e => setDesignConfig(prev => ({
                                                        ...prev,
                                                        watermark: { ...prev.watermark, opacity: parseFloat(e.target.value) }
                                                    }))}
                                                    className="w-full accent-primary"
                                                />
                                            </div>

                                            <div className="flex items-center justify-between pt-3">
                                                <span className="text-xs font-medium">Diagonal 25° Tilt</span>
                                                <Switch 
                                                    checked={designConfig.watermark?.rotate !== false}
                                                    onCheckedChange={val => setDesignConfig(prev => ({
                                                        ...prev,
                                                        watermark: { ...prev.watermark, rotate: val }
                                                    }))}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Institutional Header Controls */}
                                <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
                                    <span className="text-xs font-black uppercase tracking-wider text-foreground">Header Banner Elements</span>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">Show School Logo Crest</span>
                                            <Switch 
                                                checked={designConfig.header?.showLogo !== false && designConfig.header?.showSchoolLogo !== false}
                                                onCheckedChange={val => {
                                                    updateHeaderConfig("showLogo", val);
                                                    updateHeaderConfig("showSchoolLogo", val);
                                                }}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">Show Registered School Name</span>
                                            <Switch 
                                                checked={designConfig.header?.showSchoolName !== false}
                                                onCheckedChange={val => updateHeaderConfig("showSchoolName", val)}
                                            />
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium">Show Affiliation / Board Details</span>
                                            <Switch 
                                                checked={designConfig.header?.showAffiliation !== false}
                                                onCheckedChange={val => updateHeaderConfig("showAffiliation", val)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* ID Card Specific Frame & Typography Controls */}
                                {isIdCard && (
                                    <>
                                        <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
                                            <span className="text-xs font-black uppercase tracking-wider text-foreground">Photo Frame Geometry</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-bold">Shape</Label>
                                                    <Select
                                                        value={designConfig.photoFrame?.shape || "squircle"}
                                                        onValueChange={val => updatePhotoFrameConfig("shape", val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs bg-background border-border/70 rounded-lg">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="squircle">Squircle</SelectItem>
                                                            <SelectItem value="circle">Circle</SelectItem>
                                                            <SelectItem value="rounded_square">Rounded Square</SelectItem>
                                                            <SelectItem value="hex">Hexagon</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-bold">Border Style</Label>
                                                    <Select
                                                        value={designConfig.photoFrame?.border || "dual-ring"}
                                                        onValueChange={val => updatePhotoFrameConfig("border", val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs bg-background border-border/70 rounded-lg">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="dual-ring">Dual-Ring Halo</SelectItem>
                                                            <SelectItem value="accent">Accent Border</SelectItem>
                                                            <SelectItem value="plain">Plain</SelectItem>
                                                            <SelectItem value="none">None</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="p-4 rounded-xl border border-border/60 bg-card space-y-3">
                                            <span className="text-xs font-black uppercase tracking-wider text-foreground">Typography Styling</span>
                                            <div className="grid grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-bold">Name Size</Label>
                                                    <Select
                                                        value={designConfig.typography?.nameSize || "M"}
                                                        onValueChange={val => updateTypographyConfig("nameSize", val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs bg-background border-border/70 rounded-lg">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="S">Small (Compact)</SelectItem>
                                                            <SelectItem value="M">Medium (Standard)</SelectItem>
                                                            <SelectItem value="L">Large (Prominent)</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>

                                                <div className="space-y-1">
                                                    <Label className="text-[11px] font-bold">Font Preset</Label>
                                                    <Select
                                                        value={designConfig.typography?.fontPreset || "modern_sans"}
                                                        onValueChange={val => updateTypographyConfig("fontPreset", val)}
                                                    >
                                                        <SelectTrigger className="h-8 text-xs bg-background border-border/70 rounded-lg">
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="modern_sans">Modern Sans</SelectItem>
                                                            <SelectItem value="geometric">Geometric Clean</SelectItem>
                                                            <SelectItem value="editorial">Editorial Serif</SelectItem>
                                                            <SelectItem value="technical">Technical Mono</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                            </div>
                                        </div>
                                    </>
                                )}
                            </div>
                        )}

                        {/* 4. FIELD SELECTION & REORDER */}
                        {activeSection === "FIELDS" && (
                            <div className="space-y-4 animate-in fade-in duration-150">
                                <div className="space-y-1">
                                    <h3 className="text-sm font-black text-foreground">4. Document Attributes & Display Order</h3>
                                    <p className="text-xs text-muted-foreground">Select and arrange credentials visible on the document.</p>
                                </div>

                                <div className="space-y-2 rounded-xl border border-border/60 bg-card p-2 divide-y divide-border/40">
                                    {selectedFields.map((field, idx) => (
                                        <div key={field.key} className="flex items-center justify-between p-2 hover:bg-muted/30 rounded-lg transition-colors">
                                            <div className="flex items-center gap-3">
                                                <Switch 
                                                    checked={field.visible}
                                                    onCheckedChange={val => handleFieldToggle(idx, val)}
                                                />
                                                <div>
                                                    <span className={cn("text-xs", field.isBold ? "font-bold text-foreground" : "font-medium text-foreground/80")}>
                                                        {field.label}
                                                    </span>
                                                    <span className="text-[10px] text-muted-foreground ml-2 font-mono">
                                                        ({field.key})
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-1">
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant={field.isBold ? "default" : "ghost"}
                                                    onClick={() => handleFieldBoldToggle(idx)}
                                                    className="h-7 w-7 rounded-md"
                                                    title="Toggle Bold"
                                                >
                                                    <Bold className="w-3.5 h-3.5" />
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={idx === 0}
                                                    onClick={() => moveFieldOrder(idx, "UP")}
                                                    className="h-7 w-7 rounded-md"
                                                    title="Move Up"
                                                >
                                                    <ArrowUp className="w-3.5 h-3.5" />
                                                </Button>

                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    disabled={idx === selectedFields.length - 1}
                                                    onClick={() => moveFieldOrder(idx, "DOWN")}
                                                    className="h-7 w-7 rounded-md"
                                                    title="Move Down"
                                                >
                                                    <ArrowDown className="w-3.5 h-3.5" />
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* 5. PREVIEW SECTION IN MOBILE/RESPONSIVE */}
                        {activeSection === "PREVIEW" && (
                            <div className="lg:hidden space-y-4">
                                <h3 className="text-sm font-black text-foreground">Interactive Document Preview</h3>
                                <div className="border rounded-2xl overflow-hidden h-[450px]">
                                    <ZoomableDocumentPreview
                                        title={name || typeDefaults.label}
                                        dimensionsLabel={currentDimensions.label}
                                    >
                                        {isIdCard ? (
                                            <StudentIdCardPreview 
                                                template={currentDraft}
                                                schoolName={schoolName}
                                                logoUrl={logoUrl}
                                                schoolInfo={schoolInfo}
                                                activeSide={sideMode === "both_sides" ? activePreviewSide : "FRONT"}
                                            />
                                        ) : (
                                            <CertificatePreview 
                                                template={currentDraft}
                                                schoolName={schoolName}
                                                logoUrl={logoUrl}
                                                schoolInfo={schoolInfo}
                                            />
                                        )}
                                    </ZoomableDocumentPreview>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Right Pane: Live Full Document Preview with Double-Click Zoom (5 columns) */}
                    <div className="hidden lg:flex lg:col-span-5 flex-col bg-muted/20 overflow-hidden h-full">
                        <ZoomableDocumentPreview
                            title={name || typeDefaults.label}
                            dimensionsLabel={currentDimensions.label}
                            aspectRatioText={isIdCard ? (cardFormat === "landscape" ? "Landscape CR80" : "Long Vertical") : `${paperSize} ${orientation}`}
                        >
                            {/* Rendering Preview Based on Type & Side */}
                            {isIdCard ? (
                                <div className="space-y-3 flex flex-col items-center">
                                    {sideMode === "both_sides" && (
                                        <div className="flex items-center gap-1 bg-background p-1 rounded-xl border border-border/60 shadow-xs mb-2">
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={activePreviewSide === "FRONT" ? "default" : "ghost"}
                                                onClick={() => setActivePreviewSide("FRONT")}
                                                className="h-7 px-3 text-xs font-bold rounded-lg"
                                            >
                                                Front Side
                                            </Button>
                                            <Button
                                                type="button"
                                                size="sm"
                                                variant={activePreviewSide === "BACK" ? "default" : "ghost"}
                                                onClick={() => setActivePreviewSide("BACK")}
                                                className="h-7 px-3 text-xs font-bold rounded-lg"
                                            >
                                                Back Side
                                            </Button>
                                        </div>
                                    )}

                                    <StudentIdCardPreview 
                                        template={currentDraft}
                                        schoolName={schoolName}
                                        logoUrl={logoUrl}
                                        schoolInfo={schoolInfo}
                                        activeSide={sideMode === "both_sides" ? activePreviewSide : "FRONT"}
                                    />
                                </div>
                            ) : (
                                <CertificatePreview 
                                    template={currentDraft}
                                    schoolName={schoolName}
                                    logoUrl={logoUrl}
                                    schoolInfo={schoolInfo}
                                />
                            )}
                        </ZoomableDocumentPreview>
                    </div>
                </div>

                {/* Footer with sticky action buttons */}
                <DialogFooter className="p-4 border-t border-border/60 bg-muted/10 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        {onBackToTypeSelect && !isEditMode && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={onBackToTypeSelect}
                                className="text-xs font-semibold rounded-xl text-primary hover:bg-primary/10"
                            >
                                ← Change Type
                            </Button>
                        )}
                        <span>Status: <strong className="text-foreground">{status}</strong></span>
                        {isDefault && <span>• <Badge variant="secondary" className="text-[10px]">Default for {typeDefaults.label}</Badge></span>}
                    </div>

                    <div className="flex items-center gap-2 justify-end">
                        <Button 
                            variant="outline" 
                            onClick={onClose} 
                            disabled={isSaving} 
                            className="rounded-xl text-xs font-semibold"
                        >
                            Cancel
                        </Button>

                        <Button 
                            variant="secondary"
                            onClick={() => handleSave(false)} 
                            disabled={isSaving} 
                            className="rounded-xl text-xs font-bold"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : null}
                            Save as Draft
                        </Button>

                        <Button 
                            onClick={() => handleSave(true)} 
                            disabled={isSaving} 
                            className="rounded-xl text-xs font-bold gap-1.5"
                        >
                            {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                            Save & Activate
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
