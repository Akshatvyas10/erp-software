import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { SharedAdmissionForm } from '@/components/common/SharedAdmissionForm';
import api from '@/lib/api';
import type { Student } from '@/types/erp';

interface AdmissionFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editTarget: Student | null;
    onSuccess: () => void;
}

export default function AdmissionFormDialog({
    open, onOpenChange, editTarget, onSuccess,
}: AdmissionFormDialogProps) {
    const isEdit = !!editTarget;

    const handleSubmit = async (fd: FormData) => {
        const config = { headers: { 'Content-Type': 'multipart/form-data' } };
        if (isEdit) {
            await api.put(`/students/${editTarget.id}`, fd, config);
            toast.success('Student profile updated');
        } else {
            await api.post('/students', fd, config);
            toast.success('Student enrolled — admission number auto-generated');
        }
        onSuccess();
        onOpenChange(false);
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="sm:max-w-3xl p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-white dark:bg-zinc-950 flex flex-col h-[88vh] max-h-[92dvh]"
            >
                <DialogHeader className="px-6 py-4.5 bg-muted/40 dark:bg-purple-950/10 border-b border-border shrink-0">
                    <div className="flex items-center justify-between pr-6">
                        <div>
                            <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                                {isEdit ? 'Edit Student Profile' : 'Enrol New Student'}
                            </DialogTitle>
                            <p className="text-xs text-muted-foreground mt-0.5">
                                {isEdit 
                                    ? 'Update verified demographic, academic, and guardian records' 
                                    : 'Enrol a new student and create associated ERP login credentials'}
                            </p>
                        </div>
                        {isEdit && editTarget?.admissionNumber && (
                            <span className="hidden sm:inline-flex px-2.5 py-1 rounded-full text-xs font-mono font-semibold bg-primary/10 text-primary border border-primary/20">
                                {editTarget.admissionNumber}
                            </span>
                        )}
                    </div>
                </DialogHeader>
                
                <div className="flex-1 overflow-hidden">
                    <SharedAdmissionForm
                        isEdit={isEdit}
                        editTarget={editTarget}
                        onCancel={() => onOpenChange(false)}
                        onSubmitSuccess={handleSubmit}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
