import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Layout, Star, Trash2, Edit3, Copy,
    Layers, Search, RefreshCw, Plus, FileText, Printer
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { 
    documentTemplateApi, 
    type DocumentTemplateItem,
    type DocumentTemplateType
} from "../../api/documentTemplateApi";
import { getDocumentDimensions, DOCUMENT_TYPE_DEFAULTS } from "./templateSizeConfig";
import { TemplateEditorModal } from "./TemplateEditorModal";
import { IssueDocumentModal } from "./IssueDocumentModal";
import { TemplateTypeSelectorDialog } from "./TemplateTypeSelectorDialog";
import { DOCUMENT_CONTENT_DEFAULTS } from "./documentContentTemplates";
import { StudentIdCardPreview } from "./previews/StudentIdCardPreview";
import { CertificatePreview } from "./previews/CertificatePreview";
import { usePermissions } from "@/store/hooks";
import { cn } from "@/lib/utils";

interface DocumentTemplatesSectionProps {
    schoolName?: string;
    logoUrl?: string;
    schoolInfo?: any;
}

export function DocumentTemplatesSection({ schoolName, logoUrl, schoolInfo }: DocumentTemplatesSectionProps) {
    const qc = useQueryClient();
    const { can } = usePermissions();
    const [selectedType, setSelectedType] = useState<string>("ALL");
    const [searchQuery, setSearchQuery] = useState("");
    const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
    const [editingTemplate, setEditingTemplate] = useState<Partial<DocumentTemplateItem> | null>(null);
    const [issuingTemplate, setIssuingTemplate] = useState<DocumentTemplateItem | null>(null);
    const [isTypeSelectorOpen, setIsTypeSelectorOpen] = useState(false);

    const { data: templates = [], isLoading, refetch } = useQuery({
        queryKey: ["documentTemplates"],
        queryFn: () => documentTemplateApi.getAll(),
    });

    const createMutation = useMutation({
        mutationFn: async (payload: Partial<DocumentTemplateItem>) => {
            return documentTemplateApi.create(payload);
        },
        onSuccess: (data) => {
            toast.success(`Template "${data.name}" created successfully`);
            qc.invalidateQueries({ queryKey: ["documentTemplates"] });
            setSelectedTemplateId(data.id);
            setEditingTemplate(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to create template");
        }
    });

    const updateMutation = useMutation({
        mutationFn: async ({ id, payload }: { id: string; payload: Partial<DocumentTemplateItem> }) => {
            return documentTemplateApi.update(id, payload);
        },
        onSuccess: (data) => {
            toast.success("Document template updated successfully");
            qc.invalidateQueries({ queryKey: ["documentTemplates"] });
            setSelectedTemplateId(data.id);
            setEditingTemplate(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to update template");
        }
    });

    const duplicateMutation = useMutation({
        mutationFn: async (id: string) => documentTemplateApi.duplicate(id),
        onSuccess: (data) => {
            toast.success(`Duplicated as "${data.name}"`);
            qc.invalidateQueries({ queryKey: ["documentTemplates"] });
            setSelectedTemplateId(data.id);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to duplicate template");
        }
    });

    const setDefaultMutation = useMutation({
        mutationFn: async (id: string) => documentTemplateApi.setDefault(id),
        onSuccess: (data) => {
            toast.success(`Set "${data.name}" as default template`);
            qc.invalidateQueries({ queryKey: ["documentTemplates"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to set default");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (id: string) => documentTemplateApi.delete(id),
        onSuccess: () => {
            toast.success("Template deleted successfully");
            qc.invalidateQueries({ queryKey: ["documentTemplates"] });
            setSelectedTemplateId(null);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to delete template");
        }
    });

    const filteredTemplates = templates.filter(tmpl => {
        const matchesType = selectedType === "ALL" || tmpl.type === selectedType;
        const matchesSearch = !searchQuery.trim() || 
            tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            tmpl.type.toLowerCase().includes(searchQuery.toLowerCase());
        return matchesType && matchesSearch;
    });

    // Currently focused template for Right Pane Summary
    const activeTemplate = templates.find(t => t.id === selectedTemplateId) || filteredTemplates[0] || null;

    const canManage = can("all", "manage") || can("departments", "manage");

    // Starts creation by opening Type Selector first
    const handleStartCreateFlow = () => {
        setIsTypeSelectorOpen(true);
    };

    // When a type is chosen from Step 1 dialog
    const handleTypeSelected = (chosenType: DocumentTemplateType) => {
        setIsTypeSelectorOpen(false);
        const typeConfig = DOCUMENT_TYPE_DEFAULTS[chosenType] || DOCUMENT_TYPE_DEFAULTS.CUSTOM;
        const contentPreset = DOCUMENT_CONTENT_DEFAULTS[chosenType] || DOCUMENT_CONTENT_DEFAULTS.CUSTOM;
        const isId = chosenType === "STUDENT_ID_CARD" || chosenType === "TEACHER_ID_CARD";

        setEditingTemplate({
            name: `New ${typeConfig.label}`,
            type: chosenType,
            status: "DRAFT",
            paperSize: typeConfig.paperSize,
            orientation: typeConfig.orientation,
            isDefault: false,
            designConfig: {
                format: isId ? "landscape" : undefined,
                sideMode: isId ? "front_only" : undefined,
                theme: isId 
                    ? { primaryColor: "#4F46E5", secondaryColor: "#818CF8", backgroundColor: "#FFFFFF" }
                    : { primaryColor: "#1E3A8A", secondaryColor: "#D97706", backgroundColor: "#FFFFFF", textColor: "#0F172A" },
                header: { 
                    showSchoolLogo: true, 
                    showSchoolName: true, 
                    showAffiliation: true,
                    showSchoolAddress: true
                },
                watermark: {
                    enabled: true,
                    opacity: 0.08,
                    rotate: true,
                    scale: 1.15
                },
                editableContent: {
                    certificateTitle: contentPreset.certificateTitle,
                    leadText: contentPreset.leadText,
                    bodyTemplate: contentPreset.bodyTemplate,
                    closingDeclaration: contentPreset.closingDeclaration,
                    extraLines: contentPreset.extraLines || []
                },
                dimensions: { showCutGuides: true }
            },
            selectedFields: []
        });
    };

    return (
        <div className="space-y-6">
            <Card className="border-border/60 shadow-sm">
                <CardHeader className="pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                        <div>
                            <CardTitle className="text-xl font-bold flex items-center gap-2">
                                <Layout className="w-5 h-5 text-primary" />
                                Document & Certificate Templates
                            </CardTitle>
                            <CardDescription className="text-xs">
                                Central print design engine for Student ID Cards, Staff Badges, Report Cards, and Transfer Certificates.
                            </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => refetch()}
                                className="rounded-xl font-semibold gap-1.5 text-xs h-9"
                            >
                                <RefreshCw className="w-3.5 h-3.5" /> Refresh
                            </Button>

                            {canManage && (
                                <Button 
                                    size="sm" 
                                    onClick={handleStartCreateFlow}
                                    className="rounded-xl font-bold gap-1.5 text-xs h-9"
                                >
                                    <Plus className="w-4 h-4" /> Create Template
                                </Button>
                            )}
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="space-y-4">
                    {/* Filters & Search Toolbar */}
                    <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                        {/* Type Category Pills */}
                        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
                            {[
                                { key: "ALL", label: "All Templates" },
                                { key: "STUDENT_ID_CARD", label: "Student ID" },
                                { key: "TEACHER_ID_CARD", label: "Faculty ID" },
                                { key: "REPORT_CARD", label: "Report Card" },
                                { key: "TRANSFER_CERTIFICATE", label: "TC" },
                                { key: "LEAVING_CERTIFICATE", label: "Leaving" },
                                { key: "BONAFIDE_CERTIFICATE", label: "Bonafide" },
                                { key: "CHARACTER_CERTIFICATE", label: "Character" },
                            ].map(item => (
                                <Button
                                    key={item.key}
                                    type="button"
                                    variant={selectedType === item.key ? "default" : "secondary"}
                                    size="sm"
                                    onClick={() => setSelectedType(item.key)}
                                    className={cn(
                                        "h-8 px-3 rounded-xl text-xs font-bold transition-all shrink-0",
                                        selectedType !== item.key && "bg-muted/60 text-muted-foreground hover:bg-muted"
                                    )}
                                >
                                    {item.label}
                                </Button>
                            ))}
                        </div>

                        {/* Search Input */}
                        <div className="relative w-full md:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                            <Input 
                                placeholder="Search templates..."
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                className="pl-9 h-9 text-xs rounded-xl"
                            />
                        </div>
                    </div>

                    {/* Master-Detail Split Layout */}
                    {isLoading ? (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2">
                            <div className="lg:col-span-7 space-y-3">
                                {[1, 2, 3].map(i => (
                                    <Skeleton key={i} className="h-28 rounded-2xl" />
                                ))}
                            </div>
                            <div className="lg:col-span-5">
                                <Skeleton className="h-96 rounded-2xl" />
                            </div>
                        </div>
                    ) : filteredTemplates.length === 0 ? (
                        <div className="py-16 text-center text-muted-foreground border border-dashed rounded-2xl space-y-3">
                            <Layers className="w-10 h-10 mx-auto opacity-40 text-primary" />
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-foreground">No Document Templates Found</p>
                                <p className="text-xs">Adjust your search filter or initialize a new document template.</p>
                            </div>
                            {canManage && (
                                <Button 
                                    size="sm" 
                                    onClick={handleStartCreateFlow}
                                    className="rounded-xl text-xs font-bold gap-1.5"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Create First Template
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-2 items-start">
                            {/* Left Pane: Template List Cards (7 columns) */}
                            <div className="lg:col-span-7 space-y-3">
                                {filteredTemplates.map(tmpl => {
                                    const isDefault = tmpl.isDefault;
                                    const isSelected = activeTemplate?.id === tmpl.id;
                                    const dim = getDocumentDimensions(tmpl.paperSize, tmpl.orientation);

                                    return (
                                        <div 
                                            key={tmpl.id}
                                            onClick={() => setSelectedTemplateId(tmpl.id)}
                                            className={cn(
                                                "p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between space-y-3 bg-card",
                                                isSelected 
                                                    ? "border-primary ring-1 ring-primary/40 shadow-sm" 
                                                    : "border-border/70 hover:border-primary/40 hover:shadow-2xs"
                                            )}
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div className="space-y-1">
                                                    <div className="flex items-center gap-2">
                                                        <h4 className="font-black text-sm text-foreground line-clamp-1">{tmpl.name}</h4>
                                                        {isDefault ? (
                                                            <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[10px] font-bold px-1.5 py-0.5 gap-1">
                                                                <Star className="w-3 h-3 fill-amber-500" /> Default
                                                            </Badge>
                                                        ) : (
                                                            <Badge variant="secondary" className="text-[10px] font-medium">
                                                                {tmpl.status}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                    <p className="text-xs text-muted-foreground line-clamp-1">
                                                        {tmpl.description || "Central institution template layout."}
                                                    </p>
                                                </div>

                                                <Badge variant="outline" className="text-[10px] font-mono px-2 py-0.5 uppercase tracking-wider bg-muted/40 shrink-0">
                                                    {dim.widthMm} × {dim.heightMm} mm
                                                </Badge>
                                            </div>

                                            <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                                                <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                                                    <span className="font-semibold text-foreground/80">{tmpl.type.replace(/_/g, " ")}</span>
                                                    <span>•</span>
                                                    <span>{tmpl.paperSize} ({tmpl.orientation.toLowerCase()})</span>
                                                </div>

                                                <div className="flex items-center gap-1">
                                                    <Button 
                                                        size="sm" 
                                                        variant="outline" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setEditingTemplate(tmpl);
                                                        }}
                                                        className="h-7 text-xs font-bold rounded-lg gap-1 px-2.5"
                                                    >
                                                        <Edit3 className="w-3 h-3 text-primary" /> Edit
                                                    </Button>

                                                    <Button 
                                                        size="sm" 
                                                        variant="ghost" 
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            duplicateMutation.mutate(tmpl.id);
                                                        }}
                                                        title="Duplicate"
                                                        className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-foreground"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </Button>

                                                    {!isDefault && canManage && (
                                                        <Button 
                                                            size="sm" 
                                                            variant="ghost" 
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (window.confirm(`Delete template "${tmpl.name}"?`)) {
                                                                    deleteMutation.mutate(tmpl.id);
                                                                }
                                                            }}
                                                            title="Delete"
                                                            className="h-7 w-7 p-0 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Right Pane: Selected Template Live Summary (5 columns sticky) */}
                            <div className="lg:col-span-5 sticky top-6">
                                {activeTemplate ? (
                                    <div className="p-4 rounded-2xl border border-border/70 bg-card/60 shadow-sm space-y-4">
                                        <div className="flex items-center justify-between border-b pb-3">
                                            <div>
                                                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                                                    Selected Template Summary
                                                </span>
                                                <h3 className="text-base font-black text-foreground line-clamp-1">
                                                    {activeTemplate.name}
                                                </h3>
                                            </div>
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                {activeTemplate.paperSize}
                                            </Badge>
                                        </div>

                                        {/* Scaled Preview Box */}
                                        <div className="p-3 rounded-xl bg-muted/20 border border-border/50 flex flex-col items-center justify-center overflow-hidden min-h-[260px]">
                                            {activeTemplate.type === "STUDENT_ID_CARD" || activeTemplate.type === "TEACHER_ID_CARD" ? (
                                                <div className="scale-75 origin-center my--4">
                                                    <StudentIdCardPreview 
                                                        template={activeTemplate} 
                                                        schoolName={schoolName}
                                                        logoUrl={logoUrl}
                                                        schoolInfo={schoolInfo}
                                                    />
                                                </div>
                                            ) : (
                                                <div className="scale-50 origin-center my--16">
                                                    <CertificatePreview 
                                                        template={activeTemplate} 
                                                        schoolName={schoolName}
                                                        logoUrl={logoUrl}
                                                        schoolInfo={schoolInfo}
                                                    />
                                                </div>
                                            )}
                                        </div>

                                        {/* Physical Specifications Details */}
                                        <div className="grid grid-cols-2 gap-2 text-[11px] p-2.5 rounded-xl bg-muted/30 border border-border/40">
                                            <div>
                                                <span className="text-muted-foreground text-[9px] uppercase font-bold block">Physical Dimensions</span>
                                                <span className="font-mono font-bold text-foreground">
                                                    {getDocumentDimensions(activeTemplate.paperSize, activeTemplate.orientation).label}
                                                </span>
                                            </div>
                                            <div>
                                                <span className="text-muted-foreground text-[9px] uppercase font-bold block">Active Status</span>
                                                <span className="font-semibold text-foreground">
                                                    {activeTemplate.status} {activeTemplate.isDefault && "• Default"}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Action Bar */}
                                        <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2">
                                            <Button 
                                                className="flex-1 rounded-xl font-bold text-xs gap-1.5 h-9"
                                                onClick={() => {
                                                    setEditingTemplate(activeTemplate);
                                                }}
                                            >
                                                <Edit3 className="w-3.5 h-3.5" /> Customize Design & Size
                                            </Button>

                                            <Button 
                                                variant="secondary"
                                                className="rounded-xl font-bold text-xs gap-1.5 h-9"
                                                onClick={() => setIssuingTemplate(activeTemplate)}
                                            >
                                                <Printer className="w-3.5 h-3.5 text-primary" /> Issue / Download
                                            </Button>

                                            {!activeTemplate.isDefault && canManage && (
                                                <Button 
                                                    variant="outline"
                                                    size="sm"
                                                    onClick={() => setDefaultMutation.mutate(activeTemplate.id)}
                                                    className="rounded-xl text-xs font-semibold gap-1 h-9"
                                                    title="Set as Default"
                                                >
                                                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" /> Default
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="p-8 text-center text-muted-foreground border border-dashed rounded-2xl">
                                        <FileText className="w-8 h-8 mx-auto opacity-30" />
                                        <p className="text-xs font-semibold mt-2">Select a template to view details</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Step 1: Template Type Selector Dialog */}
            <TemplateTypeSelectorDialog
                isOpen={isTypeSelectorOpen}
                onClose={() => setIsTypeSelectorOpen(false)}
                onSelectType={handleTypeSelected}
            />

            {/* Step 2: Template Editor / Creator Studio */}
            {editingTemplate && (
                <TemplateEditorModal 
                    template={editingTemplate}
                    isOpen={!!editingTemplate}
                    onClose={() => {
                        setEditingTemplate(null);
                    }}
                    onBackToTypeSelect={() => {
                        setEditingTemplate(null);
                        setIsTypeSelectorOpen(true);
                    }}
                    schoolName={schoolName}
                    logoUrl={logoUrl}
                    schoolInfo={schoolInfo}
                    onSave={async (payload) => {
                        if (editingTemplate.id) {
                            await updateMutation.mutateAsync({
                                id: editingTemplate.id,
                                payload
                            });
                        } else {
                            await createMutation.mutateAsync(payload);
                        }
                    }}
                />
            )}

            {/* Document Issuance & Download Modal */}
            {issuingTemplate && (
                <IssueDocumentModal 
                    template={issuingTemplate}
                    isOpen={!!issuingTemplate}
                    onClose={() => setIssuingTemplate(null)}
                    schoolName={schoolName}
                    logoUrl={logoUrl}
                    schoolInfo={schoolInfo}
                />
            )}
        </div>
    );
}
