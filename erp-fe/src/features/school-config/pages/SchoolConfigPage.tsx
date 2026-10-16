import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSchoolConfig, updateSchoolConfig } from "../api/schoolConfigApi";
import { toast } from "sonner";
import {
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Building2, Save, MapPin, Building, CreditCard, Mail, Palette, Loader2 } from "lucide-react";
import { EmailServerTab } from "../components/EmailServerTab";
import { ThemeConfigTab } from "../components/ThemeConfigTab";

const formSchema = z.object({
    schoolName: z.string().min(2, "School name is required"),
    tagline: z.string().optional(),
    primaryPhone: z.string().optional(),
    secondaryPhone: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    website: z.string().url("Invalid URL").optional().or(z.literal("")),
    addressLine1: z.string().optional(),
    addressLine2: z.string().optional(),
    city: z.string().optional(),
    state: z.string().optional(),
    pincode: z.string().optional(),
    country: z.string().optional(),
    boardType: z.enum(["CBSE", "ICSE", "IB", "STATE_BOARD", "OTHER"]).optional(),
    affiliationNumber: z.string().optional(),
    schoolCode: z.string().optional(),
    taxId: z.string().optional(),
    currencySymbol: z.string().default("₹"),
    timezone: z.string().default("Asia/Kolkata"),
});

