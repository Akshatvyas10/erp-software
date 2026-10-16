import { useState } from 'react';
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle, 
    DialogDescription,
    DialogFooter
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useUpdateApplicationStatus } from '../api/admissionApi';
import { toast } from 'sonner';

interface AdmitRejectModalProps {
    isOpen: boolean;
    onClose: () => void;
    applicationId: string;
    studentName: string;
    actionType: 'Admit' | 'Reject' | null;
}

export function AdmitRejectModal({ isOpen, onClose, applicationId, studentName, actionType }: AdmitRejectModalProps) {
    const [rejectionReason, setRejectionReason] = useState('');
    const [rollNumber, setRollNumber] = useState('');
    const [admissionNumber, setAdmissionNumber] = useState('');
    const [password, setPassword] = useState('');
    const updateStatusMutation = useUpdateApplicationStatus();

    const handleSubmit = () => {
        if (!actionType) return;
        
        if (actionType === 'Reject' && !rejectionReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        if (actionType === 'Admit') {
            if (!rollNumber.trim()) {
                toast.error('Roll Number is required');
                return;
            }
            if (!admissionNumber.trim()) {
                toast.error('Admission Number is required');
                return;
            }
            if (!password.trim() || password.length < 8) {
                toast.error('Password is required and must be at least 8 characters');
                return;
            }
        }

        updateStatusMutation.mutate(
            {
                applicationId,
                status: actionType === 'Admit' ? 'Admitted' : 'Rejected',
                rejectionReason: actionType === 'Reject' ? rejectionReason : undefined,
                ...(actionType === 'Admit' ? { rollNumber, admissionNumber, password } : {})
            },
            {
                onSuccess: () => {
                    toast.success(`Application ${actionType === 'Admit' ? 'Admitted' : 'Rejected'} successfully`);
                    onClose();
                    setRejectionReason('');
                    setRollNumber('');
                    setAdmissionNumber('');
                    setPassword('');
                },
                onError: (error: any) => {
                    toast.error(error.response?.data?.message || `Failed to ${actionType} application`);
                }
            }
        );
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>{actionType} Application</DialogTitle>
                    <DialogDescription>
                        {actionType === 'Admit' 
                            ? `Are you sure you want to admit ${studentName}? This will automatically create a Student Profile and User Account.` 
                            : `Are you sure you want to reject the application for ${studentName}?`
                        }
                    </DialogDescription>
                </DialogHeader>

                {actionType === 'Reject' && (
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="reason">Rejection Reason</Label>
                            <Textarea 
                                id="reason" 
                                placeholder="Enter reason for rejection..." 
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                        </div>
                    </div>
                )}

                {actionType === 'Admit' && (
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="admissionNumber">Admission Number <span className="text-destructive">*</span></Label>
                            <Input 
                                id="admissionNumber" 
                                placeholder="e.g. ADM-2026-0001" 
                                value={admissionNumber}
                                onChange={(e) => setAdmissionNumber(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="rollNumber">Roll Number <span className="text-destructive">*</span></Label>
                            <Input 
                                id="rollNumber" 
                                placeholder="e.g. 101" 
                                value={rollNumber}
                                onChange={(e) => setRollNumber(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="password">Student Password <span className="text-destructive">*</span></Label>
                            <Input 
                                id="password" 
                                type="text"
                                placeholder="Min. 8 characters" 
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                            />
                            <p className="text-xs text-muted-foreground">This password will be emailed to the student/parent.</p>
                        </div>
                    </div>
                )}

                <DialogFooter>
                    <Button variant="outline" onClick={onClose} disabled={updateStatusMutation.isPending}>
                        Cancel
                    </Button>
                    <Button 
                        variant={actionType === 'Admit' ? 'default' : 'destructive'}
                        onClick={handleSubmit}
                        disabled={updateStatusMutation.isPending}
                    >
                        {updateStatusMutation.isPending ? 'Processing...' : `Confirm ${actionType}`}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
