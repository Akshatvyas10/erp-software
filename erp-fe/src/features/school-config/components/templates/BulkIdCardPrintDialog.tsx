import { useState, useId, useMemo } from "react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Printer,
    CreditCard,
    ChevronLeft,
    ChevronRight,
    Layers,
    Loader2,
    Users,
    Sliders,
    Eye,
    CheckCircle2
} from "lucide-react";
import { StudentIdCardPreview } from "./previews/StudentIdCardPreview";
import {
    documentTemplateApi,
    type DocumentTemplateItem,
    type TemplateFieldItem
} from "@/features/school-config/api/documentTemplateApi";
import type { StudentCardItem, TeacherCardItem } from "../../api/idCardApi";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

interface BulkIdCardPrintDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: string;
    description?: string;
    template: DocumentTemplateItem | null;
    cards: (StudentCardItem | TeacherCardItem)[];
    isLoading?: boolean;
    documentType?: "STUDENT_ID_CARD" | "TEACHER_ID_CARD";
    onTemplateChange?: (templateId: string) => void;
}

export function BulkIdCardPrintDialog({
    open,
    onOpenChange,
    title = "Faculty & Staff • ID Badges",
    description = "Preview and print official faculty identification badges.",
    template,
    cards,
    isLoading = false,
    documentType = "TEACHER_ID_CARD",
    onTemplateChange
}: BulkIdCardPrintDialogProps) {
    const dialogTitleId = useId();
    const dialogDescriptionId = useId();

    const [currentIndex, setCurrentIndex] = useState(0);
    const [viewMode, setViewMode] = useState<"single" | "grid">("single");
    const [activeSide, setActiveSide] = useState<"FRONT" | "BACK">("FRONT");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");

    // Fetch active templates matching documentType
    const { data: availableTemplates = [], isLoading: isLoadingTemplates } = useQuery({
        queryKey: ["documentTemplates", documentType],
        queryFn: () => documentTemplateApi.getAll({ type: documentType, status: "ACTIVE" }),
        enabled: open
    });

    // Active working template
    const effectiveTemplate = useMemo(() => {
        if (selectedTemplateId) {
            const found = availableTemplates.find(t => t.id === selectedTemplateId);
            if (found) return found;
        }
        if (template) return template;
        if (availableTemplates.length > 0) return availableTemplates[0];

        // Fallback default
        return {
            id: "default-teacher-tpl",
            name: "Standard Faculty Badge",
            type: documentType,
            paperSize: "CR80",
            orientation: "LANDSCAPE",
            status: "ACTIVE",
            isDefault: true,
            createdAt: "",
            updatedAt: "",
            designConfig: {
                format: "landscape",
                theme: { primaryColor: "#4F46E5", secondaryColor: "#818CF8", textColor: "#1E293B" }
            },
            selectedFields: [
                { key: "fullName", label: "Full Name", visible: true, order: 1, isBold: true },
                { key: "employeeId", label: "Employee ID", visible: true, order: 2, isBold: true },
                { key: "department", label: "Department", visible: true, order: 3 },
                { key: "designation", label: "Designation", visible: true, order: 4 }
            ]
        } as DocumentTemplateItem;
    }, [selectedTemplateId, availableTemplates, template, documentType]);

    // Field visibility toggle state
    const [fieldVisibility, setFieldVisibility] = useState<Record<string, boolean>>({});

    const fieldsToDisplay: TemplateFieldItem[] = useMemo(() => {
        const base = effectiveTemplate.selectedFields || [];
        return base.map(f => ({
            ...f,
            visible: fieldVisibility[f.key] !== undefined ? fieldVisibility[f.key] : f.visible
        }));
    }, [effectiveTemplate, fieldVisibility]);

    // Template with customized field visibility
    const customizedTemplate: DocumentTemplateItem = useMemo(() => ({
        ...effectiveTemplate,
        selectedFields: fieldsToDisplay
    }), [effectiveTemplate, fieldsToDisplay]);

    const toggleField = (key: string, checked: boolean) => {
        setFieldVisibility(prev => ({
            ...prev,
            [key]: checked
        }));
    };

    const totalCards = cards.length;
    const currentCard = cards[currentIndex] || null;

    const handleNext = () => {
        if (currentIndex < totalCards - 1) {
            setCurrentIndex(prev => prev + 1);
        }
    };

    const handlePrev = () => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
        }
    };

    const handleTemplateSelect = (val: string) => {
        setSelectedTemplateId(val);
        setFieldVisibility({});
        if (onTemplateChange) {
            onTemplateChange(val);
        }
    };

    const handlePrint = () => {
        if (cards.length === 0) {
            toast.error("No ID cards available to print");
            return;
        }
        window.print();
        toast.success(`Printing ${totalCards} ID Card${totalCards > 1 ? "s" : ""}...`);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent 
                aria-labelledby={dialogTitleId}
                aria-describedby={dialogDescriptionId}
                className="w-[96vw] sm:w-[94vw] md:max-w-5xl lg:max-w-6xl max-h-[92vh] sm:max-h-[90vh] p-0 gap-0 overflow-hidden rounded-2xl border-border shadow-2xl bg-background flex flex-col"
            >
                {/* 1. HEADER (Title + summary badge + View switch) */}
                <DialogHeader className="p-3.5 sm:p-5 border-b border-border bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
                    <div className="space-y-0.5 text-left">
                        <DialogTitle id={dialogTitleId} className="text-base sm:text-lg font-bold flex flex-wrap items-center gap-2">
                            <CreditCard className="w-5 h-5 text-primary shrink-0" />
                            <span>{title}</span>
                            <Badge variant="outline" className="font-mono text-xs">
                                {totalCards} {totalCards === 1 ? "Record" : "Records"}
                            </Badge>
                        </DialogTitle>
                        <DialogDescription id={dialogDescriptionId} className="text-xs text-muted-foreground line-clamp-1 sm:line-clamp-none">
                            {description} • Active template: <span className="font-semibold text-foreground">{customizedTemplate.name}</span>
                        </DialogDescription>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-2 shrink-0">
                        <Tabs value={viewMode} onValueChange={v => setViewMode(v as any)} className="w-auto">
                            <TabsList className="h-8">
                                <TabsTrigger value="single" className="text-xs px-2.5">
                                    <Eye className="w-3.5 h-3.5 mr-1" /> Single Preview
                                </TabsTrigger>
                                <TabsTrigger value="grid" className="text-xs px-2.5">
                                    <Layers className="w-3.5 h-3.5 mr-1" /> Grid View ({totalCards})
                                </TabsTrigger>
                            </TabsList>
                        </Tabs>
                    </div>
                </DialogHeader>

                {/* 2. BODY CONTENT (Single-column stack on mobile/tablet, 2-column on lg:) */}
                <div className="flex-1 overflow-y-auto w-full bg-muted/10 p-3 sm:p-4 md:p-6">
                    {isLoading || isLoadingTemplates ? (
                        <div className="flex flex-col items-center justify-center py-16 space-y-4">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <div className="space-y-2 text-center">
                                <p className="text-sm font-semibold">Generating ID badges and binding template...</p>
                                <Skeleton className="w-48 h-3 mx-auto" />
                            </div>
                        </div>
                    ) : totalCards === 0 ? (
                        <Card className="max-w-md mx-auto my-12 border-dashed border-border bg-card/60 text-center p-6 sm:p-8">
                            <CardContent className="space-y-3 p-0">
                                <Users className="w-12 h-12 mx-auto text-muted-foreground/40" />
                                <h4 className="font-bold text-base">No Records Selected</h4>
                                <p className="text-xs text-muted-foreground">
                                    Select faculty members or students from the directory table to preview and batch generate their official ID badges.
                                </p>
                                <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} className="mt-2 w-full sm:w-auto">
                                    Back to Directory
                                </Button>
                            </CardContent>
                        </Card>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 lg:gap-6 items-start">
                            {/* CONTROLS (Mobile order 1, Desktop lg:col-span-5) */}
                            <div className="lg:col-span-5 space-y-3 sm:space-y-4 w-full">
                                {/* Section 1: Selection Summary */}
                                <Card size="sm" className="bg-card border-border shadow-xs">
                                    <CardHeader className="p-3 pb-2">
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                            <span>Target Roster</span>
                                            <Badge variant="secondary" className="font-mono text-[10px]">
                                                {documentType === "TEACHER_ID_CARD" ? "Faculty & Staff" : "Student"}
                                            </Badge>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0 space-y-2">
                                        <div className="flex items-center justify-between text-xs">
                                            <span className="text-muted-foreground">Selected Count:</span>
                                            <span className="font-semibold">{totalCards} {totalCards === 1 ? "Person" : "People"}</span>
                                        </div>
                                        {currentCard && viewMode === "single" && (
                                            <div className="flex items-center justify-between text-xs border-t border-border/50 pt-2">
                                                <span className="text-muted-foreground">Active Card:</span>
                                                <span className="font-bold text-primary truncate max-w-[170px]">
                                                    {currentCard.fullName}
                                                </span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Section 2: Template Selector */}
                                <Card size="sm" className="bg-card border-border shadow-xs">
                                    <CardHeader className="p-3 pb-2">
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                            <Sliders className="w-3.5 h-3.5 text-primary" />
                                            <span>Template Layout</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0 space-y-2.5">
                                        <div className="space-y-1.5 w-full">
                                            <Label className="text-xs text-muted-foreground">Active Template</Label>
                                            <Select
                                                value={customizedTemplate.id}
                                                onValueChange={handleTemplateSelect}
                                            >
                                                <SelectTrigger className="h-9 text-xs w-full">
                                                    <SelectValue placeholder="Select template..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableTemplates.map(tpl => (
                                                        <SelectItem key={tpl.id} value={tpl.id} className="text-xs">
                                                            {tpl.name} {tpl.isDefault ? "(Default)" : ""}
                                                        </SelectItem>
                                                    ))}
                                                    {availableTemplates.length === 0 && (
                                                        <SelectItem value={customizedTemplate.id || "standard"} className="text-xs">
                                                            {customizedTemplate.name}
                                                        </SelectItem>
                                                    )}
                                                </SelectContent>
                                            </Select>
                                        </div>

                                        <div className="flex items-center justify-between text-[11px] text-muted-foreground pt-0.5">
                                            <span>Format:</span>
                                            <span className="font-mono font-medium text-foreground">
                                                {customizedTemplate.paperSize || "CR80"} ({customizedTemplate.designConfig?.format || "landscape"})
                                            </span>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Section 3: Field Checklist */}
                                <Card size="sm" className="bg-card border-border shadow-xs">
                                    <CardHeader className="p-3 pb-2">
                                        <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                                            <span>Display Fields</span>
                                            <span className="text-[10px] font-normal lowercase text-muted-foreground">toggle on card</span>
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="p-3 pt-0">
                                        <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                                            {fieldsToDisplay.map((field) => (
                                                <div key={field.key} className="flex items-center justify-between py-1 border-b border-border/30 last:border-none">
                                                    <Label htmlFor={`field-${field.key}`} className="text-xs font-medium cursor-pointer">
                                                        {field.label}
                                                    </Label>
                                                    <Checkbox
                                                        id={`field-${field.key}`}
                                                        checked={field.visible}
                                                        onCheckedChange={(checked) => toggleField(field.key, Boolean(checked))}
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>

                            {/* PREVIEW & DISPLAY (Mobile order 2, Desktop lg:col-span-7) */}
                            <div className="lg:col-span-7 space-y-4 w-full">
                                {viewMode === "single" && currentCard ? (
                                    <div className="flex flex-col items-center space-y-3 sm:space-y-4 w-full">
                                        {/* Front / Back Side Switcher */}
                                        <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/50">
                                            <Button
                                                type="button"
                                                variant={activeSide === "FRONT" ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setActiveSide("FRONT")}
                                                className="h-7 px-3 text-xs font-semibold rounded-lg"
                                            >
                                                Front Side
                                            </Button>
                                            <Button
                                                type="button"
                                                variant={activeSide === "BACK" ? "default" : "ghost"}
                                                size="sm"
                                                onClick={() => setActiveSide("BACK")}
                                                className="h-7 px-3 text-xs font-semibold rounded-lg"
                                            >
                                                Back Side
                                            </Button>
                                        </div>

                                        {/* Scaled Preview Viewport: scales proportionally on screens smaller than card width */}
                                        <div className="w-full flex items-center justify-center overflow-hidden p-2 sm:p-4 bg-muted/30 rounded-2xl border border-border/40">
                                            <div className="w-full max-w-[380px] flex justify-center [transform-origin:center_top] scale-[0.80] xs:scale-[0.88] sm:scale-100 my-[-20px] xs:my-[-10px] sm:my-0 transition-transform">
                                                <div className="p-2 sm:p-3 bg-white/40 dark:bg-black/20 rounded-2xl shadow-inner border border-border/40 shrink-0">
                                                    <StudentIdCardPreview
                                                        template={customizedTemplate}
                                                        schoolName={currentCard.schoolInfo?.schoolName}
                                                        logoUrl={currentCard.schoolInfo?.logoUrl}
                                                        schoolInfo={currentCard.schoolInfo}
                                                        activeSide={activeSide}
                                                        data={currentCard as any}
                                                    />
                                                </div>
                                            </div>
                                        </div>

                                        {/* Carousel Navigation */}
                                        <div className="flex items-center justify-between w-full max-w-xs sm:max-w-sm px-2 gap-2">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handlePrev}
                                                disabled={currentIndex === 0}
                                                className="h-8 text-xs gap-1 flex-1 sm:flex-initial"
                                            >
                                                <ChevronLeft className="w-4 h-4" /> Previous
                                            </Button>

                                            <span className="text-xs font-mono font-bold text-muted-foreground whitespace-nowrap px-1">
                                                Card {currentIndex + 1} of {totalCards}
                                            </span>

                                            <Button
                                                type="button"
                                                variant="outline"
                                                size="sm"
                                                onClick={handleNext}
                                                disabled={currentIndex >= totalCards - 1}
                                                className="h-8 text-xs gap-1 flex-1 sm:flex-initial"
                                            >
                                                Next <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Grid View of all generated cards: 1 column on mobile, 2 columns on md+ */
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full justify-items-center py-1">
                                        {cards.map((card, idx) => {
                                            const code = 'employeeId' in card ? card.employeeId : card.admissionNumber;
                                            return (
                                                <Card key={idx} size="sm" className="w-full max-w-[360px] bg-card border-border/70 shadow-xs flex flex-col items-center p-2.5 sm:p-3 overflow-hidden">
                                                    <div className="w-full flex items-center justify-between mb-2 px-1">
                                                        <Badge variant="outline" className="font-mono text-[10px]">
                                                            #{idx + 1}
                                                        </Badge>
                                                        <span className="text-xs font-semibold truncate max-w-[150px]">
                                                            {card.fullName}
                                                        </span>
                                                        {code && (
                                                            <span className="text-[10px] font-mono text-muted-foreground">
                                                                {code}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="w-full flex justify-center overflow-hidden [transform-origin:center_top] scale-[0.75] xs:scale-[0.82] sm:scale-[0.88] md:scale-90 my-[-25px] sm:my-[-12px]">
                                                        <StudentIdCardPreview
                                                            template={customizedTemplate}
                                                            schoolName={card.schoolInfo?.schoolName}
                                                            logoUrl={card.schoolInfo?.logoUrl}
                                                            schoolInfo={card.schoolInfo}
                                                            activeSide="FRONT"
                                                            data={card as any}
                                                        />
                                                    </div>
                                                </Card>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                {/* 3. FOOTER ACTIONS (Sticky at bottom, responsive wrap on mobile) */}
                <DialogFooter className="p-3 sm:p-4 border-t border-border bg-muted/20 flex flex-col-reverse sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-4 shrink-0">
                    <div className="flex items-center justify-center sm:justify-start gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-[11px] sm:text-xs font-mono text-muted-foreground">
                            Official Wet-Ink / Embossed Verification Mode
                        </span>
                    </div>

                    <div className="flex items-center justify-end gap-2 w-full sm:w-auto">
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="flex-1 sm:flex-initial"
                        >
                            Cancel
                        </Button>

                        <Button
                            type="button"
                            size="sm"
                            onClick={handlePrint}
                            disabled={isLoading || totalCards === 0}
                            className="flex-1 sm:flex-initial gap-1.5 shadow-sm font-semibold"
                        >
                            <Printer className="w-4 h-4" />
                            Print {totalCards > 1 ? `All (${totalCards})` : "Card"}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
