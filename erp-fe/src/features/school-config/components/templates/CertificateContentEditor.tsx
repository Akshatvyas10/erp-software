import { Plus, Trash2, ArrowUp, ArrowDown, HelpCircle } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { TemplateDesignConfig } from "../../api/documentTemplateApi";

interface CertificateContentEditorProps {
    designConfig: TemplateDesignConfig;
    onChange: (editable: NonNullable<TemplateDesignConfig["editableContent"]>) => void;
    documentTypeLabel?: string;
}

const PLACEHOLDER_CHIPS = [
    { token: "{{studentName}}", label: "Student Name" },
    { token: "{{fatherName}}", label: "Father Name" },
    { token: "{{motherName}}", label: "Mother Name" },
    { token: "{{admissionNumber}}", label: "Admission No" },
    { token: "{{className}}", label: "Class" },
    { token: "{{section}}", label: "Section" },
    { token: "{{rollNumber}}", label: "Roll No" },
    { token: "{{academicYear}}", label: "Academic Session" },
    { token: "{{dateOfBirth}}", label: "DOB (Numeric)" },
    { token: "{{dobWords}}", label: "DOB (Words)" },
    { token: "{{dateOfLeaving}}", label: "Date of Leaving" },
    { token: "{{reasonForLeaving}}", label: "Reason" },
    { token: "{{generalConduct}}", label: "Conduct" },
    { token: "{{bonafidePurpose}}", label: "Bonafide Purpose" }
];

