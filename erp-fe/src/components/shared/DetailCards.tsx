import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function DetailRow({
    icon: Icon, label, value, href, mono = false,
}: {
    icon: React.ElementType;
    label: string;
    value: React.ReactNode;
    href?: string;
    mono?: boolean;
}) {
    return (
        <div className="flex items-start gap-3 py-2.5 border-b border-border/60 last:border-0">
            <div className="h-7 w-7 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                <Icon className="h-3.5 w-3.5 text-primary" />
            </div>
            <div className="flex flex-col min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                    {label}
                </span>
                {href ? (
                    <a href={href}
                        className="text-[13px] font-semibold text-primary hover:underline underline-offset-2 truncate">
                        {value}
                    </a>
                ) : (
                    <span className={`text-[13px] font-semibold text-foreground break-words ${mono ? "font-mono" : ""}`}>
                        {value ?? <span className="text-muted-foreground font-normal italic">Not provided</span>}
                    </span>
                )}
            </div>
        </div>
    );
}

export function SectionCard({
    title, icon: Icon, accent = "primary", children, className = ""
}: {
    title: string;
    icon: React.ElementType;
    accent?: "primary" | "accent" | "emerald" | "destructive" | "muted";
    children: React.ReactNode;
    className?: string;
}) {
    const accents = {
        primary: "text-primary bg-primary/10",
        accent: "text-accent-foreground bg-accent",
        emerald: "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10",
        destructive: "text-destructive bg-destructive/10",
        muted: "text-muted-foreground bg-muted",
    };
    return (
        <Card className={`border border-border/60 shadow-sm hover:shadow-md transition-shadow duration-300 rounded-2xl bg-card overflow-hidden ${className}`}>
            <CardHeader className="pb-2 pt-5 px-5 bg-muted/20 border-b border-border/40">
                <CardTitle className="flex items-center gap-2.5 text-[13px] font-extrabold uppercase tracking-wide text-foreground">
                    <div className={`h-7 w-7 rounded-xl flex items-center justify-center shrink-0 ${accents[accent]}`}>
                        <Icon className="h-4 w-4" />
                    </div>
                    {title}
                </CardTitle>
            </CardHeader>
            <CardContent className="px-5 pb-4 pt-3">
                {children}
            </CardContent>
        </Card>
    );
}
