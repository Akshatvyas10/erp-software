import React from "react";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetHeader,
    SheetTitle,
    SheetDescription,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";

export interface ResponsiveModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title?: React.ReactNode;
    description?: React.ReactNode;
    children: React.ReactNode;
    className?: string;
    contentClassName?: string;
    footer?: React.ReactNode;
    maxWidth?: string; // e.g. "sm:max-w-xl", "sm:max-w-2xl", "sm:max-w-3xl"
}

/**
 * ResponsiveModal
 * Displays a centered Radix <Dialog> on desktop (>= 640px)
 * and an adaptive bottom-sheet <Sheet side="bottom"> on mobile devices (< 640px)
 * with scroll boundaries and sticky header/footer to prevent virtual keyboard clipping.
 */
export function ResponsiveModal({
    open,
    onOpenChange,
    title,
    description,
    children,
    className,
    contentClassName,
    footer,
    maxWidth = "sm:max-w-xl",
}: ResponsiveModalProps) {
    const isDesktop = useMediaQuery("(min-width: 640px)");

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={onOpenChange}>
                <DialogContent
                    className={cn(
                        "p-0 flex flex-col overflow-hidden border border-border/80 shadow-2xl rounded-2xl bg-background max-h-[88vh]",
                        maxWidth,
                        className
                    )}
                >
                    {(title || description) && (
                        <DialogHeader className="px-6 py-4 bg-muted/40 border-b border-border shrink-0">
                            {title && (
                                <DialogTitle className="text-lg md:text-xl font-bold tracking-tight text-foreground">
                                    {title}
                                </DialogTitle>
                            )}
                            {description && (
                                <DialogDescription className="text-xs md:text-sm text-muted-foreground mt-0.5">
                                    {description}
                                </DialogDescription>
                            )}
                        </DialogHeader>
                    )}

                    <div className={cn("flex-1 overflow-y-auto p-6 custom-scrollbar", contentClassName)}>
                        {children}
                    </div>

                    {footer && (
                        <div className="p-4 px-6 bg-muted/40 border-t border-border flex justify-end gap-3 shrink-0">
                            {footer}
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        );
    }

    return (
        <Sheet open={open} onOpenChange={onOpenChange}>
            <SheetContent
                side="bottom"
                className={cn(
                    "p-0 flex flex-col rounded-t-3xl border-t border-border shadow-2xl bg-background max-h-[92vh] focus:outline-none",
                    className
                )}
            >
                {/* Mobile visual drag indicator */}
                <div className="pt-2 pb-1 flex justify-center shrink-0">
                    <div className="w-10 h-1 rounded-full bg-muted-foreground/30" />
                </div>

                {(title || description) && (
                    <SheetHeader className="px-5 py-3 border-b border-border/60 text-left shrink-0">
                        {title && (
                            <SheetTitle className="text-base font-bold tracking-tight text-foreground">
                                {title}
                            </SheetTitle>
                        )}
                        {description && (
                            <SheetDescription className="text-xs text-muted-foreground mt-0.5">
                                {description}
                            </SheetDescription>
                        )}
                    </SheetHeader>
                )}

                <div className={cn("flex-1 overflow-y-auto p-5 custom-scrollbar", contentClassName)}>
                    {children}
                </div>

                {footer && (
                    <div className="p-4 px-5 bg-muted/40 border-t border-border flex flex-col-reverse sm:flex-row justify-end gap-2 shrink-0 pb-safe">
                        {footer}
                    </div>
                )}
            </SheetContent>
        </Sheet>
    );
}
