import {
    CreditCard,
    FileText,
    Award,
    FileSpreadsheet,
    FileCheck,
    ScrollText,
    Receipt,
    Files,
    ArrowRight
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { DocumentTemplateType } from "../../api/documentTemplateApi";
import { cn } from "@/lib/utils";

interface TemplateTypeSelectorDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectType: (type: DocumentTemplateType) => void;
}

interface TypeOption {
    type: DocumentTemplateType;
    title: string;
    description: string;
    icon: typeof CreditCard;
    sizeLabel: string;
    aspectRatioBadge: string;
    category: "ID Card" | "Certificate" | "Academic" | "Financial";
}

const TYPE_OPTIONS: TypeOption[] = [
    {
        type: "STUDENT_ID_CARD",
        title: "Student ID Card",
        description: "CR80 PVC credentials with barcode/QR, student photo, and emergency parent details.",
        icon: CreditCard,
        sizeLabel: "CR80 (85.6mm × 54mm)",
        aspectRatioBadge: "Landscape / Long",
        category: "ID Card"
    },
    {
        type: "TEACHER_ID_CARD",
        title: "Teacher / Faculty Badge",
        description: "Official staff credentials with department, employee ID, and security clearance.",
        icon: Award,
        sizeLabel: "CR80 (85.6mm × 54mm)",
        aspectRatioBadge: "Landscape / Long",
        category: "ID Card"
    },
    {
        type: "REPORT_CARD",
        title: "Report Card / Scorecard",
        description: "Comprehensive academic scorecard with marks table, subject grades, and faculty remarks.",
        icon: FileSpreadsheet,
        sizeLabel: "A4 Standard (210mm × 297mm)",
        aspectRatioBadge: "A4 Portrait",
        category: "Academic"
    },
    {
        type: "TRANSFER_CERTIFICATE",
        title: "Transfer Certificate (TC)",
        description: "Departure clearance stating attendance, dues settlement, conduct, and registration details.",
        icon: FileCheck,
        sizeLabel: "A4 Standard (210mm × 297mm)",
        aspectRatioBadge: "A4 Portrait",
        category: "Certificate"
    },
    {
        type: "LEAVING_CERTIFICATE",
        title: "School Leaving Certificate",
        description: "Institutional release certificate with date of birth in words and examination status.",
        icon: ScrollText,
        sizeLabel: "A4 Standard (210mm × 297mm)",
        aspectRatioBadge: "A4 Portrait",
        category: "Certificate"
    },
    {
        type: "BONAFIDE_CERTIFICATE",
        title: "Bonafide Certificate",
        description: "Official verification for passport, bus concession, bank account, and scholarship purposes.",
        icon: FileText,
        sizeLabel: "A4 Standard (210mm × 297mm)",
        aspectRatioBadge: "A4 Portrait",
        category: "Certificate"
    },
    {
        type: "CHARACTER_CERTIFICATE",
        title: "Character Certificate",
        description: "Merit and conduct endorsement highlighting co-curricular achievements and discipline.",
        icon: Award,
        sizeLabel: "A4 Standard (210mm × 297mm)",
        aspectRatioBadge: "A4 Portrait",
        category: "Certificate"
    },
    {
        type: "FEE_RECEIPT",
        title: "Fee Receipt",
        description: "Official dues clearance with receipt numbering, mode of payment, and digital validation.",
        icon: Receipt,
        sizeLabel: "A4 Standard (210mm × 297mm)",
        aspectRatioBadge: "A4 / A5",
        category: "Financial"
    },
    {
        type: "CUSTOM",
        title: "Custom Document / Letterhead",
        description: "Configurable institutional letterhead, circular, or custom administrative form.",
        icon: Files,
        sizeLabel: "A4 / Letter / Custom",
        aspectRatioBadge: "Selectable",
        category: "Certificate"
    }
];

export function TemplateTypeSelectorDialog({
    isOpen,
    onClose,
    onSelectType
}: TemplateTypeSelectorDialogProps) {
    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="!max-w-4xl sm:!max-w-4xl !w-[92vw] p-0 overflow-hidden rounded-2xl border-border/80 shadow-2xl bg-card">
                <DialogHeader className="p-5 sm:p-6 border-b border-border/60 bg-muted/20">
                    <div className="space-y-1">
                        <DialogTitle className="text-xl font-black text-foreground flex items-center gap-2.5">
                            <Files className="w-5 h-5 text-primary" />
                            Select Document Template Type
                        </DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            Step 1 of 2: Choose the document type to open the specialized design studio with appropriate physical dimensions, content blocks, and layout controls.
                        </DialogDescription>
                    </div>
                </DialogHeader>

                <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
                        {TYPE_OPTIONS.map(opt => {
                            const Icon = opt.icon;
                            return (
                                <button
                                    key={opt.type}
                                    type="button"
                                    onClick={() => onSelectType(opt.type)}
                                    className={cn(
                                        "group text-left p-4 rounded-xl border border-border/60 bg-background/80",
                                        "hover:border-primary/80 hover:bg-primary/5 hover:shadow-md transition-all duration-150",
                                        "flex flex-col justify-between space-y-3 cursor-pointer relative"
                                    )}
                                >
                                    <div className="space-y-2.5">
                                        <div className="flex items-center justify-between">
                                            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center group-hover:scale-105 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                                                <Icon className="w-5 h-5" />
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-mono font-semibold">
                                                {opt.aspectRatioBadge}
                                            </Badge>
                                        </div>

                                        <div>
                                            <h4 className="text-sm font-black text-foreground group-hover:text-primary transition-colors">
                                                {opt.title}
                                            </h4>
                                            <p className="text-[11px] text-muted-foreground mt-1 leading-relaxed line-clamp-2">
                                                {opt.description}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="pt-2 border-t border-border/40 flex items-center justify-between text-[10.5px]">
                                        <span className="font-mono text-muted-foreground">
                                            {opt.sizeLabel}
                                        </span>
                                        <span className="font-bold text-primary flex items-center gap-1 group-hover:translate-x-0.5 transition-transform">
                                            Select <ArrowRight className="w-3 h-3" />
                                        </span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                </div>

                <div className="p-4 bg-muted/20 border-t border-border/60 flex items-center justify-between text-xs text-muted-foreground">
                    <span>You can customize colors, headers, watermarks, and fields in the next step.</span>
                    <Button variant="outline" size="sm" onClick={onClose} className="rounded-xl text-xs font-semibold">
                        Cancel
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
