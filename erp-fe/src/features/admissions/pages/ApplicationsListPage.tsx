import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useListApplications, useListForms, useToggleFormStatus, useBulkToggleFormStatus } from '../api/admissionApi';
import { ProcessApplicationModal } from '../components/ProcessApplicationModal';
import { CopyLinkButton } from '../components/CopyLinkButton';
import type { AdmissionApplication } from '../../../types/erp';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, AlertCircle, Plus } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "../../../components/ui/alert";
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';

export function ApplicationsListPage() {
    const [statusFilter, setStatusFilter] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedApp, setSelectedApp] = useState<AdmissionApplication | null>(null);

    // Form selection & actions
    const [selectedFormIds, setSelectedFormIds] = useState<string[]>([]);
    const toggleFormStatusMutation = useToggleFormStatus();
    const bulkToggleFormStatusMutation = useBulkToggleFormStatus();

    // Filter params
    const queryParams = {
        ...(statusFilter !== 'all' && { status: statusFilter }),
    };

    const { data, isLoading, error } = useListApplications(queryParams);
    const applications: AdmissionApplication[] = Array.isArray(data?.data) ? data.data : (data?.data?.applications || []);

    const { data: formsData, isLoading: isLoadingForms } = useListForms();
    const forms = formsData?.data?.forms || [];

    const filteredApplications = applications.filter(app => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        return (
            app.studentFirstName.toLowerCase().includes(searchLower) ||
            app.studentLastName.toLowerCase().includes(searchLower) ||
            app.parentEmail.toLowerCase().includes(searchLower)
        );
    });

    const handleToggleFormStatus = (formId: string) => {
        toggleFormStatusMutation.mutate(formId, {
            onSuccess: () => {
                toast.success('Form status updated');
                setSelectedFormIds(prev => prev.filter(id => id !== formId));
            },
            onError: (err: any) => {
                toast.error(err.response?.data?.message || 'Failed to update form status');
            }
        });
    };

    const handleBulkToggleFormStatus = (isActive: boolean) => {
        if (selectedFormIds.length === 0) return;
        bulkToggleFormStatusMutation.mutate({ ids: selectedFormIds, isActive }, {
            onSuccess: () => {
                toast.success(`Forms ${isActive ? 'activated' : 'deactivated'} successfully`);
                setSelectedFormIds([]);
            },
            onError: (err: any) => {
                toast.error(err.response?.data?.message || 'Failed to update forms');
            }
        });
    };

    const handleSelectForm = (id: string, checked: boolean) => {
        if (checked) {
            setSelectedFormIds(prev => [...prev, id]);
        } else {
            setSelectedFormIds(prev => prev.filter(formId => formId !== id));
        }
    };

    const handleSelectAllForms = (checked: boolean) => {
        if (checked) {
            setSelectedFormIds(forms.map((f: any) => f.id));
        } else {
            setSelectedFormIds([]);
        }
    };

    const openProcessModal = (app: AdmissionApplication) => {
        setSelectedApp(app);
        setModalOpen(true);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Admitted': return <Badge className="bg-green-500 hover:bg-green-600">Admitted</Badge>;
            case 'Rejected': return <Badge variant="destructive">Rejected</Badge>;
            default: return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800 hover:bg-yellow-200">Pending</Badge>;
        }
    };

    return (
        <div className="container mx-auto py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Admission Applications</h1>
                    <p className="text-muted-foreground mt-1">
                        Review and manage incoming student admission applications.
                    </p>
                </div>
                <Button asChild>
                    <Link to="/dashboard/admissions/generate">
                        <Plus className="mr-2 h-4 w-4" />
                        Generate Form
                    </Link>
                </Button>
            </div>

            <Tabs defaultValue="applications" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="applications">Applications</TabsTrigger>
                    <TabsTrigger value="forms">Generated Links</TabsTrigger>
                </TabsList>
                
                <TabsContent value="applications" className="space-y-6">
                    <Card className="mb-6">
                <CardContent className="pt-6 pb-4">
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="space-y-2 w-full md:w-1/3">
                            <label className="text-sm font-medium">Search</label>
                            <div className="relative">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search by name or email..."
                                    className="pl-8"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2 w-full md:w-48">
                            <label className="text-sm font-medium">Status</label>
                            <Select value={statusFilter} onValueChange={setStatusFilter}>
                                <SelectTrigger>
                                    <SelectValue placeholder="Filter by status" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">All Applications</SelectItem>
                                    <SelectItem value="Pending">Pending</SelectItem>
                                    <SelectItem value="Admitted">Admitted</SelectItem>
                                    <SelectItem value="Rejected">Rejected</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardContent className="p-0">
                    {isLoading ? (
                        <div className="p-6 space-y-4">
                            {[...Array(5)].map((_, i) => (
                                <div key={i} className="flex items-center space-x-4">
                                    <Skeleton className="h-12 w-full" />
                                </div>
                            ))}
                        </div>
                    ) : error ? (
                        <div className="p-6">
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>Error</AlertTitle>
                                <AlertDescription>
                                    {error instanceof Error ? error.message : (error as any)?.response?.data?.message || 'Failed to load applications. Please try again.'}
                                </AlertDescription>
                            </Alert>
                        </div>
                    ) : filteredApplications.length === 0 ? (
                        <div className="flex justify-center items-center h-64 text-muted-foreground">
                            <p>No applications found matching your criteria.</p>
                        </div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Student Name</th>
                                        <th className="px-6 py-4 font-medium">Class / Section</th>
                                        <th className="px-6 py-4 font-medium">Parent Contact</th>
                                        <th className="px-6 py-4 font-medium">Applied On</th>
                                        <th className="px-6 py-4 font-medium">Status</th>
                                        <th className="px-6 py-4 font-medium text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredApplications.map((app) => (
                                        <tr key={app.id} className="border-b hover:bg-muted/30 transition-colors">
                                            <td className="px-6 py-4 font-medium">
                                                {app.studentFirstName} {app.studentLastName}
                                                <div className="text-xs text-muted-foreground mt-1 font-normal">
                                                    DOB: {new Date(app.dateOfBirth).toLocaleDateString()}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                {app.form?.classroom?.name || 'Unknown'} - {app.form?.classroom?.section || 'N/A'}
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col gap-1">
                                                    <span className="font-medium">{app.fatherName}</span>
                                                    <span className="text-xs text-muted-foreground">{app.primaryContactNumber}</span>
                                                    <span className="text-xs text-muted-foreground">{app.parentEmail}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {new Date(app.createdAt).toLocaleDateString()}
                                            </td>
                                            <td className="px-6 py-4">
                                                {getStatusBadge(app.status)}
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                {app.status === 'Pending' && (
                                                    <div className="flex justify-end gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            className="text-purple-600 border-purple-200 hover:text-purple-700 hover:bg-purple-50"
                                                            onClick={() => openProcessModal(app)}
                                                        >
                                                            Process Application
                                                        </Button>
                                                    </div>
                                                )}
                                                {app.status !== 'Pending' && (
                                                    <Button variant="ghost" size="sm">View Details</Button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </CardContent>
            </Card>
            </TabsContent>

            <TabsContent value="forms">
                <Card>
                    <CardContent className="p-0">
                        {isLoadingForms ? (
                            <div className="p-6 space-y-4">
                                {[...Array(3)].map((_, i) => (
                                    <Skeleton key={i} className="h-12 w-full" />
                                ))}
                            </div>
                        ) : forms.length === 0 ? (
                            <div className="flex justify-center items-center h-64 text-muted-foreground">
                                <p>No generated forms found.</p>
                            </div>
                        ) : (
                            <div className="overflow-x-auto">
                                {selectedFormIds.length > 0 && (
                                    <div className="bg-muted/30 p-3 border-b flex items-center justify-between">
                                        <span className="text-sm font-medium">{selectedFormIds.length} forms selected</span>
                                        <div className="flex gap-2">
                                            <Button size="sm" onClick={() => handleBulkToggleFormStatus(true)} disabled={bulkToggleFormStatusMutation.isPending}>
                                                Activate Selected
                                            </Button>
                                            <Button size="sm" variant="destructive" onClick={() => handleBulkToggleFormStatus(false)} disabled={bulkToggleFormStatusMutation.isPending}>
                                                Deactivate Selected
                                            </Button>
                                        </div>
                                    </div>
                                )}
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                                        <tr>
                                            <th className="px-6 py-4 font-medium w-12">
                                                <Checkbox 
                                                    checked={selectedFormIds.length === forms.length && forms.length > 0}
                                                    onCheckedChange={(checked) => handleSelectAllForms(!!checked)}
                                                />
                                            </th>
                                            <th className="px-6 py-4 font-medium">Classroom</th>
                                            <th className="px-6 py-4 font-medium">Created On</th>
                                            <th className="px-6 py-4 font-medium">Expires On</th>
                                            <th className="px-6 py-4 font-medium">Status</th>
                                            <th className="px-6 py-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {forms.map((form: any) => {
                                            const isExpired = form.expiresAt ? new Date(form.expiresAt) < new Date() : false;
                                            const isActive = form.isActive && !isExpired;
                                            const publicUrl = `${window.location.origin}/public/admissions/${form.token}`;
                                            return (
                                                <tr key={form.id} className="border-b hover:bg-muted/30 transition-colors">
                                                    <td className="px-6 py-4">
                                                        <Checkbox 
                                                            checked={selectedFormIds.includes(form.id)}
                                                            onCheckedChange={(checked) => handleSelectForm(form.id, !!checked)}
                                                        />
                                                    </td>
                                                    <td className="px-6 py-4 font-medium">
                                                        {form.classroom?.name} {form.classroom?.section}
                                                        <div className="text-xs text-muted-foreground mt-1 font-normal">
                                                            {form.classroom?.academicYear}
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {new Date(form.createdAt).toLocaleDateString()}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        {form.expiresAt ? new Date(form.expiresAt).toLocaleDateString() : 'Never'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {isActive ? (
                                                            <Badge className="bg-green-500 hover:bg-green-600">Active</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">Inactive</Badge>
                                                        )}
                                                    </td>
                                                    <td className="px-6 py-4 flex justify-end gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm"
                                                            onClick={() => handleToggleFormStatus(form.id)}
                                                            disabled={toggleFormStatusMutation.isPending || isExpired}
                                                        >
                                                            {form.isActive ? 'Deactivate' : 'Activate'}
                                                        </Button>
                                                        {isActive && (
                                                            <CopyLinkButton link={publicUrl} variant="outline" />
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </TabsContent>
            </Tabs>

            {/* Modal */}
            <ProcessApplicationModal 
                isOpen={modalOpen} 
                onClose={() => setModalOpen(false)} 
                application={selectedApp} 
            />
        </div>
    );
}
