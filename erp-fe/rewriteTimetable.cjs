const fs = require('fs');
const path = require('path');

const filePath = path.join('d:', 'STARTUP', 'ERP', 'erp-fe', 'src', 'pages', 'dashboard', 'ClassroomDetails.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const replacement = `// ─── Timetable UI Rewrite ───────────────────────────────────────────────────

interface ManagePeriodsDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    periods: ClassroomPeriod[];
    onSuccess: () => void;
}

function ManagePeriodsDialog({ open, onOpenChange, classroomId, periods, onSuccess }: ManagePeriodsDialogProps) {
    const [name, setName] = useState("");
    const [startTime, setStartTime] = useState("08:00");
    const [endTime, setEndTime] = useState("08:45");
    const qc = useQueryClient();

    const addMutation = useMutation({
        mutationFn: (data: { name: string, startTime: string, endTime: string, order: number }) =>
            api.post(\`/classrooms/\${classroomId}/periods\`, data),
        onSuccess: () => {
            toast.success("Period added");
            setName("");
            onSuccess();
        },
        onError: () => toast.error("Failed to add period"),
    });

    const deleteMutation = useMutation({
        mutationFn: (id: string) => api.delete(\`/classrooms/\${classroomId}/periods/\${id}\`),
        onSuccess: () => {
            toast.success("Period deleted");
            onSuccess();
        },
        onError: () => toast.error("Failed to delete period"),
    });

    const TIME_OPTIONS = Array.from({ length: 24 * 4 }).map((_, i) => {
        const totalMinutes = i * 15;
        const hour = Math.floor(totalMinutes / 60).toString().padStart(2, '0');
        const min = (totalMinutes % 60).toString().padStart(2, '0');
        return \`\${hour}:\${min}\`;
    });

    const inputCls = "h-9 bg-zinc-100 dark:bg-zinc-900/50 border-none focus-visible:ring-1 focus-visible:ring-purple-500/50";
    const labelCls = "text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block";

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md p-0 rounded-2xl border border-border/80 shadow-2xl bg-white dark:bg-zinc-950">
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border">
                    <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                        Manage Lectures
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-12 gap-3 items-end">
                        <div className="col-span-4">
                            <label className={labelCls}>Name</label>
                            <Input placeholder="e.g. Lecture 1" value={name} onChange={e => setName(e.target.value)} className={inputCls} />
                        </div>
                        <div className="col-span-3">
                            <label className={labelCls}>Start</label>
                            <Select value={startTime} onValueChange={setStartTime}>
                                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-40">{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-3">
                            <label className={labelCls}>End</label>
                            <Select value={endTime} onValueChange={setEndTime}>
                                <SelectTrigger className={inputCls}><SelectValue /></SelectTrigger>
                                <SelectContent className="max-h-40">{TIME_OPTIONS.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                            </Select>
                        </div>
                        <div className="col-span-2">
                            <Button className="w-full h-9 bg-purple-700 hover:bg-purple-800 text-white" disabled={!name || addMutation.isPending}
                                onClick={() => addMutation.mutate({ name, startTime, endTime, order: periods.length + 1 })}>
                                Add
                            </Button>
                        </div>
                    </div>

                    <ScrollArea className="h-[200px] w-full rounded-xl border border-border/50 p-2">
                        {periods.length === 0 ? (
                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground italic">No periods defined.</div>
                        ) : (
                            <div className="space-y-1">
                                {periods.map(p => (
                                    <div key={p.id} className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-muted/50 text-sm">
                                        <div className="font-semibold text-foreground">{p.name}</div>
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs text-muted-foreground font-mono">{p.startTime.substring(0,5)} - {p.endTime.substring(0,5)}</span>
                                            <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive/60 hover:text-destructive" onClick={() => deleteMutation.mutate(p.id)}>
                                                <Trash2 className="h-3 w-3" />
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </ScrollArea>
                </div>
            </DialogContent>
        </Dialog>
    );
}

interface BookSlotDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    classroomId: string;
    dayOfWeek: DayOfWeek;
    period: ClassroomPeriod | null;
    subjects: ClassroomSubject[];
    onSuccess: () => void;
}

function BookSlotDialog({ open, onOpenChange, classroomId, dayOfWeek, period, subjects, onSuccess }: BookSlotDialogProps) {
    const [subjectId, setSubjectId] = useState("");
    const mutation = useMutation({
        mutationFn: (sid: string) => api.post(\`/classrooms/\${classroomId}/subjects/\${sid}/timetable\`, {
            dayOfWeek, startTime: period?.startTime, endTime: period?.endTime
        }),
        onSuccess: () => {
            toast.success("Slot booked");
            setSubjectId("");
            onSuccess();
            onOpenChange(false);
        },
        onError: () => toast.error("Failed to book slot")
    });

    if (!period) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-sm p-0 rounded-2xl border border-border/80 shadow-2xl">
                <DialogHeader className="px-6 py-5 bg-muted/40 border-b border-border">
                    <DialogTitle className="text-base font-bold tracking-tight text-foreground">
                        Book Slot - {dayOfWeek} {period.name}
                    </DialogTitle>
                </DialogHeader>
                <div className="p-6">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1 block">Select Subject</label>
                    <Select value={subjectId} onValueChange={setSubjectId}>
                        <SelectTrigger className="h-9 w-full bg-zinc-100 dark:bg-zinc-900/50">
                            <SelectValue placeholder="Choose a subject..." />
                        </SelectTrigger>
                        <SelectContent>
                            {subjects.map(s => (
                                <SelectItem key={s.id} value={s.id}>
                                    {s.subject?.name} {s.teacher ? \`(\${s.teacher.account.firstName} \${s.teacher.account.lastName})\` : ""}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="px-6 py-4 bg-muted/40 border-t border-border flex justify-end gap-3">
                    <Button variant="outline" className="rounded-xl font-medium" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button className="bg-purple-700 hover:bg-purple-800 text-white rounded-xl font-semibold" disabled={!subjectId || mutation.isPending} onClick={() => mutation.mutate(subjectId)}>
                        {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Book Slot"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}

// ─── TAB B: Timetable Builder ─────────────────────────────────────────────────

interface TimetableTabProps {
    classroomId: string;
    subjects: ClassroomSubject[];
    periods: ClassroomPeriod[];
    canEdit: boolean;
    onRefresh: () => void;
}

function TimetableTab({ classroomId, subjects, periods, canEdit, onRefresh }: TimetableTabProps) {
    const [managePeriodsOpen, setManagePeriodsOpen] = useState(false);
    const [bookSlotData, setBookSlotData] = useState<{ open: boolean; dayOfWeek: DayOfWeek; period: ClassroomPeriod | null }>({ open: false, dayOfWeek: 'Monday', period: null });
    const [removeSlotId, setRemoveSlotId] = useState<string | null>(null);

    const sortedPeriods = [...periods].sort((a, b) => a.order - b.order);

    const removeSlotMutation = useMutation({
        mutationFn: ({ subjectId, slotId }: { subjectId: string; slotId: string }) =>
            api.delete(\`/classrooms/\${classroomId}/subjects/\${subjectId}/timetable/\${slotId}\`),
        onSuccess: () => { toast.success("Slot removed"); setRemoveSlotId(null); onRefresh(); },
        onError: () => toast.error("Failed to remove slot"),
    });

    // Build lookup: dayOfWeek -> periodId -> { slot, subject }
    const slotMatrix = useMemo(() => {
        const map: Record<string, Record<string, { slot: TimetableSlot, subject: ClassroomSubject }>> = {};
        for (const subj of subjects) {
            for (const slot of subj.schedule ?? []) {
                if (!map[slot.dayOfWeek]) map[slot.dayOfWeek] = {};
                // Find period matching this slot's time exactly
                const period = periods.find(p => p.startTime.substring(0,5) === slot.startTime.substring(0,5) && p.endTime.substring(0,5) === slot.endTime.substring(0,5));
                if (period) {
                    map[slot.dayOfWeek][period.id] = { slot, subject: subj };
                }
            }
        }
        return map;
    }, [subjects, periods]);

    const handleCellClick = (day: DayOfWeek, period: ClassroomPeriod, existing: any) => {
        if (!canEdit) return;
        if (existing) {
            setRemoveSlotId(\`\${existing.subject.id}::\${existing.slot.id}\`);
        } else {
            setBookSlotData({ open: true, dayOfWeek: day, period });
        }
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wider text-purple-900/50 dark:text-zinc-500">
                    {periods.length} Lecture{periods.length !== 1 ? "s" : ""} configured
                </p>
                {canEdit && (
                    <Button size="sm" onClick={() => setManagePeriodsOpen(true)}
                        className="gap-2 h-9 px-4 bg-purple-700 hover:bg-purple-800 dark:bg-purple-600
                                   dark:hover:bg-purple-500 text-white rounded-xl font-semibold shadow-md">
                        <Clock className="h-3.5 w-3.5" /> Manage Lectures
                    </Button>
                )}
            </div>

            {periods.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-14 text-muted-foreground gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-purple-600/5 dark:bg-purple-500/10
                                    border border-purple-100 dark:border-zinc-800 flex items-center justify-center">
                        <LayoutGrid className="h-6 w-6 text-purple-400/60" />
                    </div>
                    <p className="text-sm font-bold text-purple-950/40 dark:text-zinc-500">No lectures defined</p>
                    <p className="text-xs text-muted-foreground/60">Add lectures to construct the timetable grid.</p>
                </div>
            ) : (
                <div className="rounded-2xl border border-purple-100 dark:border-zinc-800 overflow-hidden
                                shadow-[0_6px_24px_-4px_rgba(0,0,0,0.06)] dark:shadow-[0_6px_24px_-4px_rgba(0,0,0,0.3)]">
                    <div className="overflow-x-auto custom-scrollbar">
                        <table className="w-full min-w-[800px] text-sm border-collapse">
                            <thead>
                                <tr className="bg-purple-50/80 dark:bg-zinc-900/60 border-b border-purple-100 dark:border-zinc-800">
                                    <th className="pl-5 py-3.5 text-left min-w-[120px] text-[11px] font-bold uppercase tracking-wider text-muted-foreground sticky left-0 bg-purple-50/80 dark:bg-zinc-900/90 z-10">
                                        Day
                                    </th>
                                    {sortedPeriods.map(p => (
                                        <th key={p.id} className="py-3.5 px-3 text-center min-w-[140px] border-l border-purple-100/50 dark:border-zinc-800/50">
                                            <div className="text-[11px] font-bold uppercase tracking-wider text-purple-700 dark:text-purple-400">{p.name}</div>
                                            <div className="text-[10px] text-muted-foreground mt-0.5 font-mono">{p.startTime.substring(0,5)} - {p.endTime.substring(0,5)}</div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {WEEKDAYS.map((day, rowIdx) => (
                                    <tr key={day} className="border-b border-purple-100/60 dark:border-zinc-800/60 last:border-0 hover:bg-purple-500/[0.02] dark:hover:bg-purple-500/[0.03] transition-colors">
                                        <td className="pl-5 py-4 font-bold text-[12px] text-foreground sticky left-0 bg-white/95 dark:bg-zinc-950/95 z-10 shadow-[1px_0_0_0_rgba(0,0,0,0.05)] dark:shadow-[1px_0_0_0_rgba(255,255,255,0.05)]">
                                            {day}
                                        </td>
                                        {sortedPeriods.map(p => {
                                            const existing = slotMatrix[day]?.[p.id];
                                            const colorCls = existing ? SUBJECT_COLORS[(subjects.findIndex(s => s.id === existing.subject.id) || 0) % SUBJECT_COLORS.length] : "";
                                            return (
                                                <td key={p.id} className="py-2 px-2 border-l border-purple-100/50 dark:border-zinc-800/50 align-middle">
                                                    <div 
                                                        onClick={() => handleCellClick(day, p, existing)}
                                                        className={cn(
                                                            "h-16 rounded-xl flex flex-col items-center justify-center text-center p-2 transition-all cursor-pointer border",
                                                            existing 
                                                                ? \`\${colorCls} group relative\`
                                                                : "border-dashed border-purple-200 dark:border-zinc-700 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/10 text-transparent hover:text-purple-400"
                                                        )}
                                                    >
                                                        {existing ? (
                                                            <>
                                                                <div className="text-[11px] font-bold leading-tight line-clamp-1">{existing.subject.subject?.name}</div>
                                                                <div className="text-[9px] opacity-80 mt-1 line-clamp-1 truncate w-full px-1">
                                                                    {existing.subject.teacher ? \`\${existing.subject.teacher.account.firstName} \${existing.subject.teacher.account.lastName}\` : "No Teacher"}
                                                                </div>
                                                                {canEdit && (
                                                                    <div className="absolute inset-0 bg-destructive/90 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold gap-1">
                                                                        <X className="h-3 w-3" /> Remove
                                                                    </div>
                                                                )}
                                                            </>
                                                        ) : (
                                                            <Plus className="h-4 w-4" />
                                                        )}
                                                    </div>
                                                </td>
                                            );
                                        })}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            <ManagePeriodsDialog
                open={managePeriodsOpen}
                onOpenChange={setManagePeriodsOpen}
                classroomId={classroomId}
                periods={periods}
                onSuccess={onRefresh}
            />

            <BookSlotDialog
                open={bookSlotData.open}
                onOpenChange={v => setBookSlotData(prev => ({ ...prev, open: v }))}
                classroomId={classroomId}
                dayOfWeek={bookSlotData.dayOfWeek}
                period={bookSlotData.period}
                subjects={subjects}
                onSuccess={onRefresh}
            />

            <AlertDialog open={!!removeSlotId} onOpenChange={v => !v && setRemoveSlotId(null)}>
                <AlertDialogContent className="rounded-xl border border-purple-100 dark:border-zinc-800 bg-white dark:bg-zinc-950 shadow-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-purple-950 dark:text-zinc-50 font-bold">Remove Subject from Slot?</AlertDialogTitle>
                        <AlertDialogDescription className="text-purple-900/70 dark:text-zinc-400">This will empty the period for this day.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="mt-4 gap-2">
                        <AlertDialogCancel className="bg-purple-100/50 dark:bg-zinc-900 text-purple-950 dark:text-zinc-300 hover:bg-purple-100 dark:hover:bg-zinc-800 border-none h-10 px-4 rounded-lg font-semibold">Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={() => {
                                if (!removeSlotId) return;
                                const [subjectId, slotId] = removeSlotId.split("::");
                                removeSlotMutation.mutate({ subjectId, slotId });
                            }}
                            className="bg-destructive hover:bg-destructive/90 text-white h-10 px-4 rounded-lg font-semibold"
                        >
                            {removeSlotMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Remove"}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
`;

const startMarker = "// ─── Add Timetable Slot Dialog";
const endMarker = "// ─── Tab type";

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    const newContent = content.substring(0, startIndex) + replacement + "\n" + content.substring(endIndex);
    fs.writeFileSync(filePath, newContent, 'utf8');
    console.log("Successfully replaced Timetable UI.");
} else {
    console.log("Markers not found.");
}
