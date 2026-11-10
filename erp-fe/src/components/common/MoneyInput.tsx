import React from 'react';
import { Input } from '@/components/ui/input';
import { IndianRupee } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MoneyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange'> {
  value: number | string;
  onChange: (val: number) => void;
  currencySymbol?: React.ReactNode;
  className?: string;
  error?: boolean;
}

export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onChange, currencySymbol, className, error, ...props }, ref) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const parsed = parseFloat(e.target.value);
      onChange(isNaN(parsed) ? 0 : parsed);
    };

    return (
      <div className="relative flex items-center">
        <span className="absolute left-3 text-muted-foreground flex items-center pointer-events-none">
          {currencySymbol || <IndianRupee className="w-4 h-4" />}
        </span>
        <Input
          ref={ref}
          type="number"
          step="any"
          value={value === 0 ? '' : value}
          onChange={handleChange}
          className={cn(
            'pl-9 font-semibold text-foreground tracking-tight',
            error && 'border-destructive focus-visible:ring-destructive',
            className
          )}
          {...props}
        />
      </div>
    );
  }
);

MoneyInput.displayName = 'MoneyInput';

export default MoneyInput;

