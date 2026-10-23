import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Settings2 } from "lucide-react";
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
import type { Classroom } from "@/types/erp";
import { getBuildingBlocks, getClassroomRooms } from "@/features/school-config/api/classroomConfigApi";
import { fetchCurrentAcademicYear } from "@/features/school-config/api/academicYearApi";

const editClassroomSchema = z.object({
    academicYear: z.string().min(1, "Academic year is required"),
    blockId: z.string().optional(),
    roomId: z.string().optional(),
    roomNumber: z.string().optional(),
    classTeacherId: z.string().optional(),
    maxCapacity: z.coerce.number().min(1, "Capacity must be at least 1"),
    status: z.enum(["ACTIVE", "INACTIVE"]),
});

type EditClassroomFormValues = z.infer<typeof editClassroomSchema>;

interface EditClassroomDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroom: Classroom;
    onSuccess?: () => void;
}

export function EditClassroomDialog({
    open,
    onOpenChange,
    classroom,
    onSuccess
}: EditClassroomDialogProps) {
    const qc = useQueryClient();

    const { data: currentYear } = useQuery({
        queryKey: ["currentAcademicYear"],
        queryFn: fetchCurrentAcademicYear,
        staleTime: 60_000,
        enabled: open,
    });

    const activeYearName = classroom.academicYear || currentYear?.name || "";

    const form = useForm<EditClassroomFormValues>({
        resolver: zodResolver(editClassroomSchema) as any,
        defaultValues: {
            academicYear: activeYearName,
            blockId: classroom.blockId || "",
            roomId: classroom.roomId || "",
            roomNumber: classroom.roomNumber || "",
            classTeacherId: classroom.classTeacherId || "NONE",
            maxCapacity: classroom.maxCapacity || 40,
            status: classroom.status || "ACTIVE",
        }
    });

    useEffect(() => {
        if (open) {
            form.reset({
                academicYear: classroom.academicYear || currentYear?.name || "",
                blockId: classroom.blockId || "",
                roomId: classroom.roomId || "",
                roomNumber: classroom.roomNumber || "",
                classTeacherId: classroom.classTeacherId || "NONE",
                maxCapacity: classroom.maxCapacity || 40,
                status: classroom.status || "ACTIVE",
            });
        }
    }, [open, classroom, currentYear, form]);

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
        mutationFn: async (values: EditClassroomFormValues) => {
            const chosenBlock = blocks.find(b => b.id === values.blockId);
            const chosenRoom = rooms.find(r => r.id === values.roomId);
            const resolvedRoomNumber = chosenRoom?.roomNumber || values.roomNumber || null;

            const payload = {
                academicYear: values.academicYear,
                blockId: values.blockId || null,
                buildingBlock: chosenBlock?.name || null,
                roomId: values.roomId || null,
                roomNumber: resolvedRoomNumber,
                classTeacherId: values.classTeacherId === "NONE" ? null : values.classTeacherId,
                maxCapacity: values.maxCapacity,
                status: values.status,
            };

            const { data } = await api.put(`/classrooms/${classroom.id}`, payload);
            return data.data;
        },
        onSuccess: () => {
            toast.success("Classroom settings updated successfully");
            qc.invalidateQueries({ queryKey: ["classroom", classroom.id] });
            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["classrooms"] });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || "Failed to update classroom");
        }
    });

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            title={`Edit ${classroom.name}`}
            description="Update room allocation, student capacity, teacher leadership, and status."
            maxWidth="sm:max-w-lg"
        >
            <Form {...form}>
                <form onSubmit={form.handleSubmit((v) => mutation.mutate(v))} className="space-y-4 pt-1">
                    {/* Academic Year & Status */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="academicYear"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">Academic Year</FormLabel>
                                    <FormControl>
                                        <Input {...field} className="h-9 text-xs rounded-lg" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="status"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">Status</FormLabel>
                                    <Select value={field.value} onValueChange={field.onChange}>
                                        <FormControl>
                                            <SelectTrigger className="h-9 text-xs rounded-lg">
                                                <SelectValue />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="ACTIVE">Active</SelectItem>
                                            <SelectItem value="INACTIVE">Inactive</SelectItem>
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Building Block & Room */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="blockId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">Building Block</FormLabel>
                                    <Select
                                        value={field.value || "NONE"}
                                        onValueChange={(val) => {
                                            field.onChange(val === "NONE" ? "" : val);
                                            form.setValue("roomId", "");
                                        }}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="h-9 text-xs rounded-lg">
                                                <SelectValue placeholder="Select block…" />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="NONE" className="text-muted-foreground italic">
                                                No Block Assigned
                                            </SelectItem>
                                            {blocks.map(b => (
                                                <SelectItem key={b.id} value={b.id}>
                                                    {b.name} ({b.code})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="roomId"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">Classroom / Room</FormLabel>
                                    <Select
                                        disabled={!selectedBlockId || rooms.length === 0}
                                        value={field.value || "NONE"}
                                        onValueChange={(val) => {
                                            field.onChange(val === "NONE" ? "" : val);
                                            const r = rooms.find(rm => rm.id === val);
                                            if (r) {
                                                form.setValue("roomNumber", r.roomNumber);
                                                if (r.capacity) form.setValue("maxCapacity", r.capacity);
                                            }
                                        }}
                                    >
                                        <FormControl>
                                            <SelectTrigger className="h-9 text-xs rounded-lg">
                                                <SelectValue placeholder={!selectedBlockId ? "Select block first" : "Select room…"} />
                                            </SelectTrigger>
                                        </FormControl>
                                        <SelectContent>
                                            <SelectItem value="NONE" className="text-muted-foreground italic">
                                                Custom / Unassigned
                                            </SelectItem>
                                            {rooms.map(r => (
                                                <SelectItem key={r.id} value={r.id}>
                                                    Room {r.roomNumber} (Cap: {r.capacity})
                                                </SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Room Number fallback and Max Capacity */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <FormField
                            control={form.control}
                            name="roomNumber"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">Room Number / Identifier</FormLabel>
                                    <FormControl>
                                        <Input {...field} placeholder="e.g. 101, Lab-2" className="h-9 text-xs rounded-lg" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="maxCapacity"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-xs font-medium">Student Capacity</FormLabel>
                                    <FormControl>
                                        <Input {...field} type="number" min={1} className="h-9 text-xs rounded-lg" />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    </div>

                    {/* Class Teacher */}
                    <FormField
                        control={form.control}
                        name="classTeacherId"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-xs font-medium">Class Teacher</FormLabel>
                                <Select value={field.value || "NONE"} onValueChange={field.onChange}>
                                    <FormControl>
                                        <SelectTrigger className="h-9 text-xs rounded-lg">
                                            <SelectValue placeholder="Choose a teacher…" />
                                        </SelectTrigger>
                                    </FormControl>
                                    <SelectContent className="max-h-56">
                                        <SelectItem value="NONE" className="text-muted-foreground italic">
                                            None / Not Assigned
                                        </SelectItem>
                                        {teachers.map((t: any) => (
                                            <SelectItem key={t.id} value={t.id}>
                                                {t.account?.firstName} {t.account?.lastName} ({t.teacherId || "Teacher"})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                                <FormMessage />
                            </FormItem>
                        )}
                    />

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/60">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => onOpenChange(false)}
                            className="rounded-lg text-xs"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            size="sm"
                            disabled={mutation.isPending}
                            className="gap-2 rounded-lg text-xs font-semibold"
                        >
                            {mutation.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                            <Settings2 className="w-3.5 h-3.5" /> Save Changes
                        </Button>
                    </div>
                </form>
            </Form>
        </ResponsiveModal>
    );
}
