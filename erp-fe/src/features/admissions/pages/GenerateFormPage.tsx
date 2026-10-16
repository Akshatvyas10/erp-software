import { useState } from 'react';
import { format } from 'date-fns';
import { CalendarIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useQuery } from '@tanstack/react-query';
import api from '@/lib/api';
import { CustomFieldBuilder } from '../components/CustomFieldBuilder';
import { CopyLinkButton } from '../components/CopyLinkButton';
import { useGenerateForm } from '../api/admissionApi';
import type { CustomFieldDefinition } from '../../../types/erp';
import { toast } from 'sonner';

export function GenerateFormPage() {
    const [classroomId, setClassroomId] = useState('');
    const [customFields, setCustomFields] = useState<CustomFieldDefinition[]>([]);
    const [generatedLink, setGeneratedLink] = useState('');
    const [expiresAt, setExpiresAt] = useState<Date | undefined>();

    const generateMutation = useGenerateForm();

    // Fetch classrooms (assuming standard classroom endpoint exists)
    const { data: classroomsResponse, isLoading: isLoadingClassrooms } = useQuery({
        queryKey: ['classrooms'],
        queryFn: async () => {
            const res = await api.get('/classrooms?status=ACTIVE&limit=100');
            return res.data;
        }
    });

    const classrooms = classroomsResponse?.data?.classrooms || [];

    const handleGenerate = () => {
        if (!classroomId) {
            toast.error('Please select a classroom');
            return;
        }

        let finalExpiresAt = expiresAt;
        if (finalExpiresAt) {
            finalExpiresAt = new Date(finalExpiresAt);
            finalExpiresAt.setHours(23, 59, 59, 999);
        }

        if (finalExpiresAt && finalExpiresAt <= new Date()) {
            toast.error("Expiry date must be in the future");
            return;
        }

        const defaultExpiresAt = new Date();
        defaultExpiresAt.setMonth(defaultExpiresAt.getMonth() + 1);

        generateMutation.mutate({
            classroomId,
            customFields: customFields.length > 0 ? customFields : undefined,
            expiresAt: finalExpiresAt ? finalExpiresAt.toISOString() : defaultExpiresAt.toISOString()
        }, {
            onSuccess: (data) => {
                const formToken = data.data.token;
                // Generate absolute public link
                const publicUrl = `${window.location.origin}/public/admissions/${formToken}`;
                setGeneratedLink(publicUrl);
                toast.success('Form generated successfully!');
            },
            onError: (error: any) => {
                toast.error(error.response?.data?.message || 'Failed to generate form');
            }
        });
    };

    const handleReset = () => {
        setClassroomId('');
        setCustomFields([]);
        setGeneratedLink('');
        setExpiresAt(undefined);
    };

    return (
        <div className="container mx-auto py-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-3xl font-bold tracking-tight">Generate Admission Form</h1>
                <p className="text-muted-foreground mt-2">
                    Create a unique, secure link for parents to apply for admission to a specific class.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Form Configuration</CardTitle>
                    <CardDescription>
                        Select the classroom and configure any additional custom fields you want to collect.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2 max-w-md">
                            <Label htmlFor="classroom">Target Classroom / Class <span className="text-destructive">*</span></Label>
                            <Select value={classroomId} onValueChange={setClassroomId}>
                                <SelectTrigger>
                                    <SelectValue placeholder={isLoadingClassrooms ? "Loading classrooms..." : "Select a classroom"} />
                                </SelectTrigger>
                                <SelectContent>
                                    {classrooms.map((c: any) => (
                                        <SelectItem key={c.id} value={c.id}>
                                            {c.name} {c.section} ({c.academicYear})
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        
                        <div className="space-y-2 max-w-md flex flex-col">
                            <Label htmlFor="expiresAt">Link Expiry Date (Optional)</Label>
                            <Popover>
                                <PopoverTrigger asChild>
                                    <Button
                                        id="expiresAt"
                                        variant={"outline"}
                                        className={cn(
                                            "w-full justify-start text-left font-normal",
                                            !expiresAt && "text-muted-foreground"
                                        )}
                                    >
                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                        {expiresAt ? format(expiresAt, "PPP") : <span>Pick a date</span>}
                                    </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                        mode="single"
                                        selected={expiresAt}
                                        onSelect={setExpiresAt}
                                        disabled={(date) => {
                                            const today = new Date();
                                            today.setHours(0, 0, 0, 0);
                                            return date < today;
                                        }}
                                    />
                                </PopoverContent>
                            </Popover>
                            <p className="text-xs text-muted-foreground">If left empty, the link will expire after 1 month.</p>
                        </div>
                    </div>

                    <div className="pt-4 border-t">
                        <CustomFieldBuilder 
                            fields={customFields} 
                            onChange={setCustomFields} 
                        />
                    </div>

                    {!generatedLink && (
                        <div className="pt-6 flex justify-end">
                            <Button 
                                onClick={handleGenerate} 
                                disabled={generateMutation.isPending || !classroomId}
                            >
                                {generateMutation.isPending ? 'Generating...' : 'Generate Form Link'}
                            </Button>
                        </div>
                    )}

                    {generatedLink && (
                        <div className="pt-6 border-t mt-6">
                            <div className="bg-muted p-4 rounded-md space-y-4">
                                <div>
                                    <h3 className="font-medium text-lg text-primary flex items-center">
                                        Form Link Generated Successfully!
                                    </h3>
                                    <p className="text-sm text-muted-foreground mt-1">
                                        Share this link with parents via Email, WhatsApp, or SMS.
                                    </p>
                                </div>
                                <div className="flex items-center gap-2 bg-background border p-3 rounded-md">
                                    <code className="text-sm flex-1 truncate">{generatedLink}</code>
                                    <CopyLinkButton link={generatedLink} variant="default" />
                                </div>
                                <div className="flex justify-end pt-2">
                                    <Button variant="outline" onClick={handleReset}>
                                        Generate Another Link
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
