import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const ClassroomDetailsSkeleton: React.FC = () => {
    return (
        <div className="space-y-6 pt-1">
            {/* 1. Header Section Skeleton */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center pb-4 border-b border-border">
                <div className="space-y-2">
                    <div className="flex items-center gap-3">
                        <Skeleton className="h-8 w-56 rounded-lg" />
                        <Skeleton className="h-6 w-20 rounded-md" />
                    </div>
                    <Skeleton className="h-4 w-64 rounded-md" />
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <Skeleton className="h-9 w-36 rounded-lg" />
                    <Skeleton className="h-9 w-32 rounded-lg" />
                </div>
            </div>

            {/* 2. Classic Summary Strip Skeleton */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="rounded-xl border border-border bg-card p-3.5 space-y-2">
                        <Skeleton className="h-3 w-20 rounded-md" />
                        <Skeleton className="h-5 w-28 rounded-md" />
                    </div>
                ))}
            </div>

            {/* 3. Tabs Skeleton */}
            <div className="flex items-center gap-2 p-1 bg-muted/60 rounded-xl border border-border/60 w-fit">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-8 w-24 rounded-lg" />
                ))}
            </div>

            {/* 4. Tab Content Card Skeleton */}
            <Card className="border border-border bg-card shadow-xs">
                <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
                    <Skeleton className="h-4 w-40 rounded-md" />
                    <Skeleton className="h-8 w-24 rounded-lg" />
                </div>
                <CardContent className="p-5 space-y-3">
                    <Skeleton className="h-10 w-full rounded-lg bg-muted/40" />
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="flex items-center justify-between py-2 border-b border-border/40 last:border-0">
                            <div className="flex items-center gap-3">
                                <Skeleton className="h-8 w-8 rounded-full" />
                                <div className="space-y-1">
                                    <Skeleton className="h-4 w-32" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-24 hidden md:block" />
                            <Skeleton className="h-4 w-20 hidden md:block" />
                            <Skeleton className="h-6 w-16 rounded-md" />
                        </div>
                    ))}
                </CardContent>
            </Card>
        </div>
    );
};

export default ClassroomDetailsSkeleton;
