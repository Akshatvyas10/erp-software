import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
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
import { CLASSROOM_SECTIONS, type AcademicClass } from "@/types/erp";
import { getBuildingBlocks, getClassroomRooms } from "@/features/school-config/api/classroomConfigApi";
import { fetchCurrentAcademicYear } from "@/features/school-config/api/academicYearApi";

const sectionSchema = z.object({
    classId: z.string().uuid("Class is required"),
    section: z.enum(CLASSROOM_SECTIONS, { message: "Section must be A-G" }),
    academicYear: z.string().min(1, "Academic year is required"),
    blockId: z.string().optional(),
    roomId: z.string().optional(),
    roomNumber: z.string().optional(),
    classTeacherId: z.string().uuid("Invalid Teacher").optional().or(z.literal("")),
    maxCapacity: z.coerce.number().min(1).default(40),
    status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
});

type SectionFormValues = z.infer<typeof sectionSchema>;

interface CreateSectionDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    preSelectedClass?: AcademicClass | null;
    classes: AcademicClass[];
    onSuccess?: () => void;
}

export function CreateSectionDialog({
    open,
    onOpenChange,
    preSelectedClass,
    classes,
    onSuccess
}: CreateSectionDialogProps) {
    const qc = useQueryClient();

    const form = useForm<SectionFormValues>({
        resolver: zodResolver(sectionSchema) as any,
        defaultValues: {
            classId: preSelectedClass?.id || "",
            section: "A",
            academicYear: "",
            blockId: "",
            roomId: "",
            roomNumber: "",
            classTeacherId: "",
            maxCapacity: 40,
            status: "ACTIVE",
        }
    });

    // Fetch active academic year
    const { data: currentYear } = useQuery({
        queryKey: ["currentAcademicYear"],
        queryFn: fetchCurrentAcademicYear,
        staleTime: 60_000,
    });

    useEffect(() => {
        if (currentYear?.name) {
            form.setValue("academicYear", currentYear.name);
        }
    }, [currentYear, form]);

    useEffect(() => {
        if (preSelectedClass) {
            form.setValue("classId", preSelectedClass.id);
            const existingLetters = (preSelectedClass.sections || []).map(s => s.section);
            const nextAvailable = CLASSROOM_SECTIONS.find(l => !existingLetters.includes(l)) || "A";
            form.setValue("section", nextAvailable);
        }
    }, [preSelectedClass, form]);

    const selectedBlockId = form.watch("blockId");

    const { data: blocks = [] } = useQuery({
        queryKey: ["buildingBlocks"],
        queryFn: getBuildingBlocks,
        enabled: open,
    });

    const { data: rooms = [] } = useQuery({
        queryKey: ["classroomRooms", selectedBlockId],
        queryFn: () => getClassroomRooms(selectedBlockId),
        enabled: open && !!selectedBlockId,
    });

    const { data: teachers = [] } = useQuery({
        queryKey: ["teachersList"],
        queryFn: async () => {
            const { data } = await api.get("/teachers?limit=100");
            return data.data.teachers || [];
        },
        enabled: open,
    });

    const mutation = useMutation({
        mutationFn: async (values: SectionFormValues) => {
            const parent = classes.find(c => c.id === values.classId);
            const payload = {
                ...values,
                name: parent ? `${parent.name} - Section ${values.section}` : `Section ${values.section}`,
                departmentId: parent?.departmentId || undefined,
                classTeacherId: values.classTeacherId || null,
            };
            const { data } = await api.post("/classrooms", payload);
            return data.data;
        },
        onSuccess: () => {
            toast.success("Section created successfully");
            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["classrooms"] });
            onOpenChange(false);
            form.reset();
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || "Failed to create section");
        }
    });

    const onSubmit = (values: SectionFormValues) => {
        mutation.mutate(values);
    };

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            title={preSelectedClass ? `Add Section to ${preSelectedClass.name}` : "Create Section"}
            description="Create an operational section with room, capacity, and class teacher."
            maxWidth="sm:max-w-lg"
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 pt-1">
                    {/* Class Selector */}
                    <FormField
                        control={form.control as any}
                        name="classId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-bold text-foreground">Academic Class *</FormLabel>
                                <Select
                                    disabled={!!preSelectedClass}
                                    onValueChange={field.onChange}
                                    value={field.value}
                                >
                                    <FormControl>
                                        <SelectTrigger className="h-9 text-xs rounded-xl">
                                            <SelectValue placeholder="Select Class" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                        {classes.map(c => (
                                            <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage className="text-[11px]" />
                            </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Section Letter */}
                        <FormField
                            control={form.control as any}
                            name="section"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-foreground">Section Letter *</FormLabel>
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <FormControl>
                                            <SelectTrigger className="h-9 text-xs rounded-xl">
                                                <SelectValue placeholder="Select Section" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {CLASSROOM_SECTIONS.map(s => (
                                                <SelectItem key={s} value={s}>Section {s}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )}
                        />

                        {/* Academic Year */}
                        <FormField
                            control={form.control as any}
                            name="academicYear"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-foreground">Academic Year *</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="2026-2027" className="h-9 text-xs rounded-xl" />
                                    </FormControl>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Infrastructure (Block & Room) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                            control={form.control as any}
                            name="blockId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-foreground">Building Block</FormLabel>
                                    <Select onValueChange={(val) => { field.onChange(val); form.setValue("roomId", ""); }} value={field.value || ""}>
                                        <FormControl>
                                            <SelectTrigger className="h-9 text-xs rounded-xl">
                                                <SelectValue placeholder="Select Block" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {blocks.map(b => (
                                                <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control as any}
                            name="roomId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-foreground">Room Assignment</FormLabel>
                                    <Select
                                        disabled={!selectedBlockId}
                                        onValueChange={(val) => {
                                            field.onChange(val);
                                            const rm = rooms.find(r => r.id === val);
                                            if (rm) {
                                                form.setValue("roomNumber", rm.roomNumber);
                                                if (rm.capacity) form.setValue("maxCapacity", rm.capacity);
                                            }
                                        }}
                                        value={field.value || ""}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="h-9 text-xs rounded-xl">
                                                <SelectValue placeholder={selectedBlockId ? "Select Room" : "Choose Block first"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            {rooms.map(r => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    Room {r.roomNumber} (Cap: {r.capacity})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {/* Class Teacher (Optional) */}
                        <FormField
                            control={form.control as any}
                            name="classTeacherId"
                            render={({ field }) => (
                                <FormItem>
                                    <div className="flex items-center justify-between">
                                        <FormLabel className="text-xs font-bold text-foreground">Class Teacher</FormLabel>
                                        <span className="text-[10px] text-muted-foreground font-semibold">(Optional)</span>
                                    </div>
                                    <Select
                                        onValueChange={(val) => field.onChange(val === "NONE" ? "" : val)}
                                        value={field.value || "NONE"}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="h-9 text-xs rounded-xl">
                                                <SelectValue placeholder="Assign Class Teacher (Optional)" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent className="max-h-56">
                                            <SelectItem value="NONE" className="text-muted-foreground italic">
                                                None / Assign Later
                                            </SelectItem>
                                            {teachers.map((t: any) => (
                                                <SelectItem key={t.id} value={t.id}>
                                                    {t.account?.firstName} {t.account?.lastName}
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[11px]" />
                                </FormItem>
                            )}
                        />

                        {/* Max Capacity */}
                        <FormField
                            control={form.control as any}
                            name="maxCapacity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-bold text-foreground">Student Capacity</FormLabel>
                                    <FormControl>
                                        <Input type="number" min={1} max={150} {...field} className="h-9 text-xs rounded-xl" />
                                    </FormControl>
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
                            {mutation.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                            Create Section
                        </Button>
                    </div>
                </form>
            </Form>
        </ResponsiveModal>
    );
}
