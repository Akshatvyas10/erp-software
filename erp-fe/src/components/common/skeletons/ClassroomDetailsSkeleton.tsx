import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

export const ClassroomDetailsSkeleton: React.FC = () => {
  return (
    <div className="space-y-6 pt-2">
      {/* Back and Header Section */}
      <div className="pb-4 border-b border-border/60 space-y-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72" />
        </div>

        {/* Teachers Section Banner */}
        <div className="mt-4 p-4 bg-muted/30 border border-border/50 rounded-xl space-y-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-4 rounded-full" />
            <Skeleton className="h-4 w-36" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-start gap-3 p-3 bg-background border border-border/60 rounded-lg shadow-sm">
                <Skeleton className="h-10 w-10 rounded-full shrink-0" />
                <div className="space-y-1.5 flex-1">
                  <div className="flex items-center gap-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3.5 w-16 rounded-full" />
                  </div>
                  <Skeleton className="h-3 w-28" />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Classroom Tabs Navigation Skeleton */}
        <div className="flex items-center gap-2 mt-6 overflow-x-auto pb-1">
          <Skeleton className="h-9 w-24 rounded-t-xl" />
          <Skeleton className="h-9 w-36 rounded-t-xl" />
          <Skeleton className="h-9 w-28 rounded-t-xl" />
          <Skeleton className="h-9 w-28 rounded-t-xl" />
          <Skeleton className="h-9 w-28 rounded-t-xl" />
        </div>
      </div>

      {/* Main Tab Content Card Skeleton (e.g. Roster or Timetable) */}
      <Card className="border border-border shadow-sm rounded-2xl bg-card overflow-hidden">
        {/* Card Toolbar / Filters */}
        <div className="p-4 sm:p-6 border-b border-border/50 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
          <div className="flex gap-2 w-full sm:w-auto justify-end">
            <Skeleton className="h-9 w-24 rounded-xl" />
            <Skeleton className="h-9 w-28 rounded-xl" />
          </div>
        </div>

        {/* Table Rows Skeleton */}
        <CardContent className="p-4 sm:p-6 space-y-3">
          <Skeleton className="h-10 w-full rounded-lg bg-muted/60" />
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
              <Skeleton className="h-4 w-36 hidden lg:block" />
              <Skeleton className="h-8 w-8 rounded-lg" />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClassroomDetailsSkeleton;
