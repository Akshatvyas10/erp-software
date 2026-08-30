import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { toast } from "sonner";
import type { Classroom, Subject, Homework } from "@/types/erp";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { CalendarIcon, Loader2, Save, Send } from "lucide-react";
import { cn } from "@/lib/utils";

const homeworkSchema = z.object({
    title: z.string().min(3, "Title must be at least 3 characters").max(150),
    description: z.string().min(10, "Description must be at least 10 characters"),
    dueDate: z.string().refine(v => !isNaN(Date.parse(v)), { message: "Invalid date format" }),
    subjectId: z.string().uuid("Please select a valid subject"),
    classId: z.string().uuid("Please select a valid classroom"),
    status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"])
});

type HomeworkFormValues = z.infer<typeof homeworkSchema>;

interface HomeworkFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    homeworkId?: string | null;
}

export default function HomeworkFormDialog({ open, onOpenChange, homeworkId }: HomeworkFormDialogProps) {
    const isEdit = !!homeworkId;
    const qc = useQueryClient();
    const [isDueDateOpen, setIsDueDateOpen] = React.useState(false);

    const form = useForm<HomeworkFormValues>({
        resolver: zodResolver(homeworkSchema),
        defaultValues: {
            title: "",
            description: "",
            dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0], // Tomorrow
            subjectId: "",
            classId: "",
            status: "DRAFT"
        }
    });

    const { data: classrooms = [] } = useQuery<Classroom[]>({
        queryKey: ["classrooms"],
        queryFn: async () => {
            const res = await api.get("/classrooms");
            return res.data?.data?.classrooms || [];
        },
        enabled: open
    });

    const { data: subjects = [] } = useQuery<Subject[]>({
        queryKey: ["subjects"],
        queryFn: async () => {
            const res = await api.get("/subjects");
            return res.data?.data?.subjects || [];
        },
        enabled: open
    });

    const { data: responseData, isLoading: isFetching } = useQuery<{ homework: Homework }>({
        queryKey: ["homework", homeworkId],
        queryFn: async () => {
            const res = await api.get(`/homeworks/${homeworkId}`);
            return res.data;
        },
        enabled: isEdit && open,
        staleTime: 0
    });

    const homework = responseData?.homework;

    useEffect(() => {
        if (open) {
            if (homework && isEdit) {
                form.reset({
                    title: homework.title || "",
                    description: homework.description || "",
                    dueDate: (() => {
                        if (!homework.dueDate) return new Date(Date.now() + 86400000).toISOString().split('T')[0];
                        const d = new Date(homework.dueDate);
                        return isNaN(d.getTime()) ? new Date(Date.now() + 86400000).toISOString().split('T')[0] : d.toISOString().split('T')[0];
                    })(),
                    subjectId: homework.subjectId || "",
                    classId: homework.classroomId || "",
                    status: homework.status || "DRAFT"
                });
            } else if (!isEdit) {
                form.reset({
                    title: "",
                    description: "",
                    dueDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
                    subjectId: "",
                    classId: "",
                    status: "DRAFT"
                });
            }
        }
    }, [homework, isEdit, form, open]);

    const mutation = useMutation({
        mutationFn: async (values: HomeworkFormValues) => {
            if (isEdit) {
                const res = await api.put(`/homeworks/${homeworkId}`, values);
                return res.data;
            } else {
                const res = await api.post("/homeworks", values);
                return res.data;
            }
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["homeworks"] });
            qc.invalidateQueries({ queryKey: ["homework", homeworkId] });
            toast.success(isEdit ? "Homework updated" : "Homework assigned successfully");
            onOpenChange(false);
        },
        onError: (err: unknown) => {
            const e = err as { response?: { data?: { message?: string } } };
            toast.error(e.response?.data?.message || "Failed to save homework");
        }
    });

    const onSubmit = (values: HomeworkFormValues) => {
        mutation.mutate(values);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="w-[95vw] max-w-[600px] max-h-[90vh] overflow-y-auto sm:max-w-[600px] p-4 sm:p-6 border border-border/80 shadow-2xl rounded-2xl bg-background dark:bg-zinc-950 custom-scrollbar">
                <DialogHeader>
                    <DialogTitle className="text-xl md:text-2xl font-extrabold tracking-tight text-[#5513a1] dark:text-[#8e44ad]">
                        {isEdit ? "Edit Homework" : "Assign New Homework"}
                    </DialogTitle>
                </DialogHeader>

                {isEdit && isFetching ? (
                    <div className="flex justify-center py-10">
                        <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                            <FormField
                                control={form.control}
                                name="title"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-purple-950 dark:text-purple-300">Title</FormLabel>
                                        <FormControl>
                                            <Input placeholder="e.g. Chapter 4 Math Exercises" className="h-10 rounded-xl bg-muted/50 border-none" {...field} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <FormField
                                    control={form.control}
                                    name="subjectId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-purple-950 dark:text-purple-300">Subject</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-none">
                                                        <SelectValue placeholder="Select a subject" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {subjects.map(s => (
                                                        <SelectItem key={s.id} value={s.id}>{s.name} ({s.code})</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="classId"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-purple-950 dark:text-purple-300">Classroom</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-none">
                                                        <SelectValue placeholder="Select a class" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    {classrooms.map(c => (
                                                        <SelectItem key={c.id} value={c.id}>{c.name} - {c.section}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <FormField
                                        control={form.control}
                                        name="dueDate"
                                        render={({ field }) => (
                                            <FormItem>
                                                <FormLabel className="font-semibold text-purple-950 dark:text-purple-300">Due Date</FormLabel>
                                                <Popover modal={true} open={isDueDateOpen} onOpenChange={setIsDueDateOpen}>
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
                                                                    setIsDueDateOpen(false);
                                                                }
                                                            }}
                                                            disabled={(date) => date < new Date(new Date().setHours(0,0,0,0))}
                                                        />
                                                    </PopoverContent>
                                                </Popover>
                                                <FormMessage />
                                            </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control}
                                    name="status"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="font-semibold text-purple-950 dark:text-purple-300">Status</FormLabel>
                                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 rounded-xl bg-muted/50 border-none">
                                                        <SelectValue placeholder="Select status" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent>
                                                    <SelectItem value="DRAFT">Draft</SelectItem>
                                                    <SelectItem value="PUBLISHED">Published (Assign to Students)</SelectItem>
                                                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <FormField
                                control={form.control}
                                name="description"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel className="font-semibold text-purple-950 dark:text-purple-300">Instructions / Description</FormLabel>
                                        <FormControl>
                                            <Textarea 
                                                placeholder="Provide detailed instructions for the assignment..." 
                                                className="min-h-[120px] rounded-xl bg-muted/50 border-none resize-y" 
                                                {...field} 
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <div className="flex justify-end gap-3 pt-4 border-t border-border/40">
                                <Button
                                    type="button"
                                    variant="outline"
                                    className="h-10 px-6 rounded-xl font-semibold"
                                    onClick={() => onOpenChange(false)}
                                >
                                    Cancel
                                </Button>
                                <Button
                                    type="submit"
                                    variant="primary"
                                    className="h-10 px-6 rounded-xl font-semibold gap-2 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                    disabled={mutation.isPending}
                                >
                                    {mutation.isPending ? (
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : form.watch("status") === "PUBLISHED" ? (
                                        <><Send className="h-4 w-4" /> Publish</>
                                    ) : (
                                        <><Save className="h-4 w-4" /> Save as Draft</>
                                    )}
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </DialogContent>
        </Dialog>
    );
}
