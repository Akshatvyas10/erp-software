import { useState, useRef } from "react";
import { 
    ZoomIn, 
    ZoomOut, 
    RotateCcw, 
    Eye
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ZoomableDocumentPreviewProps {
    children: React.ReactNode;
    title?: string;
    dimensionsLabel?: string;
    aspectRatioText?: string;
    initialZoom?: number;
    className?: string;
}

export function ZoomableDocumentPreview({
    children,
    title,
    dimensionsLabel,
    aspectRatioText,
    initialZoom = 1,
    className
}: ZoomableDocumentPreviewProps) {
    const [zoom, setZoom] = useState<number>(initialZoom);
    const containerRef = useRef<HTMLDivElement>(null);

    // Zoom steps
    const handleZoomIn = () => {
        setZoom(prev => Math.min(Number((prev + 0.25).toFixed(2)), 2.5));
    };

    const handleZoomOut = () => {
        setZoom(prev => Math.max(Number((prev - 0.25).toFixed(2)), 0.5));
    };

    const handleResetZoom = () => {
        setZoom(1);
        if (containerRef.current) {
            containerRef.current.scrollTo({ top: 0, left: 0, behavior: "smooth" });
        }
    };

    // Double-click toggle: toggles between 100% and 150% (or fit)
    const handleDoubleClick = (e: React.MouseEvent) => {
        e.preventDefault();
        setZoom(prev => (prev >= 1.4 ? 1 : 1.5));
    };

    const zoomPercentage = Math.round(zoom * 100);

    return (
        <div className={cn("flex flex-col h-full w-full select-none", className)}>
            {/* Top Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-border/50 bg-muted/40 shrink-0 text-xs gap-2">
                <div className="flex items-center gap-2 truncate">
                    <span className="font-bold text-foreground flex items-center gap-1.5 truncate">
                        <Eye className="w-3.5 h-3.5 text-primary" />
                        {title || "Live Document Preview"}
                    </span>
                    {dimensionsLabel && (
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0 hidden sm:inline-flex">
                            {dimensionsLabel}
                        </Badge>
                    )}
                    {aspectRatioText && (
                        <span className="text-[10px] text-muted-foreground hidden md:inline">
                            • {aspectRatioText}
                        </span>
                    )}
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                    <div className="flex items-center bg-background border border-border/60 rounded-xl p-0.5 shadow-2xs">
                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleZoomOut}
                            disabled={zoom <= 0.5}
                            className="h-7 w-7 rounded-lg"
                            title="Zoom Out (-25%)"
                        >
                            <ZoomOut className="w-3.5 h-3.5" />
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={handleResetZoom}
                            className="h-7 px-2 text-[11px] font-mono font-bold"
                            title="Reset Zoom to 100%"
                        >
                            {zoomPercentage}%
                        </Button>

                        <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={handleZoomIn}
                            disabled={zoom >= 2.5}
                            className="h-7 w-7 rounded-lg"
                            title="Zoom In (+25%)"
                        >
                            <ZoomIn className="w-3.5 h-3.5" />
                        </Button>
                    </div>

                    <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={handleResetZoom}
                        className="h-7 w-7 rounded-xl"
                        title="Fit / Reset (100%)"
                    >
                        <RotateCcw className="w-3.5 h-3.5" />
                    </Button>
                </div>
            </div>

            {/* Scrollable Canvas Container */}
            <div
                ref={containerRef}
                onDoubleClick={handleDoubleClick}
                className="flex-1 overflow-auto p-4 sm:p-6 bg-neutral-900/10 dark:bg-neutral-950/40 flex items-start justify-center cursor-zoom-in relative"
                title="Double click to toggle zoom (100% / 150%)"
            >
                <div 
                    className="transition-transform duration-150 origin-top flex flex-col items-center justify-center my-auto"
                    style={{ transform: `scale(${zoom})` }}
                >
                    {children}
                </div>
            </div>

            {/* Bottom Tip Bar */}
            <div className="px-3 py-1.5 border-t border-border/40 bg-muted/20 text-[10px] text-muted-foreground flex items-center justify-between shrink-0">
                <span>💡 Tip: Double-click preview to toggle zoom in/out</span>
                <span className="font-mono">Zoom: {zoomPercentage}%</span>
            </div>
        </div>
    );
}
