import type { Classroom, ClassroomSubject, Subject } from "@/types/erp";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { UserCheck } from "lucide-react";

export interface ClassroomOverviewTabProps {
    classroom: Classroom;
    teacherSubjectsMap: Array<{
        teacher: NonNullable<ClassroomSubject["teacher"]>;
        subjects: Subject[];
    }>;
}

export function ClassroomOverviewTab({ classroom, teacherSubjectsMap }: ClassroomOverviewTabProps) {
    return (
        <div className="p-4 bg-muted/30 border border-border/50 rounded-xl">
            <h3 className="text-sm font-bold text-foreground mb-3 flex items-center gap-2">
                <UserCheck className="h-4 w-4 text-primary" />
                Classroom Teachers
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {classroom.classTeacher && (
                    <div className="flex items-start gap-3 p-3 bg-background border border-border/60 rounded-lg shadow-sm">
                        <Avatar className="h-10 w-10 border border-primary/20">
                            <AvatarFallback className="bg-primary/10 text-primary font-bold">
                                {classroom.classTeacher.account?.firstName?.[0]}
                                {classroom.classTeacher.account?.lastName?.[0]}
                            </AvatarFallback>
                        </Avatar>
                        <div>
                            <p className="text-sm font-bold text-foreground flex items-center gap-2">
                                {classroom.classTeacher.account?.firstName} {classroom.classTeacher.account?.lastName}
                                <Badge variant="secondary" className="bg-primary/10 text-primary text-[10px] h-4 px-1.5 border-primary/20">Class Teacher</Badge>
                            </p>
                            <p className="text-xs text-muted-foreground mt-0.5 font-medium">{classroom.classTeacher.teacherId}</p>
                        </div>
                    </div>
                )}
                {teacherSubjectsMap.map(({ teacher, subjects }) => {
                    if (classroom.classTeacher && teacher.id === classroom.classTeacher.id) return null; // Avoid duplicate if they are also class teacher
                    return (
                        <div key={teacher.id} className="flex items-start gap-3 p-3 bg-background border border-border/60 rounded-lg shadow-sm">
                            <Avatar className="h-10 w-10 border border-border/40">
                                <AvatarFallback className="bg-muted text-muted-foreground font-bold">
                                    {teacher.account?.firstName?.[0]}
                                    {teacher.account?.lastName?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-foreground truncate">
                                    {teacher.account?.firstName} {teacher.account?.lastName}
                                </p>
                                <p className="text-xs text-muted-foreground mt-0.5 truncate flex items-center gap-1.5 flex-wrap">
                                    <span className="font-medium">{teacher.teacherId}</span>
                                    <span className="text-border/50">•</span>
                                    <span className="truncate">{subjects.map(s => s.name).join(", ")}</span>
                                </p>
                            </div>
                        </div>
                    );
                })}
                {!classroom.classTeacher && teacherSubjectsMap.length === 0 && (
                    <div className="col-span-full py-4 text-center">
                        <p className="text-sm text-muted-foreground font-medium">No teachers assigned to this classroom yet.</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default ClassroomOverviewTab;
