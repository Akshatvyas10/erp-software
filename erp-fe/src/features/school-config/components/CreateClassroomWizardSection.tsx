import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    Plus, School, Calendar, Users, DoorOpen, Building,
    CalendarCheck, CheckCircle2, AlertCircle, Loader2, Sparkles
} from "lucide-react";
import { toast } from "sonner";
import api from "@/lib/api";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ResponsiveModal } from "@/components/common/ResponsiveModal";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Table, TableBody, TableCell, TableHead, TableHeader, TableRow
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { CLASSROOM_SECTIONS } from "@/types/erp";
import {
    getBuildingBlocks,
    createBuildingBlock,
    getClassroomRooms,
    getTestExamRules,
    configureClassroom,
    type TestExamConfig
} from "../api/classroomConfigApi";

interface Department {
    id: string;
    name: string;
}

interface ClassroomItem {
    id: string;
    name: string;
    section: string;
    academicYear: string;
    department?: string;
    buildingBlock?: string;
    roomNumber?: string;
    maxCapacity: number;
    studentCount?: number;
    classTeacher?: {
        id: string;
        account?: {
            firstName: string;
            lastName: string;
        }
    };
    status: 'ACTIVE' | 'INACTIVE';
}

export function CreateClassroomWizardSection() {
    const queryClient = useQueryClient();
    const [isWizardOpen, setIsWizardOpen] = useState(false);

    // Form inputs
    const [name, setName] = useState("Grade 10");
    const [section, setSection] = useState("A");
    const [academicYear, setAcademicYear] = useState("2026-2027");
    const [departmentId, setDepartmentId] = useState("");
    const [blockId, setBlockId] = useState("");
    const [roomId, setRoomId] = useState("");
    const [maxCapacity, setMaxCapacity] = useState(40);
    const [classTeacherId, setClassTeacherId] = useState("");

    // Quick add block modal within classroom setup
    const [isQuickBlockOpen, setIsQuickBlockOpen] = useState(false);
    const [quickBlockName, setQuickBlockName] = useState("");
    const [quickBlockCode, setQuickBlockCode] = useState("");

    // Evaluation Schedules (Date pickers for tests & exams populated from rules)
    const [testDates, setTestDates] = useState<{ title: string; startDate: string; endDate?: string }[]>([]);
    const [examDates, setExamDates] = useState<{ title: string; startDate: string; endDate: string }[]>([]);

    // Fetch existing classrooms
    const { data: classrooms = [], isLoading: isLoadingClassrooms } = useQuery({
        queryKey: ["classrooms"],
        queryFn: async () => {
            const res = await api.get("/classrooms");
            return res.data.data.classrooms as ClassroomItem[];
        }
    });

    // Fetch departments
    const { data: departments = [] } = useQuery({
        queryKey: ["departments"],
        queryFn: async () => {
            const res = await api.get("/departments");
            return res.data.data.departments as Department[];
        }
    });

    // Fetch teachers for class teacher selection
    const { data: teachers = [] } = useQuery({
        queryKey: ["teachers-select"],
        queryFn: async () => {
            const res = await api.get("/teachers");
            return res.data.data.teachers || [];
        }
    });

    // Fetch building blocks
    const { data: blocks = [] } = useQuery({
        queryKey: ["building-blocks"],
        queryFn: getBuildingBlocks,
    });

    // Fetch rooms (filtered by selected block)
    const { data: rooms = [] } = useQuery({
        queryKey: ["classroom-rooms", blockId],
        queryFn: () => getClassroomRooms(blockId || undefined),
    });

    // Fetch evaluation rules for selected department
    const { data: departmentRules = [] } = useQuery({
        queryKey: ["test-exam-rules", departmentId, academicYear],
        queryFn: () => getTestExamRules(departmentId, academicYear),
        enabled: !!departmentId,
    });

    // When department changes, sync evaluation schedule slots
    useEffect(() => {
        const rule: TestExamConfig | undefined = departmentRules[0];
        if (rule) {
            const currentYear = new Date().getFullYear();
            const testsCount = rule.totalTestsPerYear || 6;
            const newTests = Array.from({ length: testsCount }, (_, i) => {
                const month = Math.min(4 + i, 12);
                const monthStr = month < 10 ? `0${month}` : `${month}`;
                const title = rule.testTemplates?.[i]?.name || `Unit Test ${i + 1}`;
                return {
                    title,
                    startDate: `${currentYear}-${monthStr}-15`,
                    endDate: `${currentYear}-${monthStr}-16`,
                };
            });
            setTestDates(newTests);

            const examsCount = rule.totalExamsPerYear || 3;
            const newExams = Array.from({ length: examsCount }, (_, i) => {
                let examTitle = rule.examTemplates?.[i]?.name;
                if (!examTitle) {
                    if (examsCount === 1) examTitle = "Annual Final Examination";
                    else if (examsCount === 2) examTitle = i === 0 ? "Mid-Term Examination" : "Annual Final Examination";
                    else if (examsCount === 3) examTitle = i === 0 ? "Quarterly Examination" : i === 1 ? "Half-Yearly Examination" : "Annual Final Examination";
                    else examTitle = `Examination ${i + 1}`;
                }

                let month = 9;
                if (examsCount === 1) month = 3;
                else if (examsCount === 2) month = i === 0 ? 10 : 3;
                else if (examsCount === 3) month = i === 0 ? 8 : i === 1 ? 11 : 3;
                else if (examsCount === 4) month = i === 0 ? 7 : i === 1 ? 10 : i === 2 ? 1 : 3;

                const targetYear = month <= 4 ? currentYear + 1 : currentYear;
                const monthStr = month < 10 ? `0${month}` : `${month}`;
                return {
                    title: examTitle,
                    startDate: `${targetYear}-${monthStr}-10`,
                    endDate: `${targetYear}-${monthStr}-16`,
                };
            });
            setExamDates(newExams);
        } else {
            setTestDates([]);
            setExamDates([]);
        }
    }, [departmentRules, departmentId]);

    // Quick Block Mutation
    const quickBlockMutation = useMutation({
        mutationFn: async () => {
            return await createBuildingBlock({
                name: quickBlockName,
                code: quickBlockCode.toUpperCase(),
                status: 'ACTIVE'
            });
        },
        onSuccess: (newBlock) => {
            queryClient.invalidateQueries({ queryKey: ["building-blocks"] });
            toast.success("Block created!");
            setBlockId(newBlock.id);
            setIsQuickBlockOpen(false);
            setQuickBlockName("");
            setQuickBlockCode("");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to create block");
        }
    });

    // Create Configured Classroom Mutation
    const createClassroomMutation = useMutation({
        mutationFn: async () => {
            const selectedDept = departments.find(d => d.id === departmentId);
            const selectedRoom = rooms.find(r => r.id === roomId);
            const selectedBlock = blocks.find(b => b.id === blockId);

            return await configureClassroom({
                name,
                section,
                academicYear,
                departmentId: departmentId || undefined,
                department: selectedDept?.name,
                blockId: blockId || undefined,
                buildingBlock: selectedBlock?.name,
                roomId: roomId || undefined,
                roomNumber: selectedRoom?.roomNumber,
                maxCapacity,
                classTeacherId: classTeacherId || null,
                status: 'ACTIVE',
                testSchedules: testDates,
                examSchedules: examDates,
            });
        },
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ["classrooms"] });
            queryClient.invalidateQueries({ queryKey: ["events"] });
            toast.success(`Classroom created! ${data.eventsCreatedCount || 0} class-specific calendar events scheduled.`);
            setIsWizardOpen(false);
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to configure classroom");
        }
    });

    const selectedRoom = rooms.find(r => r.id === roomId);
    const capacityWarning = selectedRoom && selectedRoom.capacity < maxCapacity;

    return (
        <Card className="border-border/60 shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                <div>
                    <CardTitle className="text-lg font-bold flex items-center gap-2">
                        <School className="w-5 h-5 text-primary" />
                        Classrooms & Academic Configurations
                    </CardTitle>
                    <CardDescription>
                        Provision classrooms with assigned building blocks, rooms, and targeted test/exam calendar schedules.
                    </CardDescription>
                </div>

                <Button onClick={() => setIsWizardOpen(true)} className="gap-2 shrink-0">
                    <Plus className="w-4 h-4" />
                    Configure New Classroom
                </Button>
            </CardHeader>

            <CardContent>
                {isLoadingClassrooms ? (
                    <div className="space-y-2">
                        <Skeleton className="h-10 w-full" />
                        <Skeleton className="h-10 w-full" />
                    </div>
                ) : classrooms.length === 0 ? (
                    <div className="py-12 text-center text-muted-foreground flex flex-col items-center">
                        <School className="w-10 h-10 mb-2 opacity-30" />
                        <p className="font-semibold text-base">No classrooms found</p>
                        <p className="text-sm">Configure your first classroom with full physical and evaluation setup.</p>
                        <Button className="mt-4 gap-2" onClick={() => setIsWizardOpen(true)}>
                            <Plus className="w-4 h-4" /> Configure Classroom
                        </Button>
                    </div>
                ) : (
                    <div className="border border-border/60 rounded-xl overflow-hidden">
                        <Table>
                            <TableHeader className="bg-muted/40">
                                <TableRow>
                                    <TableHead className="font-bold">Classroom</TableHead>
                                    <TableHead className="font-bold">Department</TableHead>
                                    <TableHead className="font-bold">Block & Room</TableHead>
                                    <TableHead className="font-bold">Class Teacher</TableHead>
                                    <TableHead className="font-bold">Capacity</TableHead>
                                    <TableHead className="font-bold">Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {classrooms.map((c) => (
                                    <TableRow key={c.id} className="hover:bg-muted/30">
                                        <TableCell className="font-bold text-foreground">
                                            <div className="flex items-center gap-2">
                                                <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                                                    {c.section}
                                                </div>
                                                <div>
                                                    <p>{c.name} - {c.section}</p>
                                                    <p className="text-[11px] text-muted-foreground">{c.academicYear}</p>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {c.department ? (
                                                <Badge variant="outline" className="font-semibold">
                                                    {c.department}
                                                </Badge>
                                            ) : (
                                                <span className="text-xs text-muted-foreground italic">General</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            <div className="flex items-center gap-1.5">
                                                <DoorOpen className="w-3.5 h-3.5 text-primary" />
                                                <span>{c.roomNumber ? `Room ${c.roomNumber}` : "No room"}</span>
                                                {c.buildingBlock && (
                                                    <span className="text-xs text-muted-foreground/80">({c.buildingBlock})</span>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-sm text-muted-foreground">
                                            {c.classTeacher?.account ? (
                                                <div className="flex items-center gap-1.5">
                                                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                                                    <span>{c.classTeacher.account.firstName} {c.classTeacher.account.lastName}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs italic text-muted-foreground/60">Unassigned</span>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-sm">
                                            <span className="font-semibold">{c.studentCount || 0}</span>
                                            <span className="text-muted-foreground"> / {c.maxCapacity}</span>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={c.status === "ACTIVE" ? "default" : "secondary"}>
                                                {c.status}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                )}
            </CardContent>

            {/* Modal: Classroom Configuration Wizard */}
            <ResponsiveModal
                open={isWizardOpen}
                onOpenChange={setIsWizardOpen}
                title="Configure New Classroom"
                description="Complete academic, physical infrastructure, and calendar schedule setup."
            >
                <div className="space-y-6">
                    {/* Section 1: Academic Identity */}
                    <div className="p-4 rounded-2xl border border-border/70 bg-card/60 space-y-4">
                        <div className="flex items-center gap-2">
                            <School className="w-4 h-4 text-primary" />
                            <h4 className="font-bold text-sm text-foreground">1. Academic Identity</h4>
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Class Name</label>
                                <Input
                                    placeholder="e.g. Grade 10"
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Section (A - G)</label>
                                <Select value={section} onValueChange={setSection}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Section" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {CLASSROOM_SECTIONS.map((sec) => (
                                            <SelectItem key={sec} value={sec}>
                                                Section {sec}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Academic Year</label>
                                <Select value={academicYear} onValueChange={setAcademicYear}>
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="2025-2026">2025-2026</SelectItem>
                                        <SelectItem value="2026-2027">2026-2027</SelectItem>
                                        <SelectItem value="2027-2028">2027-2028</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>

                        {/* Department Selection */}
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                Academic Department (Controls Tests & Exam Rules)
                            </label>
                            <Select value={departmentId} onValueChange={setDepartmentId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Select Department (e.g. Primary, Mid, High Secondary)" />
                                </SelectTrigger>
                                <SelectContent>
                                    {departments.map(d => (
                                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Section 2: Physical Room & Block Allocation */}
                    <div className="p-4 rounded-2xl border border-border/70 bg-card/60 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Building className="w-4 h-4 text-primary" />
                                <h4 className="font-bold text-sm text-foreground">2. Campus Room & Block</h4>
                            </div>
                            <button
                                type="button"
                                onClick={() => setIsQuickBlockOpen(true)}
                                className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
                            >
                                <Plus className="w-3.5 h-3.5" /> New Block
                            </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Building Block</label>
                                <Select value={blockId} onValueChange={(val) => { setBlockId(val); setRoomId(""); }}>
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select Block" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">-- None --</SelectItem>
                                        {blocks.map(b => (
                                            <SelectItem key={b.id} value={b.id}>{b.name} ({b.code})</SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Assigned Room</label>
                                <Select value={roomId} onValueChange={setRoomId} disabled={!blockId}>
                                    <SelectTrigger>
                                        <SelectValue placeholder={blockId ? "Select Room" : "Select Block first"} />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="">-- Unassigned --</SelectItem>
                                        {rooms.map(r => (
                                            <SelectItem key={r.id} value={r.id}>
                                                Room {r.roomNumber} (Cap: {r.capacity})
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Student Capacity</label>
                                <Input
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={maxCapacity}
                                    onChange={(e) => setMaxCapacity(parseInt(e.target.value, 10) || 40)}
                                />
                            </div>
                        </div>

                        {capacityWarning && (
                            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold">
                                <AlertCircle className="w-4 h-4 shrink-0" />
                                <span>Warning: Selected Room {selectedRoom.roomNumber} has capacity of {selectedRoom.capacity}, which is less than requested class capacity ({maxCapacity}).</span>
                            </div>
                        )}
                    </div>

                    {/* Section 3: Staffing */}
                    <div className="p-4 rounded-2xl border border-border/70 bg-card/60 space-y-3">
                        <div className="flex items-center gap-2">
                            <Users className="w-4 h-4 text-primary" />
                            <h4 className="font-bold text-sm text-foreground">3. Staffing & Class Teacher</h4>
                        </div>

                        <div className="space-y-1">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Class Teacher (Optional)</label>
                            <Select value={classTeacherId} onValueChange={setClassTeacherId}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Assign a teacher" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="">-- Unassigned --</SelectItem>
                                    {teachers.map((t: any) => (
                                        <SelectItem key={t.id} value={t.id}>
                                            {t.account?.firstName} {t.account?.lastName} ({t.teacherId || "Teacher"})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Section 4: Academic Calendar Evaluation Schedule */}
                    <div className="p-4 rounded-2xl border border-border/70 bg-card/60 space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <CalendarCheck className="w-4 h-4 text-primary" />
                                <h4 className="font-bold text-sm text-foreground">4. Department Test & Exam Schedule</h4>
                            </div>
                            <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-xs">
                                Classroom-Specific Calendar Only
                            </Badge>
                        </div>

                        <p className="text-xs text-muted-foreground">
                            Dates selected below will automatically publish to the Academic Calendar <strong>strictly for students of this classroom ({name} {section})</strong>.
                        </p>

                        {!departmentId ? (
                            <div className="p-4 rounded-xl border border-dashed border-border/80 text-center text-xs text-muted-foreground">
                                Select a Department above to load its evaluation rules and configure test/exam dates.
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {/* Unit Tests List */}
                                <div className="space-y-2">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Sparkles className="w-3.5 h-3.5 text-blue-500" />
                                        Unit Tests Dates ({testDates.length} Tests)
                                    </span>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                                        {testDates.map((test, idx) => (
                                            <div key={idx} className="p-2.5 rounded-xl border border-border/60 bg-muted/40 flex items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-foreground truncate">{test.title}</span>
                                                <Input
                                                    type="date"
                                                    value={test.startDate}
                                                    onChange={(e) => {
                                                        const updated = [...testDates];
                                                        updated[idx].startDate = e.target.value;
                                                        setTestDates(updated);
                                                    }}
                                                    className="w-36 h-8 text-xs font-medium"
                                                />
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Exams List */}
                                <div className="space-y-2 pt-2">
                                    <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                                        <Calendar className="w-3.5 h-3.5 text-purple-600" />
                                        Examinations Period ({examDates.length} Exams)
                                    </span>
                                    <div className="space-y-2">
                                        {examDates.map((exam, idx) => (
                                            <div key={idx} className="p-2.5 rounded-xl border border-purple-500/20 bg-purple-500/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                                <span className="text-xs font-bold text-foreground">{exam.title}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] text-muted-foreground">From:</span>
                                                    <Input
                                                        type="date"
                                                        value={exam.startDate}
                                                        onChange={(e) => {
                                                            const updated = [...examDates];
                                                            updated[idx].startDate = e.target.value;
                                                            setExamDates(updated);
                                                        }}
                                                        className="w-32 h-8 text-xs font-medium"
                                                    />
                                                    <span className="text-[11px] text-muted-foreground">To:</span>
                                                    <Input
                                                        type="date"
                                                        value={exam.endDate}
                                                        onChange={(e) => {
                                                            const updated = [...examDates];
                                                            updated[idx].endDate = e.target.value;
                                                            setExamDates(updated);
                                                        }}
                                                        className="w-32 h-8 text-xs font-medium"
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-3 pt-2">
                        <Button variant="outline" onClick={() => setIsWizardOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => createClassroomMutation.mutate()}
                            disabled={!name.trim() || !section.trim() || capacityWarning || createClassroomMutation.isPending}
                            className="gap-2"
                        >
                            {createClassroomMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                            Create & Publish Calendar
                        </Button>
                    </div>
                </div>
            </ResponsiveModal>

            {/* Quick Add Block Modal */}
            <ResponsiveModal
                open={isQuickBlockOpen}
                onOpenChange={setIsQuickBlockOpen}
                title="Quick Add Building Block"
                description="Create a block to immediately assign to this classroom."
            >
                <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Block Name</label>
                        <Input
                            placeholder="e.g. Science Block, West Wing"
                            value={quickBlockName}
                            onChange={(e) => {
                                const val = e.target.value;
                                setQuickBlockName(val);
                                setQuickBlockCode(
                                    val.trim().toUpperCase().replace(/[^A-Z0-9\s-]/g, "").replace(/\s+/g, "-").slice(0, 20)
                                );
                            }}
                        />
                    </div>
                    <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Block Code</label>
                            <span className="text-[10px] text-muted-foreground italic">Auto-generated slug</span>
                        </div>
                        <Input
                            placeholder="e.g. BLK-SCI, BLK-W"
                            value={quickBlockCode}
                            onChange={(e) => setQuickBlockCode(e.target.value.toUpperCase())}
                        />
                    </div>
                    <div className="flex justify-end gap-2 pt-4">
                        <Button variant="outline" onClick={() => setIsQuickBlockOpen(false)}>Cancel</Button>
                        <Button
                            onClick={() => quickBlockMutation.mutate()}
                            disabled={!quickBlockName.trim() || !quickBlockCode.trim() || quickBlockMutation.isPending}
                        >
                            {quickBlockMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                            Save & Select Block
                        </Button>
                    </div>
                </div>
            </ResponsiveModal>
        </Card>
    );
}
