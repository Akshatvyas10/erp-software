import React from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

export const ProfilePageSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Hero Banner / Profile Header Skeleton */}
      <Card className="overflow-hidden border-border shadow-sm">
        <Skeleton className="h-32 w-full bg-muted/60" />
        <CardContent className="relative pt-0 pb-6 px-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-end gap-4 -mt-12 sm:-mt-16 mb-4">
            <Skeleton className="h-24 w-24 sm:h-28 sm:w-28 rounded-full border-4 border-background shadow-md" />
            <div className="space-y-2 text-center sm:text-left flex-1">
              <Skeleton className="h-7 w-48 mx-auto sm:mx-0" />
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-28 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-full" />
              </div>
            </div>
            <div className="flex gap-2">
              <Skeleton className="h-9 w-24 rounded-md" />
              <Skeleton className="h-9 w-24 rounded-md" />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs Skeleton */}
      <div className="flex gap-2 border-b border-border pb-2">
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
        <Skeleton className="h-9 w-28 rounded-md" />
      </div>

      {/* Profile Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-1 shadow-sm">
          <CardHeader>
            <Skeleton className="h-5 w-32" />
          </CardHeader>
          <CardContent className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex justify-between items-center py-1 border-b border-border/50">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-4 w-28" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 shadow-sm">
          <CardHeader>
            <Skeleton className="h-5 w-40" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="p-4 rounded-lg border border-border/60 space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-6 w-36" />
                </div>
              ))}
            </div>
            <Skeleton className="h-32 w-full rounded-md" />
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePageSkeleton;
