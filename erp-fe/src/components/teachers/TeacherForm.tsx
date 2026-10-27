import { useState, useRef, type ChangeEvent } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import {
    CalendarIcon, Eye, EyeOff, Plus, X, Loader2,
    User, Briefcase, Landmark, MapPin, UploadCloud, Check, ChevronRight, ChevronLeft, ShieldCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { useGet } from "@/hooks/useApi";
import CreateSubjectDialog from "@/components/shared/CreateSubjectDialog";

export const teacherSchema = z.object({
    // Account / Basic
    userId: z.string().optional().or(z.literal('')),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(8, "Minimum 8 characters are required").optional().or(z.literal('')),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
    dob: z.string().optional(),
    phone: z.string().refine(val => !val || /^[0-9+\-\s()]{7,20}$/.test(val), "Valid phone number required").optional(),
    isActive: z.boolean().optional(),

    // Professional
    employeeNumber: z.string().optional(),
    teacherId: z.string().optional(),
    department: z.string().optional(),
    designation: z.string().optional(),
    employmentType: z.enum(['part_time', 'full_time', 'double_shift', 'casual', 'hourly']).optional(),
    qualification: z.string().optional(),
    joiningDate: z.string().optional(),
    dailyWorkingHours: z.string().optional(),
    salaryType: z.enum(['fixed_monthly', 'hourly']).optional(),
    fixedMonthlySalary: z.string().optional(),
    hourlyRate: z.string().optional(),
    casualLeaveBalance: z.string().optional(),
    sickLeaveBalance: z.string().optional(),

    // Identity
    aadhaarNo: z.string().refine(val => !val || /^\d{12}$/.test(val), "Aadhaar must be 12 digits").optional(),
    panNo: z.string().refine(val => !val || /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i.test(val), "PAN format: ABCDE1234F").optional(),

    // Bank
    accountHolderName: z.string().optional(),
    bankName: z.string().optional(),
    accountNumber: z.string().optional(),
    ifscCode: z.string().refine(val => !val || /^[A-Z]{4}0[A-Z0-9]{6}$/i.test(val), "Invalid IFSC format (e.g. SBIN0001234)").optional(),
    bankBranch: z.string().optional(),

    // Contact & Address
    currentAddress: z.string().optional(),
    permanentAddress: z.string().optional(),
    emergencyContactName: z.string().optional(),
    emergencyContactPhone: z.string().refine(val => !val || /^[0-9+\-\s()]{7,20}$/.test(val), "Valid emergency phone required").optional(),
});

export type TeacherFormValues = z.infer<typeof teacherSchema>;

interface SubjectItem {
    id: string;
    name: string;
    code: string;
}

interface TeacherFormProps {
    initialData?: Partial<TeacherFormValues> & { profilePhotoUrl?: string };
    initialSubjects?: string[];
    isEditMode?: boolean;
    onSubmit: (values: TeacherFormValues, subjects: string[], photoFile?: File) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

type StepKey = "basic" | "professional" | "identity" | "contact";

interface StepConfig {
    id: StepKey;
    title: string;
    shortLabel: string;
    description: string;
    icon: typeof User;
    fields: (keyof TeacherFormValues)[];
}

const STEPS: StepConfig[] = [
    {
        id: "basic",
        title: "Basic & Account",
        shortLabel: "Basic Info",
        description: "Credentials, legal names, and contact basics",
        icon: User,
        fields: ["firstName", "lastName", "email", "password", "phone", "gender", "dob"]
    },
    {
        id: "professional",
        title: "Professional & Academic",
        shortLabel: "Professional",
        description: "Designation, role, subjects, and remuneration",
        icon: Briefcase,
        fields: ["designation", "employmentType", "qualification", "joiningDate", "salaryType", "fixedMonthlySalary", "dailyWorkingHours"]
    },
    {
        id: "identity",
        title: "Identity & Banking",
        shortLabel: "Identity & Bank",
        description: "Aadhaar, PAN, and salary disbursement account",
        icon: Landmark,
        fields: ["aadhaarNo", "panNo", "accountHolderName", "bankName", "accountNumber", "ifscCode", "bankBranch"]
    },
    {
        id: "contact",
        title: "Address & Emergency",
        shortLabel: "Contact & Address",
        description: "Residential addresses and emergency contact",
        icon: MapPin,
        fields: ["currentAddress", "permanentAddress", "emergencyContactName", "emergencyContactPhone"]
    }
];

export function TeacherForm({
    initialData,
    initialSubjects = [],
    isEditMode = false,
    onSubmit,
    onCancel,
    isSubmitting = false
}: TeacherFormProps) {
    const [currentStepIndex, setCurrentStepIndex] = useState<number>(0);
    const [showPw, setShowPw] = useState(false);
    const [isJoiningDateOpen, setIsJoiningDateOpen] = useState(false);
    const [isDobOpen, setIsDobOpen] = useState(false);
    const [subjects, setSubjects] = useState<string[]>(initialSubjects);
    const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false);

    // Track completed steps for checkmark indicators
    const [completedSteps, setCompletedSteps] = useState<Record<number, boolean>>({});

    // Photo preview
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [selectedPhoto, setSelectedPhoto] = useState<File | undefined>();
    const [photoPreview, setPhotoPreview] = useState<string | undefined>(
        initialData?.profilePhotoUrl ? (initialData.profilePhotoUrl.startsWith('http') ? initialData.profilePhotoUrl : `${api.defaults.baseURL?.replace('/api', '')}${initialData.profilePhotoUrl}`) : undefined
    );

    const { data: subjectsData, refetch: fetchSubjects } = useGet<{ subjects: SubjectItem[] }>(["subjects"], "/subjects");
    const allSubjects = subjectsData?.subjects || [];

    const form = useForm<TeacherFormValues, unknown, TeacherFormValues>({
        resolver: zodResolver(teacherSchema),
        mode: "onTouched",
        defaultValues: {
            userId: initialData?.userId || "",
            email: initialData?.email || "",
            password: initialData?.password || "",
            firstName: initialData?.firstName || "",
            lastName: initialData?.lastName || "",
            gender: initialData?.gender || undefined,
            dob: initialData?.dob || "",
            phone: initialData?.phone || "",
            isActive: initialData?.isActive !== undefined ? initialData.isActive : true,

            employeeNumber: initialData?.employeeNumber || "",
            teacherId: initialData?.teacherId || "",
            department: initialData?.department || "",
            designation: initialData?.designation || "",
            employmentType: initialData?.employmentType || "full_time",
            qualification: initialData?.qualification || "",
            joiningDate: initialData?.joiningDate || "",
            dailyWorkingHours: initialData?.dailyWorkingHours !== undefined ? String(initialData.dailyWorkingHours) : "8",
            salaryType: initialData?.salaryType || "fixed_monthly",
            fixedMonthlySalary: initialData?.fixedMonthlySalary !== undefined ? String(initialData.fixedMonthlySalary) : "",
            hourlyRate: initialData?.hourlyRate !== undefined ? String(initialData.hourlyRate) : "",
            casualLeaveBalance: initialData?.casualLeaveBalance !== undefined ? String(initialData.casualLeaveBalance) : "12",
            sickLeaveBalance: initialData?.sickLeaveBalance !== undefined ? String(initialData.sickLeaveBalance) : "10",

            aadhaarNo: initialData?.aadhaarNo || "",
            panNo: initialData?.panNo || "",

            accountHolderName: initialData?.accountHolderName || "",
            bankName: initialData?.bankName || "",
            accountNumber: initialData?.accountNumber || "",
            ifscCode: initialData?.ifscCode || "",
            bankBranch: initialData?.bankBranch || "",

            currentAddress: initialData?.currentAddress || "",
            permanentAddress: initialData?.permanentAddress || "",
            emergencyContactName: initialData?.emergencyContactName || "",
            emergencyContactPhone: initialData?.emergencyContactPhone || "",
        },
    });

    const handlePhotoSelect = (e: ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedPhoto(file);
            setPhotoPreview(URL.createObjectURL(file));
        }
    };

    const inputCls = "h-9 bg-zinc-100 dark:bg-zinc-900/50 border border-border/50 focus-visible:ring-1 focus-visible:ring-purple-500/50";
    const labelCls = "text-[11px] font-semibold tracking-wide text-foreground/80";

    const validateStep = async (stepIdx: number): Promise<boolean> => {
        const stepFields = STEPS[stepIdx].fields;
        // In edit mode, password is optional
        const fieldsToValidate = stepFields.filter(f => {
            if (isEditMode && f === "password") return false;
            return true;
        });

        const isValid = await form.trigger(fieldsToValidate);
        if (isValid) {
            setCompletedSteps(prev => ({ ...prev, [stepIdx]: true }));
        }
        return isValid;
    };

    const handleNext = async () => {
        const isCurrentStepValid = await validateStep(currentStepIndex);
        if (isCurrentStepValid && currentStepIndex < STEPS.length - 1) {
            setCurrentStepIndex(prev => prev + 1);
        }
    };

    const handleBack = () => {
        if (currentStepIndex > 0) {
            setCurrentStepIndex(prev => prev - 1);
        }
    };

    const handleStepClick = async (targetIdx: number) => {
        if (targetIdx === currentStepIndex) return;

        // If navigating forward, must validate all intermediate steps
        if (targetIdx > currentStepIndex) {
            for (let i = currentStepIndex; i < targetIdx; i++) {
                const ok = await validateStep(i);
                if (!ok) {
                    setCurrentStepIndex(i);
                    return;
                }
            }
        }
        setCurrentStepIndex(targetIdx);
    };

    const handleSubmit = (values: TeacherFormValues) => {
        const cleanedValues = { ...values };
        if (cleanedValues.department === "none") cleanedValues.department = "";
        if (cleanedValues.designation === "none") cleanedValues.designation = "";
        if (!cleanedValues.joiningDate) delete cleanedValues.joiningDate;
        if (!cleanedValues.dob) delete cleanedValues.dob;

        if (cleanedValues.panNo) cleanedValues.panNo = cleanedValues.panNo.toUpperCase();
        if (cleanedValues.ifscCode) cleanedValues.ifscCode = cleanedValues.ifscCode.toUpperCase();

        onSubmit(cleanedValues, subjects, selectedPhoto);
    };

    const activeStep = STEPS[currentStepIndex];

    return (
        <div className="flex flex-col h-[78vh] max-h-[800px] bg-background dark:bg-zinc-950 overflow-hidden">
            {/* Header Identity Badge (Fixed Top) */}
            <div className="px-6 py-4 bg-gradient-to-r from-purple-500/10 via-indigo-500/5 to-transparent border-b border-border/60 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3.5">
                    <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                        <Avatar className="h-12 w-12 rounded-xl ring-2 ring-purple-500/30 shadow-sm border border-border">
                            <AvatarImage src={photoPreview} className="object-cover" />
                            <AvatarFallback className="rounded-xl bg-purple-600/15 text-purple-700 dark:text-purple-300 font-bold text-sm">
                                {form.watch('firstName')?.[0] || 'T'}{form.watch('lastName')?.[0] || ''}
                            </AvatarFallback>
                        </Avatar>
                        <div className="absolute inset-0 bg-black/40 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <UploadCloud className="h-4 w-4" />
                        </div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/png,image/jpeg,image/jpg"
                            className="hidden"
                            onChange={handlePhotoSelect}
                        />
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-base font-bold text-foreground">
                                {form.watch('firstName') ? `${form.watch('firstName')} ${form.watch('lastName')}` : (isEditMode ? 'Edit Faculty Profile' : 'New Faculty Onboarding')}
                            </h2>
                            <Badge variant="outline" className="text-[10px] uppercase font-semibold text-purple-600 border-purple-500/30 bg-purple-500/10">
                                {isEditMode ? 'Active Teacher' : 'Auto ID Generated'}
                            </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {isEditMode ? (form.watch('employeeNumber') || 'Faculty Profile') : 'Step-by-step onboarding wizard with instant validation'}
                        </p>
                    </div>
                </div>

                <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-xs text-purple-600 dark:text-purple-400 font-medium hover:bg-purple-500/10"
                    onClick={() => fileInputRef.current?.click()}
                >
                    <UploadCloud className="h-3.5 w-3.5 mr-1.5" />
                    {photoPreview ? 'Change Photo' : 'Upload Photo'}
                </Button>
            </div>

            {/* Stepper Navigation Header (Fixed Top) */}
            <div className="px-6 py-3 border-b border-border/60 bg-muted/20 shrink-0">
                <nav aria-label="Faculty Enrolment Progress" className="flex items-center justify-between w-full">
                    {STEPS.map((step, idx) => {
                        const isCurrent = idx === currentStepIndex;
                        const isCompleted = completedSteps[idx] || (isEditMode && idx < currentStepIndex);
                        const StepIcon = step.icon;

                        return (
                            <div key={step.id} className="flex items-center flex-1 last:flex-none">
                                <button
                                    type="button"
                                    onClick={() => handleStepClick(idx)}
                                    className={cn(
                                        "group flex items-center gap-2.5 text-left focus:outline-none transition-all rounded-lg p-1.5",
                                        isCurrent && "font-semibold text-purple-600 dark:text-purple-400",
                                        !isCurrent && isCompleted && "text-foreground/90 hover:text-purple-600",
                                        !isCurrent && !isCompleted && "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <div
                                        className={cn(
                                            "h-7 w-7 rounded-lg flex items-center justify-center text-xs font-bold transition-all border",
                                            isCurrent && "bg-purple-600 text-white border-purple-600 shadow-sm shadow-purple-500/25",
                                            !isCurrent && isCompleted && "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
                                            !isCurrent && !isCompleted && "bg-muted/80 text-muted-foreground border-border"
                                        )}
                                    >
                                        {isCompleted && !isCurrent ? (
                                            <Check className="h-4 w-4 stroke-[2.5]" />
                                        ) : (
                                            <StepIcon className="h-3.5 w-3.5" />
                                        )}
                                    </div>
                                    <div className="hidden sm:block">
                                        <p className="text-[10px] uppercase font-bold text-muted-foreground leading-none">
                                            Step {idx + 1}
                                        </p>
                                        <p className={cn("text-xs font-medium leading-tight mt-0.5", isCurrent ? "text-purple-600 dark:text-purple-400 font-semibold" : "text-foreground")}>
                                            {step.shortLabel}
                                        </p>
                                    </div>
                                </button>

                                {idx < STEPS.length - 1 && (
                                    <div className="flex-1 mx-3 hidden sm:block">
                                        <div
                                            className={cn(
                                                "h-0.5 w-full rounded-full transition-colors",
                                                idx < currentStepIndex ? "bg-purple-600 dark:bg-purple-400" : "bg-border"
                                            )}
                                        />
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </nav>
            </div>

            {/* Form body */}
            <Form {...form}>
                <form id="teacher-form" onSubmit={form.handleSubmit(handleSubmit)} className="flex-1 min-h-0 flex flex-col overflow-hidden">
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-6">
                        {/* Step Title & Subtitle banner */}
                        <div className="flex items-center justify-between pb-3 border-b border-border/50">
                            <div>
                                <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                                    <span>{activeStep.title}</span>
                                    <Badge variant="secondary" className="text-[10px] font-medium bg-purple-500/10 text-purple-700 dark:text-purple-300 border-none">
                                        Step {currentStepIndex + 1} of {STEPS.length}
                                    </Badge>
                                </h3>
                                <p className="text-xs text-muted-foreground mt-0.5">{activeStep.description}</p>
                            </div>
                        </div>

                        {/* STEP 1: BASIC & LOGIN */}
                        {currentStepIndex === 0 && (
                            <div className="space-y-5 animate-in fade-in-50 duration-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="firstName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>First Name *</FormLabel>
                                            <FormControl><Input placeholder="e.g. Rahul" className={inputCls} {...field} /></FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="lastName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Last Name *</FormLabel>
                                            <FormControl><Input placeholder="e.g. Sharma" className={inputCls} {...field} /></FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Email Address *</FormLabel>
                                            <FormControl><Input type="email" placeholder="e.g. rahul.sharma@school.edu" disabled={isEditMode} className={inputCls} {...field} /></FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Mobile Number</FormLabel>
                                            <FormControl><Input placeholder="e.g. 9876543210" className={inputCls} {...field} /></FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="gender" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Gender</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className={inputCls}><SelectValue placeholder="Select gender" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MALE">Male</SelectItem>
                                                    <SelectItem value="FEMALE">Female</SelectItem>
                                                    <SelectItem value="OTHER">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="dob" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className={labelCls} style={{ marginBottom: '6px' }}>Date of Birth</FormLabel>
                                            <Popover modal={true} open={isDobOpen} onOpenChange={setIsDobOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn("w-full h-9 pl-3 text-left font-normal border border-border/50 bg-zinc-100 dark:bg-zinc-900/50", !field.value && "text-muted-foreground")}
                                                        >
                                                            {field.value && !isNaN(new Date(field.value).getTime()) ? format(new Date(field.value), "PP") : <span>Pick DOB</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value ? new Date(field.value) : undefined}
                                                        onSelect={(d) => {
                                                            if (d) {
                                                                field.onChange(format(d, "yyyy-MM-dd"));
                                                                setIsDobOpen(false);
                                                            }
                                                        }}
                                                        disabled={(d) => d > new Date() || d < new Date("1940-01-01")}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="password" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Password {isEditMode ? "(Keep current)" : "*"}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type={showPw ? "text" : "password"} placeholder="••••••••" className={`${inputCls} pr-9`} {...field} />
                                                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                        {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        )}

                        {/* STEP 2: PROFESSIONAL */}
                        {currentStepIndex === 1 && (
                            <div className="space-y-5 animate-in fade-in-50 duration-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="designation" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Designation</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                <FormControl><SelectTrigger className={inputCls}><SelectValue placeholder="Select designation" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="none">-- No Designation --</SelectItem>
                                                    <SelectItem value="CLASS_TEACHER">Class Teacher</SelectItem>
                                                    <SelectItem value="SUBJECT_TEACHER">Subject Teacher</SelectItem>
                                                    <SelectItem value="HEAD_OF_DEPARTMENT">Incharge (Head of Department)</SelectItem>
                                                    <SelectItem value="ASSISTANT_TEACHER">Assistant Teacher</SelectItem>
                                                    <SelectItem value="LAB_ASSISTANT">Lab Assistant</SelectItem>
                                                    <SelectItem value="SPECIAL_EDUCATOR">Special Educator</SelectItem>
                                                    <SelectItem value="PHYSICAL_EDUCATION_TEACHER">Physical Education Teacher</SelectItem>
                                                    <SelectItem value="SUBSTITUTE_TEACHER">Substitute Teacher</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="employmentType" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Employment Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value || 'full_time'}>
                                                <FormControl><SelectTrigger className={inputCls}><SelectValue placeholder="Employment Type" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="full_time">Full Time</SelectItem>
                                                    <SelectItem value="part_time">Part Time</SelectItem>
                                                    <SelectItem value="double_shift">Double Shift</SelectItem>
                                                    <SelectItem value="casual">Casual</SelectItem>
                                                    <SelectItem value="hourly">Hourly Contract</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="qualification" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Highest Qualification</FormLabel>
                                            <FormControl><Input placeholder="e.g. M.Sc. Mathematics, B.Ed." className={inputCls} {...field} /></FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="joiningDate" render={({ field }) => (
                                        <FormItem className="flex flex-col">
                                            <FormLabel className={labelCls} style={{ marginBottom: '6px' }}>Date of Joining</FormLabel>
                                            <Popover modal={true} open={isJoiningDateOpen} onOpenChange={setIsJoiningDateOpen}>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            type="button"
                                                            variant="outline"
                                                            className={cn("w-full h-9 pl-3 text-left font-normal border border-border/50 bg-zinc-100 dark:bg-zinc-900/50", !field.value && "text-muted-foreground")}
                                                        >
                                                            {field.value && !isNaN(new Date(field.value).getTime()) ? format(new Date(field.value), "PPP") : <span>Pick joining date</span>}
                                                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value) : undefined}
                                                        onSelect={(d) => {
                                                            field.onChange(d ? format(d, "yyyy-MM-dd") : "");
                                                            setIsJoiningDateOpen(false);
                                                        }}
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                </div>

                                {/* Subjects Multi-selector */}
                                <div className="space-y-2">
                                    <p className={labelCls}>Allocated Subjects</p>
                                    <div className="flex gap-2">
                                        <Select
                                            value=""
                                            onValueChange={val => {
                                                if (val && !subjects.includes(val)) {
                                                    setSubjects([...subjects, val]);
                                                }
                                            }}
                                        >
                                            <SelectTrigger className="h-9 bg-zinc-100 dark:bg-zinc-900/50 border border-border/50 flex-1">
                                                <SelectValue placeholder="Add subjects..." />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {allSubjects.filter(s => !subjects.includes(s.name)).map(s => (
                                                    <SelectItem key={s.id} value={s.name}>
                                                        {s.name} ({s.code})
                                                    </SelectItem>
                                                ))}
                                                {allSubjects.length === 0 && (
                                                    <div className="p-2 text-xs text-muted-foreground text-center">No subjects found</div>
                                                )}
                                            </SelectContent>
                                        </Select>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 shrink-0"
                                            onClick={() => setIsCreateSubjectOpen(true)}
                                            title="Create Subject"
                                        >
                                            <Plus className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    {subjects.length > 0 && (
                                        <div className="flex flex-wrap gap-1.5 pt-1">
                                            {subjects.map(s => (
                                                <Badge key={s} variant="secondary" className="text-xs bg-purple-500/10 text-purple-700 dark:text-purple-300 border-none gap-1 pr-1.5 py-1">
                                                    {s}
                                                    <button type="button" onClick={() => setSubjects(subjects.filter(x => x !== s))} className="ml-1 hover:bg-black/10 rounded-full p-0.5">
                                                        <X className="h-3 w-3" />
                                                    </button>
                                                </Badge>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Compensation details */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-border/40">
                                    <FormField control={form.control} name="salaryType" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Salary Type</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value || 'fixed_monthly'}>
                                                <FormControl><SelectTrigger className={inputCls}><SelectValue placeholder="Salary Type" /></SelectTrigger></FormControl>
                                                <SelectContent>
                                                    <SelectItem value="fixed_monthly">Fixed Monthly</SelectItem>
                                                    <SelectItem value="hourly">Hourly Rate</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="fixedMonthlySalary" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Monthly Salary (₹)</FormLabel>
                                            <FormControl><Input type="number" placeholder="e.g. 45000" className={inputCls} {...field} /></FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="dailyWorkingHours" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Working Hours / Day</FormLabel>
                                            <FormControl><Input type="number" step="0.5" placeholder="8.0" className={inputCls} {...field} /></FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                </div>
                            </div>
                        )}

                        {/* STEP 3: IDENTITY & BANK */}
                        {currentStepIndex === 2 && (
                            <div className="space-y-6 animate-in fade-in-50 duration-200">
                                <div className="space-y-4">
                                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <ShieldCheck className="h-4 w-4 text-purple-600" /> Government Identity Verification
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="aadhaarNo" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={labelCls}>Aadhaar Card Number</FormLabel>
                                                <FormControl><Input placeholder="12-digit number (e.g. 123456789012)" maxLength={12} className={inputCls} {...field} /></FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="panNo" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={labelCls}>PAN Number</FormLabel>
                                                <FormControl><Input placeholder="e.g. ABCDE1234F" maxLength={10} className={`${inputCls} uppercase`} {...field} /></FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-3 border-t border-border/40">
                                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider flex items-center gap-1.5">
                                        <Landmark className="h-4 w-4 text-purple-600" /> Salary Account & Banking
                                    </h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="accountHolderName" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={labelCls}>Account Holder Name</FormLabel>
                                                <FormControl><Input placeholder="As per bank record" className={inputCls} {...field} /></FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="bankName" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={labelCls}>Bank Name</FormLabel>
                                                <FormControl><Input placeholder="e.g. State Bank of India, HDFC" className={inputCls} {...field} /></FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )} />
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                        <FormField control={form.control} name="accountNumber" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={labelCls}>Bank Account Number</FormLabel>
                                                <FormControl><Input placeholder="Account number" className={inputCls} {...field} /></FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="ifscCode" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={labelCls}>IFSC Code</FormLabel>
                                                <FormControl><Input placeholder="e.g. SBIN0001234" maxLength={11} className={`${inputCls} uppercase font-mono`} {...field} /></FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="bankBranch" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={labelCls}>Branch Name</FormLabel>
                                                <FormControl><Input placeholder="Branch name/city" className={inputCls} {...field} /></FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* STEP 4: CONTACT & ADDRESS */}
                        {currentStepIndex === 3 && (
                            <div className="space-y-6 animate-in fade-in-50 duration-200">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    <FormField control={form.control} name="currentAddress" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Current Residential Address</FormLabel>
                                            <FormControl><Textarea placeholder="Flat/House, Street, Area, City, PIN" className="bg-zinc-100 dark:bg-zinc-900/50 border border-border/50 min-h-[75px]" {...field} /></FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control} name="permanentAddress" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>Permanent Address</FormLabel>
                                            <FormControl><Textarea placeholder="Permanent address / hometown" className="bg-zinc-100 dark:bg-zinc-900/50 border border-border/50 min-h-[75px]" {...field} /></FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                </div>

                                <div className="space-y-4 pt-3 border-t border-border/40">
                                    <h4 className="text-xs font-semibold text-foreground uppercase tracking-wider">Emergency Contact Person</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <FormField control={form.control} name="emergencyContactName" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={labelCls}>Emergency Contact Name</FormLabel>
                                                <FormControl><Input placeholder="e.g. Spouse, Parent, Relative" className={inputCls} {...field} /></FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )} />
                                        <FormField control={form.control} name="emergencyContactPhone" render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className={labelCls}>Emergency Contact Phone</FormLabel>
                                                <FormControl><Input placeholder="Emergency Phone Number" className={inputCls} {...field} /></FormControl>
                                                <FormMessage className="text-[11px]" />
                                            </FormItem>
                                        )} />
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </form>
            </Form>

            {/* Footer with Stepper Controls */}
            <div className="px-6 py-4 bg-muted/30 dark:bg-zinc-900/40 border-t border-border flex items-center justify-between shrink-0">
                <div>
                    {currentStepIndex > 0 ? (
                        <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="text-xs font-medium gap-1.5 border-border/70"
                            onClick={handleBack}
                        >
                            <ChevronLeft className="h-4 w-4" /> Back
                        </Button>
                    ) : (
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="text-xs font-medium text-muted-foreground"
                            onClick={onCancel}
                        >
                            Cancel
                        </Button>
                    )}
                </div>

                <div className="flex items-center gap-2.5">
                    {currentStepIndex < STEPS.length - 1 ? (
                        <Button
                            type="button"
                            size="sm"
                            className="rounded-xl bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-semibold gap-1.5 text-xs px-4"
                            onClick={handleNext}
                        >
                            Next <ChevronRight className="h-4 w-4" />
                        </Button>
                    ) : (
                        <Button
                            type="submit"
                            form="teacher-form"
                            size="sm"
                            disabled={isSubmitting}
                            className="rounded-xl bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-semibold gap-2 text-xs px-5 shadow-sm shadow-purple-500/25"
                        >
                            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                            {isEditMode ? "Save Changes" : "Complete Enrolment"}
                        </Button>
                    )}
                </div>
            </div>

            {isCreateSubjectOpen && (
                <CreateSubjectDialog
                    open={isCreateSubjectOpen}
                    onOpenChange={setIsCreateSubjectOpen}
                    onSuccess={(newSubject) => {
                        fetchSubjects();
                        if (!subjects.includes(newSubject)) {
                            setSubjects([...subjects, newSubject]);
                        }
                        setIsCreateSubjectOpen(false);
                    }}
                />
            )}
        </div>
    );
}

