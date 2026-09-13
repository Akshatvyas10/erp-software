import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { format } from "date-fns";
import { CalendarIcon, Eye, EyeOff, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { useGet } from "@/hooks/useApi";
import CreateSubjectDialog from "@/components/shared/CreateSubjectDialog";

export const teacherSchema = z.object({
    userId: z.string().optional().or(z.literal('')),
    email: z.string().min(1, "Email is required").email("Invalid email address"),
    password: z.string().min(8, "Minimum 8 characters are required").optional().or(z.literal('')),
    firstName: z.string().min(1, "First name is required"),
    lastName: z.string().min(1, "Last name is required"),
    employeeNumber: z.string().optional(),
    department: z.string().optional(),
    designation: z.string().optional(),
    qualification: z.string().optional(),
    joiningDate: z.string().optional(),
    phone: z.string().refine(val => !val || /^\d{10}$/.test(val), "Phone number must be exactly 10 digits").optional(),
});

export type TeacherFormValues = z.infer<typeof teacherSchema>;

interface TeacherFormProps {
    initialData?: Partial<TeacherFormValues>;
    initialSubjects?: string[];
    isEditMode?: boolean;
    onSubmit: (values: TeacherFormValues, subjects: string[]) => void;
    onCancel: () => void;
    isSubmitting?: boolean;
}

export function TeacherForm({
    initialData,
    initialSubjects = [],
    isEditMode = false,
    onSubmit,
    onCancel,
    isSubmitting = false
}: TeacherFormProps) {
    const [showPw, setShowPw] = useState(false);
    const [isJoiningDateOpen, setIsJoiningDateOpen] = useState(false);
    const [subjects, setSubjects] = useState<string[]>(initialSubjects);
    const [isCreateSubjectOpen, setIsCreateSubjectOpen] = useState(false);

    const { data: deptsData } = useGet(["departments"], "/departments");
    const departments = deptsData?.departments || [];

    const { data: subjectsData, refetch: fetchSubjects } = useGet(["subjects"], "/subjects");
    const allSubjects = subjectsData?.subjects || [];

    const form = useForm<TeacherFormValues>({
        resolver: zodResolver(teacherSchema),
        mode: "onTouched",
        defaultValues: initialData || {
            userId: "", email: "", password: "", firstName: "", lastName: "",
            employeeNumber: "", department: "", designation: "", qualification: "",
            joiningDate: "", phone: "",
        },
    });

    const inputCls = "h-9 bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50";
    const labelCls = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground";

    const handleSubmit = (values: TeacherFormValues) => {
        const cleanedValues = { ...values };
        if (cleanedValues.department === "none") cleanedValues.department = "";
        if (cleanedValues.designation === "none") cleanedValues.designation = "";
        if (!cleanedValues.joiningDate) delete cleanedValues.joiningDate;
        
        onSubmit(cleanedValues, subjects);
    };

    return (
        <div className="flex flex-col h-full bg-background dark:bg-zinc-950">
            <div className="flex-1 overflow-y-auto max-h-[60vh] custom-scrollbar p-6 space-y-6">
                <Form {...form}>
                    <form id="teacher-form" onSubmit={form.handleSubmit(handleSubmit)} className="space-y-6">

                        {/* Login Section */}
                        <div className="space-y-4">
                            <h3 className="text-xs font-semibold text-[#7f39c2] tracking-wide uppercase flex items-center gap-2">
                                <span className="h-4 w-1 rounded-full bg-[#7f39c2]"></span> Login Account
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="firstName" render={({ field }) => (
                                    <FormItem><FormLabel className={labelCls}>First Name *</FormLabel><FormControl><Input placeholder="e.g. John" className={inputCls} {...field} /></FormControl><FormMessage className="text-[11px]" /></FormItem>
                                )} />
                                <FormField control={form.control} name="lastName" render={({ field }) => (
                                    <FormItem><FormLabel className={labelCls}>Last Name *</FormLabel><FormControl><Input placeholder="e.g. Doe" className={inputCls} {...field} /></FormControl><FormMessage className="text-[11px]" /></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {isEditMode && (
                                    <FormField control={form.control} name="userId" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className={labelCls}>ERP User ID</FormLabel>
                                            <FormControl>
                                                <Input disabled={true} className={`${inputCls} font-mono`} {...field} value={field.value || ""} />
                                            </FormControl>
                                            <FormMessage className="text-[11px]" />
                                        </FormItem>
                                    )} />
                                )}
                                <FormField control={form.control} name="email" render={({ field }) => (
                                    <FormItem><FormLabel className={labelCls}>Email *</FormLabel><FormControl><Input type="email" placeholder="e.g. john.doe@example.com" disabled={isEditMode} className={inputCls} {...field} /></FormControl><FormMessage className="text-[11px]" /></FormItem>
                                )} />
                            </div>
                            <FormField control={form.control} name="password" render={({ field }) => (
                                <FormItem>
                                    <FormLabel className={labelCls}>Password {isEditMode ? "(Leave empty to keep current)" : "*"}</FormLabel>
                                    <FormControl>
                                        <div className="relative">
                                            <Input type={showPw ? "text" : "password"} placeholder="••••••••" className={`${inputCls} pr-10`} {...field} />
                                            <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                                                {showPw ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                            </button>
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )} />
                        </div>

                        {/* Profile Section */}
                        <div className="space-y-4 pt-4 border-t border-border/60">
                            <h3 className="text-xs font-semibold text-[#7f39c2] tracking-wide uppercase flex items-center gap-2">
                                <span className="h-4 w-1 rounded-full bg-[#7f39c2]"></span> Teacher Profile
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                {isEditMode && (
                                    <FormField control={form.control} name="employeeNumber" render={({ field }) => (
                                        <FormItem><FormLabel className={labelCls}>Employee Number</FormLabel><FormControl><Input className={inputCls} {...field} value={field.value || ""} /></FormControl><FormMessage className="text-[11px]" /></FormItem>
                                    )} />
                                )}
                                <FormField control={form.control} name="department" render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className={labelCls}>Department</FormLabel>
                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                            <FormControl><SelectTrigger className={inputCls}><SelectValue placeholder="Select department" /></SelectTrigger></FormControl>
                                            <SelectContent>
                                                <SelectItem value="none">-- No Department --</SelectItem>
                                                {departments.map((dept: any) => <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />
                            </div>
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
                                                <SelectItem value="HEAD_OF_DEPARTMENT">Head of Department</SelectItem>
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
                                <FormField control={form.control} name="phone" render={({ field }) => (
                                    <FormItem><FormLabel className={labelCls}>Phone</FormLabel><FormControl><Input placeholder="e.g. +91 9876543210" className={inputCls} {...field} /></FormControl><FormMessage className="text-[11px]" /></FormItem>
                                )} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <FormField control={form.control} name="qualification" render={({ field }) => (
                                    <FormItem><FormLabel className={labelCls}>Qualification</FormLabel><FormControl><Input placeholder="e.g. Ph.D. in Computer Science" className={inputCls} {...field} /></FormControl><FormMessage className="text-[11px]" /></FormItem>
                                )} />
                                <FormField control={form.control} name="joiningDate" render={({ field }) => (
                                    <FormItem className="flex flex-col">
                                        <FormLabel className={labelCls} style={{ marginBottom: '6px' }}>Joining Date</FormLabel>
                                        <Popover modal={true} open={isJoiningDateOpen} onOpenChange={setIsJoiningDateOpen}>
                                            <PopoverTrigger asChild>
                                                <FormControl>
                                                    <Button
                                                        type="button"
                                                        variant={"outline"}
                                                        className={cn(
                                                            "w-full h-9 pl-3 text-left font-normal border-none bg-zinc-100 dark:bg-zinc-900/50",
                                                            !field.value && "text-muted-foreground"
                                                        )}
                                                    >
                                                        {field.value && !isNaN(new Date(field.value).getTime()) ? (
                                                            format(new Date(field.value), "PPP")
                                                        ) : (
                                                            <span>Pick a date</span>
                                                        )}
                                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                                    </Button>
                                                </FormControl>
                                            </PopoverTrigger>
                                            <PopoverContent className="w-auto p-0" align="start">
                                                <Calendar
                                                    mode="single"
                                                    selected={field.value && !isNaN(new Date(field.value).getTime()) ? new Date(field.value) : undefined}
                                                    onSelect={(date: Date | undefined) => {
                                                        field.onChange(date ? format(date, "yyyy-MM-dd") : "");
                                                        setIsJoiningDateOpen(false);
                                                    }}
                                                />
                                            </PopoverContent>
                                        </Popover>
                                        <FormMessage className="text-[11px]" />
                                    </FormItem>
                                )} />
                            </div>

                            <div className="space-y-2">
                                <p className={labelCls}>Subjects</p>
                                <div className="flex gap-2">
                                    <Select
                                        value=""
                                        onValueChange={val => {
                                            if (val && !subjects.includes(val)) {
                                                setSubjects([...subjects, val]);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-9 bg-zinc-100 dark:bg-zinc-900/50 border-none flex-1">
                                            <SelectValue placeholder="Select a subject..." />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {allSubjects.filter((s: any) => !subjects.includes(s.name)).map((s: any) => (
                                                <SelectItem key={s.id} value={s.name}>
                                                    {s.name} ({s.code})
                                                </SelectItem>
                                            ))}
                                            {allSubjects.length === 0 && (
                                                <div className="p-2 text-xs text-muted-foreground text-center">No subjects found.</div>
                                            )}
                                        </SelectContent>
                                    </Select>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="icon"
                                        className="h-9 w-9 shrink-0"
                                        onClick={() => setIsCreateSubjectOpen(true)}
                                        title="Create New Subject"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </Button>
                                </div>
                                {subjects.length > 0 && (
                                    <div className="flex flex-wrap gap-2 pt-2">
                                        {subjects.map(s => (
                                            <Badge key={s} variant="secondary" className="text-xs bg-[#5513a1]/10 dark:bg-purple-500/20 text-[#5513a1] dark:text-purple-400 border-none gap-1 pr-1.5 py-1">
                                                {s}
                                                <button type="button" onClick={() => setSubjects(subjects.filter(x => x !== s))} className="ml-1 hover:bg-black/10 dark:hover:bg-white/10 rounded-full p-0.5 transition-colors">
                                                    <X className="h-3 w-3" />
                                                </button>
                                            </Badge>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </form>
                </Form>
            </div>

            <div className="px-6 py-4 bg-muted/40 dark:bg-purple-950/10 border-t border-border flex justify-end gap-3 shrink-0">
                <Button variant="outline" type="button" className="rounded-xl font-medium border-border/80" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" form="teacher-form" disabled={isSubmitting} className="rounded-xl bg-purple-700 hover:bg-purple-800 dark:bg-purple-600 dark:hover:bg-purple-500 text-white font-semibold gap-2">
                    {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                    {isEditMode ? "Save Changes" : "Create Teacher"}
                </Button>
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
