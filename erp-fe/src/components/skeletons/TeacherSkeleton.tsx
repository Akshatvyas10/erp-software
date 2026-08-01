import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";

export function TeacherSkeleton() {
    return (
        <div className="space-y-4 animate-in fade-in duration-500">
            {/* Mobile View: Cards */}
            <div className="md:hidden space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <Card key={`mobile-skel-${i}`} className="border-border/50">
                        <CardContent className="p-4 space-y-4">
                            <div className="flex items-center gap-4">
                                <Skeleton className="h-12 w-12 rounded-full" />
                                <div className="space-y-2 flex-1">
                                    <Skeleton className="h-4 w-3/4" />
                                    <Skeleton className="h-3 w-1/2" />
                                </div>
                            </div>
                            <div className="flex gap-2 pt-2">
                                <Skeleton className="h-5 w-16 rounded-full" />
                                <Skeleton className="h-5 w-20 rounded-full" />
                            </div>
                            <div className="flex justify-end gap-2 pt-2 border-t border-border/50">
                                <Skeleton className="h-8 w-8 rounded-md" />
                                <Skeleton className="h-8 w-8 rounded-md" />
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Desktop View: Table */}
            <div className="hidden md:block rounded-xl border border-border/50 bg-white dark:bg-zinc-900/50 shadow-sm overflow-hidden">
                <Table>
                    <TableHeader className="bg-zinc-50/50 dark:bg-zinc-900/50">
                        <TableRow className="border-border/50 hover:bg-transparent">
                            <TableHead className="font-semibold h-11 w-12 text-center text-xs">#</TableHead>
                            <TableHead className="font-semibold h-11 text-xs">Teacher</TableHead>
                            <TableHead className="font-semibold h-11 text-xs">Emp No</TableHead>
                            <TableHead className="font-semibold h-11 text-xs">Contact</TableHead>
                            <TableHead className="font-semibold h-11 text-xs">Department</TableHead>
                            <TableHead className="font-semibold h-11 text-right text-xs pr-6">Actions</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={`desktop-skel-${i}`} className="border-border/50">
                                <TableCell className="text-center">
                                    <Skeleton className="h-4 w-4 mx-auto" />
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center gap-3">
                                        <Skeleton className="h-9 w-9 rounded-full" />
                                        <div className="space-y-2">
                                            <Skeleton className="h-4 w-32" />
                                            <Skeleton className="h-3 w-24" />
                                        </div>
                                    </div>
                                </TableCell>
                                <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                                <TableCell>
                                    <div className="space-y-2">
                                        <Skeleton className="h-4 w-28" />
                                        <Skeleton className="h-3 w-20" />
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        <Skeleton className="h-5 w-20 rounded-full" />
                                        <Skeleton className="h-5 w-16 rounded-full" />
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                    <Skeleton className="h-8 w-8 ml-auto rounded-md" />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
