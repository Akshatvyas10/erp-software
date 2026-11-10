import React from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type StatusVariant =
  | 'success'
  | 'warning'
  | 'destructive'
  | 'info'
  | 'secondary'
  | 'outline';

interface StatusBadgeProps {
  status: string;
  variant?: StatusVariant;
  label?: string;
  className?: string;
}

const statusVariantMap: Record<string, StatusVariant> = {
  // Positive / Cleared
  PAID: 'success',
  ACTIVE: 'success',
  APPROVED: 'success',
  PRESENT: 'success',
  CLEARED: 'success',

  // Pending / In progress
  PARTIAL: 'warning',
  PARTIALLY_PAID: 'warning',
  PENDING: 'warning',
  ISSUED: 'info',
  HALF_DAY: 'warning',

  // Destructive / Negative
  CANCELLED: 'destructive',
  REJECTED: 'destructive',
  BOUNCED: 'destructive',
  ABSENT: 'destructive',
  OVERDUE: 'destructive',

  // Neutral
  DRAFT: 'secondary',
  INACTIVE: 'outline',
  EXPIRED: 'outline',
};

const badgeClasses: Record<StatusVariant, string> = {
  success: 'bg-emerald-600 hover:bg-emerald-700 text-white font-medium border-transparent',
  warning: 'bg-amber-500 hover:bg-amber-600 text-white font-medium border-transparent',
  destructive: 'bg-destructive hover:bg-destructive/90 text-destructive-foreground font-medium',
  info: 'bg-blue-600 hover:bg-blue-700 text-white font-medium border-transparent',
  secondary: 'bg-secondary text-secondary-foreground font-medium',
  outline: 'border-border text-foreground font-medium',
};

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  variant,
  label,
  className,
}) => {
  const normalizedKey = status.toUpperCase().trim();
  const resolvedVariant = variant || statusVariantMap[normalizedKey] || 'secondary';
  const displayLabel = label || status.replace(/_/g, ' ');

  return (
    <Badge
      variant="outline"
      className={cn('text-xs uppercase tracking-wide', badgeClasses[resolvedVariant], className)}
    >
      {displayLabel}
    </Badge>
  );
};

export default StatusBadge;

