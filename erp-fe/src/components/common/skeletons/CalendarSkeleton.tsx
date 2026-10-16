import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const CalendarSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Calendar Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="space-y-2">
          <Skeleton className="h-8 w-44" />
          <Skeleton className="h-4 w-60" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-20 rounded-md" />
          <Skeleton className="h-9 w-28 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-md" />
        </div>
      </div>

      {/* Month & Navigation Bar */}
      <Card className="shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between py-4">
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
          <div className="flex gap-1">
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
            <Skeleton className="h-8 w-16 rounded-md" />
          </div>
        </CardHeader>
        <CardContent className="p-0 border-t border-border">
          {/* Day Headers (Sun-Sat) */}
          <div className="grid grid-cols-7 border-b border-border bg-muted/30">
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <div key={day} className="p-3 text-center">
                <Skeleton className="h-4 w-10 mx-auto" />
              </div>
            ))}
          </div>

          {/* 5 Weeks Grid */}
          <div className="grid grid-cols-7 divide-x divide-y divide-border">
            {Array.from({ length: 35 }).map((_, index) => (
              <div key={index} className="min-h-[90px] p-2 space-y-1">
                <div className="flex justify-between items-center mb-1">
                  <Skeleton className="h-4 w-5" />
                </div>
                {index % 4 === 0 && <Skeleton className="h-4 w-full rounded bg-primary/20" />}
                {index % 7 === 2 && <Skeleton className="h-4 w-4/5 rounded bg-amber-500/20" />}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CalendarSkeleton;
