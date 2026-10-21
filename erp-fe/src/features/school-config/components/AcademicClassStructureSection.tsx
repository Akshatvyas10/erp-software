import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, School, Trash2, Loader2, ArrowRight, Layers
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import {
    Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import {
    fetchAcademicClasses,
    deleteAcademicClass,
    fetchPredefinedClasses,
    type PredefinedClassItem
} from "@/features/classrooms/api/classApi";

interface Department {
    id: string;
    name: string;
    headId?: string | null;
    head?: {
        account?: {
            firstName: string;
            lastName: string;
        };
    };
}

export function AcademicClassStructureSection() {
    const queryClient = useQueryClient();
    const [isAddClassOpen, setIsAddClassOpen] = useState(false);
    const [selectedClassCode, setSelectedClassCode] = useState("");
    const [selectedDeptId, setSelectedDeptId] = useState("__NONE__");

    // 1. Fetch current configured classes (already ordered by sequenceOrder/orderIndex)
    const {
        data: classes = [],
        isLoading: isLoadingClasses
    } = useQuery({
        queryKey: ["classes"],
        queryFn: () => fetchAcademicClasses(),
    });

    // 2. Fetch predefined standard catalog from backend
    const {
        data: predefinedClasses = []
    } = useQuery<PredefinedClassItem[]>({
        queryKey: ["predefinedClasses"],
        queryFn: fetchPredefinedClasses,
    });

    // 3. Fetch existing departments for linking
    const { data: departments = [] } = useQuery<Department[]>({
        queryKey: ["departments"],
        queryFn: async () => {
            const res = await api.get("/departments");
            return res.data.data.departments || [];
        }
    });

    // Determine which classes are already configured
    const configuredCodes = new Set(classes.map(c => c.code.toUpperCase()));
    const configuredNames = new Set(classes.map(c => c.name.toLowerCase()));

    // Available predefined classes that haven't been added yet
    const availablePredefined = predefinedClasses.filter(
        c => !configuredCodes.has(c.code.toUpperCase()) && !configuredNames.has(c.name.toLowerCase())
    );

    // Mutation: Add predefined class
    const addClassMutation = useMutation({
        mutationFn: async ({ code, departmentId }: { code: string; departmentId?: string | null }) => {
            const predefined = predefinedClasses.find(p => p.code === code);
            if (!predefined) throw new Error("Invalid predefined class selected");

            const payload: Record<string, any> = {
                name: predefined.name,
                code: predefined.code,
                orderIndex: predefined.sequenceOrder,
                status: "ACTIVE"
            };

            if (departmentId && departmentId !== "__NONE__") {
                payload.departmentId = departmentId;
            }

            const { data } = await api.post("/classes", payload);
            return data.data;
        },
        onSuccess: (data) => {
            toast.success(`Class "${data.class.name}" added to school structure!`);
            queryClient.invalidateQueries({ queryKey: ["classes"] });
            queryClient.invalidateQueries({ queryKey: ["classSetupStatus"] });
            setIsAddClassOpen(false);
            setSelectedClassCode("");
            setSelectedDeptId("__NONE__");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || "Failed to add class");
        }
    });

    // Mutation: Delete configured class
    const deleteMutation = useMutation({
        mutationFn: (id: string) => deleteAcademicClass(id),
        onSuccess: () => {
            toast.success("Class removed from structure");
            queryClient.invalidateQueries({ queryKey: ["classes"] });
            queryClient.invalidateQueries({ queryKey: ["classSetupStatus"] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || err.message || "Failed to delete class");
        }
    });

    const handleSaveClass = () => {
        if (!selectedClassCode) {
            toast.error("Please select a standard class from the list");
            return;
        }
        addClassMutation.mutate({
            code: selectedClassCode,
            departmentId: selectedDeptId === "__NONE__" ? null : selectedDeptId
        });
    };

    return (
        <Card className="border-border/60 shadow-xs">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                <div>
                    <div className="flex items-center gap-2">
                        <CardTitle className="text-lg font-bold flex items-center gap-2">
                            <School className="w-5 h-5 text-primary" />
                            Academic Class Structure & Progression
                        </CardTitle>
                        <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold text-xs">
                            Central Source of Truth
                        </Badge>
                    </div>
                    <CardDescription className="mt-1">
                        Configure the exact grades offered by your school. Progression & promotions follow this sequence order.
                    </CardDescription>
                </div>

                <Button
                    onClick={() => {
                        setSelectedClassCode(availablePredefined[0]?.code || "");
                        setSelectedDeptId("__NONE__");
                        setIsAddClassOpen(true);
                    }}
                    disabled={availablePredefined.length === 0}
                    className="gap-2 shrink-0 rounded-xl font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/95"
                >
                    <Plus className="w-4 h-4" />
                    Add Class
                </Button>
            </CardHeader>

            <CardContent className="space-y-4">
                {/* Visual Sequence Progression Ribbon */}
                {classes.length > 0 && (
                    <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/70 space-y-2">
                        <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                                <Layers className="w-3.5 h-3.5 text-primary" /> Active Progression Sequence ({classes.length} Grades)
                            </span>
                            <span className="text-[11px] text-muted-foreground">
                                Automated next-class promotion flow
                            </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-1.5 pt-1">
                            {classes.map((cls, idx) => (
                                <div key={cls.id} className="flex items-center gap-1.5">
                                    <Badge
                                        variant="secondary"
                                        className="py-1 px-2.5 rounded-lg text-xs font-bold border border-border/80 bg-background text-foreground shadow-2xs"
                                    >
                                        <span className="text-primary font-black mr-1">{cls.orderIndex}.</span>
                                        {cls.name}
                                    </Badge>
                                    {idx < classes.length - 1 && (
                                        <ArrowRight className="w-3 h-3 text-muted-foreground/60 shrink-0" />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Table of configured classes */}
                {isLoadingClasses ? (
                    <div className="space-y-2 py-4">
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                        <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                ) : classes.length === 0 ? (
                    <div className="text-center py-12 border border-dashed rounded-2xl border-border/80 p-6 space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center">
                            <School className="w-6 h-6" />
                        </div>
                        <h4 className="font-bold text-base text-foreground">No Classes Configured Yet</h4>
                        <p className="text-xs text-muted-foreground max-w-md mx-auto">
                            Add your school's grades one by one (e.g. Nursery, Class 8, Class 10). They will automatically be sorted in real-world educational order.
                        </p>
                        <Button
                            size="sm"
                            onClick={() => {
                                setSelectedClassCode(availablePredefined[0]?.code || "");
                                setIsAddClassOpen(true);
                            }}
                            className="rounded-xl font-bold gap-1.5"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add First Class
                        </Button>
                    </div>
                ) : (
                    <div className="rounded-xl border border-border/70 overflow-hidden">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead className="w-20 font-bold text-xs">Seq #</TableHead>
                                    <TableHead className="font-bold text-xs">Class Name</TableHead>
                                    <TableHead className="font-bold text-xs">Class Code</TableHead>
                                    <TableHead className="font-bold text-xs">Department</TableHead>
                                    <TableHead className="font-bold text-xs">Department Incharge</TableHead>
                                    <TableHead className="font-bold text-xs">Sections</TableHead>
                                    <TableHead className="text-right font-bold text-xs">Action</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classes.map((cls) => {
                                    const dept = departments.find(d => d.id === cls.departmentId);
                                    const inchargeName = dept?.head?.account
                                        ? `${dept.head.account.firstName} ${dept.head.account.lastName}`
                                        : null;

                                    return (
                                        <TableRow key={cls.id} className="hover:bg-muted/30">
                                            <TableCell className="font-black text-primary text-sm">
                                                {cls.orderIndex}
                                            </TableCell>
                                            <TableCell className="font-bold text-foreground">
                                                {cls.name}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="font-mono text-[11px] font-bold">
                                                    {cls.code}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {dept ? (
                                                    <Badge variant="secondary" className="font-semibold text-xs">
                                                        {dept.name}
                                                    </Badge>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground/60 italic">Unassigned</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                {inchargeName ? (
                                                    <span className="text-xs font-medium text-foreground">
                                                        {inchargeName}
                                                    </span>
                                                ) : (
                                                    <span className="text-xs text-muted-foreground/60 italic">None</span>
                                                )}
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="text-xs font-semibold">
                                                    {cls.sections?.length || 0} Sections
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    disabled={deleteMutation.isPending}
                                                    onClick={() => {
                                                        if (confirm(`Remove "${cls.name}" from school structure?`)) {
                                                            deleteMutation.mutate(cls.id);
                                                        }
                                                    }}
                                                    className="h-8 w-8 text-destructive hover:bg-destructive/10 rounded-lg"
                                                    title="Delete Class"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            {/* Modal: Add Class (Predefined Dropdown Only - No Custom Input) */}
            <ResponsiveModal
                open={isAddClassOpen}
                onOpenChange={setIsAddClassOpen}
                title="Add Class to School Structure"
                description="Select a predefined standard grade to add to the institution structure."
                maxWidth="sm:max-w-md"
            >
                <div className="space-y-4 pt-1">
                    {/* Class Select Dropdown (Predefined Only) */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground flex items-center justify-between">
                            <span>Predefined Standard Class *</span>
                            <span className="text-[10px] text-muted-foreground font-normal">Standard ERP Catalog</span>
                        </label>
                        <Select value={selectedClassCode} onValueChange={setSelectedClassCode}>
                            <SelectTrigger className="h-10 text-xs font-bold rounded-xl bg-background">
                                <SelectValue placeholder="Choose standard class..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-60">
                                {predefinedClasses.map((item) => {
                                    const isAlreadyAdded = configuredCodes.has(item.code.toUpperCase()) || configuredNames.has(item.name.toLowerCase());
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
                                                    {isAlreadyAdded ? "(Already Added)" : `[${item.departmentCategory}]`}
                                                </span>
                                            </div>
                                        </SelectItem>
                                    );
                                })}
                            </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                            Custom class names are disabled by institutional policy to guarantee valid progression and promotion paths.
                        </p>
                    </div>

                    {/* Department Mapping Dropdown */}
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-foreground">
                            Department Mapping (Optional)
                        </label>
                        <Select value={selectedDeptId} onValueChange={setSelectedDeptId}>
                            <SelectTrigger className="h-10 text-xs rounded-xl bg-background">
                                <SelectValue placeholder="Select Department" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="__NONE__">-- Unassigned --</SelectItem>
                                {departments.map(d => {
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
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-3 border-t border-border/70">
                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => setIsAddClassOpen(false)}
                            className="rounded-xl text-xs font-bold"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="button"
                            disabled={!selectedClassCode || addClassMutation.isPending}
                            onClick={handleSaveClass}
                            className="gap-2 rounded-xl text-xs font-bold shadow-xs bg-primary text-primary-foreground hover:bg-primary/95"
                        >
                            {addClassMutation.isPending ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                                <Plus className="w-3.5 h-3.5" />
                            )}
                            Save Class
                        </Button>
                    </div>
                </div>
            </ResponsiveModal>
        </Card>
    );
}
