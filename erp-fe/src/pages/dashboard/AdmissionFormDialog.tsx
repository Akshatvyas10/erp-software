import { useEffect, useRef, useState } from "react";
import { useForm, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Eye, EyeOff, UploadCloud, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

import api from "@/lib/api";
import type { Student, Classroom } from "@/types/erp";

// ─── Constants ────────────────────────────────────────────────────────────────
const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ?? "http://localhost:5000";
const MAX_PHOTO_BYTES = 1 * 1024 * 1024; // 1 MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const TAB_ORDER = ["account", "academic", "guardian", "logistics"] as const;
const TAB_LABELS: Record<string, string> = {
    account: "Account", academic: "Academic", guardian: "Guardian", logistics: "Logistics",
};
const inputCls = "h-9 bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50 rounded-lg";
const sectionHd = "text-[11px] font-bold uppercase tracking-widest text-purple-900/50 dark:text-zinc-500 mb-3 mt-1";

// ─── Zod schema ───────────────────────────────────────────────────────────────
const admissionSchema = z.object({
    firstName: z.string().min(1, "First name is required").max(100),
    lastName: z.string().min(1, "Last name is required").max(100),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().optional(),
    gender: z.string().optional(),
    religion: z.string().optional(),
    caste: z.string().optional(),
    motherTongue: z.string().optional(),
    rollNumber: z.string().max(20).optional().or(z.literal("")),
    classroomId: z.string().uuid().optional().or(z.literal("")),
    previousSchoolDetails: z.string().optional(),
    dateOfBirth: z.string().optional().or(z.literal("")),
    status: z.enum(["ACTIVE", "SUSPENDED", "GRADUATED", "TRANSFERRED"]).optional(),
    guardianName: z.string().max(200).optional().or(z.literal("")),
    guardianRelationship: z.string().max(50).optional().or(z.literal("")),
    guardianPhone: z.string().max(20).optional().or(z.literal("")),
    guardianEmail: z.string().email("Invalid email").optional().or(z.literal("")),
    permanentAddress: z.string().optional(),
    currentAddress: z.string().optional(),
    sameAddress: z.boolean().optional(),
    governmentId: z.string().max(50).optional().or(z.literal("")),
    bloodGroup: z.string().max(5).optional().or(z.literal("")),
    transportationMode: z.enum(["SCHOOL_BUS", "PRIVATE_TRANSPORT", "WALKER"]).optional(),
    feeQuota: z.enum(["REGULAR", "STAFF_CHILD", "SCHOLARSHIP_HALF", "SCHOLARSHIP_FULL"]).optional(),
    medicalNotes: z.string().optional(),
    bankAccountNumber: z.string().min(1, "Account number is required"),
    bankIfscCode: z.string().min(1, "IFSC code is required"),
    bankName: z.string().min(1, "Bank name is required"),
    bankBranch: z.string().min(1, "Bank branch is required"),
    bankMicrNumber: z.string().optional().or(z.literal("")),
});

type AdmissionFormValues = z.infer<typeof admissionSchema>;

// ─── Props ────────────────────────────────────────────────────────────────────
interface AdmissionFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editTarget: Student | null;
    onSuccess: () => void;
}

// ─── Photo upload sub-component ───────────────────────────────────────────────
interface PhotoPickerProps {
    currentUrl: string | null;
    file: File | null;
    onFile: (f: File | null) => void;
    error: string | null;
}

