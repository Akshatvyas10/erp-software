import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateSmtpConfig, testEmailConnection, type SmtpSettings } from '../api/schoolConfigApi';
import { toast } from 'sonner';
import { 
    Server, Send, CheckCircle2, XCircle, AlertCircle, 
    Loader2, ShieldCheck, Eye, EyeOff 
} from 'lucide-react';

import {
    Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
    Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger
} from '@/components/ui/dialog';

const smtpFormSchema = z.object({
    host: z.string().min(1, 'SMTP Host is required (e.g. smtp.gmail.com)'),
    port: z.coerce.number().int().min(1, 'Port must be greater than 0').max(65535, 'Invalid port'),
    encryption: z.enum(['NONE', 'SSL', 'TLS']),
    username: z.string().min(1, 'Username / Account email is required'),
    password: z.string().optional(),
    fromName: z.string().min(1, 'Sender Name is required'),
    fromEmail: z.string().email('Valid sender email required'),
    replyTo: z.string().email('Valid reply-to email').optional().or(z.literal('')),
});

interface EmailServerTabProps {
    initialSmtp?: SmtpSettings;
}

export const EmailServerTab: React.FC<EmailServerTabProps> = ({ initialSmtp }) => {
    const queryClient = useQueryClient();
    const [showPassword, setShowPassword] = useState(false);
    const [testEmailDialogOpen, setTestEmailDialogOpen] = useState(false);
    const [recipientEmail, setRecipientEmail] = useState('');

    const form = useForm<z.infer<typeof smtpFormSchema>>({
        // @ts-ignore
        resolver: zodResolver(smtpFormSchema),
        defaultValues: {
            host: initialSmtp?.host || '',
            port: initialSmtp?.port || 587,
            encryption: initialSmtp?.encryption || 'TLS',
            username: initialSmtp?.username || '',
            password: '',
            fromName: initialSmtp?.fromName || '',
            fromEmail: initialSmtp?.fromEmail || '',
            replyTo: initialSmtp?.replyTo || '',
        },
    });

    useEffect(() => {
        if (initialSmtp) {
            form.reset({
                host: initialSmtp.host || '',
                port: initialSmtp.port || 587,
                encryption: initialSmtp.encryption || 'TLS',
                username: initialSmtp.username || '',
                password: '',
                fromName: initialSmtp.fromName || '',
                fromEmail: initialSmtp.fromEmail || '',
                replyTo: initialSmtp.replyTo || '',
            });
        }
    }, [initialSmtp, form]);

    const saveMutation = useMutation({
        mutationFn: updateSmtpConfig,
        onSuccess: () => {
            toast.success('SMTP configuration saved and encrypted successfully');
            queryClient.invalidateQueries({ queryKey: ['schoolConfig'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to save SMTP configuration');
        },
    });

    const testMutation = useMutation({
        mutationFn: testEmailConnection,
        onSuccess: () => {
            toast.success(`Verification email sent successfully! Connection verified.`);
            setTestEmailDialogOpen(false);
            setRecipientEmail('');
            queryClient.invalidateQueries({ queryKey: ['schoolConfig'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'SMTP Connection Test Failed');
        },
    });

    const onSubmit = (values: any) => {
        saveMutation.mutate(values as SmtpSettings);
    };

    const handleSendTest = () => {
        if (!recipientEmail || !recipientEmail.includes('@')) {
            toast.error('Please enter a valid recipient email address');
            return;
        }
        testMutation.mutate(recipientEmail);
    };

    const connectionStatus = initialSmtp?.connectionStatus || 'UNTESTED';

    return (
        <div className="space-y-6">
            {/* Status & Overview Banner */}
            <Card className="border-border/60 shadow-sm bg-card rounded-2xl overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Server className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-foreground">SMTP Gateway Status</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                Automated transactional emails (admissions, notifications, resets) route through this server.
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {connectionStatus === 'SUCCESS' && (
                            <Badge variant="outline" className="gap-1.5 px-3 py-1 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 text-xs font-semibold">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Connected
                            </Badge>
                        )}
                        {connectionStatus === 'FAILED' && (
                            <Badge variant="outline" className="gap-1.5 px-3 py-1 bg-destructive/10 text-destructive border-destructive/20 text-xs font-semibold">
                                <XCircle className="h-3.5 w-3.5" /> Verification Failed
                            </Badge>
                        )}
                        {connectionStatus === 'UNTESTED' && (
                            <Badge variant="outline" className="gap-1.5 px-3 py-1 bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/20 text-xs font-semibold">
                                <AlertCircle className="h-3.5 w-3.5" /> Untested
                            </Badge>
                        )}

                        <Dialog open={testEmailDialogOpen} onOpenChange={setTestEmailDialogOpen}>
                            <DialogTrigger asChild>
                                <Button 
                                    variant="outline" 
                                    size="sm" 
                                    className="gap-2 h-9 rounded-xl border-border bg-background hover:bg-muted font-medium text-xs"
                                    disabled={!initialSmtp?.isConfigured}
                                >
                                    <Send className="h-3.5 w-3.5 text-primary" /> Send Test Email
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md rounded-2xl">
                                <DialogHeader>
                                    <DialogTitle className="text-base font-bold">Verify SMTP Dispatch</DialogTitle>
                                    <DialogDescription className="text-xs">
                                        Enter an email address to receive an instant verification message confirming your SMTP credentials.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-3 py-2">
                                    <label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Recipient Email</label>
                                    <Input
                                        placeholder="admin@school.edu"
                                        value={recipientEmail}
                                        onChange={(e) => setRecipientEmail(e.target.value)}
                                        className="h-10 rounded-xl"
                                    />
                                </div>
                                <DialogFooter>
                                    <Button variant="ghost" size="sm" onClick={() => setTestEmailDialogOpen(false)}>Cancel</Button>
                                    <Button 
                                        size="sm" 
                                        onClick={handleSendTest} 
                                        disabled={testMutation.isPending} 
                                        className="gap-2 rounded-xl"
                                    >
                                        {testMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                                        Dispatch Test
                                    </Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>
                </CardHeader>
            </Card>

            {/* Main SMTP Configuration Form */}
            <Card className="border-border/60 shadow-sm bg-card rounded-2xl">
                <CardHeader>
                    <CardTitle className="text-base font-bold text-foreground">SMTP Server Connection Details</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">
                        All passwords and tokens are secured with AES-256-GCM encryption at rest before being saved.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Form {...form}>
                        {/* @ts-ignore */}
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control as any}
                                    name="host"
                                    render={({ field }) => (
                                        <FormItem className="md:col-span-2">
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SMTP Host</FormLabel>
                                            <FormControl>
                                                <Input placeholder="smtp.gmail.com" {...field} className="h-10 rounded-xl bg-muted/40" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="port"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">SMTP Port</FormLabel>
                                            <FormControl>
                                                <Input type="number" placeholder="587" {...field} className="h-10 rounded-xl bg-muted/40 font-mono" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control as any}
                                    name="encryption"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Security Protocol</FormLabel>
                                            <Select onValueChange={field.onChange} value={field.value}>
                                                <FormControl>
                                                    <SelectTrigger className="h-10 rounded-xl bg-muted/40">
                                                        <SelectValue placeholder="Select Encryption" />
                                                    </SelectTrigger>
                                                </FormControl>
                                                <SelectContent className="rounded-xl">
                                                    <SelectItem value="TLS">TLS (Recommended - Port 587)</SelectItem>
                                                    <SelectItem value="SSL">SSL (Port 465)</SelectItem>
                                                    <SelectItem value="NONE">None (Insecure / Internal)</SelectItem>
                                                </SelectContent>
                                            </Select>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="username"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Username / Account Email</FormLabel>
                                            <FormControl>
                                                <Input placeholder="notifications@school.edu" {...field} className="h-10 rounded-xl bg-muted/40" />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="password"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                                                Password / App Password {initialSmtp?.isConfigured && <span className="text-[10px] text-primary lowercase">(leave blank to keep current)</span>}
                                            </FormLabel>
                                            <div className="relative">
                                                <FormControl>
                                                    <Input
                                                        type={showPassword ? 'text' : 'password'}
                                                        placeholder={initialSmtp?.isConfigured ? '••••••••••••' : 'Enter SMTP password'}
                                                        {...field}
                                                        className="h-10 rounded-xl bg-muted/40 pr-10 font-mono"
                                                    />
                                                </FormControl>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 text-muted-foreground hover:text-foreground"
                                                    onClick={() => setShowPassword(!showPassword)}
                                                >
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </Button>
                                            </div>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="pt-2 border-t border-border/40 grid grid-cols-1 md:grid-cols-3 gap-4">
                                <FormField
                                    control={form.control as any}
                                    name="fromName"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Sender Display Name</FormLabel>
                                            <FormControl>
                                                <Input placeholder="Oakridge Academy" {...field} className="h-10 rounded-xl bg-muted/40" />
                                            </FormControl>
                                            <FormDescription className="text-[11px]">e.g. Oakridge Admissions</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="fromEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">From Address</FormLabel>
                                            <FormControl>
                                                <Input placeholder="no-reply@school.edu" {...field} className="h-10 rounded-xl bg-muted/40" />
                                            </FormControl>
                                            <FormDescription className="text-[11px]">Primary sending email</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />

                                <FormField
                                    control={form.control as any}
                                    name="replyTo"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reply-To Address (Optional)</FormLabel>
                                            <FormControl>
                                                <Input placeholder="support@school.edu" {...field} className="h-10 rounded-xl bg-muted/40" />
                                            </FormControl>
                                            <FormDescription className="text-[11px]">Receives parent/student replies</FormDescription>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>

                            <div className="flex justify-end pt-4">
                                <Button
                                    type="submit"
                                    disabled={saveMutation.isPending}
                                    className="gap-2 h-10 px-6 rounded-xl font-semibold shadow-sm"
                                >
                                    {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
                                    Save & Encrypt SMTP Settings
                                </Button>
                            </div>
                        </form>
                    </Form>
                </CardContent>
            </Card>
        </div>
    );
};

export default EmailServerTab;
