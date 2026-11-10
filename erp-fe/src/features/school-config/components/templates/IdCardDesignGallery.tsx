import { Check, Sparkles } from "lucide-react";
import { 
    MODERN_STUDENT_ID_PRESETS, 
    type ModernIdCardPreset 
} from "./modernIdCardPresets";
import { cn } from "@/lib/utils";

interface IdCardDesignGalleryProps {
    selectedDesignKey: string;
    onSelectDesign: (preset: ModernIdCardPreset) => void;
}

export function IdCardDesignGallery({
    selectedDesignKey,
    onSelectDesign
}: IdCardDesignGalleryProps) {
    return (
        <div className="space-y-3">
            <div className="flex items-center justify-between">
                <div>
                    <h4 className="text-xs font-black text-foreground uppercase tracking-wider flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-primary" /> Modern Design Gallery
                    </h4>
                    <p className="text-[11px] text-muted-foreground">
                        Select a design aesthetic. Colors, typography, frames, and header styles will automatically update.
                    </p>
                </div>
            </div>

            {/* Presets 2-column or 3-column Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {MODERN_STUDENT_ID_PRESETS.map((preset) => {
                    const isSelected = selectedDesignKey === preset.key;

                    return (
                        <div
                            key={preset.key}
                            onClick={() => onSelectDesign(preset)}
                            className={cn(
                                "p-3 rounded-xl border transition-all cursor-pointer flex flex-col justify-between text-left space-y-2.5 relative group",
                                isSelected
                                    ? "border-primary bg-primary/5 ring-2 ring-primary/40 shadow-sm"
                                    : "border-border/70 hover:border-primary/40 hover:bg-muted/20 bg-card"
                            )}
                        >
                            {/* Selected Checkmark Badge */}
                            {isSelected && (
                                <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-xs z-10">
                                    <Check className="w-3 h-3 stroke-[3]" />
                                </div>
                            )}

                            {/* Mini Thumbnail Silhouette with Preset Flavor */}
                            <div 
                                className={cn(
                                    "w-full h-20 rounded-lg border border-border/80 overflow-hidden relative shadow-2xs flex flex-col justify-between p-1.5",
                                    preset.cardBackgroundCss
                                )}
                            >
                                {/* Header thumbnail */}
                                <div 
                                    className="h-3 w-full rounded flex items-center px-1 justify-between shrink-0"
                                    style={{ 
                                        backgroundColor: preset.headerStyle === "transparent" ? "rgba(255,255,255,0.15)" : preset.primaryColor,
                                        color: "#FFFFFF"
                                    }}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full bg-white/70" />
                                    <div className="h-1 w-12 bg-white/80 rounded-full" />
                                    <div className="w-1.5 h-1.5" />
                                </div>

                                {/* Body thumbnail */}
                                <div className="flex items-center gap-2 flex-1 px-1">
                                    <div 
                                        className={cn(
                                            "w-7 h-8 bg-slate-300/40 shrink-0 border",
                                            preset.photoShape === "circle" ? "rounded-full" : 
                                            preset.photoShape === "squircle" ? "rounded-lg" : "rounded-xs"
                                        )}
                                        style={{ borderColor: preset.accentColor }}
                                    />
                                    <div className="flex-1 space-y-1">
                                        <div className="h-1.5 w-16 bg-current opacity-70 rounded-full" />
                                        <div className="h-1 w-10 bg-current opacity-40 rounded-full" />
                                        <div className="h-1 w-7 bg-current opacity-30 rounded-full" />
                                    </div>
                                    <div className="w-3.5 h-3.5 bg-black/10 rounded-xs border border-current opacity-40 shrink-0" />
                                </div>

                                {/* Footer thumbnail */}
                                <div className="h-1 w-full bg-black/10 rounded-full shrink-0" />
                            </div>

                            {/* Preset Details */}
                            <div className="space-y-0.5">
                                <div className="flex items-center justify-between">
                                    <h5 className="font-black text-xs text-foreground truncate">
                                        {preset.name}
                                    </h5>
                                    <span className="text-[9px] font-semibold text-muted-foreground truncate pl-1">
                                        {preset.label}
                                    </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground line-clamp-2 leading-relaxed">
                                    {preset.tagline}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
