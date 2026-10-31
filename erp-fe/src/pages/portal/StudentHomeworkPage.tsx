import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { BookOpen, CheckCircle2, Clock, Send } from "lucide-react";
import { toast } from "sonner";

export default function StudentHomeworkPage() {
    const qc = useQueryClient();
    const [selectedHw, setSelectedHw] = useState<any | null>(null);
    const [submissionContent, setSubmissionContent] = useState("");
    const [attachmentUrl, setAttachmentUrl] = useState("");

    const { data } = useQuery({
        queryKey: ["portal", "student", "homework"],
        queryFn: async () => {
            const res = await api.get("/portal/student/homework");
            return res.data.data;
        },
    });

    const submitMutation = useMutation({
        mutationFn: async ({ id, content, attachmentUrl }: { id: string; content: string; attachmentUrl: string }) => {
            return await api.post(`/portal/student/homework/${id}/submit`, { content, attachmentUrl });
        },
        onSuccess: () => {
            toast.success("Homework assignment submitted successfully!");
            qc.invalidateQueries({ queryKey: ["portal", "student", "homework"] });
            setSelectedHw(null);
            setSubmissionContent("");
            setAttachmentUrl("");
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || "Failed to submit assignment");
        },
    });

    const homeworks = data?.homeworks || [];

    const handleOpenSubmit = (hw: any) => {
        setSelectedHw(hw);
        const existing = hw.submissions?.[0];
        setSubmissionContent(existing?.content || "");
        setAttachmentUrl(existing?.attachmentUrl || "");
    };

    const handleConfirmSubmit = () => {
        if (!selectedHw) return;
        submitMutation.mutate({
            id: selectedHw.id,
            content: submissionContent,
            attachmentUrl,
        });
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-xl md:text-2xl font-extrabold tracking-tight text-foreground">
                    Classroom Homework
                </h1>
                <p className="text-xs text-muted-foreground">
                    View assignments given by subject teachers and upload your homework notes.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {homeworks.map((hw: any) => {
                    const isSubmitted = hw.submissions && hw.submissions.length > 0;
                    return (
                        <Card key={hw.id} className="rounded-2xl border-border/80 bg-card p-5 space-y-4 flex flex-col justify-between">
                            <div className="space-y-2.5">
                                <div className="flex items-start justify-between gap-2">
                                    <div>
                                        <Badge variant="outline" className="text-[10px] font-mono bg-primary/5 text-primary border-primary/20">
                                            {hw.subject?.name || "Subject"}
                                        </Badge>
                                        <h3 className="font-bold text-sm text-foreground mt-1">{hw.title}</h3>
                                    </div>
                                    {isSubmitted ? (
                                        <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px] font-bold">
                                            <CheckCircle2 className="h-3 w-3 mr-1" /> Submitted
                                        </Badge>
                                    ) : (
                                        <Badge variant="outline" className="text-amber-600 border-amber-500/30 text-[10px] font-bold">
                                            <Clock className="h-3 w-3 mr-1" /> Pending
                                        </Badge>
                                    )}
                                </div>

                                <p className="text-xs text-muted-foreground whitespace-pre-line line-clamp-3">
                                    {hw.description || "No specific instructions provided."}
                                </p>
                            </div>

                            <div className="pt-3 border-t border-border/60 flex items-center justify-between">
                                <span className="text-[11px] text-muted-foreground font-medium">
                                    Due: <span className="text-foreground font-bold">{hw.dueDate}</span>
                                </span>
                                <Button
                                    variant={isSubmitted ? "outline" : "default"}
                                    size="sm"
                                    onClick={() => handleOpenSubmit(hw)}
                                    className="rounded-xl text-xs h-8 font-semibold"
                                >
                                    {isSubmitted ? "Update Submission" : "Submit Work"}
                                </Button>
                            </div>
                        </Card>
                    );
                })}

                {homeworks.length === 0 && (
                    <div className="col-span-full py-16 text-center space-y-2">
                        <BookOpen className="h-8 w-8 text-muted-foreground mx-auto" />
                        <p className="text-sm font-semibold text-foreground">No Homework Assigned</p>
                        <p className="text-xs text-muted-foreground">All assignments are up to date.</p>
                    </div>
                )}
            </div>

            {/* Submission Dialog */}
            <Dialog open={Boolean(selectedHw)} onOpenChange={(open) => !open && setSelectedHw(null)}>
                <DialogContent className="max-w-md rounded-2xl">
                    <DialogHeader>
                        <DialogTitle className="text-base font-bold">Submit Assignment</DialogTitle>
                        <DialogDescription className="text-xs text-muted-foreground">
                            {selectedHw?.title} ({selectedHw?.subject?.name})
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-2">
                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Notes / Response</label>
                            <Textarea
                                placeholder="Type your answers, notes, or comments here..."
                                value={submissionContent}
                                onChange={(e) => setSubmissionContent(e.target.value)}
                                className="rounded-xl text-xs min-h-[100px]"
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-semibold text-foreground">Resource Link or Doc URL</label>
                            <Input
                                placeholder="https://drive.google.com/..."
                                value={attachmentUrl}
                                onChange={(e) => setAttachmentUrl(e.target.value)}
                                className="rounded-xl text-xs h-9"
                            />
                            <p className="text-[10px] text-muted-foreground">
                                Optional link to your shared document or image assignment.
                            </p>
                        </div>
                    </div>

                    <DialogFooter>
                        <Button variant="outline" size="sm" onClick={() => setSelectedHw(null)} className="rounded-xl">
                            Cancel
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleConfirmSubmit}
                            disabled={submitMutation.isPending || (!submissionContent && !attachmentUrl)}
                            className="rounded-xl font-bold gap-1.5"
                        >
                            <Send className="h-3.5 w-3.5" /> Submit Work
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
