import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Plus } from "lucide-react";
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import api from "@/lib/api";
import { useQueryClient } from "@tanstack/react-query";

const subjectSchema = z.object({
    name: z.string().min(2, "Name is required").max(100),
    type: z.enum(["THEORY", "PRACTICAL", "LAB", "ELECTIVE"]),
    description: z.string().optional(),
});
type SubjectFormValues = z.infer<typeof subjectSchema>;

interface CreateSubjectDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onSuccess?: (subjectName: string) => void;
}

export default function CreateSubjectDialog({ open, onOpenChange, onSuccess }: CreateSubjectDialogProps) {
    const qc = useQueryClient();
    const form = useForm<SubjectFormValues>({
        resolver: zodResolver(subjectSchema) as any,
        defaultValues: { name: "", type: "THEORY", description: "" },
    });

    const onSubmit = async (values: SubjectFormValues) => {
        try {
            const { data } = await api.post("/subjects", { ...values, isActive: true });
            toast.success("Subject created successfully!");
            qc.invalidateQueries({ queryKey: ["subjects"] });
            qc.invalidateQueries({ queryKey: ["subjects-all"] });
            onOpenChange(false);
            form.reset();
            const subjectName = data?.data?.data?.subject?.name || data?.data?.subject?.name;
            if (onSuccess && subjectName) {
                onSuccess(subjectName);
            }
        } catch (err: any) {
            toast.error(err.response?.data?.message || "Failed to create subject");
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Plus className="h-4 w-4 text-purple-600" />
                        Create New Subject
                    </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-2">
                        <FormField control={form.control} name="name" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Subject Name *</FormLabel>
                                <FormControl><Input placeholder="e.g. Mathematics" {...field} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="type" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Type *</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl><SelectTrigger><SelectValue placeholder="Select type" /></SelectTrigger></FormControl>
                                    <SelectContent>
                                        <SelectItem value="THEORY">Theory</SelectItem>
                                        <SelectItem value="PRACTICAL">Practical</SelectItem>
                                        <SelectItem value="LAB">Lab</SelectItem>
                                        <SelectItem value="ELECTIVE">Elective</SelectItem>
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <FormField control={form.control} name="description" render={({ field }) => (
                            <FormItem>
                                <FormLabel>Description</FormLabel>
                                <FormControl><Input placeholder="Optional details..." {...field} value={field.value || ""} /></FormControl>
                                <FormMessage />
                            </FormItem>
                        )} />
                        <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={form.formState.isSubmitting}>
                                Cancel
                            </Button>
                            <Button type="submit" disabled={form.formState.isSubmitting}>
                                {form.formState.isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
