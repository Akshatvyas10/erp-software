import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2, Save } from "lucide-react";
import { toast } from "sonner";

import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import api from "@/lib/api";
import type { AcademicClass } from "@/types/erp";
import { createAcademicClass, updateAcademicClass } from "../../api/classApi";

const classSchema = z.object({
    name: z.string().min(1, "Class name is required").max(80),
    departmentId: z.string().optional(),
    orderIndex: z.coerce.number().min(1).default(1),
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
    nextOrderIndex = 1,
    classToEdit = null
}: CreateClassDialogProps) {
    const qc = useQueryClient();
    const isEditing = Boolean(classToEdit);

    const form = useForm<ClassFormValues>({
        resolver: zodResolver(classSchema) as any,
        defaultValues: {
            name: "",
            departmentId: "",
            orderIndex: nextOrderIndex,
        }
    });

    useEffect(() => {
        if (open) {
            if (classToEdit) {
                form.reset({
                    name: classToEdit.name || "",
                    departmentId: classToEdit.departmentId || "__NONE__",
                    orderIndex: classToEdit.orderIndex || 1,
                });
            } else {
                form.reset({
                    name: "",
                    departmentId: "__NONE__",
                    orderIndex: nextOrderIndex,
                });
            }
        }
    }, [open, classToEdit, nextOrderIndex, form]);

    const { data: departments = [] } = useQuery({
        queryKey: ["departmentsList"],
        queryFn: async () => {
            const { data } = await api.get("/departments");
            return data.data.departments || [];
        },
        enabled: open,
    });

    const mutation = useMutation({
        mutationFn: (values: ClassFormValues) => {
            const deptId = values.departmentId === "__NONE__" || !values.departmentId ? null : values.departmentId;
            if (isEditing && classToEdit) {
                return updateAcademicClass(classToEdit.id, {
                    name: values.name.trim(),
                    departmentId: deptId,
                    orderIndex: values.orderIndex,
                });
            }
            return createAcademicClass({
                name: values.name.trim(),
                departmentId: deptId || undefined,
                orderIndex: values.orderIndex,
                status: "ACTIVE"
            });
        },
        onSuccess: () => {
            toast.success(isEditing ? "Academic Class updated successfully" : "Academic Class created successfully");
            qc.invalidateQueries({ queryKey: ["classes"] });
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
            title={isEditing ? "Edit Academic Class" : "Create Academic Class"}
            description={
                isEditing
                    ? "Modify academic class name, sequence order, or department affiliation."
                    : "Define a new academic grade level (e.g. Class 11, Pre-KG)."
            }
            maxWidth="sm:max-w-md"
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 pt-1">
                    <FormField
                        control={form.control as any}
                        name="name"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-foreground">Class Name *</FormLabel>
                                <FormControl>
                                    <Input {...field} placeholder="e.g. Class 11 or Nursery" className="h-9 text-xs rounded-xl" />
                                </FormControl>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                            control={form.control as any}
                            name="orderIndex"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-foreground">Sequence Order</FormLabel>
                                    <FormControl>
                                        <Input type="number" min={1} {...field} className="h-9 text-xs rounded-xl" />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control as any}
                            name="departmentId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-foreground">Department</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value || "__NONE__"}>
                                        <FormControl>
                                            <SelectTrigger className="h-9 text-xs rounded-xl">
                                                <SelectValue placeholder="Select Department" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="__NONE__">None / Unassigned</SelectItem>
                                            {departments.map((d: any) => (
                                                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="rounded-xl text-xs font-bold">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={mutation.isPending} className="gap-2 rounded-xl text-xs font-bold shadow-sm">
                            {mutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isEditing ? (
                                <Save className="w-3.5 h-3.5" />
                            ) : (
                                <Plus className="w-3.5 h-3.5" />
                            )}
                            {isEditing ? "Save Changes" : "Create Class"}
                        </Button>
                    </div>
                </form>
            </Form>
        </ResponsiveModal>
    );
}
