import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useGetPublicForm, useSubmitApplication, useGetPublicApplicationStatus } from '../api/admissionApi';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { SharedAdmissionForm } from '@/components/common/SharedAdmissionForm';

export function PublicAdmissionFormPage() {
    const { token } = useParams<{ token: string }>();
    
    const { data, isLoading, error } = useGetPublicForm(token || '');
    const submitMutation = useSubmitApplication();
    
    // Check localStorage for previous submission
    const storedAppId = localStorage.getItem(`admission_app_${token}`);
    const { data: statusData, isLoading: isStatusLoading } = useGetPublicApplicationStatus(storedAppId);

    const [isSubmitted, setIsSubmitted] = useState(!!storedAppId);
    const [studentName, setStudentName] = useState('');

    if (isLoading || (storedAppId && isStatusLoading)) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30">
                <Loader2 className="h-10 w-10 animate-spin text-purple-600 mb-4" />
                <h2 className="text-xl font-medium">Loading...</h2>
            </div>
        );
    }

    if (error || !data?.data) {
        // @ts-ignore
        const isExpired = error?.response?.status === 400 && error?.response?.data?.message?.includes('expired');
        const title = isExpired ? "Link Expired" : "Invalid Link";
        const description = isExpired 
            ? "The admission form link has expired. Please contact the school administration for a new link."
            : "The admission form you are trying to access does not exist or is currently inactive. Please contact the school administration for a valid link.";

        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 p-4">
                <Card className="w-full max-w-md shadow-lg border-destructive/20">
                    <CardHeader className="text-center">
                        <CardTitle className="text-destructive">{title}</CardTitle>
                        <CardDescription>{description}</CardDescription>
                    </CardHeader>
                </Card>
            </div>
        );
    }

    const formConfig = data.data;

    const handleSubmitSuccess = async (fd: FormData) => {
        // Map SharedAdmissionForm values to the API's expected JSON format
        const payload = {
            studentFirstName: fd.get('firstName') as string,
            studentLastName: fd.get('lastName') as string,
            dateOfBirth: fd.get('dateOfBirth') as string,
            gender: fd.get('gender') as string || 'OTHER',
            bloodGroup: (fd.get('bloodGroup') as string) || undefined,
            aadhaarNumber: (fd.get('governmentId') as string) || undefined,
            previousSchoolName: (fd.get('previousSchoolDetails') as string) || undefined,
            currentAddress: fd.get('currentAddress') as string || 'Not Provided',
            permanentAddress: fd.get('permanentAddress') as string || 'Not Provided',
            
            // Map guardian fields
            fatherName: fd.get('guardianRelationship') === 'Father' ? (fd.get('guardianName') as string || 'Not Provided') : 'N/A',
            motherName: fd.get('guardianRelationship') === 'Mother' ? (fd.get('guardianName') as string || 'Not Provided') : 'N/A',
            guardianName: fd.get('guardianName') as string,
            primaryContactNumber: fd.get('guardianPhone') as string || 'Not Provided',
            parentEmail: fd.get('guardianEmail') as string || fd.get('email') as string || 'notprovided@example.com',
            
            // Bank Details
            bankAccountNumber: (fd.get('bankAccountNumber') as string) || undefined,
            bankIfscCode: (fd.get('bankIfscCode') as string) || undefined,
            bankName: (fd.get('bankName') as string) || undefined,
            bankBranch: (fd.get('bankBranch') as string) || undefined,
            bankMicrNumber: (fd.get('bankMicrNumber') as string) || undefined,
            
            declarationAccepted: true,
            customFieldResponses: {} // Handle if any custom fields exist in fd
        };

        setStudentName(`${payload.studentFirstName} ${payload.studentLastName}`);

        return new Promise<void>((resolve, reject) => {
            submitMutation.mutate(
                { token: token as string, data: payload },
                {
                    onSuccess: (resp: any) => {
                        const appId = resp?.data?.applicationId || resp?.applicationId || "submitted";
                        localStorage.setItem(`admission_app_${token}`, appId);
                        
                        setIsSubmitted(true);
                        toast.success("Application submitted successfully!");
                        resolve();
                    },
                    onError: (error: any) => {
                        toast.error(error.response?.data?.message || "Failed to submit application. Please check your inputs.");
                        reject(error);
                    }
                }
            );
        });
    };

    if (isSubmitted || storedAppId) {
        const appStatus = statusData?.data?.status || 'Pending';
        const stName = statusData?.data?.name || studentName;
        
        let statusColor = "text-yellow-600 bg-yellow-50";
        if (appStatus === 'Admitted') statusColor = "text-emerald-700 bg-emerald-100";
        if (appStatus === 'Rejected') statusColor = "text-red-600 bg-red-50";

        return (
            <div className="min-h-screen bg-muted/20 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <Card className="max-w-md w-full shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <div className={`mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4 ${statusColor}`}>
                            {appStatus === 'Admitted' ? (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                            ) : appStatus === 'Rejected' ? (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                            ) : (
                                <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
                            )}
                        </div>
                        <CardTitle className="text-2xl">Application {appStatus}</CardTitle>
                    </CardHeader>
                    <CardContent className="text-center text-muted-foreground pt-4">
                        <p>We have an admission application on file for <strong>{stName}</strong>.</p>
                        {appStatus === 'Pending' && (
                            <p className="mt-4">The administration will review the application and contact you soon.</p>
                        )}
                        {appStatus === 'Admitted' && (
                            <p className="mt-4">Congratulations! The application has been approved.</p>
                        )}
                        {appStatus === 'Rejected' && (
                            <p className="mt-4">Unfortunately, the application was not approved.</p>
                        )}
                        <p className="mt-6 text-sm text-muted-foreground border-t pt-4">
                            This form is already filled. If you want to admit another student, please contact our school administration.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-purple-950/5 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto space-y-6">
                <div className="text-center space-y-2 mb-8">
                    <h1 className="text-3xl font-bold tracking-tight text-purple-900 dark:text-purple-100">Student Admission Application</h1>
                    <p className="text-lg text-purple-900/60 dark:text-purple-100/60">
                        Applying for {formConfig.classroom?.name} - {formConfig.classroom?.section} ({formConfig.classroom?.academicYear})
                    </p>
                </div>

                <div className="bg-white dark:bg-zinc-950 rounded-2xl shadow-xl border border-purple-900/10 overflow-hidden" style={{ minHeight: '600px' }}>
                    <SharedAdmissionForm
                        isEdit={false}
                        isPublic={true}
                        initialClassroomId={formConfig.classroom?.id}
                        formConfig={formConfig}
                        onSubmitSuccess={handleSubmitSuccess}
                    />
                </div>
            </div>
        </div>
    );
}
