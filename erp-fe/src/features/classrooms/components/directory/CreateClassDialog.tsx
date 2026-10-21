import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Save, Layers } from "lucide-react";
import { toast } from "sonner";

import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Button } from "@/components/ui/button";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import api from "@/lib/api";
import type { AcademicClass } from "@/types/erp";
import {
    createAcademicClass,
    updateAcademicClass,
    fetchPredefinedClasses,
    fetchAcademicClasses,
    type PredefinedClassItem
} from "../../api/classApi";

const classSchema = z.object({
    code: z.string().min(1, "Please select a standard class"),
    departmentId: z.string().optional(),
});

type ClassFormValues = z.infer<typeof classSchema>;

interface CreateClassDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: () => void;
    nextOrderIndex?: number;
    classToEdit?: AcademicClass | null;
}

export function CreateClassDialog({
    open,
    onOpenChange,
    onSuccess,
    classToEdit = null
}: CreateClassDialogProps) {
    const qc = useQueryClient();
    const isEditing = Boolean(classToEdit);

    const form = useForm<ClassFormValues>({
        // @ts-ignore
        resolver: zodResolver(classSchema),
        defaultValues: {
            code: "",
            departmentId: "__NONE__",
        }
    });

    // 1. Fetch predefined catalog
    const { data: predefinedClasses = [] } = useQuery<PredefinedClassItem[]>({
        queryKey: ["predefinedClasses"],
        queryFn: fetchPredefinedClasses,
        enabled: open,
    });

    // 2. Fetch existing classes to filter out already added ones
    const { data: existingClasses = [] } = useQuery<AcademicClass[]>({
        queryKey: ["classes"],
        queryFn: () => fetchAcademicClasses(),
        enabled: open,
    });

    // 3. Fetch departments
    const { data: departments = [] } = useQuery({
        queryKey: ["departmentsList"],
        queryFn: async () => {
            const { data } = await api.get("/departments");
            return data.data.departments || [];
        },
        enabled: open,
    });

    const configuredCodes = new Set(
        existingClasses
            .filter(c => !classToEdit || c.id !== classToEdit.id)
            .map(c => c.code.toUpperCase())
    );

    useEffect(() => {
        if (open) {
            if (classToEdit) {
                form.reset({
                    code: classToEdit.code || "",
                    departmentId: classToEdit.departmentId || "__NONE__",
                });
            } else {
                form.reset({
                    code: "",
                    departmentId: "__NONE__",
                });
            }
        }
    }, [open, classToEdit, form]);

    const mutation = useMutation({
        mutationFn: (values: ClassFormValues) => {
            const predefined = predefinedClasses.find(p => p.code === values.code);
            const deptId = values.departmentId === "__NONE__" || !values.departmentId ? null : values.departmentId;

            if (isEditing && classToEdit) {
                return updateAcademicClass(classToEdit.id, {
                    name: predefined?.name || classToEdit.name,
                    code: values.code,
                    departmentId: deptId,
                    orderIndex: predefined?.sequenceOrder,
                });
            }

            if (!predefined) {
                throw new Error("Please select a valid standard class");
            }

            return createAcademicClass({
                name: predefined.name,
                code: predefined.code,
                departmentId: deptId || undefined,
                orderIndex: predefined.sequenceOrder,
                status: "ACTIVE"
            });
        },
        onSuccess: () => {
            toast.success(isEditing ? "Academic Class updated successfully" : "Academic Class added successfully");
            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["classSetupStatus"] });
            onOpenChange(false);
            form.reset();
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || `Failed to ${isEditing ? "update" : "create"} class`);
        }
    });

    const onSubmit = (values: ClassFormValues) => {
        mutation.mutate(values);
    };

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            title={isEditing ? "Edit Academic Class" : "Add Academic Class"}
            description={
                isEditing
                    ? "Update department association for this academic class."
                    : "Select a standard class to add to the institution structure. No custom class names permitted."
            }
            maxWidth="sm:max-w-md"
        >
            <Form {...form}>
                {/* @ts-ignore */}
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-1">
                    {/* Predefined Class Dropdown */}
                    <FormField
                        control={form.control}
                        name="code"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-foreground flex items-center justify-between">
                                    <span>Standard Academic Class *</span>
                                    <span className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                        <Layers className="w-3 h-3 text-primary" /> Fixed Progression Order
                                    </span>
                                </FormLabel>
                                <Select
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    disabled={isEditing}
                                >
                                    <FormControl>
                                        <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-background">
                                            <SelectValue placeholder="Choose standard class..." />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-60">
                                        {predefinedClasses.map((item) => {
                                            const isAlreadyAdded = configuredCodes.has(item.code.toUpperCase());
                                            return (
                                                <SelectItem
                                                    key={item.code}
                                                    value={item.code}
                                                    disabled={isAlreadyAdded}
                                                    className="text-xs font-semibold"
                                                >
                                                    <div className="flex items-center justify-between w-full gap-3">
                                                        <span>{item.name}</span>
                                                        <span className="text-[10px] text-muted-foreground">
                                                            {isAlreadyAdded ? "(Configured)" : `[${item.departmentCategory}]`}
                                                        </span>
                                                    </div>
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                <p className="text-[10px] text-muted-foreground">
                                    Only predefined academic classes are allowed. Order and sequence are automatically maintained.
                                </p>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )}
                    />

                    {/* Department Mapping */}
                    <FormField
                        control={form.control}
                        name="departmentId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-foreground">Department (Optional)</FormLabel>
                                <Select onValueChange={field.onChange} value={field.value || "__NONE__"}>
                                    <FormControl>
                                        <SelectTrigger className="h-10 text-xs rounded-xl bg-background">
                                            <SelectValue placeholder="Select Department" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        <SelectItem value="__NONE__">-- Unassigned --</SelectItem>
                                        {departments.map((d: any) => {
                                            const incharge = d.head?.account
                                                ? ` (Incharge: ${d.head.account.firstName} ${d.head.account.lastName})`
                                                : "";
                                            return (
                                                <SelectItem key={d.id} value={d.id} className="text-xs">
                                                    {d.name} {incharge}
                                                </SelectItem>
                                            );
                                        })}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )}
                    />

                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/70">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs font-bold">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending} className="gap-2 rounded-xl text-xs font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/95">
                            {mutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isEditing ? (
                                <Save className="w-3.5 h-3.5" />
                            ) : (
                                <Plus className="w-3.5 h-3.5" />
                            )}
                            {isEditing ? "Save Changes" : "Save Class"}
                        </Button>
                    </div>
                </form>
            </Form>
        </ResponsiveModal>
    );
}