export default function SchoolConfigPage() {
    const queryClient = useQueryClient();
    const [logoFile, setLogoFile] = useState<File | null>(null);
    const [watermarkFile, setWatermarkFile] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState("general");

    const { data: config, isLoading } = useQuery({
        queryKey: ["schoolConfig"],
        queryFn: getSchoolConfig,
    });

    const form = useForm<z.infer<typeof formSchema>>({
        // @ts-ignore
        resolver: zodResolver(formSchema),
        defaultValues: {
            schoolName: "",
            tagline: "",
            primaryPhone: "",
            secondaryPhone: "",
            email: "",
            website: "",
            addressLine1: "",
            addressLine2: "",
            city: "",
            state: "",
            pincode: "",
            country: "",
            boardType: "CBSE",
            affiliationNumber: "",
            schoolCode: "",
            taxId: "",
            currencySymbol: "₹",
            timezone: "Asia/Kolkata",
        },
    });

    useEffect(() => {
        if (config) {
            form.reset({
                schoolName: config.schoolName || "",
                tagline: config.tagline || "",
                primaryPhone: config.primaryPhone || "",
                secondaryPhone: config.secondaryPhone || "",
                email: config.email || "",
                website: config.website || "",
                addressLine1: config.addressLine1 || "",
                addressLine2: config.addressLine2 || "",
                city: config.city || "",
                state: config.state || "",
                pincode: config.pincode || "",
                country: config.country || "",
                boardType: (config.boardType as any) || "CBSE",
                affiliationNumber: config.affiliationNumber || "",
                schoolCode: config.schoolCode || "",
                taxId: config.taxId || "",
                currencySymbol: config.currencySymbol || "₹",
                timezone: config.timezone || "Asia/Kolkata",
            });
        }
    }, [config, form]);

    const mutation = useMutation({
        mutationFn: updateSchoolConfig,
        onSuccess: (data) => {
            toast.success("School configuration updated successfully");
            setLogoFile(null);
            setWatermarkFile(null);
            form.reset(data); // Resets the form's dirty state to the newly saved data
            queryClient.invalidateQueries({ queryKey: ["schoolConfig"] });
        },
        onError: (error: any) => {
            toast.error(error.response?.data?.message || "Failed to update configuration");
        },
    });

    const onSubmit = (values: z.infer<typeof formSchema>) => {
        const formData = new FormData();
        
        // Append all text values
        Object.entries(values).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                formData.append(key, value.toString());
            }
        });

        // Append files if selected
        if (logoFile) formData.append("logoUrl", logoFile);
        if (watermarkFile) formData.append("watermarkUrl", watermarkFile);

        mutation.mutate(formData);
    };

    const onError = (errors: any) => {
        const errorFields = Object.keys(errors);
        
        const tabMapping: Record<string, string> = {
            schoolName: "general",
            tagline: "general",
            primaryPhone: "contact",
            secondaryPhone: "contact",
            email: "contact",
            website: "contact",
            addressLine1: "contact",
            addressLine2: "contact",
            city: "contact",
            state: "contact",
            pincode: "contact",
            country: "contact",
            boardType: "board",
            affiliationNumber: "board",
            schoolCode: "board",
            taxId: "financial",
            currencySymbol: "financial",
            timezone: "financial",
        };

        for (const field of errorFields) {
            if (tabMapping[field]) {
                setActiveTab(tabMapping[field]);
                toast.error(`Please fix the errors in the ${tabMapping[field]} section.`);
                break;
            }
        }
    };

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    const API_URL = import.meta.env.VITE_API_URL?.replace('/api', '') || "http://localhost:5000";

    const hasChanges = form.formState.isDirty || logoFile !== null || watermarkFile !== null;

    return (
        <div className="p-4 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-foreground">School Configuration</h1>
                    <p className="text-muted-foreground mt-1 text-sm md:text-base">
                        Manage your institution's identity, contact details, and core settings.
                    </p>
                </div>
                <Button 
                    // @ts-ignore
                    onClick={form.handleSubmit(onSubmit, onError)}
                    disabled={mutation.isPending || !hasChanges}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm gap-2"
                >
                    {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </Button>
            </div>

            <Form {...form}>
                {/* @ts-ignore */}
                <form onSubmit={form.handleSubmit(onSubmit, onError)} className="space-y-6">
                    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                        <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 lg:w-[850px] bg-muted/60 p-1 rounded-2xl">
                            <TabsTrigger value="general" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs">
                                <Building2 className="w-4 h-4" /> <span className="hidden md:inline">General</span>
                            </TabsTrigger>
                            <TabsTrigger value="contact" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs">
                                <MapPin className="w-4 h-4" /> <span className="hidden md:inline">Contact</span>
                            </TabsTrigger>
                            <TabsTrigger value="board" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs">
                                <Building className="w-4 h-4" /> <span className="hidden md:inline">Board</span>
                            </TabsTrigger>
                            <TabsTrigger value="financial" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs">
                                <CreditCard className="w-4 h-4" /> <span className="hidden md:inline">Financial</span>
                            </TabsTrigger>
                            <TabsTrigger value="email" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs">
                                <Mail className="w-4 h-4" /> <span className="hidden md:inline">Email Server</span>
                            </TabsTrigger>
                            <TabsTrigger value="theme" className="gap-2 rounded-xl data-[state=active]:bg-background data-[state=active]:shadow-xs">
                                <Palette className="w-4 h-4" /> <span className="hidden md:inline">Theme</span>
                            </TabsTrigger>
                        </TabsList>

                        <div className="mt-6">
                            {/* General Tab */}
                            <TabsContent value="general" className="m-0">
                                <Card className="border-border/60 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Identity & Branding</CardTitle>
                                        <CardDescription>Primary information about the school and branding assets.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control as any}
                                                name="schoolName"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>School Name *</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Acme International School" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="tagline"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Tagline / Motto</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Excellence in Education" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-border/60">
                                            {/* Logo Upload */}
                                            <div className="space-y-3">
                                                <FormLabel>School Logo</FormLabel>
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/40 overflow-hidden shrink-0">
                                                        {logoFile ? (
                                                             <img src={URL.createObjectURL(logoFile)} alt="Logo Preview" className="w-full h-full object-contain p-2" />
                                                        ) : config?.logoUrl ? (
                                                            <img src={`${API_URL}${config.logoUrl}`} alt="Current Logo" className="w-full h-full object-contain p-2" />
                                                        ) : (
                                                            <Building2 className="w-8 h-8 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-2 w-full">
                                                        <Input 
                                                            type="file" 
                                                            accept="image/png, image/jpeg, image/webp" 
                                                            onChange={(e) => setLogoFile(e.target.files?.[0] || null)}
                                                            className="cursor-pointer file:cursor-pointer file:bg-muted file:text-foreground hover:file:bg-muted/80 border-border"
                                                        />
                                                        <p className="text-xs text-muted-foreground">Max 2MB. PNG, JPG, or WebP.</p>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Watermark Upload */}
                                            <div className="space-y-3">
                                                <FormLabel>Document Watermark</FormLabel>
                                                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                                                    <div className="h-24 w-24 rounded-xl border-2 border-dashed border-border flex items-center justify-center bg-muted/40 overflow-hidden shrink-0">
                                                        {watermarkFile ? (
                                                            <img src={URL.createObjectURL(watermarkFile)} alt="Watermark Preview" className="w-full h-full object-contain p-2 opacity-50" />
                                                        ) : config?.watermarkUrl ? (
                                                            <img src={`${API_URL}${config.watermarkUrl}`} alt="Current Watermark" className="w-full h-full object-contain p-2 opacity-50" />
                                                        ) : (
                                                            <Building2 className="w-8 h-8 text-muted-foreground opacity-50" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 space-y-2 w-full">
                                                        <Input 
                                                            type="file" 
                                                            accept="image/png, image/jpeg, image/webp" 
                                                            onChange={(e) => setWatermarkFile(e.target.files?.[0] || null)}
                                                            className="cursor-pointer file:cursor-pointer file:bg-muted file:text-foreground hover:file:bg-muted/80 border-border"
                                                        />
                                                        <p className="text-xs text-muted-foreground">Used for certificates and reports. Max 2MB.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Contact & Address Tab */}
                            <TabsContent value="contact" className="m-0">
                                <Card className="border-border/60 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Contact & Location</CardTitle>
                                        <CardDescription>Public contact information and physical address.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control as any}
                                                name="primaryPhone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Primary Phone</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="+91 9876543210" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="secondaryPhone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Secondary Phone</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="+91 9876543211" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="email"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Official Email</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="info@school.com" type="email" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="website"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Website URL</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="https://www.school.com" type="url" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="pt-4 border-t border-purple-50 dark:border-zinc-800 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control as any}
                                                name="addressLine1"
                                                render={({ field }) => (
                                                    <FormItem className="md:col-span-2">
                                                        <FormLabel>Address Line 1</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Building Name, Street" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="addressLine2"
                                                render={({ field }) => (
                                                    <FormItem className="md:col-span-2">
                                                        <FormLabel>Address Line 2</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Locality, Landmark" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="city"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>City</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Mumbai" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="state"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>State</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Maharashtra" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="pincode"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Pincode / Zip</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="400001" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="country"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Country</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="India" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Board Tab */}
                            <TabsContent value="board" className="m-0">
                                <Card className="border-purple-100 dark:border-zinc-800 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Board & Affiliation</CardTitle>
                                        <CardDescription>Academic board details and registration numbers.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control as any}
                                                name="boardType"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Board Type</FormLabel>
                                                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                                                            <FormControl>
                                                                <SelectTrigger>
                                                                    <SelectValue placeholder="Select board" />
                                                                </SelectTrigger>
                                                            </FormControl>
                                                            <SelectContent>
                                                                <SelectItem value="CBSE">CBSE</SelectItem>
                                                                <SelectItem value="ICSE">ICSE</SelectItem>
                                                                <SelectItem value="IB">IB</SelectItem>
                                                                <SelectItem value="STATE_BOARD">State Board</SelectItem>
                                                                <SelectItem value="OTHER">Other</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="affiliationNumber"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Affiliation Number</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. 1130XXX" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="schoolCode"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>School Code</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. 450XX" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Financial Tab */}
                            <TabsContent value="financial" className="m-0">
                                <Card className="border-purple-100 dark:border-zinc-800 shadow-sm">
                                    <CardHeader>
                                        <CardTitle>Financial & System Settings</CardTitle>
                                        <CardDescription>Currency, taxes, and localization defaults.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <FormField
                                                control={form.control as any}
                                                name="taxId"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Tax ID (GSTIN / PAN)</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="e.g. 27AAAAA0000A1Z5" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="currencySymbol"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Currency Symbol</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="₹" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control as any}
                                                name="timezone"
                                                render={({ field }) => (
                                                    <FormItem>
                                                        <FormLabel>Timezone</FormLabel>
                                                        <FormControl>
                                                            <Input placeholder="Asia/Kolkata" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            </TabsContent>

                            {/* Email Server (SMTP) Tab */}
                            <TabsContent value="email" className="m-0">
                                <EmailServerTab initialSmtp={config?.smtpSettings} />
                            </TabsContent>

                            {/* Theme Configuration Tab */}
                            <TabsContent value="theme" className="m-0">
                                <ThemeConfigTab />
                            </TabsContent>
                        </div>
                    </Tabs>
                </form>
            </Form>
        </div>
    );
}
