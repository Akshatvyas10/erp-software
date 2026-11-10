import { useState } from "react";
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
import { 
    Download, Printer, FileText, 
    ShieldCheck, Sparkles
} from "lucide-react";
import type { DocumentTemplateItem } from "../../api/documentTemplateApi";
import type { DocumentDownloadMode } from "./previews/CertificatePreview";
import { CertificatePreview } from "./previews/CertificatePreview";
import { StudentIdCardPreview } from "./previews/StudentIdCardPreview";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface IssueDocumentModalProps {
    template: DocumentTemplateItem;
    isOpen: boolean;
    onClose: () => void;
    schoolName?: string;
    logoUrl?: string;
    schoolInfo?: any;
}

export function IssueDocumentModal({
    template,
    isOpen,
    onClose,
    schoolName,
    logoUrl,
    schoolInfo
}: IssueDocumentModalProps) {
    const [downloadMode, setDownloadMode] = useState<DocumentDownloadMode>("without_signature");
    const [isGenerating, setIsGenerating] = useState(false);

    const isIdCard = template.type === "STUDENT_ID_CARD" || template.type === "TEACHER_ID_CARD";

    const handleDownloadOrPrint = (action: "print" | "download") => {
        setIsGenerating(true);
        setTimeout(() => {
            setIsGenerating(false);
            if (action === "print") {
                window.print();
            } else {
                toast.success(`Generated ${template.name} (${downloadMode.replace(/_/g, " ").toUpperCase()})`);
                onClose();
            }
        }, 600);
    };

    return (
        <Dialog open={isOpen} onOpenChange={open => !open && onClose()}>
            <DialogContent className="!max-w-6xl sm:!max-w-6xl !w-[92vw] h-[88vh] flex flex-col p-0 overflow-hidden rounded-2xl shadow-2xl border border-border/80">
                {/* Header */}
                <DialogHeader className="p-4 sm:p-5 border-b border-border/60 bg-muted/20 shrink-0">
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle className="text-base font-black text-foreground flex items-center gap-2">
                                <Printer className="w-5 h-5 text-primary" />
                                Issue & Download: {template.name}
                            </DialogTitle>
                            <DialogDescription className="text-xs text-muted-foreground">
                                Select institutional issuance authorization mode before printing or generating PDF.
                            </DialogDescription>
                        </div>
                        <Badge variant="outline" className="font-mono text-xs uppercase px-2.5 py-1">
                            {template.paperSize} • {template.orientation}
                        </Badge>
                    </div>
                </DialogHeader>

                {/* 2-Column Responsive Body */}
                <div className="flex-1 overflow-hidden grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-border/60">
                    {/* Left: Mode Selection Controls (5 columns) */}
                    <div className="lg:col-span-5 p-4 sm:p-6 overflow-y-auto max-h-full space-y-5">
                        <div className="space-y-1">
                            <h4 className="text-xs font-black uppercase tracking-wider text-foreground">
                                1. Select Issuance Mode
                            </h4>
                            <p className="text-[11px] text-muted-foreground">
                                Choose how credentials and signatures should render on the final document.
                            </p>
                        </div>

                        {/* Download Modes Options */}
                        <div className="space-y-3">
                            {/* Mode 1: Without Signature (Wet-ink - Standard default) */}
                            <div
                                onClick={() => setDownloadMode("without_signature")}
                                className={cn(
                                    "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 bg-card",
                                    downloadMode === "without_signature"
                                        ? "border-blue-600 bg-blue-600/5 ring-2 ring-blue-600/30 shadow-xs"
                                        : "border-border/70 hover:border-border hover:bg-muted/20"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <Printer className="w-4 h-4 text-blue-600" />
                                        <span className="font-bold text-xs text-foreground">1. Filled Student Data — Without Signature</span>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] font-semibold text-blue-700 bg-blue-50">
                                        Wet-Ink (Standard)
                                    </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed pl-6">
                                    All student records, admission details, and grades are populated cleanly, with physical signature and institutional rubber stamp lines left open for physical ink signing.
                                </p>
                            </div>

                            {/* Mode 2: Plain Blank (Manual writing) */}
                            <div
                                onClick={() => setDownloadMode("plain_empty")}
                                className={cn(
                                    "p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between space-y-1.5 bg-card",
                                    downloadMode === "plain_empty"
                                        ? "border-amber-500 bg-amber-500/5 ring-2 ring-amber-500/30 shadow-xs"
                                        : "border-border/70 hover:border-border hover:bg-muted/20"
                                )}
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <FileText className="w-4 h-4 text-amber-600" />
                                        <span className="font-bold text-xs text-foreground">2. Plain Blank Certificate</span>
                                    </div>
                                    <Badge variant="outline" className="text-[9px] font-semibold text-amber-700 bg-amber-50">
                                        Blank
                                    </Badge>
                                </div>
                                <p className="text-[10px] text-muted-foreground leading-relaxed pl-6">
                                    Clean official document with underlined blank spaces for offline manual pen writing or offline school registry record filing.
                                </p>
                            </div>
                        </div>

                        {/* Audit info notice */}
                        <div className="p-3 bg-muted/40 rounded-xl border border-border/50 text-[11px] text-muted-foreground flex items-start gap-2">
                            <ShieldCheck className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                            <span>
                                Every issued document is logged with an immutable audit hash, issuer user identity, and timestamp.
                            </span>
                        </div>
                    </div>

                    {/* Right: Live Preview of Selected Mode (7 columns) */}
                    <div className="lg:col-span-7 p-4 sm:p-6 bg-muted/20 flex flex-col items-center justify-between space-y-4 overflow-y-auto">
                        <div className="flex items-center justify-between w-full">
                            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-1.5">
                                <Sparkles className="w-3.5 h-3.5 text-primary" /> Live Output Preview
                            </span>
                            <span className="text-[10px] font-mono font-semibold">
                                {downloadMode.toUpperCase()}
                            </span>
                        </div>

                        <div className="flex-1 flex items-center justify-center py-4 w-full overflow-x-auto">
                            {isIdCard ? (
                                <StudentIdCardPreview 
                                    template={template}
                                    schoolName={schoolName}
                                    logoUrl={logoUrl}
                                    schoolInfo={schoolInfo}
                                />
                            ) : (
                                <CertificatePreview 
                                    template={template}
                                    schoolName={schoolName}
                                    logoUrl={logoUrl}
                                    schoolInfo={schoolInfo}
                                    downloadMode={downloadMode}
                                />
                            )}
                        </div>

                        <div className="text-center text-[10px] text-muted-foreground">
                            Rendered to exact ISO print scale • Ready for immediate high-resolution PDF generation
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <DialogFooter className="p-4 border-t border-border/60 bg-muted/10 flex items-center justify-between gap-3 shrink-0">
                    <Button variant="outline" onClick={onClose} className="rounded-xl text-xs font-semibold">
                        Cancel
                    </Button>

                    <div className="flex items-center gap-2">
                        <Button
                            variant="secondary"
                            onClick={() => handleDownloadOrPrint("print")}
                            disabled={isGenerating}
                            className="rounded-xl text-xs font-bold gap-1.5"
                        >
                            <Printer className="w-3.5 h-3.5" /> Print
                        </Button>

                        <Button 
                            onClick={() => handleDownloadOrPrint("download")}
                            disabled={isGenerating}
                            className="rounded-xl text-xs font-bold gap-1.5"
                        >
                            <Download className="w-3.5 h-3.5" /> Download PDF ({downloadMode.replace(/_/g, " ").toUpperCase()})
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
