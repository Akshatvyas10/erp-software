import React from "react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
    title: string;
    description?: string;
    children?: React.ReactNode;
    className?: string;
}

export function PageHeader({ title, description, children, className }: PageHeaderProps) {
    return (
        <div className={cn("flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6", className)}>
            <div className="space-y-1">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">{title}</h1>
                {description && <p className="text-xs sm:text-sm text-muted-foreground">{description}</p>}
            </div>
            {children && <div className="flex flex-wrap items-center gap-2.5 shrink-0">{children}</div>}
        </div>
    );
}