function PhotoPicker({ currentUrl, file, onFile, error }: PhotoPickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const previewUrl = file ? URL.createObjectURL(file) : (currentUrl ? `${API_BASE}${currentUrl}` : null);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (!ALLOWED_TYPES.includes(f.type)) {
            toast.error("Only JPEG or PNG images are accepted");
            return;
        }
        if (f.size > MAX_PHOTO_BYTES) {
            toast.error("Photo must be under 1 MB");
            return;
        }
        onFile(f);
    };

    return (
        <div className="space-y-2">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                Profile Photo <span className="normal-case font-normal">(JPEG/PNG · max 1 MB)</span>
            </p>
            <div className="flex items-center gap-4">
                {/* Preview circle */}
                <div className="h-16 w-16 rounded-full shrink-0 border-2 border-purple-200 dark:border-purple-500/30
                                bg-purple-600/5 dark:bg-purple-500/10 overflow-hidden flex items-center justify-center">
                    {previewUrl
                        ? <img src={previewUrl} alt="Preview" className="h-full w-full object-cover" />
                        : <ImageIcon className="h-7 w-7 text-purple-400/50" />
                    }
                </div>
                <div className="flex flex-col gap-1.5">
                    <Button
                        type="button" variant="outline" size="sm"
                        onClick={() => inputRef.current?.click()}
                        className="gap-2 h-8 text-xs font-semibold rounded-lg border-purple-200 dark:border-zinc-700
                                   text-purple-700 dark:text-purple-400 hover:bg-purple-600/5"
                    >
                        <UploadCloud className="h-3.5 w-3.5" />
                        {file ? "Change Photo" : "Upload Photo"}
                    </Button>
                    {file && (
                        <div className="flex items-center gap-1.5">
                            <Badge variant="outline" className="text-[10px] font-mono border-border/60 bg-muted/60 max-w-[160px] truncate">
                                {file.name}
                            </Badge>
                            <button type="button" onClick={() => { onFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                                className="text-destructive/70 hover:text-destructive">
                                <X className="h-3 w-3" />
                            </button>
                        </div>
                    )}
                </div>
            </div>
            <input ref={inputRef} type="file" accept="image/jpeg,image/png" className="hidden" onChange={handleChange} />
            {error && <p className="text-[11px] text-destructive font-medium">{error}</p>}
        </div>
    );
}

// ─── Document picker sub-component ──────────────────────────────────────────────
interface DocumentPickerProps {
    label: string;
    currentUrl: string | null;
    file: File | null;
    onFile: (f: File | null) => void;
}

function DocumentPicker({ label, currentUrl, file, onFile }: DocumentPickerProps) {
    const inputRef = useRef<HTMLInputElement>(null);
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0];
        if (!f) return;
        if (f.size > 5 * 1024 * 1024) {
            toast.error("Document must be under 5 MB");
            return;
        }
        onFile(f);
    };
    return (
        <div className="flex flex-col gap-1.5 p-3 rounded-xl border border-border/60 bg-muted/20">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{label}</p>
            <div className="flex items-center gap-2">
                <Button
                    type="button" variant="outline" size="sm"
                    onClick={() => inputRef.current?.click()}
                    className="h-8 text-xs font-semibold rounded-lg text-purple-700 dark:text-purple-400 bg-background"
                >
                    <UploadCloud className="h-3.5 w-3.5 mr-2" />
                    {file ? "Change File" : currentUrl ? "Update File" : "Upload"}
                </Button>
                {file ? (
                    <Badge variant="outline" className="text-[10px] font-mono truncate max-w-[120px] bg-background">{file.name}</Badge>
                ) : currentUrl ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30">Uploaded</Badge>
                ) : null}
                {file && (
                    <button type="button" onClick={() => { onFile(null); if (inputRef.current) inputRef.current.value = ""; }}
                        className="text-destructive/70 hover:text-destructive">
                        <X className="h-3 w-3" />
                    </button>
                )}
            </div>
            <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleChange} />
        </div>
    );
}

