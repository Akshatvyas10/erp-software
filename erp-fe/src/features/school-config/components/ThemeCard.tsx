import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Check } from 'lucide-react';
import { type RoyalTheme } from '@/lib/royalThemes';
import { cn } from '@/lib/utils';

interface ThemeCardProps {
    theme: RoyalTheme;
    isSelected: boolean;
    onSelect: (themeId: string) => void;
}

export const ThemeCard: React.FC<ThemeCardProps> = ({ theme, isSelected, onSelect }) => {
    return (
        <Card
            onClick={() => onSelect(theme.id)}
            className={cn(
                "group relative cursor-pointer overflow-hidden rounded-2xl border transition-all duration-300 hover:shadow-md",
                isSelected
                    ? "border-primary ring-2 ring-primary/40 shadow-sm bg-accent/20"
                    : "border-border/60 hover:border-border hover:bg-muted/30"
            )}
        >
            {/* Color Swatch Header Preview */}
            <div
                className="h-20 w-full relative p-3 flex flex-col justify-between"
                style={{
                    background: `linear-gradient(135deg, ${theme.primaryHex} 0%, ${theme.accentHex} 100%)`,
                }}
            >
                <div className="flex justify-between items-start">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider bg-black/20 backdrop-blur-sm px-2 py-0.5 rounded-full">
                        {theme.id.replace('-', ' ')}
                    </span>
                    {isSelected && (
                        <div className="h-6 w-6 rounded-full bg-white text-primary flex items-center justify-center shadow-md">
                            <Check className="h-3.5 w-3.5 stroke-[3]" />
                        </div>
                    )}
                </div>

                {/* Micro UI sample inside swatch */}
                <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-sm rounded-lg p-1.5 w-fit">
                    <div className="h-3 w-3 rounded-full bg-white/80" />
                    <div className="h-1.5 w-12 rounded-full bg-white/60" />
                    <div className="h-1.5 w-6 rounded-full bg-white/40" />
                </div>
            </div>

            {/* Description & Color Chips */}
            <CardContent className="p-4 space-y-3">
                <div>
                    <h4 className="font-bold text-sm text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                        {theme.name}
                    </h4>
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{theme.description}</p>
                </div>

                {/* Hex preview chips */}
                <div className="flex items-center justify-between pt-2 border-t border-border/40">
                    <div className="flex items-center gap-2">
                        <div
                            className="h-4 w-4 rounded-full border border-background shadow-xs"
                            style={{ backgroundColor: theme.primaryHex }}
                            title={`Primary: ${theme.primaryHex}`}
                        />
                        <span className="text-[11px] font-mono text-muted-foreground">{theme.primaryHex}</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                        <div
                            className="h-3.5 w-3.5 rounded-full border border-background"
                            style={{ backgroundColor: theme.accentHex }}
                            title={`Accent: ${theme.accentHex}`}
                        />
                        <span className="text-[11px] font-mono text-muted-foreground/70">{theme.accentHex}</span>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export default ThemeCard;
