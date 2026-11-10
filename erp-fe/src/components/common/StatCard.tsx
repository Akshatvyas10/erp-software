import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  trend?: {
    value: string;
    isPositive?: boolean;
    label?: string;
  };
  variant?: 'default' | 'success' | 'warning' | 'destructive' | 'info';
  className?: string;
}

const variantStyles: Record<NonNullable<StatCardProps['variant']>, {
  iconBg: string;
  iconColor: string;
  valueColor: string;
}> = {
  default: {
    iconBg: 'bg-primary/10',
    iconColor: 'text-primary',
    valueColor: 'text-foreground',
  },
  success: {
    iconBg: 'bg-emerald-500/10',
    iconColor: 'text-emerald-600 dark:text-emerald-400',
    valueColor: 'text-foreground',
  },
  warning: {
    iconBg: 'bg-amber-500/10',
    iconColor: 'text-amber-600 dark:text-amber-400',
    valueColor: 'text-foreground',
  },
  destructive: {
    iconBg: 'bg-destructive/10',
    iconColor: 'text-destructive',
    valueColor: 'text-foreground',
  },
  info: {
    iconBg: 'bg-sky-500/10',
    iconColor: 'text-sky-600 dark:text-sky-400',
    valueColor: 'text-foreground',
  },
};

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  className,
}) => {
  const styles = variantStyles[variant];

  return (
    <Card className={cn('bg-card border-border/80 shadow-xs hover:shadow-sm transition-all rounded-xl', className)}>
      <CardContent className="p-5 flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            {title}
          </p>
          <h3 className={cn('text-2xl font-bold tracking-tight', styles.valueColor)}>
            {value}
          </h3>
          {(subtitle || trend) && (
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              {trend && (
                <span className={cn('font-medium', trend.isPositive ? 'text-emerald-600' : 'text-destructive')}>
                  {trend.value}
                </span>
              )}
              {subtitle && <span>{subtitle}</span>}
            </div>
          )}
        </div>
        {Icon && (
          <div className={cn('h-11 w-11 rounded-xl flex items-center justify-center shrink-0', styles.iconBg, styles.iconColor)}>
            <Icon className="w-5 h-5" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default StatCard;
