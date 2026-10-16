import React from 'react';
import { useRoyalTheme } from '@/context/ThemeProvider';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateActiveTheme } from '../api/schoolConfigApi';
import { toast } from 'sonner';
import { ThemeCard } from './ThemeCard';
import { Palette, Sparkles, Loader2 } from 'lucide-react';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const ThemeConfigTab: React.FC = () => {
    const queryClient = useQueryClient();
    const { activeTheme, themeId, setTheme, availableThemes } = useRoyalTheme();

    const themeMutation = useMutation({
        mutationFn: updateActiveTheme,
        onSuccess: (data) => {
            toast.success(`Theme updated to ${data.activeTheme.replace('-', ' ')} and saved system-wide!`);
            queryClient.invalidateQueries({ queryKey: ['schoolConfig'] });
        },
        onError: (err: any) => {
            toast.error(err.response?.data?.message || 'Failed to persist theme in database');
        },
    });

    const handleSelectTheme = (id: string) => {
        // Instantly switch theme locally for instant feedback
        setTheme(id);
        // Persist to server
        themeMutation.mutate(id);
    };

    return (
        <div className="space-y-6">
            {/* Header Banner */}
            <Card className="border-border/60 shadow-sm bg-card rounded-2xl overflow-hidden">
                <CardHeader className="py-4 px-6 border-b border-border/40 bg-muted/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary">
                            <Palette className="h-5 w-5" />
                        </div>
                        <div>
                            <CardTitle className="text-base font-bold text-foreground">Royal Design Aesthetics</CardTitle>
                            <CardDescription className="text-xs text-muted-foreground mt-0.5">
                                Select from 12 curated royal color palettes. Themes apply dynamically across components in both Light and Dark modes.
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="gap-1.5 px-3 py-1 bg-primary/10 text-primary border-primary/20 text-xs font-semibold">
                            <Sparkles className="h-3.5 w-3.5" /> Active: {activeTheme.name}
                        </Badge>
                        {themeMutation.isPending && (
                            <Badge variant="secondary" className="gap-1.5 text-xs">
                                <Loader2 className="h-3 w-3 animate-spin" /> Saving...
                            </Badge>
                        )}
                    </div>
                </CardHeader>
            </Card>

            {/* Live Preview Sample */}
            <Card className="border-border/60 shadow-sm bg-card rounded-2xl p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Live Component Preview</h3>
                <div className="flex flex-wrap items-center gap-3">
                    <Button variant="default" size="sm" className="rounded-xl">Primary Action</Button>
                    <Button variant="outline" size="sm" className="rounded-xl border-border">Outline Button</Button>
                    <Button variant="secondary" size="sm" className="rounded-xl">Secondary Pill</Button>
                    <Badge variant="default" className="text-xs">Primary Badge</Badge>
                    <Badge variant="outline" className="text-xs border-primary text-primary">Accent Border</Badge>
                    <div className="h-8 px-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center text-xs font-bold text-primary">
                        Dynamic Accent Box
                    </div>
                </div>
            </Card>

            {/* 12 Royal Theme Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {availableThemes.map((t) => (
                    <ThemeCard
                        key={t.id}
                        theme={t}
                        isSelected={t.id === themeId}
                        onSelect={handleSelectTheme}
                    />
                ))}
            </div>
        </div>
    );
};

export default ThemeConfigTab;
