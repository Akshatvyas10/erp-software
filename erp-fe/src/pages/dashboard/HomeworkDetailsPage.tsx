import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Homework, HomeworkSubmission } from "@/types/erp";
import { useAuth, usePermissions } from "@/store/hooks";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, User, FileText, Trash2, CheckCircle2, AlertCircle, Clock, BookOpen, Send, GraduationCap, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import HomeworkFormDialog from "@/components/homework/HomeworkFormDialog";

export default function HomeworkDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { } = useAuth();
    const { can } = usePermissions();
    const qc = useQueryClient();
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const canManageHomework = can('homework', 'manage');

    const { data: details, isLoading } = useQuery<{ homework: Homework; submission?: HomeworkSubmission }>({
        queryKey: ["homework", id],
        queryFn: async () => {
            const res = await api.get(`/homeworks/${id}`);
            return res.data;
        }
    });

    const { data: submissions = [] } = useQuery<HomeworkSubmission[]>({
        queryKey: ["homework-submissions", id],
        queryFn: async () => {
            const res = await api.get(`/homeworks/${id}/submissions`);
            return res.data;
        },
        enabled: !!details && canManageHomework
    });

    const studentSubmitMutation = useMutation({
        mutationFn: async (submissionId: string) => {
            return api.put(`/homeworks/submissions/${submissionId}`, { status: 'SUBMITTED' });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["homework", id] });
            toast.success("Homework marked as submitted! Great job!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            return api.delete(`/homeworks/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["homeworks"] });
            toast.success("Homework assignment deleted successfully");
            navigate("/dashboard/homework");
        }
    });

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-[50vh]">
                <div className="flex flex-col items-center gap-4">
                    <span className="animate-spin h-10 w-10 rounded-full border-4 border-primary border-t-transparent shadow-lg" />
                    <p className="text-muted-foreground font-medium animate-pulse">Loading homework details...</p>
                </div>
            </div>
        );
    }

    const homework = details?.homework || (details as any)?.data?.homework;
    const submission = details?.submission || (details as any)?.data?.submission;

    if (!homework) {
        return (
            <div className="flex flex-col items-center justify-center p-20 text-center gap-4">
                <AlertCircle className="h-12 w-12 text-destructive opacity-80" />
                <h2 className="text-xl font-bold">Homework Not Found</h2>
                <Button variant="outline" onClick={() => navigate("/dashboard/homework")}>Go Back</Button>
            </div>
        );
    }

    return (
        <motion.div
            className="max-w-6xl mx-auto space-y-6 pb-20"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
        >
            {/* Header Bar */}
            <div className="border-b border-border/40 pb-4 pt-2 mb-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                        <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0 h-9 w-9 sm:h-10 sm:w-10 rounded-full hover:bg-muted/80 bg-background/50 border border-border/50 shadow-sm mt-0.5"
                            onClick={() => navigate("/dashboard/homework")}
                        >
                            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-foreground/80" />
                        </Button>

                        <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-1.5">
                                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[9px] sm:text-[10px] uppercase font-bold tracking-wider">
                                    {homework.subject?.name}
                                </Badge>
                                <span className="text-[10px] sm:text-xs text-muted-foreground font-medium px-2 py-0.5 bg-muted/40 rounded-full border border-border/50">
                                    {homework.classroom?.name} {homework.classroom?.section}
                                </span>
                            </div>
                            <h1 className="text-xl sm:text-3xl font-black tracking-tight text-foreground truncate drop-shadow-sm">
                                {homework.title}
                            </h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 pl-12 sm:pl-0">
                        {can("homework", "update") && (
                            <Button variant="outline" size="sm" onClick={() => setEditDialogOpen(true)}>
                                <Pencil className="h-4 w-4 mr-2" /> Edit
                            </Button>
                        )}
                        {can("homework", "delete") && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="outline" className="h-9 sm:h-10 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-semibold border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground transition-colors">
                                        <Trash2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" /> Delete
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent className="w-[95vw] sm:max-w-lg mx-auto rounded-3xl p-6">
                                    <AlertDialogHeader>
                                        <AlertDialogTitle className="text-xl font-bold">Delete Homework Assignment</AlertDialogTitle>
                                        <AlertDialogDescription className="text-muted-foreground mt-2">
                                            Are you absolutely sure you want to delete this homework? This action cannot be undone and will remove all associated student submissions and grades.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter className="mt-6 gap-3">
                                        <AlertDialogCancel className="h-11 rounded-xl font-semibold border-border/50">Cancel</AlertDialogCancel>
                                        <AlertDialogAction
                                            className="h-11 rounded-xl font-bold bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                            onClick={() => deleteMutation.mutate()}
                                        >
                                            Confirm Delete
                                        </AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8">
                {/* Main Content Column */}
                <div className="lg:col-span-7 xl:col-span-8 space-y-6">
                    {/* Instructions Card */}
                    <Card className="rounded-3xl border-border/50 shadow-sm overflow-hidden bg-card">
                        <div className="p-6 sm:p-8">
                            <div className="flex flex-wrap items-center gap-3 sm:gap-4 mb-6 sm:mb-8 pb-5 sm:pb-6 border-b border-border/40">
                                <div className="flex items-center gap-2.5 sm:gap-3 bg-muted/30 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-border/50">
                                    <div className="bg-amber-500/10 p-1.5 sm:p-2 rounded-xl border border-amber-500/20">
                                        <Clock className="h-4 w-4 sm:h-5 sm:w-5 text-amber-600 dark:text-amber-400" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Due Date</p>
                                        <p className="text-xs sm:text-sm font-bold">{format(new Date(homework.dueDate), "EEEE, MMM dd, yyyy")}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2.5 sm:gap-3 bg-muted/30 px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-border/50">
                                    <div className="bg-primary/10 p-1.5 sm:p-2 rounded-xl border border-primary/20">
                                        <GraduationCap className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                                    </div>
                                    <div>
                                        <p className="text-[9px] sm:text-[10px] uppercase font-bold text-muted-foreground tracking-wider">Status</p>
                                        <p className="text-xs sm:text-sm font-bold capitalize">{homework.status.toLowerCase()}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="prose dark:prose-invert max-w-none prose-p:leading-relaxed prose-headings:font-bold prose-a:text-primary hover:prose-a:text-primary/80 prose-img:rounded-xl">
                                <h3 className="text-base sm:text-lg font-bold flex items-center gap-2 mb-3 sm:mb-4 text-foreground/90">
                                    <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-primary" /> Instructions
                                </h3>
                                <div className="text-sm sm:text-[15px] text-muted-foreground whitespace-pre-wrap bg-muted/10 p-4 sm:p-5 rounded-2xl border border-border/40">
                                    {homework.description}
                                </div>
                            </div>
                        </div>
                    </Card>

                    {/* Student View: Your Submission */}
                    {!canManageHomework && submission && (
                        <Card className={`relative overflow-hidden rounded-3xl p-6 sm:p-8 transition-colors duration-300 border ${submission.status === 'SUBMITTED' || submission.status === 'REVIEWED'
                            ? 'bg-emerald-500/5 border-emerald-500/20'
                            : 'bg-primary/5 border-primary/20'
                            }`}>

                            <div className="absolute top-0 right-0 -translate-y-1/3 translate-x-1/3 opacity-10 pointer-events-none">
                                <FileText className="h-48 w-48 text-foreground" />
                            </div>

                            <div className="relative z-10">
                                <h3 className="text-xl font-extrabold mb-6 flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl border ${submission.status === 'SUBMITTED' || submission.status === 'REVIEWED'
                                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                                        : 'bg-primary/10 text-primary border-primary/20'
                                        }`}>
                                        <FileText className="h-6 w-6" />
                                    </div>
                                    Your Submission
                                </h3>

                                <div className="grid sm:grid-cols-2 gap-6 items-center">
                                    <div className="space-y-4">
                                        <div className="bg-background/60 backdrop-blur-md p-4 rounded-2xl border border-border/40 shadow-sm">
                                            <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">Status</p>
                                            <div className="flex items-center gap-2">
                                                {submission.status === 'SUBMITTED' || submission.status === 'REVIEWED' ? (
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                ) : (
                                                    <AlertCircle className="h-5 w-5 text-amber-500" />
                                                )}
                                                <span className="font-bold text-lg capitalize">{submission.status.toLowerCase()}</span>
                                            </div>
                                        </div>

                                        {submission.grade && (
                                            <div className="bg-background/60 backdrop-blur-md p-4 rounded-2xl border border-border/40 shadow-sm border-l-4 border-l-emerald-500">
                                                <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">Grade</p>
                                                <p className="font-extrabold text-2xl text-emerald-600 dark:text-emerald-400">{submission.grade}</p>
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex flex-col justify-center h-full">
                                        {submission.status === 'PENDING' ? (
                                            <Button
                                                size="lg"
                                                className="w-full h-14 rounded-2xl font-bold text-base bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
                                                onClick={() => studentSubmitMutation.mutate(submission.id)}
                                                disabled={studentSubmitMutation.isPending}
                                            >
                                                <Send className="h-5 w-5 mr-2" /> Mark as Submitted
                                            </Button>
                                        ) : (
                                            <div className="bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 p-4 rounded-2xl border border-emerald-500/20 text-center font-semibold flex flex-col items-center gap-2">
                                                <CheckCircle2 className="h-8 w-8" />
                                                Successfully Submitted
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {submission.feedback && (
                                    <div className="mt-6 bg-accent/50 p-5 rounded-2xl border border-border/50">
                                        <h4 className="text-xs uppercase font-bold text-foreground/80 tracking-wider mb-2">Teacher Feedback</h4>
                                        <p className="text-sm font-medium text-muted-foreground leading-relaxed italic">
                                            "{submission.feedback}"
                                        </p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {/* Teacher View: Sidebar */}
                {canManageHomework && (
                    <div className="lg:col-span-5 xl:col-span-4">
                        <Card className="rounded-3xl border-border/50 shadow-sm bg-card sticky top-24">
                            <div className="p-5 border-b border-border/40 bg-muted/10 rounded-t-3xl">
                                <h3 className="font-extrabold text-lg flex items-center gap-2">
                                    <User className="h-5 w-5 text-primary" />
                                    Student Submissions
                                    <Badge variant="secondary" className="ml-auto rounded-full font-bold">
                                        {submissions.length} Enrolled
                                    </Badge>
                                </h3>
                            </div>
                            <div className="p-2 space-y-1 max-h-[calc(100vh-250px)] overflow-y-auto custom-scrollbar">
                                {submissions.map(sub => (
                                    <div key={sub.id} className="p-3 hover:bg-muted/30 transition-colors rounded-2xl border border-transparent hover:border-border/50 group">
                                        <div className="flex items-center gap-3 mb-2">
                                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center font-bold text-primary border border-primary/20 shadow-sm shrink-0">
                                                {sub.student?.firstName?.[0]}{sub.student?.lastName?.[0]}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-bold text-sm truncate">{sub.student?.firstName} {sub.student?.lastName}</h4>
                                                <p className="text-xs text-muted-foreground font-medium">Admission No: {sub.student?.admissionNumber || 'N/A'}</p>
                                            </div>
                                            <Badge variant="outline" className={`shrink-0 text-[9px] uppercase tracking-wider font-bold rounded-full ${sub.status === 'SUBMITTED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                                                sub.status === 'REVIEWED' ? 'bg-primary/10 text-primary border-primary/20' :
                                                    sub.status === 'OVERDUE' ? 'bg-destructive/10 text-destructive border-destructive/20' :
                                                        'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20'
                                                }`}>
                                                {sub.status}
                                            </Badge>
                                        </div>

                                        {(sub.status === 'SUBMITTED' || sub.status === 'REVIEWED') ? (
                                            <GradeForm submission={sub} />
                                        ) : (
                                            <div className="mt-2 text-xs text-center p-2 rounded-xl bg-muted/30 text-muted-foreground/70 font-medium">
                                                Waiting for student submission
                                            </div>
                                        )}
                                    </div>
                                ))}
                                {submissions.length === 0 && (
                                    <div className="text-center p-8 text-muted-foreground">
                                        <User className="h-10 w-10 mx-auto opacity-20 mb-3" />
                                        <p className="text-sm font-bold">No students enrolled</p>
                                    </div>
                                )}
                            </div>
                        </Card>
                    </div>
                )}
            </div>

            <HomeworkFormDialog
                open={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                homeworkId={id}
            />
        </motion.div>
    );
}

function GradeForm({ submission }: { submission: HomeworkSubmission }) {
    const qc = useQueryClient();
    const [grade, setGrade] = useState(submission.grade || "");
    const [feedback, setFeedback] = useState(submission.feedback || "");
    const [status, setStatus] = useState(submission.status);
    const [isExpanded, setIsExpanded] = useState(submission.status === 'SUBMITTED'); // Auto expand if needs review

    const updateMutation = useMutation({
        mutationFn: async () => {
            return api.put(`/homeworks/submissions/${submission.id}`, { grade, feedback, status });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["homework-submissions", submission.homeworkId] });
            toast.success("Review saved successfully!");
            setIsExpanded(false);
        }
    });

    if (!isExpanded) {
        return (
            <div className="mt-2">
                <Button
                    variant="outline"
                    size="sm"
                    className="w-full h-8 rounded-xl text-xs font-semibold bg-background border-border shadow-sm hover:bg-muted"
                    onClick={() => setIsExpanded(true)}
                >
                    {submission.status === 'REVIEWED' ? 'Edit Review & Grade' : 'Grade Submission'}
                </Button>
            </div>
        );
    }

    return (
        <div className="mt-3 p-3 bg-background rounded-2xl border border-border/60 shadow-inner">
            <div className="flex items-center justify-between mb-2 pb-2 border-b border-border/40">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Evaluation</span>
                <button onClick={() => setIsExpanded(false)} className="text-[10px] font-bold text-muted-foreground hover:text-foreground underline underline-offset-2">Cancel</button>
            </div>
            <div className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground pl-1">Status</label>
                        <Select value={status} onValueChange={(v: "PENDING" | "SUBMITTED" | "REVIEWED" | "OVERDUE") => setStatus(v)}>
                            <SelectTrigger className="h-9 rounded-xl text-xs font-medium border-border/60 bg-muted/20 focus:ring-2 focus:ring-ring focus:ring-offset-0 transition-colors duration-200">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                <SelectItem value="SUBMITTED">Submitted</SelectItem>
                                <SelectItem value="REVIEWED">Reviewed</SelectItem>
                                <SelectItem value="OVERDUE">Overdue</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-semibold text-muted-foreground pl-1">Grade</label>
                        <Input
                            placeholder="e.g. A+, 95/100"
                            className="h-9 rounded-xl text-xs font-medium border-border/60 bg-muted/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors duration-200"
                            value={grade}
                            onChange={e => setGrade(e.target.value)}
                        />
                    </div>
                </div>
                <div className="space-y-1">
                    <label className="text-[10px] font-semibold text-muted-foreground pl-1">Feedback</label>
                    <Textarea
                        placeholder="Great work on the conclusion..."
                        className="text-xs min-h-[70px] rounded-xl border-border/60 bg-muted/20 resize-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none transition-colors duration-200 p-3"
                        value={feedback}
                        onChange={e => setFeedback(e.target.value)}
                    />
                </div>
                <Button
                    size="sm"
                    className="w-full h-9 rounded-xl text-xs font-bold bg-primary hover:bg-primary/90 text-primary-foreground transition-all shadow-sm shadow-primary/20"
                    onClick={() => updateMutation.mutate()}
                    disabled={updateMutation.isPending}
                >
                    {updateMutation.isPending ? "Saving..." : "Save Review"}
                </Button>
            </div>
        </div>
    );
}
