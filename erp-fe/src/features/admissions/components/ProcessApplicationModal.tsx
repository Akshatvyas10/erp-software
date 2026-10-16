import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { SharedAdmissionForm } from '@/components/common/SharedAdmissionForm';
import { useUpdateApplicationStatus } from '../api/admissionApi';
import type { AdmissionApplication } from '../../../types/erp';

interface ProcessApplicationModalProps {
    isOpen: boolean;
    onClose: () => void;
    application: AdmissionApplication | null;
}

export function ProcessApplicationModal({ isOpen, onClose, application }: ProcessApplicationModalProps) {
    const [isRejecting, setIsRejecting] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const updateStatusMutation = useUpdateApplicationStatus();

    if (!application) return null;

    // Map application to Student-like object so SharedAdmissionForm can pre-fill
    const mappedStudent: any = {
        account: {
            firstName: application.studentFirstName,
            lastName: application.studentLastName,
            email: application.parentEmail,
        },
        gender: application.gender,
        dateOfBirth: application.dateOfBirth,
        bloodGroup: application.bloodGroup,
        previousSchoolDetails: application.previousSchoolName ? `${application.previousSchoolName} (${application.previousClass})` : "",
        guardianName: application.guardianName || application.fatherName || application.motherName,
        guardianPhone: application.primaryContactNumber,
        guardianEmail: application.parentEmail,
        permanentAddress: application.permanentAddress,
        currentAddress: application.currentAddress,
        medicalNotes: application.medicalNotes,
        bankAccountNumber: application.bankAccountNumber,
        bankIfscCode: application.bankIfscCode,
        bankName: application.bankName,
        bankBranch: application.bankBranch,
        bankMicrNumber: application.bankMicrNumber,
        customFieldResponses: application.customFieldResponses,
        rollNumber: '',
        admissionNumber: '',
        classroomEnrollments: [{
            classroomId: application.form?.classroomId || ""
        }]
    };

    const handleAdmit = async (data: FormData) => {
        // Collect everything from the form data
        const payload: any = {
            applicationId: application.id,
            status: 'Admitted',
        };

        const mapField = (fdKey: string, payloadKey: string) => {
            const val = data.get(fdKey);
            if (val) payload[payloadKey] = val.toString();
        };

        mapField("firstName", "studentFirstName");
        mapField("lastName", "studentLastName");
        mapField("dateOfBirth", "dateOfBirth");
        mapField("gender", "gender");
        mapField("bloodGroup", "bloodGroup");
        mapField("currentAddress", "currentAddress");
        mapField("permanentAddress", "permanentAddress");
        mapField("guardianName", "guardianName");
        mapField("guardianPhone", "primaryContactNumber");
        mapField("guardianEmail", "parentEmail");
        mapField("medicalNotes", "medicalNotes");
        mapField("rollNumber", "rollNumber");
        mapField("admissionNumber", "admissionNumber");
        mapField("password", "password");
        
        // Bank Details
        mapField("bankAccountNumber", "bankAccountNumber");
        mapField("bankIfscCode", "bankIfscCode");
        mapField("bankName", "bankName");
        mapField("bankBranch", "bankBranch");
        mapField("bankMicrNumber", "bankMicrNumber");
        
        const customFieldResponses = data.get("customFieldResponses");
        if (customFieldResponses) {
            try {
                payload.customFieldResponses = JSON.parse(customFieldResponses.toString());
            } catch (e) {
                // ignore
            }
        }

        // Strict Validation
        if (!payload.rollNumber?.trim()) {
            toast.error('Roll Number is required (set it in the Academic tab)');
            return;
        }
        if (!payload.admissionNumber?.trim()) {
            toast.error('Admission Number is required (set it in the Academic tab)');
            return;
        }
        if (!payload.password?.trim() || payload.password.length < 8) {
            toast.error('Password is required and must be at least 8 characters (set it in the Account tab)');
            return;
        }

        updateStatusMutation.mutate(payload, {
            onSuccess: () => {
                toast.success('Student Admitted Successfully');
                onClose();
            }
        });
    };

    const handleReject = () => {
        if (!rejectionReason.trim()) {
            toast.error('Please provide a reason for rejection');
            return;
        }

        updateStatusMutation.mutate({
            applicationId: application.id,
            status: 'Rejected',
            rejectionReason
        }, {
            onSuccess: () => {
                toast.success('Application Rejected');
                setIsRejecting(false);
                onClose();
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={(open) => {
            if (!open) {
                setIsRejecting(false);
                onClose();
            }
        }}>
            <DialogContent
                className="sm:max-w-4xl p-0 overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-white dark:bg-zinc-950 flex flex-col"
                style={{ maxHeight: '92dvh', minHeight: '80vh' }}
            >
                <DialogHeader className="px-6 py-5 bg-muted/40 dark:bg-purple-950/10 border-b border-border shrink-0">
                    <DialogTitle className="text-lg font-bold tracking-tight text-foreground">
                        Process Admission Application
                    </DialogTitle>
                </DialogHeader>

                {isRejecting ? (
                    <div className="p-6 space-y-4 flex-1">
                        <div className="space-y-2">
                            <Label className="text-sm font-medium text-red-600 dark:text-red-400">Reason for Rejection *</Label>
                            <Textarea
                                placeholder="E.g., No vacancy, insufficient documents..."
                                className="resize-none h-32 focus-visible:ring-red-500"
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                            />
                        </div>
                        <div className="flex gap-2 justify-end pt-4">
                            <Button variant="outline" onClick={() => setIsRejecting(false)}>
                                Cancel
                            </Button>
                            <Button 
                                variant="destructive" 
                                onClick={handleReject}
                                disabled={updateStatusMutation.isPending}
                            >
                                {updateStatusMutation.isPending ? "Processing..." : "Confirm Rejection"}
                            </Button>
                        </div>
                    </div>
                ) : (
                    <div className="flex-1 overflow-hidden flex flex-col">
                        <SharedAdmissionForm
                            isEdit={false}
                            editTarget={mappedStudent}
                            onCancel={onClose}
                            onSubmitSuccess={handleAdmit}
                            renderCustomFooter={({ isSubmitting }) => (
                                <div className="flex gap-2">
                                    <Button 
                                        type="button" 
                                        variant="outline"
                                        className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300 dark:border-red-900 dark:hover:bg-red-950/50"
                                        onClick={() => setIsRejecting(true)}
                                        disabled={isSubmitting || updateStatusMutation.isPending}
                                    >
                                        Reject Student
                                    </Button>
                                    <Button 
                                        type="submit" 
                                        form="admission-form"
                                        className="bg-green-600 hover:bg-green-700 text-white"
                                        disabled={isSubmitting || updateStatusMutation.isPending}
                                    >
                                        {updateStatusMutation.isPending ? "Admitting..." : "Admit Student"}
                                    </Button>
                                </div>
                            )}
                        />
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}
