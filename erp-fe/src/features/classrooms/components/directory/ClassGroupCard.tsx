import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
    School, Users, Plus, DoorOpen, UserCheck,
    MoreVertical, Pencil, Trash2, ArrowRight, ShieldCheck, AlertTriangle, Copy
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
    DropdownMenu, DropdownMenuContent, DropdownMenuItem,
    DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { AcademicClass, Classroom } from "@/types/erp";
import { useAuth } from "@/store/hooks";
import { cn } from "@/lib/utils";

interface ClassGroupCardProps {
    academicClass: AcademicClass;
    canCreate: boolean;
    canEdit: boolean;
    canDelete: boolean;
    onAddSection: (cls: AcademicClass) => void;
    onEditClass?: (cls: AcademicClass) => void;
    onDeleteClass?: (id: string) => void;
    onEditSection?: (section: Classroom) => void;
    onDeleteSection?: (id: string) => void;
    onCloneSection?: (section: Classroom) => void;
}

export function ClassGroupCard({
    academicClass,
    canCreate,
    canEdit,
    canDelete,
    onAddSection,
    onEditClass,
    onDeleteClass,
    onEditSection,
    onDeleteSection,
    onCloneSection,
}: ClassGroupCardProps) {
    const navigate = useNavigate();
    const { user } = useAuth();
    const sections = academicClass.sections || [];
    const totalStudents = academicClass.totalStudents ?? sections.reduce((acc, s) => acc + (s.studentCount || 0), 0);

    // Resolve Incharge from Department
    const inchargeLead =
        academicClass.department?.incharge ||
        academicClass.department?.inchargeTeacher ||
        academicClass.department?.head ||
        null;
    const inchargeName = inchargeLead?.account
        ? `${inchargeLead.account.firstName} ${inchargeLead.account.lastName}`.trim()
        : null;

    return (
        <Card className="border border-border/80 shadow-xs hover:shadow-sm transition-all rounded-2xl sm:rounded-3xl overflow-hidden bg-card/80 backdrop-blur-xs">
            {/* Class Header Bar */}
            <div className="p-3 sm:p-5 border-b border-border/70 bg-gradient-to-r from-muted/30 via-muted/15 to-transparent flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 sm:gap-3">
                <div className="flex items-center gap-2.5 sm:gap-3.5">
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/25 text-primary flex items-center justify-center font-black text-xs sm:text-sm shrink-0 border border-primary/30 shadow-2xs">
                        {academicClass.orderIndex || <School className="w-4 h-4 sm:w-5 sm:h-5" />}
                    </div>
                    <div className="min-w-0">
                        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                            <h3 className="font-black text-base sm:text-lg text-foreground tracking-tight">
                                {academicClass.name}
                            </h3>

                            {/* Department Badge */}
                            {academicClass.department?.name && (
                                <Badge
                                    variant="outline"
                                    className="text-[10px] sm:text-[11px] py-0.5 px-2 sm:px-2.5 rounded-lg font-bold bg-primary/10 text-primary border-primary/25 flex items-center gap-1 sm:gap-1.5 shadow-2xs"
                                >
                                    <School className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-primary" />
                                    {academicClass.department.name}
                                </Badge>
                            )}

                            {/* Incharge Badge */}
                            {inchargeName && (
                                <Badge
                                    variant="outline"
                                    className="text-[10px] sm:text-[11px] py-0.5 px-2 sm:px-2.5 rounded-lg font-bold bg-indigo-500/10 text-indigo-700 dark:text-indigo-300 border-indigo-500/25 flex items-center gap-1 sm:gap-1.5 shadow-2xs"
                                >
                                    <ShieldCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-indigo-600 dark:text-indigo-400" />
                                    <span>Incharge: {inchargeName}</span>
                                </Badge>
                            )}

                            {sections.length > 0 ? (
                                <div className="flex items-center gap-1">
                                    <span className="text-[10px] font-bold text-muted-foreground mr-0.5 hidden sm:inline">Streams:</span>
                                    {sections.map(s => (
                                        <span key={s.id} className="w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-md bg-primary/10 border border-primary/25 text-primary font-black text-[9px] sm:text-[10px] flex items-center justify-center shadow-2xs">
                                            {s.section}
                                        </span>
                                    ))}
                                </div>
                            ) : (
                                <Badge variant="outline" className="text-[9px] sm:text-[10px] py-0.5 px-1.5 sm:px-2 rounded-lg font-semibold text-muted-foreground border-dashed">
                                    No streams
                                </Badge>
                            )}
                        </div>
                        <p className="text-[11px] sm:text-xs text-muted-foreground mt-0.5 font-medium flex items-center gap-1.5">
                            <Users className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-primary" />
                            <span>{totalStudents} Enrolled {totalStudents === 1 ? "Student" : "Students"}</span>
                        </p>
                    </div>
                </div>

                {/* Class Actions */}
                <div className="flex items-center gap-1.5 sm:gap-2 self-end sm:self-center">
                    {canCreate && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => onAddSection(academicClass)}
                            className="h-7 sm:h-8 text-[11px] sm:text-xs font-bold gap-1 sm:gap-1.5 rounded-lg sm:rounded-xl border-border/80 hover:bg-primary/10 hover:text-primary transition-colors shadow-2xs"
                        >
                            <Plus className="w-3.5 h-3.5" /> Add Section
                        </Button>
                    )}

                    {(canEdit || canDelete) && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7 sm:h-8 sm:w-8 rounded-lg sm:rounded-xl text-muted-foreground hover:text-foreground">
                                    <MoreVertical className="w-4 h-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-44 rounded-xl">
                                {canEdit && onEditClass && (
                                    <DropdownMenuItem onClick={() => onEditClass(academicClass)} className="gap-2 text-xs font-medium cursor-pointer">
                                        <Pencil className="w-3.5 h-3.5 text-muted-foreground" /> Edit Class
                                    </DropdownMenuItem>
                                )}
                                {canDelete && onDeleteClass && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem onClick={() => onDeleteClass(academicClass.id)} className="gap-2 text-xs font-medium text-destructive cursor-pointer">
                                            <Trash2 className="w-3.5 h-3.5" /> Delete Class
                                        </DropdownMenuItem>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>
            </div>

            {/* Sections Grid */}
            <CardContent className="p-3 sm:p-5">
                {sections.length === 0 ? (
                    <div className="py-6 sm:py-8 px-3 sm:px-4 text-center border-2 border-dashed border-border/60 rounded-xl sm:rounded-2xl bg-muted/10">
                        <School className="w-7 h-7 sm:w-8 sm:h-8 mx-auto text-muted-foreground/40 mb-2" />
                        <p className="text-xs font-bold text-foreground">No sections configured yet</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                            Add Section A to begin enrolling students and setting up timetable.
                        </p>
                        {canCreate && (
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onAddSection(academicClass)}
                                className="mt-2.5 sm:mt-3 h-7 sm:h-8 text-[11px] sm:text-xs font-bold gap-1 rounded-lg sm:rounded-xl"
                            >
                                <Plus className="w-3.5 h-3.5" /> Create Section A
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3.5">
                        {sections.map(section => {
                            const isMySection = user?.teacherId && section.classTeacherId === user.teacherId;
                            const count = section.studentCount || 0;
                            const capacity = section.maxCapacity || 40;
                            const capacityPercent = Math.min(100, Math.round((count / capacity) * 100));
                            const hasTeacher = Boolean(section.classTeacher?.account || section.classTeacherId);

                            return (
                                <motion.div
                                    key={section.id}
                                    whileHover={{ y: -2 }}
                                    transition={{ duration: 0.15 }}
                                    className={cn(
                                        "relative p-3 sm:p-4 rounded-xl sm:rounded-2xl border transition-all cursor-pointer group shadow-2xs hover:shadow-md",
                                        !hasTeacher
                                            ? "border-amber-500/40 bg-gradient-to-b from-amber-500/[0.05] via-card to-card hover:border-amber-500"
                                            : isMySection
                                                ? "border-primary/40 bg-gradient-to-b from-primary/[0.05] via-card to-card hover:border-primary"
                                                : "border-border/80 bg-gradient-to-b from-card to-muted/20 hover:border-primary/40"
                                    )}
                                    onClick={() => navigate(`/dashboard/classrooms/${section.id}`)}
                                >
                                    {/* Top Row: Section Monogram + Section Title & Badge + Edit/Delete actions */}
                                    <div className="flex items-center justify-between gap-2 mb-2 sm:mb-2.5">
                                        <div className="flex items-center gap-2 min-w-0">
                                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground font-black text-xs flex items-center justify-center shadow-xs shrink-0">
                                                {section.section}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="flex items-center gap-1.5 flex-wrap">
                                                    <span className="text-xs sm:text-sm font-bold text-foreground">
                                                        {academicClass.name} - {section.section}
                                                    </span>
                                                    {isMySection && (
                                                        <Badge variant="secondary" className="bg-primary/20 text-primary text-[9px] sm:text-[10px] font-bold py-0 px-1.5 rounded-md gap-0.5">
                                                            <ShieldCheck className="w-2.5 h-2.5" /> Mine
                                                        </Badge>
                                                    )}
                                                </div>
                                                <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">Classroom Workspace</p>
                                            </div>
                                        </div>

                                        {/* Top-Right Badges & Actions */}
                                        <div className="flex items-center gap-1 shrink-0">
                                            {/* Student Count Badge (Compact on mobile) */}
                                            <Badge variant="outline" className="text-[10px] sm:text-[11px] font-bold py-0.5 px-1.5 sm:px-2 rounded-md bg-muted/40 border-border/70 flex items-center gap-1">
                                                <Users className="w-3 h-3 text-primary" />
                                                <span>{count}/{capacity}</span>
                                            </Badge>

                                            {/* Edit Section Button - thumb-friendly */}
                                            {canEdit && onEditSection && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onEditSection(section);
                                                    }}
                                                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted active:scale-95"
                                                    title="Edit Classroom Settings"
                                                    aria-label="Edit Section"
                                                >
                                                    <Pencil className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            {/* Duplicate / Clone Section Button */}
                                            {canCreate && onCloneSection && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onCloneSection(section);
                                                    }}
                                                    className="p-1.5 text-muted-foreground hover:text-primary transition-colors rounded-lg hover:bg-muted active:scale-95"
                                                    title="Duplicate / Clone Structure"
                                                    aria-label="Duplicate Structure"
                                                >
                                                    <Copy className="w-3.5 h-3.5" />
                                                </button>
                                            )}

                                            {/* Delete Section Button */}
                                            {canDelete && onDeleteSection && (
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        onDeleteSection(section.id);
                                                    }}
                                                    className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 p-1.5 text-muted-foreground hover:text-destructive transition-all rounded-lg hover:bg-destructive/10 active:scale-95"
                                                    title="Delete Section"
                                                    aria-label="Delete Section"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Class Teacher Strip / Alert (Compact) */}
                                    <div className="my-1.5 sm:my-2">
                                        {!hasTeacher ? (
                                            <div className="flex items-center gap-1.5 text-amber-700 dark:text-amber-400 font-bold bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/25">
                                                <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 animate-pulse" />
                                                <span className="truncate text-[10px] sm:text-[11px]">Class Teacher: <strong>Not Assigned</strong></span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 text-foreground bg-muted/30 px-2 py-1 rounded-lg border border-border/50 text-[11px]">
                                                <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                                                <span className="text-[10px] text-muted-foreground">Teacher:</span>
                                                <span className="truncate text-[11px] sm:text-xs font-bold text-foreground">
                                                    {section.classTeacher?.account
                                                        ? `${section.classTeacher.account.firstName} ${section.classTeacher.account.lastName}`
                                                        : "Assigned"}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Secondary Info: Room & Department (Compact single line) */}
                                    <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-muted-foreground mb-1.5 sm:mb-2">
                                        <span className="flex items-center gap-1 truncate">
                                            <DoorOpen className="w-3 h-3 text-cyan-600 dark:text-cyan-400 shrink-0" />
                                            <span className="truncate">
                                                {section.roomNumber ? `Room ${section.roomNumber}` : "Room Unassigned"}
                                                {section.buildingBlock ? ` (${section.buildingBlock})` : ""}
                                            </span>
                                        </span>
                                        {academicClass.department?.name && (
                                            <span className="text-muted-foreground font-medium shrink-0 ml-1 truncate max-w-[120px]">
                                                {academicClass.department.name}
                                            </span>
                                        )}
                                    </div>

                                    {/* Capacity Progress Bar (Slim) */}
                                    <div className="pt-1.5 border-t border-border/50">
                                        <div className="flex items-center justify-between text-[9px] sm:text-[10px] font-semibold text-muted-foreground mb-1">
                                            <span>Enrollment</span>
                                            <span className="font-bold text-foreground">{capacityPercent}%</span>
                                        </div>
                                        <div className="h-1 sm:h-1.5 w-full bg-muted rounded-full overflow-hidden">
                                            <div
                                                className={cn(
                                                    "h-full rounded-full transition-all duration-300",
                                                    capacityPercent >= 90 ? "bg-amber-500" : "bg-emerald-500"
                                                )}
                                                style={{ width: `${capacityPercent}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Footer: View Details / Tap */}
                                    <div className="mt-2 pt-1 flex items-center justify-between text-[11px] font-bold">
                                        <span className="text-[10px] font-semibold text-muted-foreground">
                                            {section.status || "ACTIVE"}
                                        </span>
                                        <div className="flex items-center text-primary gap-1 group-hover:translate-x-0.5 transition-transform text-xs font-bold">
                                            View Details <ArrowRight className="w-3 h-3" />
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
