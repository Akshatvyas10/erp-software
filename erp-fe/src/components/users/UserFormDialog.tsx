import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Users, Mail, Eye, EyeOff, CalendarIcon, ShieldCheck, Loader2, CheckCircle2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import api from "@/lib/api";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import type { User, Role } from "@/types/erp";

export const userSchema = z.object({
    email: z.string().email("Valid email required"),
    password: z.string().min(8, "Min 8 characters").optional().or(z.literal("")),
    firstName: z.string().min(1, "First name required"),
    lastName: z.string().min(1, "Last name required"),
    gender: z.enum(["MALE", "FEMALE", "OTHER"]).optional(),
    dob: z.date().optional(),
    phone: z.string().optional(),
    mfaEnabled: z.boolean().optional(),
});
export type UserFormValues = z.infer<typeof userSchema>;

interface UserFormDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    editUser: User | null;
    onSuccess: () => void;
}

export default function UserFormDialog({ isOpen, onOpenChange, editUser, onSuccess }: UserFormDialogProps) {
    const [showPw, setShowPw] = useState(false);
    const [selectedRoles, setSelectedRoles] = useState<number[]>([]);

    const { data: roles } = useQuery<Role[]>({
        queryKey: ["roles", "simple"],
        queryFn: async () => { const { data } = await api.get("/roles"); return data.data.roles; },
        enabled: isOpen,
    });

    const defaultValues = { email: "", password: "", firstName: "", lastName: "", phone: "", dob: undefined, mfaEnabled: false, gender: undefined };

    const form = useForm<UserFormValues>({
        resolver: zodResolver(userSchema),
        defaultValues,
    });

    useEffect(() => {
        if (isOpen) {
            if (editUser) {
                form.reset({
                    email: editUser.email,
                    firstName: editUser.firstName,
                    lastName: editUser.lastName,
                    gender: editUser.gender as any,
                    dob: editUser.dob ? new Date(editUser.dob) : undefined,
                    phone: editUser.phone || "",
                    mfaEnabled: editUser.mfaEnabled || false,
                    password: "",
                });
                setSelectedRoles((editUser.Roles ?? []).map(r => r.id));
            } else {
                form.reset(defaultValues);
                setSelectedRoles([]);
            }
            setShowPw(false);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, editUser, form]);

    const onSubmit = async (values: UserFormValues) => {
        try {
            const payload: any = { ...values, roleIds: selectedRoles };
            if (payload.dob) {
                const tzOffset = payload.dob.getTimezoneOffset() * 60000;
                payload.dob = (new Date(payload.dob.getTime() - tzOffset)).toISOString().split('T')[0];
            }
            if (!payload.password) delete payload.password;

            if (editUser) {
                await api.put(`/users/${editUser.id}`, payload);
                await api.patch(`/users/${editUser.id}/roles`, { roleIds: selectedRoles });
                toast.success(`User updated successfully`);
            } else {
                if (!payload.password) {
                    form.setError("password", { message: "Password is required for new users" });
                    return;
                }
                const { data } = await api.post("/users", payload);
                toast.success(`User ${data.data.user.userId} created successfully`);
            }

            onSuccess();
            onOpenChange(false);
        } catch (err: unknown) {
            toast.error((err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? "Failed to save user");
        }
    };

    const toggleRole = (id: number) =>
        setSelectedRoles(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] sm:max-w-2xl md:max-w-3xl mx-auto flex flex-col p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-background">
                <DialogHeader className="px-6 py-5 bg-muted/40 border-b border-border">
                    <DialogTitle className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                        {editUser ? "Edit User Profile" : "Create New User Profile"}
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto max-h-[70vh] custom-scrollbar p-6 lg:p-8 bg-background">
                    <Form {...form}>
                        <form id="create-user-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 md:space-y-8">
                            {/* Identity Details Row */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2 pb-2 border-b border-border/60">
                                    <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                        <Users className="h-4 w-4 text-primary" />
                                    </div>
                                    <h3 className="text-xs font-bold uppercase tracking-wider text-primary">Identity Details</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FormField control={form.control as any} name="firstName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-muted-foreground">First Name *</FormLabel>
                                            <FormControl><Input className="h-10 md:h-11 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500" placeholder="e.g. John" {...field} /></FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control as any} name="lastName" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-muted-foreground">Last Name *</FormLabel>
                                            <FormControl><Input className="h-10 md:h-11 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500" placeholder="e.g. Doe" {...field} /></FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FormField control={form.control as any} name="email" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-muted-foreground">Email Address *</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input type="email" className="h-10 md:h-11 pl-9 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500" placeholder="john@example.com" {...field} />
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control as any} name="phone" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-muted-foreground">Mobile Number</FormLabel>
                                            <FormControl>
                                                <Input className="h-10 md:h-11 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500" placeholder="+1 234 567 8900" {...field} />
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FormField control={form.control as any} name="gender" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-muted-foreground">Gender</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value || undefined}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 md:h-11 rounded-lg bg-background border-border/80">
                                                        <SelectValue placeholder="Select Gender" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="MALE">Male</SelectItem>
                                                    <SelectItem value="FEMALE">Female</SelectItem>
                                                    <SelectItem value="OTHER">Other</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control as any} name="dob" render={({ field }) => (
                                        <FormItem className="flex flex-col pt-[5px]">
                                            <FormLabel className="text-xs font-semibold text-muted-foreground mb-[3px]">Date of Birth</FormLabel>
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <FormControl>
                                                        <Button
                                                            type="button"
                                                            variant={"outline"}
                                                            className={cn(
                                                                "w-full h-10 md:h-11 justify-start text-left font-normal rounded-lg bg-background border-border/80 focus-visible:ring-purple-500",
                                                                !field.value && "text-muted-foreground"
                                                            )}
                                                        >
                                                            <CalendarIcon className="mr-2 h-4 w-4" />
                                                            {field.value ? field.value.toLocaleDateString() : <span>Pick a date</span>}
                                                        </Button>
                                                    </FormControl>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar
                                                        mode="single"
                                                        selected={field.value}
                                                        onSelect={(date) => field.onChange(date)}
                                                        disabled={(date) =>
                                                            date > new Date() || date < new Date("1900-01-01")
                                                        }
                                                    />
                                                </PopoverContent>
                                            </Popover>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <FormField control={form.control as any} name="password" render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-semibold text-muted-foreground">Security Password {editUser ? "(Leave blank to keep current)" : "*"}</FormLabel>
                                            <FormControl>
                                                <div className="relative">
                                                    <Input type={showPw ? "text" : "password"} className="h-10 md:h-11 pr-10 rounded-lg bg-background border-border/80 focus-visible:ring-purple-500" placeholder="Minimum 8 characters" {...field} />
                                                    <button type="button" onClick={() => setShowPw(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-[#7f39c2] transition-colors">
                                                        {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                    </button>
                                                </div>
                                            </FormControl>
                                            <FormMessage className="text-xs" />
                                        </FormItem>
                                    )} />
                                    <FormField control={form.control as any} name="mfaEnabled" render={({ field }) => (
                                        <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-lg border border-border/80 bg-background p-4 h-10 md:h-11 items-center">
                                            <FormControl>
                                                <Checkbox checked={field.value} onCheckedChange={field.onChange} />
                                            </FormControl>
                                            <div className="space-y-1 leading-none">
                                                <FormLabel className="text-[11px] font-semibold">
                                                    Require Multi-Factor Authentication (MFA)
                                                </FormLabel>
                                            </div>
                                        </FormItem>
                                    )} />
                                </div>
                            </div>

                            {/* Roles Layout Section */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between pb-2 border-b border-border/60">
                                    <div className="flex items-center gap-2">
                                        <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center">
                                            <ShieldCheck className="h-4 w-4 text-primary" />
                                        </div>
                                        <h3 className="text-xs font-bold uppercase tracking-wider text-primary">System Roles</h3>
                                    </div>
                                    {selectedRoles.length > 0 && (
                                        <Badge variant="secondary" className="bg-primary/10 text-primary border border-primary/20">
                                            {selectedRoles.length} Selected
                                        </Badge>
                                    )}
                                </div>
                                {!roles ? (
                                    <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 lg:gap-4">
                                        {roles.map((role) => {
                                            const isChecked = selectedRoles.includes(role.id);
                                            return (
                                                <label key={role.id} className={
                                                    `flex items-start gap-3 p-3.5 rounded-xl border cursor-pointer transition-all duration-200 select-none focus-within:ring-2 focus-within:ring-ring
                                                    ${isChecked
                                                        ? "border-primary bg-primary/5 shadow-sm"
                                                        : "border-border/80 bg-background hover:border-primary/40 hover:bg-primary/5"}`
                                                }>
                                                    <Checkbox checked={isChecked} onCheckedChange={() => toggleRole(role.id)} className="mt-0.5 data-[state=checked]:bg-primary data-[state=checked]:border-primary" />
                                                    <div className="space-y-1">
                                                        <p className={`text-sm font-bold capitalize tracking-tight ${isChecked ? "text-primary" : "text-foreground"}`}>
                                                            {role.name.replace(/_/g, " ")}
                                                        </p>
                                                        {role.description && <p className="text-[11px] lg:text-xs leading-snug text-muted-foreground line-clamp-2">{role.description}</p>}
                                                    </div>
                                                </label>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </form>
                    </Form>
                </div>
                <div className="p-4 px-6 bg-muted/40 border-t border-border flex justify-end gap-3">
                    <Button type="button" variant="outline" className="border-border/80 bg-background hover:bg-accent hover:text-accent-foreground font-medium rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button type="submit" form="create-user-form" variant="primary" className="gap-2 h-10 px-6">
                        {form.formState?.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle2 className="h-4 w-4" /> {editUser ? "Save Changes" : "Create Profile"}</>}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
