import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import type { Homework, HomeworkSubmission } from "@/types/erp";
import { useAuth, usePermissions } from "@/store/hooks";
import { format } from "date-fns";
import { motion } from "framer-motion";
import { ArrowLeft, Calendar, User, FileText, Edit, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import HomeworkFormDialog from "@/components/homework/HomeworkFormDialog";

export default function HomeworkDetailsPage() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { can } = usePermissions();
    const qc = useQueryClient();
    const [editDialogOpen, setEditDialogOpen] = useState(false);

    const isStudent = (user as any)?.Roles?.some((r: any) => r.name === 'STUDENT');

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
        enabled: !!details && !isStudent
    });

    const studentSubmitMutation = useMutation({
        mutationFn: async (submissionId: string) => {
            return api.put(`/homeworks/submissions/${submissionId}`, { status: 'SUBMITTED' });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["homework", id] });
            toast.success("Homework marked as submitted!");
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async () => {
            return api.delete(`/homeworks/${id}`);
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["homeworks"] });
            toast.success("Homework deleted");
            navigate("/dashboard/homework");
        }
    });

    if (isLoading) return <div className="flex justify-center p-20"><span className="animate-spin h-8 w-8 rounded-full border-4 border-purple-500 border-t-transparent"></span></div>;
    
    const homework = details?.homework || (details as any)?.data?.homework;
    const submission = details?.submission || (details as any)?.data?.submission;

    if (!homework) return <div className="p-20 text-center">Homework not found</div>;

    return (
        <motion.div
            className="max-w-5xl mx-auto space-y-6"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="flex items-center gap-4 border-b border-border/40 pb-4">
                <Button variant="ghost" size="icon" onClick={() => navigate("/dashboard/homework")}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="flex-1">
                    <h1 className="text-xl md:text-2xl font-extrabold text-[#5513a1] dark:text-[#8e44ad]">
                        {homework.title}
                    </h1>
                </div>
                {!isStudent && can("homework", "update") && (
                    <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                        <Edit className="h-4 w-4 mr-2" /> Edit
                    </Button>
                )}
                {!isStudent && can("homework", "delete") && (
                    <Button variant="destructive" onClick={() => deleteMutation.mutate()}>
                        <Trash2 className="h-4 w-4 mr-2" /> Delete
                    </Button>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                    <Card className="p-6">
                        <div className="flex items-center gap-3 mb-6">
                            <Badge variant="outline">{homework.subject?.name}</Badge>
                            <Badge variant="outline">{homework.classroom?.name} - {homework.classroom?.section}</Badge>
                            <span className="text-sm text-muted-foreground flex items-center gap-1 ml-auto">
                                <Calendar className="h-4 w-4" /> Due: {format(new Date(homework.dueDate), "MMM dd, yyyy")}
                            </span>
                        </div>
                        <div className="prose dark:prose-invert max-w-none">
                            <h3 className="text-lg font-semibold mb-2">Instructions</h3>
                            <p className="whitespace-pre-wrap">{homework.description}</p>
                        </div>
                    </Card>

                    {isStudent && submission && (
                        <Card className="p-6 bg-purple-50 dark:bg-purple-950/20 border-purple-100 dark:border-purple-900/30">
                            <h3 className="text-lg font-bold text-purple-900 dark:text-purple-300 mb-4 flex items-center gap-2">
                                <FileText className="h-5 w-5" /> Your Submission
                            </h3>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium">Status: <Badge>{submission.status}</Badge></p>
                                    {submission.grade && <p className="mt-2">Grade: <span className="font-bold text-green-600">{submission.grade}</span></p>}
                                    {submission.feedback && <p className="mt-2 text-sm">Feedback: {submission.feedback}</p>}
                                </div>
                                {submission.status === 'PENDING' && (
                                    <Button 
                                        variant="primary" 
                                        onClick={() => studentSubmitMutation.mutate(submission.id)}
                                        disabled={studentSubmitMutation.isPending}
                                    >
                                        Mark as Submitted
                                    </Button>
                                )}
                            </div>
                        </Card>
                    )}
                </div>

                {!isStudent && (
                    <div className="lg:col-span-1">
                        <Card className="p-5">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <User className="h-5 w-5" /> Students ({submissions.length})
                            </h3>
                            <div className="space-y-4">
                                {submissions.map(sub => (
                                    <div key={sub.id} className="p-3 border border-border/50 rounded-xl bg-muted/20">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="font-medium text-sm">{sub.student?.firstName} {sub.student?.lastName}</span>
                                            <Badge variant="outline" className="text-[10px]">{sub.status}</Badge>
                                        </div>
                                        {(sub.status === 'SUBMITTED' || sub.status === 'REVIEWED') && (
                                            <GradeForm submission={sub} />
                                        )}
                                    </div>
                                ))}
                                {submissions.length === 0 && <p className="text-sm text-muted-foreground">No students enrolled.</p>}
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

    const updateMutation = useMutation({
        mutationFn: async () => {
            return api.put(`/homeworks/submissions/${submission.id}`, { grade, feedback, status });
        },
        onSuccess: () => {
            qc.invalidateQueries({ queryKey: ["homework-submissions", submission.homeworkId] });
            toast.success("Grade updated");
        }
    });

    return (
        <div className="mt-3 space-y-2 pt-3 border-t border-border/50">
            <div className="flex gap-2">
                <Select value={status} onValueChange={(v: "PENDING" | "SUBMITTED" | "REVIEWED" | "OVERDUE") => setStatus(v)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                        <SelectItem value="SUBMITTED">Submitted</SelectItem>
                        <SelectItem value="REVIEWED">Reviewed</SelectItem>
                        <SelectItem value="OVERDUE">Overdue</SelectItem>
                    </SelectContent>
                </Select>
                <Input placeholder="Grade" className="h-8 text-xs" value={grade} onChange={e => setGrade(e.target.value)} />
            </div>
            <Textarea placeholder="Feedback..." className="text-xs min-h-[60px]" value={feedback} onChange={e => setFeedback(e.target.value)} />
            <Button size="sm" className="w-full h-8 text-xs" onClick={() => updateMutation.mutate()} disabled={updateMutation.isPending}>
                Save Review
            </Button>
        </div>
    );
}
