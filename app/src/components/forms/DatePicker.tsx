import * as React from "react";
import { Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

export interface DatePickerProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> {
  label?: string;
  error?: string;
  hint?: string;
}

/**
 * DatePicker — styled native date input.
 *
 * Usage:
 * ```tsx
 * <DatePicker
 *   label="Data da transação"
 *   value={date}
 *   onChange={(e) => setDate(e.target.value)}
 * />
 * ```
 */
export const DatePicker = React.forwardRef<HTMLInputElement, DatePickerProps>(
  ({ label, error, hint, className, id, ...props }, ref) => {
    const inputId = id ?? React.useId();

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-[13px] font-medium text-foreground">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          <Calendar className="pointer-events-none absolute left-3 h-4 w-4 text-muted-foreground" />
          <input
            ref={ref}
            id={inputId}
            type="date"
            className={cn(
              "h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 py-2",
              "text-[13px] text-foreground",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              "[color-scheme:light] dark:[color-scheme:dark]",
              error && "border-destructive",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
            {...props}
          />
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-[12px] text-destructive">{error}</p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-[12px] text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
DatePicker.displayName = "DatePicker";
