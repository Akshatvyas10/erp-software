import React from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
    icon: React.ElementType;
    title: string;
    description: string;
    actionLabel?: string;
    onAction?: () => void;
    className?: string;
    actionDisabled?: boolean;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className,
    actionDisabled = false,
}: EmptyStateProps) {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-center p-8 sm:p-14 text-center border border-dashed border-border/70 rounded-2xl bg-card/40 my-4",
                className
            )}
        >
            <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-4 shadow-xs">
                <Icon className="h-7 w-7" />
            </div>
            <h3 className="text-base font-semibold text-foreground tracking-tight">{title}</h3>
            <p className="text-sm text-muted-foreground max-w-sm mt-1.5 leading-relaxed">{description}</p>
            {actionLabel && onAction && (
                <Button
                    onClick={onAction}
                    disabled={actionDisabled}
                    className="mt-6 font-semibold shadow-sm"
                    size="sm"
                >
                    {actionLabel}
                </Button>
            )}
        </div>
    );
}
