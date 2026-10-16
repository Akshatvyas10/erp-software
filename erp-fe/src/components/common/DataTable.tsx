import React from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Inbox } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "./EmptyState";
import { cn } from "@/lib/utils";

export interface Column<T> {
    header: string;
    accessorKey?: keyof T;
    cell?: (row: T) => React.ReactNode;
    className?: string;
    mobileHide?: boolean;
}

interface PaginationConfig {
    page: number;
    totalPages: number;
    total: number;
    limit: number;
    onPageChange: (page: number) => void;
}

interface DataTableProps<T> {
    columns: Column<T>[];
    data: T[];
    keyExtractor: (row: T) => string;
    isLoading?: boolean;
    pagination?: PaginationConfig;
    emptyTitle?: string;
    emptyDescription?: string;
    emptyIcon?: React.ElementType;
    emptyActionLabel?: string;
    onEmptyAction?: () => void;
    onRowClick?: (row: T) => void;
    renderMobileCard?: (row: T) => React.ReactNode;
    className?: string;
}

export function DataTable<T>({
    columns,
    data,
    keyExtractor,
    isLoading = false,
    pagination,
    emptyTitle = "No records found",
    emptyDescription = "There are no records matching your current criteria.",
    emptyIcon = Inbox,
    emptyActionLabel,
    onEmptyAction,
    onRowClick,
    renderMobileCard,
    className,
}: DataTableProps<T>) {
    // 1. Loading Skeleton View
    if (isLoading) {
        return (
            <div className={cn("w-full bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden", className)}>
                <div className="p-4 space-y-3">
                    <Skeleton className="h-10 w-full rounded-xl bg-muted/60" />
                    {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-14 w-full rounded-xl bg-muted/40" />
                    ))}
                </div>
            </div>
        );
    }

    // 2. Empty State View
    if (!data || data.length === 0) {
        return (
            <div className={cn("w-full bg-card rounded-2xl border border-border/60 shadow-xs p-6", className)}>
                <EmptyState
                    icon={emptyIcon}
                    title={emptyTitle}
                    description={emptyDescription}
                    actionLabel={emptyActionLabel}
                    onAction={onEmptyAction}
                />
            </div>
        );
    }

    return (
        <div className={cn("w-full bg-card rounded-2xl border border-border/60 shadow-xs overflow-hidden flex flex-col", className)}>
            {/* Desktop / Tablet Table View */}
            <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-sm border-collapse">
                    <thead className="bg-muted/40 border-b border-border/60 text-muted-foreground uppercase text-[11px] font-bold tracking-wider select-none">
                        <tr>
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className={cn(
                                        "py-3.5 px-4 font-semibold text-muted-foreground",
                                        col.mobileHide && "hidden lg:table-cell",
                                        col.className
                                    )}
                                >
                                    {col.header}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/40">
                        {data.map((row) => (
                            <tr
                                key={keyExtractor(row)}
                                onClick={() => onRowClick && onRowClick(row)}
                                className={cn(
                                    "transition-colors group",
                                    onRowClick ? "cursor-pointer hover:bg-muted/40" : "hover:bg-muted/20"
                                )}
                            >
                                {columns.map((col, idx) => (
                                    <td
                                        key={idx}
                                        className={cn(
                                            "py-3.5 px-4 align-middle",
                                            col.mobileHide && "hidden lg:table-cell",
                                            col.className
                                        )}
                                    >
                                        {col.cell
                                            ? col.cell(row)
                                            : col.accessorKey
                                            ? String(row[col.accessorKey] ?? "")
                                            : null}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {/* Mobile Stacked Card View (< 768px) */}
            <div className="block md:hidden divide-y divide-border/60">
                {data.map((row) => (
                    <div
                        key={keyExtractor(row)}
                        onClick={() => onRowClick && onRowClick(row)}
                        className={cn(
                            "p-4 transition-colors",
                            onRowClick ? "cursor-pointer hover:bg-muted/30 active:bg-muted/50" : ""
                        )}
                    >
                        {renderMobileCard ? (
                            renderMobileCard(row)
                        ) : (
                            <div className="space-y-2">
                                {columns.map((col, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs">
                                        <span className="font-semibold text-muted-foreground uppercase">{col.header}:</span>
                                        <span className="font-medium text-foreground">
                                            {col.cell
                                                ? col.cell(row)
                                                : col.accessorKey
                                                ? String(row[col.accessorKey] ?? "")
                                                : null}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.totalPages > 1 && (
                <div className="px-4 py-3 border-t border-border/60 bg-muted/20 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-muted-foreground select-none">
                    <div>
                        Showing <span className="font-semibold text-foreground">{Math.min(pagination.total, (pagination.page - 1) * pagination.limit + 1)}</span> to{" "}
                        <span className="font-semibold text-foreground">{Math.min(pagination.total, pagination.page * pagination.limit)}</span> of{" "}
                        <span className="font-semibold text-foreground">{pagination.total}</span> entries
                    </div>
                    <div className="flex items-center gap-1.5">
                        <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => pagination.onPageChange(1)}
                            disabled={pagination.page <= 1}
                            aria-label="First Page"
                        >
                            <ChevronsLeft className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => pagination.onPageChange(pagination.page - 1)}
                            disabled={pagination.page <= 1}
                            aria-label="Previous Page"
                        >
                            <ChevronLeft className="h-3.5 w-3.5" />
                        </Button>
                        <span className="px-2 font-medium">
                            Page {pagination.page} of {pagination.totalPages}
                        </span>
                        <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => pagination.onPageChange(pagination.page + 1)}
                            disabled={pagination.page >= pagination.totalPages}
                            aria-label="Next Page"
                        >
                            <ChevronRight className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                            variant="outline"
                            size="icon-xs"
                            onClick={() => pagination.onPageChange(pagination.totalPages)}
                            disabled={pagination.page >= pagination.totalPages}
                            aria-label="Last Page"
                        >
                            <ChevronsRight className="h-3.5 w-3.5" />
                        </Button>
                    </div>
                </div>
            )}
        </div>
    );
}
