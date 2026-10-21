import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";

import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import api from "@/lib/api";

interface AssignClassTeacherDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    currentTeacherId?: string | null;
    classroomName: string;
    onSuccess?: () => void;
}

export function AssignClassTeacherDialog({
    open,
    onOpenChange,
    classroomId,
    currentTeacherId,
    classroomName,
    onSuccess,
}: AssignClassTeacherDialogProps) {
    const qc = useQueryClient();
    const [selectedTeacherId, setSelectedTeacherId] = useState<string>(currentTeacherId || "NONE");

    const { data: teachers = [], isLoading: teachersLoading } = useQuery({
        queryKey: ["teachersList"],
        queryFn: async () => {
            const { data } = await api.get("/teachers?limit=100");
            return data.data.teachers || [];
        },
        enabled: open,
    });

    const mutation = useMutation({
        mutationFn: async (teacherId: string | null) => {
            const { data } = await api.put(`/classrooms/${classroomId}`, {
                classTeacherId: teacherId || null
            });
            return data.data;
        },
        onSuccess: () => {
            toast.success("Class Teacher assigned successfully");
            qc.invalidateQueries({ queryKey: ["classroom", classroomId] });
            qc.invalidateQueries({ queryKey: ["classes"] });
            qc.invalidateQueries({ queryKey: ["classrooms"] });
            onOpenChange(false);
            if (onSuccess) onSuccess();
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || "Failed to assign class teacher");
        }
    });

    const handleSave = () => {
        mutation.mutate(selectedTeacherId === "NONE" ? null : selectedTeacherId);
    };

    return (
        <ResponsiveModal
            open={open}
            onOpenChange={onOpenChange}
            title="Assign Class Teacher"
            description={`Designate the Class Teacher responsible for ${classroomName}.`}
            maxWidth="sm:max-w-md"
        >
            <div className="space-y-4 pt-2">
                <div className="space-y-2">
                    <Label className="text-xs font-bold text-foreground">Select Teacher</Label>
                    <Select
                        disabled={teachersLoading}
                        value={selectedTeacherId}
                        onValueChange={setSelectedTeacherId}
                    >
                        <SelectTrigger className="h-10 text-xs rounded-xl">
                            <SelectValue placeholder="Choose a teacher…" />
                        </SelectTrigger>
                        <SelectContent className="max-h-60">
                            <SelectItem value="NONE" className="text-muted-foreground italic">
                                None / Remove Class Teacher
                            </SelectItem>
                            {teachers.map((t: any) => (
                                <SelectItem key={t.id} value={t.id}>
                                    {t.account?.firstName} {t.account?.lastName} ({t.teacherId || "Teacher"})
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                    <p className="text-[11px] text-muted-foreground">
                        The assigned Class Teacher will have oversight on attendance, gradebooks, and student notices for this section.
                    </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                    <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => onOpenChange(false)}
                        className="rounded-xl text-xs font-bold"
                    >
                        Cancel
                    </Button>
                    <Button
                        type="button"
                        onClick={handleSave}
                        disabled={mutation.isPending}
                        className="gap-2 rounded-xl text-xs font-bold bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm"
                    >
                        {mutation.isPending ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                            <UserCheck className="w-3.5 h-3.5" />
                        )}
                        Save Assignment
                    </Button>
                </div>
            </div>
        </ResponsiveModal>
    );
}