export function CertificateContentEditor({
    designConfig,
    onChange,
    documentTypeLabel = "Certificate"
}: CertificateContentEditorProps) {
    const editable = designConfig.editableContent || {
        certificateTitle: "",
        leadText: "",
        bodyTemplate: "",
        closingDeclaration: "",
        extraLines: []
    };

    const extraLines = editable.extraLines || [];

    const updateField = (field: keyof NonNullable<TemplateDesignConfig["editableContent"]>, val: any) => {
        onChange({
            ...editable,
            [field]: val
        });
    };

    const handleAddLine = () => {
        const next = [...extraLines, ""];
        updateField("extraLines", next);
    };

    const handleUpdateLine = (index: number, val: string) => {
        const next = [...extraLines];
        next[index] = val;
        updateField("extraLines", next);
    };

    const handleRemoveLine = (index: number) => {
        const next = extraLines.filter((_, i) => i !== index);
        updateField("extraLines", next);
    };

    const handleMoveLine = (index: number, direction: "UP" | "DOWN") => {
        const target = direction === "UP" ? index - 1 : index + 1;
        if (target < 0 || target >= extraLines.length) return;
        const next = [...extraLines];
        const [moved] = next.splice(index, 1);
        next.splice(target, 0, moved);
        updateField("extraLines", next);
    };

    const handleInsertToken = (token: string) => {
        const currentBody = editable.bodyTemplate || "";
        updateField("bodyTemplate", currentBody ? `${currentBody} ${token}` : token);
    };

    return (
        <div className="space-y-6">
            <div className="space-y-1">
                <div className="flex items-center justify-between">
                    <h4 className="text-sm font-black text-foreground">
                        Document Content & Legal Phrasing
                    </h4>
                    <Badge variant="outline" className="text-[10px] font-mono">
                        {documentTypeLabel}
                    </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                    Customize the official wording, add specific clauses or regulatory lines, and insert dynamic student data placeholders.
                </p>
            </div>

            {/* Quick Token Palette */}
            <div className="p-3.5 bg-muted/40 rounded-xl border border-border/60 space-y-2">
                <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-primary" />
                        Click Placeholder Token to Insert into Body:
                    </span>
                    <span className="text-[10px] text-muted-foreground">Auto-resolved on export</span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                    {PLACEHOLDER_CHIPS.map(chip => (
                        <Button
                            key={chip.token}
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => handleInsertToken(chip.token)}
                            className="h-7 px-2 py-0.5 text-[11px] font-mono hover:bg-primary hover:text-primary-foreground transition-colors"
                            title={`Insert ${chip.token}`}
                        >
                            {chip.label}
                        </Button>
                    ))}
                </div>
            </div>

            {/* Certificate Title */}
            <div className="space-y-1.5">
                <Label className="text-xs font-bold">Main Certificate Header Title</Label>
                <Input
                    value={editable.certificateTitle || ""}
                    onChange={e => updateField("certificateTitle", e.target.value)}
                    placeholder="e.g. TRANSFER CERTIFICATE or BONAFIDE CERTIFICATE"
                    className="h-10 text-xs rounded-xl font-bold uppercase tracking-wider"
                />
            </div>

            {/* Lead In Text */}
            <div className="space-y-1.5">
                <Label className="text-xs font-bold">Salutation / Lead-in Text</Label>
                <Input
                    value={editable.leadText || ""}
                    onChange={e => updateField("leadText", e.target.value)}
                    placeholder="e.g. TO WHOMSOEVER IT MAY CONCERN or This is to formally certify that:"
                    className="h-10 text-xs rounded-xl italic"
                />
            </div>

            {/* Main Body Template */}
            <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold">Primary Certificate Body Template</Label>
                    <span className="text-[10px] text-muted-foreground font-mono">Supports multiple paragraphs</span>
                </div>
                <Textarea
                    value={editable.bodyTemplate || ""}
                    onChange={e => updateField("bodyTemplate", e.target.value)}
                    placeholder="Write body content here with tokens like {{studentName}}, {{className}}, etc..."
                    rows={6}
                    className="text-xs rounded-xl leading-relaxed font-sans"
                />
            </div>

            {/* Extra Lines / Clauses Section */}
            <div className="space-y-3 pt-2 border-t border-border/60">
                <div className="flex items-center justify-between">
                    <div>
                        <Label className="text-xs font-bold">Additional Specific Clauses & Record Lines</Label>
                        <p className="text-[11px] text-muted-foreground">Add extra bullet points, dues clearance notes, or regulatory clauses.</p>
                    </div>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAddLine}
                        className="rounded-xl text-xs font-bold gap-1.5 h-8"
                    >
                        <Plus className="w-3.5 h-3.5" /> Add Clause / Line
                    </Button>
                </div>

                {extraLines.length === 0 ? (
                    <div className="text-center py-4 border border-dashed rounded-xl bg-muted/10 text-xs text-muted-foreground">
                        No additional lines added. Click "Add Clause / Line" to include extra bulleted statements.
                    </div>
                ) : (
                    <div className="space-y-2">
                        {extraLines.map((line, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-background p-2 rounded-xl border border-border/60 shadow-2xs">
                                <span className="w-5 text-center text-xs font-mono font-bold text-muted-foreground">
                                    {idx + 1}.
                                </span>
                                <Input
                                    value={line}
                                    onChange={e => handleUpdateLine(idx, e.target.value)}
                                    placeholder="e.g. Cleared all national NCC/Sports obligations with honors"
                                    className="h-8 text-xs rounded-lg flex-1"
                                />
                                <div className="flex items-center gap-0.5">
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleMoveLine(idx, "UP")}
                                        disabled={idx === 0}
                                        className="h-7 w-7 rounded-md"
                                    >
                                        <ArrowUp className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleMoveLine(idx, "DOWN")}
                                        disabled={idx === extraLines.length - 1}
                                        className="h-7 w-7 rounded-md"
                                    >
                                        <ArrowDown className="w-3 h-3" />
                                    </Button>
                                    <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        onClick={() => handleRemoveLine(idx)}
                                        className="h-7 w-7 rounded-md text-destructive hover:bg-destructive/10"
                                    >
                                        <Trash2 className="w-3 h-3" />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Closing Declaration */}
            <div className="space-y-1.5 pt-2 border-t border-border/60">
                <Label className="text-xs font-bold">Closing Authentication Declaration</Label>
                <Input
                    value={editable.closingDeclaration || ""}
                    onChange={e => updateField("closingDeclaration", e.target.value)}
                    placeholder="e.g. Certified that the above particulars are in accordance with the official School Master Register."
                    className="h-10 text-xs rounded-xl"
                />
            </div>
        </div>
    );
}