// ─── Main dialog component ────────────────────────────────────────────────────
export default function AdmissionFormDialog({
    open, onOpenChange, editTarget, onSuccess,
}: AdmissionFormDialogProps) {
    const isEdit = !!editTarget;
    const [showPassword, setShowPassword] = useState(false);
    const [activeTab, setActiveTab] = useState("account");
    const [photoFile, setPhotoFile] = useState<File | null>(null);
    const [tcFile, setTcFile] = useState<File | null>(null);
    const [birthCertFile, setBirthCertFile] = useState<File | null>(null);
    const [idProofFile, setIdProofFile] = useState<File | null>(null);
    const [photoError, setPhotoError] = useState<string | null>(null);
    const [isDobOpen, setIsDobOpen] = useState(false);

    const form = useForm<AdmissionFormValues>({
        resolver: zodResolver(admissionSchema),
        mode: "onTouched",
        defaultValues: buildDefaults(editTarget),
    });

    // Fetch active classrooms for the selector
    const { data: classrooms = [] } = useQuery<Classroom[]>({
        queryKey: ["classrooms-active"],
        queryFn: async () => {
            const { data } = await api.get("/classrooms?status=ACTIVE&limit=100");
            return data.data.classrooms as Classroom[];
        },
        enabled: open,
        staleTime: 120_000,
    });

    useEffect(() => {
        if (open) {
            form.reset(buildDefaults(editTarget));
            setActiveTab("account");
            setShowPassword(false);
            setPhotoFile(null);
            setTcFile(null);
            setBirthCertFile(null);
            setIdProofFile(null);
            setPhotoError(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, editTarget?.id]);

    // "Same address" sync
    const sameAddress = form.watch("sameAddress");
    const permAddress = form.watch("permanentAddress");
    useEffect(() => {
        if (sameAddress) form.setValue("currentAddress", permAddress ?? "");
    }, [sameAddress, permAddress, form]);

    const fieldsByTab: Record<string, FieldPath<AdmissionFormValues>[]> = {
        account: ["firstName", "lastName", "email", "password", "gender", "religion", "caste", "motherTongue", "dateOfBirth", "status"],
        academic: ["rollNumber", "classroomId", "previousSchoolDetails"],
        guardian: ["guardianName", "guardianRelationship", "guardianPhone", "guardianEmail", "permanentAddress", "currentAddress", "sameAddress"],
        logistics: ["governmentId", "bloodGroup", "transportationMode", "feeQuota", "medicalNotes", "bankAccountNumber", "bankIfscCode", "bankName", "bankBranch", "bankMicrNumber"],
    };

    const handleNext = async () => {
        const fields = fieldsByTab[activeTab];
        const isValid = await form.trigger(fields);

        if (activeTab === "account" && !isEdit) {
            const pwd = form.getValues("password");
            if (!pwd || pwd.length < 8) {
                form.setError("password", { message: "Min. 8 characters" });
                return;
            }
        }

        if (isValid) {
            const idx = TAB_ORDER.indexOf(activeTab as any);
            if (idx < TAB_ORDER.length - 1) {
                setActiveTab(TAB_ORDER[idx + 1]);
            }
        }
    };

    const handlePrev = () => {
        const idx = TAB_ORDER.indexOf(activeTab as any);
        if (idx > 0) {
            setActiveTab(TAB_ORDER[idx - 1]);
        }
    };

    const onSubmit = async (values: AdmissionFormValues) => {
        // Client-side photo guard
        if (!isEdit && !photoFile) {
            // Photo is optional — allowed to proceed
        }

        try {
            // Build multipart FormData
            const fd = new FormData();

            // Append files if present
            if (photoFile) fd.append("profilePhoto", photoFile);
            if (tcFile) fd.append("transferCertificate", tcFile);
            if (birthCertFile) fd.append("birthCertificate", birthCertFile);
            if (idProofFile) fd.append("nationalIdProof", idProofFile);

            // Helper: append only defined, non-empty values
            const app = (key: string, val: string | undefined) => {
                if (val !== undefined && val !== "") fd.append(key, val);
            };

            fd.append("firstName", values.firstName);
            fd.append("lastName", values.lastName);
            fd.append("email", values.email);

            if (!isEdit) {
                if (!values.password || values.password.length < 8) {
                    form.setError("password", { message: "Min. 8 characters" });
                    setActiveTab("account");
                    return;
                }
                fd.append("password", values.password!);
            }

            app("gender", values.gender);
            app("religion", values.religion);
            app("caste", values.caste);
            app("motherTongue", values.motherTongue);
            app("rollNumber", values.rollNumber);
            app("classroomId", values.classroomId);
            app("previousSchoolDetails", values.previousSchoolDetails);
            app("dateOfBirth", values.dateOfBirth);
            app("status", values.status ?? (isEdit ? undefined : "ACTIVE"));
            app("guardianName", values.guardianName);
            app("guardianRelationship", values.guardianRelationship);
            app("guardianPhone", values.guardianPhone);
            app("guardianEmail", values.guardianEmail);
            app("permanentAddress", values.permanentAddress);
            app("currentAddress", values.currentAddress);
            app("governmentId", values.governmentId);
            app("bloodGroup", values.bloodGroup);
            app("transportationMode", values.transportationMode);
            app("feeQuota", values.feeQuota ?? (isEdit ? undefined : "REGULAR"));
            app("medicalNotes", values.medicalNotes);
            app("bankAccountNumber", values.bankAccountNumber);
            app("bankIfscCode", values.bankIfscCode);
            app("bankName", values.bankName);
            app("bankBranch", values.bankBranch);
            app("bankMicrNumber", values.bankMicrNumber);

            const config = { headers: { "Content-Type": "multipart/form-data" } };

            if (isEdit) {
                await api.put(`/students/${editTarget!.id}`, fd, config);
                toast.success("Student profile updated");
            } else {
                await api.post("/students", fd, config);
                toast.success("Student enrolled — admission number auto-generated");
            }

            onSuccess();
            onOpenChange(false);
        } catch (err: unknown) {
            toast.error(
                (err as { response?: { data?: { message?: string } } })
                    ?.response?.data?.message ?? "Operation failed"
            );
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-2xl p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-white dark:bg-zinc-950"
                style={{ maxHeight: "92dvh", display: "flex", flexDirection: "column" }}
            >
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border shrink-0">
                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                        {isEdit ? "Edit Student Profile" : "Enroll New Student"}
                    </DialogTitle>
                    {isEdit && editTarget?.admissionNumber && (
                        <p className="text-xs text-purple-700 dark:text-purple-400 font-mono mt-0.5">
                            {editTarget.admissionNumber}
                        </p>
                    )}
                </DialogHeader>

                <Form {...form}>
                    <form id="admission-form" onSubmit={form.handleSubmit(onSubmit)}
                        className="flex flex-col flex-1 overflow-hidden">
                        <Tabs value={activeTab} onValueChange={setActiveTab}
                            className="flex flex-col flex-1 overflow-hidden">
                            <div className="mx-6 mt-6 mb-2 flex items-center justify-between border border-zinc-100 dark:border-zinc-800/80 p-4 rounded-2xl bg-zinc-50/50 dark:bg-zinc-900/20 shrink-0">
                                {TAB_ORDER.map((tab, idx) => {
                                    const isActive = tab === activeTab;
                                    const isCompleted = TAB_ORDER.indexOf(activeTab as any) > idx;
                                    return (
                                        <div key={tab} className="flex items-center flex-1 last:flex-initial">
                                            <div className="flex items-center gap-2">
                                                <div className={`h-6 w-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all duration-200
                                                    ${isCompleted
                                                        ? "bg-purple-600 text-white"
                                                        : isActive
                                                            ? "bg-purple-600 text-white ring-4 ring-purple-100 dark:ring-purple-950/50"
                                                            : "bg-zinc-100 dark:bg-zinc-900 text-zinc-400 dark:text-zinc-600"
                                                    }`}
                                                >
                                                    {isCompleted ? "✓" : idx + 1}
                                                </div>
                                                <span className={`text-xs font-semibold transition-colors duration-200
                                                    ${isActive ? "text-purple-900 dark:text-purple-300 font-bold" : "text-zinc-500"}
                                                `}>
                                                    {TAB_LABELS[tab]}
                                                </span>
                                            </div>
                                            {idx < TAB_ORDER.length - 1 && (
                                                <div className={`flex-1 h-[2px] mx-4 rounded transition-colors duration-200
                                                    ${isCompleted ? "bg-purple-600" : "bg-zinc-200 dark:bg-zinc-800"}
                                                `} />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>

                            <div className="flex-1 overflow-y-auto px-6 py-5">
                                {/* ── TAB 1: Account ── */}
                                <TabsContent value="account" className="mt-0 space-y-4">
                                    <p className={sectionHd}>Identity & Login</p>
                                    <PhotoPicker
                                        currentUrl={editTarget?.profilePhotoUrl ?? null}
                                        file={photoFile}
                                        onFile={setPhotoFile}
                                        error={photoError}
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        <FField control={form.control} name="firstName" label="First Name *">
                                            <Input placeholder="e.g. Ananya" className={inputCls} />
                                        </FField>
                                        <FField control={form.control} name="lastName" label="Last Name *">
                                            <Input placeholder="e.g. Sharma" className={inputCls} />
                                        </FField>
                                    </div>
                                    <FField control={form.control} name="email" label="Email Address *">
                                        <Input type="email" placeholder="student@school.edu" className={inputCls} />
                                    </FField>
                                    {!isEdit && (
                                        <FField control={form.control} name="password" label="Login Password *">
                                            <div className="relative">
                                                <Input type={showPassword ? "text" : "password"}
                                                    placeholder="Min. 8 characters"
                                                    className={`${inputCls} pr-10`} />
                                                <button type="button"
                                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setShowPassword(v => !v)}>
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </FField>
                                    )}
                                    <FField control={form.control} name="gender" label="Gender">
                                        <Select onValueChange={v => form.setValue("gender", v)} value={form.watch("gender") ?? ""}>
                                            <SelectTrigger className={inputCls}><SelectValue placeholder="Select…" /></SelectTrigger>
                                            <SelectContent>
                                                {["Male", "Female", "Other", "Prefer not to say"].map(g => (
                                                    <SelectItem key={g} value={g}>{g}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FField>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FField control={form.control} name="religion" label="Religion">
                                            <Select onValueChange={v => form.setValue("religion", v)} value={form.watch("religion") ?? ""}>
                                                <SelectTrigger className={inputCls}><SelectValue placeholder="Select…" /></SelectTrigger>
                                                <SelectContent>
                                                    {["Hindu", "Muslim", "Christian", "Sikh", "Jain", "Buddhist", "Other"].map(r => (
                                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FField>
                                        <FField control={form.control} name="caste" label="Caste / Category">
                                            <Select onValueChange={v => form.setValue("caste", v)} value={form.watch("caste") ?? ""}>
                                                <SelectTrigger className={inputCls}><SelectValue placeholder="Select…" /></SelectTrigger>
                                                <SelectContent>
                                                    {["General", "OBC", "SC", "ST", "EWS", "Other"].map(c => (
                                                        <SelectItem key={c} value={c}>{c}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FField>
                                    </div>
                                    <FField control={form.control} name="motherTongue" label="Mother Tongue">
                                        <Input placeholder="e.g. Hindi, English…" className={inputCls} />
                                    </FField>
                                </TabsContent>

                                {/* ── TAB 2: Academic ── */}
                                <TabsContent value="academic" className="mt-0 space-y-4">
                                    <p className={sectionHd}>Academic Placement</p>
                                    {isEdit && editTarget?.admissionNumber && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600/5 dark:bg-purple-500/10 border border-purple-100 dark:border-purple-500/20">
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-purple-900/50 dark:text-zinc-500">Admission No.</span>
                                            <span className="text-xs font-mono font-bold text-purple-800 dark:text-purple-300">{editTarget.admissionNumber}</span>
                                            <Badge variant="outline" className="ml-auto text-[9px] text-purple-600 border-purple-200 dark:border-purple-500/30">Auto-Generated</Badge>
                                        </div>
                                    )}
                                    {!isEdit && (
                                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-200 dark:border-amber-800/40">
                                            <span className="text-[11px] text-amber-700 dark:text-amber-400 font-semibold">
                                                Admission number will be auto-generated on save (ADM-{new Date().getFullYear()}-XXXX)
                                            </span>
                                        </div>
                                    )}
                                    <div className="grid grid-cols-2 gap-3">
                                        <FField control={form.control} name="rollNumber" label="Admission Number (Roll Number)">
                                            <Input placeholder="e.g. 22" className={inputCls} />
                                        </FField>
                                        <FormField
                                            control={form.control}
                                            name="dateOfBirth"
                                            render={({ field }) => (
                                                <FormItem>
                                                    <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Date of Birth</FormLabel>
                                                    <Popover modal={true} open={isDobOpen} onOpenChange={setIsDobOpen}>
                                                        <PopoverTrigger asChild>
                                                            <FormControl>
                                                                <Button
                                                                    type="button"
                                                                    variant={"outline"}
                                                                    className={cn(
                                                                        "w-full h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900/50 border-none justify-start text-left font-normal focus-visible:ring-1 focus-visible:ring-purple-500/50",
                                                                        !field.value && "text-muted-foreground"
                                                                    )}
                                                                >
                                                                    {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                                                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                                </Button>
                                                            </FormControl>
                                                        </PopoverTrigger>
                                                        <PopoverContent className="w-auto p-0" align="start">
                                                            <Calendar
                                                                mode="single"
                                                                selected={field.value ? new Date(field.value) : undefined}
                                                                onSelect={(date) => {
                                                                    if (date) {
                                                                        field.onChange(format(date, "yyyy-MM-dd"));
                                                                        setIsDobOpen(false);
                                                                    }
                                                                }}
                                                                disabled={(date) => date > new Date() || date < new Date("1900-01-01")}
                                                            />
                                                        </PopoverContent>
                                                    </Popover>
                                                    <FormMessage className="text-[11px]" />
                                                </FormItem>
                                            )}
                                        />
                                    </div>
                                    <FField control={form.control} name="classroomId" label="Assign to Classroom (optional)">
                                        <Select onValueChange={v => form.setValue("classroomId", v === "__none__" ? "" : v)}
                                            value={form.watch("classroomId") || "__none__"}>
                                            <SelectTrigger className={inputCls}><SelectValue placeholder="No classroom" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="__none__">— No classroom</SelectItem>
                                                {classrooms.map(c => (
                                                    <SelectItem key={c.id} value={c.id}>
                                                        {c.name} – {c.section} · {c.academicYear}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FField>
                                    <FField control={form.control} name="previousSchoolDetails" label="Previous School Details">
                                        <Textarea placeholder="School name, class completed, transfer reason…"
                                            className="bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50 rounded-lg resize-none min-h-[80px]" />
                                    </FField>
                                    <FField control={form.control} name="status" label="Student Status">
                                        <Select onValueChange={v => form.setValue("status", v as any)} value={form.watch("status") ?? "ACTIVE"}>
                                            <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                {["ACTIVE", "SUSPENDED", "GRADUATED", "TRANSFERRED"].map(s => (
                                                    <SelectItem key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </FField>
                                </TabsContent>

                                {/* ── TAB 3: Guardian ── */}
                                <TabsContent value="guardian" className="mt-0 space-y-4">
                                    <p className={sectionHd}>Guardian / Parent Contact</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FField control={form.control} name="guardianName" label="Guardian Name">
                                            <Input placeholder="e.g. Rajesh Sharma" className={inputCls} />
                                        </FField>
                                        <FField control={form.control} name="guardianRelationship" label="Relationship">
                                            <Select onValueChange={v => form.setValue("guardianRelationship", v)} value={form.watch("guardianRelationship") ?? ""}>
                                                <SelectTrigger className={inputCls}><SelectValue placeholder="Select…" /></SelectTrigger>
                                                <SelectContent>
                                                    {["Father", "Mother", "Guardian", "Sibling", "Other"].map(r => (
                                                        <SelectItem key={r} value={r}>{r}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FField>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FField control={form.control} name="guardianPhone" label="Phone Number">
                                            <Input placeholder="+91 98765 43210" className={inputCls} />
                                        </FField>
                                        <FField control={form.control} name="guardianEmail" label="Guardian Email">
                                            <Input type="email" placeholder="guardian@email.com" className={inputCls} />
                                        </FField>
                                    </div>
                                    <FField control={form.control} name="permanentAddress" label="Permanent Address">
                                        <Textarea placeholder="Full permanent address…"
                                            className="bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50 rounded-lg resize-none min-h-[70px]" />
                                    </FField>
                                    <FormField control={form.control} name="sameAddress"
                                        render={({ field }) => (
                                            <FormItem className="flex items-center gap-2 space-y-0">
                                                <FormControl>
                                                    <Checkbox checked={field.value ?? false} onCheckedChange={field.onChange}
                                                        className="data-[state=checked]:bg-purple-700 data-[state=checked]:border-purple-700" />
                                                </FormControl>
                                                <FormLabel className="text-xs font-semibold text-purple-900/70 dark:text-zinc-400 cursor-pointer">
                                                    Current address same as permanent
                                                </FormLabel>
                                            </FormItem>
                                        )}
                                    />
                                    <FField control={form.control} name="currentAddress" label="Current Address">
                                        <Textarea placeholder="Current / correspondence address…" disabled={sameAddress ?? false}
                                            className="bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50 rounded-lg resize-none min-h-[70px] disabled:opacity-60" />
                                    </FField>
                                </TabsContent>

                                {/* ── TAB 4: Logistics ── */}
                                <TabsContent value="logistics" className="mt-0 space-y-4">
                                    <p className={sectionHd}>Identification & Compliance</p>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FField control={form.control} name="governmentId" label="Government ID">
                                            <Input placeholder="Aadhaar / passport no." className={inputCls} />
                                        </FField>
                                        <FField control={form.control} name="bloodGroup" label="Blood Group">
                                            <Select onValueChange={v => form.setValue("bloodGroup", v)} value={form.watch("bloodGroup") ?? ""}>
                                                <SelectTrigger className={inputCls}><SelectValue placeholder="Select…" /></SelectTrigger>
                                                <SelectContent>
                                                    {["A+", "A−", "B+", "B−", "AB+", "AB−", "O+", "O−"].map(bg => (
                                                        <SelectItem key={bg} value={bg}>{bg}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </FField>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FField control={form.control} name="transportationMode" label="Transportation Mode">
                                            <Select onValueChange={v => form.setValue("transportationMode", v as any)} value={form.watch("transportationMode") ?? ""}>
                                                <SelectTrigger className={inputCls}><SelectValue placeholder="Select…" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="SCHOOL_BUS">School Bus</SelectItem>
                                                    <SelectItem value="PRIVATE_TRANSPORT">Private Transport</SelectItem>
                                                    <SelectItem value="WALKER">Walker</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FField>
                                        <FField control={form.control} name="feeQuota" label="Fee Quota">
                                            <Select onValueChange={v => form.setValue("feeQuota", v as any)} value={form.watch("feeQuota") ?? "REGULAR"}>
                                                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="REGULAR">Regular</SelectItem>
                                                    <SelectItem value="STAFF_CHILD">Staff Child</SelectItem>
                                                    <SelectItem value="SCHOLARSHIP_HALF">Scholarship (50%)</SelectItem>
                                                    <SelectItem value="SCHOLARSHIP_FULL">Scholarship (Full)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </FField>
                                    </div>
                                    <FField control={form.control} name="medicalNotes" label="Medical Notes">
                                        <Textarea placeholder="Allergies, conditions, medications or special needs…"
                                            className="bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50 rounded-lg resize-none min-h-[80px]" />
                                    </FField>

                                    <div className="pt-2">
                                        <p className={sectionHd}>Uploaded Documents</p>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                        <DocumentPicker 
                                            label="Transfer Certificate (TC)" 
                                            currentUrl={editTarget?.transferCertificateUrl ?? null} 
                                            file={tcFile} onFile={setTcFile} 
                                        />
                                        <DocumentPicker 
                                            label="Birth Certificate" 
                                            currentUrl={(editTarget as any)?.birthCertificateUrl ?? null} 
                                            file={birthCertFile} onFile={setBirthCertFile} 
                                        />
                                        <DocumentPicker 
                                            label="Aadhar / ID Proof" 
                                            currentUrl={(editTarget as any)?.nationalIdProofUrl ?? null} 
                                            file={idProofFile} onFile={setIdProofFile} 
                                        />
                                    </div>

                                    <div className="pt-2">
                                        <p className={sectionHd}>Bank Details (Required)</p>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FField control={form.control} name="bankAccountNumber" label="Account Number *">
                                            <Input placeholder="e.g. 1234567890" className={inputCls} />
                                        </FField>
                                        <FField control={form.control} name="bankIfscCode" label="IFSC Code *">
                                            <Input placeholder="e.g. HDFC0001234" className={inputCls} />
                                        </FField>
                                    </div>
                                    <div className="grid grid-cols-2 gap-3">
                                        <FField control={form.control} name="bankName" label="Bank Name *">
                                            <Input placeholder="e.g. HDFC Bank" className={inputCls} />
                                        </FField>
                                        <FField control={form.control} name="bankBranch" label="Branch *">
                                            <Input placeholder="e.g. MG Road, Bangalore" className={inputCls} />
                                        </FField>
                                    </div>
                                    <FField control={form.control} name="bankMicrNumber" label="MICR Number (Optional)">
                                        <Input placeholder="e.g. 110002034" className={inputCls} />
                                    </FField>
                                </TabsContent>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 bg-muted/40 dark:bg-purple-950/10 border-t border-border
                                            flex justify-between items-center gap-3 shrink-0">
                                <TabNavButtons active={activeTab} onNext={handleNext} onPrev={handlePrev} />
                                <div className="flex gap-2">
                                    <Button type="button" variant="outline"
                                        className="border-border/80 bg-background hover:bg-muted font-medium rounded-xl"
                                        onClick={() => onOpenChange(false)}>Cancel</Button>
                                    {activeTab === "logistics" && (
                                        <Button type="submit" form="admission-form"
                                            className="gap-2 h-10 px-6 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600
                                                       dark:hover:bg-purple-500 text-white rounded-xl font-semibold shadow-md">
                                            {form.formState.isSubmitting
                                                ? <Loader2 className="h-4 w-4 animate-spin" />
                                                : isEdit ? "Save Changes" : "Enroll Student"}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        </Tabs>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}

// ─── Helper components ────────────────────────────────────────────────────────
function TabNavButtons({
    active,
    onNext,
    onPrev,
}: {
    active: string;
    onNext: () => void;
    onPrev: () => void;
}) {
    const idx = TAB_ORDER.indexOf(active as typeof TAB_ORDER[number]);
    const prev = TAB_ORDER[idx - 1];
    const next = TAB_ORDER[idx + 1];
    return (
        <div className="flex gap-2">
            {prev && (
                <Button type="button" variant="outline" size="sm"
                    className="h-9 rounded-xl border-border/80 font-medium text-xs"
                    onClick={onPrev}>
                    ← {TAB_LABELS[prev]}
                </Button>
            )}
            {next && (
                <Button type="button" variant="outline" size="sm"
                    className="h-9 rounded-xl border-purple-200 dark:border-zinc-700 text-purple-700 dark:text-purple-400 font-semibold text-xs hover:bg-purple-600/5"
                    onClick={onNext}>
                    {TAB_LABELS[next]} →
                </Button>
            )}
        </div>
    );
}

function FField<T extends FieldValues, N extends FieldPath<T>>({
    control, name, label, children,
}: { control: Control<T>; name: N; label: string; children: React.ReactElement }) {
    return (
        <FormField control={control} name={name} render={({ field }) => (
            <FormItem>
                <FormLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {label}
                </FormLabel>
                <FormControl>
                    {(() => {
                        const child = children as React.ReactElement<Record<string, unknown>>;
                        return { ...child, props: { ...child.props, ...field } } as React.ReactElement;
                    })()}
                </FormControl>
                <FormMessage className="text-[11px]" />
            </FormItem>
        )} />
    );
}

function buildDefaults(s: Student | null): AdmissionFormValues {
    if (!s) return {
        firstName: "", lastName: "", email: "", password: "", gender: "",
        religion: "", caste: "", motherTongue: "",
        rollNumber: "", classroomId: "",
        dateOfBirth: "", previousSchoolDetails: "", status: "ACTIVE",
        guardianName: "", guardianRelationship: "", guardianPhone: "", guardianEmail: "",
        permanentAddress: "", currentAddress: "", sameAddress: false,
        governmentId: "", bloodGroup: "", transportationMode: undefined,
        feeQuota: "REGULAR", medicalNotes: "",
        bankAccountNumber: "", bankIfscCode: "", bankName: "", bankBranch: "", bankMicrNumber: "",
    };
    const currentClassroomId = s.classroomEnrollments?.[0]?.classroomId ?? "";
    const currentRollNumber = s.classroomEnrollments?.[0]?.rollNumber ?? "";
    return {
        firstName: s.account.firstName,
        lastName: s.account.lastName,
        email: s.account.email,
        password: "",
        gender: s.gender ?? "",
        religion: (s as any).religion ?? "",
        caste: (s as any).caste ?? "",
        motherTongue: (s as any).motherTongue ?? "",
        rollNumber: currentRollNumber,
        classroomId: currentClassroomId,
        dateOfBirth: s.dateOfBirth ?? "",
        previousSchoolDetails: s.previousSchoolDetails ?? "",
        status: s.status,
        guardianName: s.guardianName ?? "",
        guardianRelationship: s.guardianRelationship ?? "",
        guardianPhone: s.guardianPhone ?? "",
        guardianEmail: s.guardianEmail ?? "",
        permanentAddress: s.permanentAddress ?? "",
        currentAddress: s.currentAddress ?? "",
        sameAddress: false,
        governmentId: s.governmentId ?? "",
        bloodGroup: s.bloodGroup ?? "",
        transportationMode: s.transportationMode ?? undefined,
        feeQuota: s.feeQuota ?? "REGULAR",
        medicalNotes: s.medicalNotes ?? "",
        bankAccountNumber: (s as any).bankAccountNumber ?? "",
        bankIfscCode: (s as any).bankIfscCode ?? "",
        bankName: (s as any).bankName ?? "",
        bankBranch: (s as any).bankBranch ?? "",
        bankMicrNumber: (s as any).bankMicrNumber ?? "",
    };
}
