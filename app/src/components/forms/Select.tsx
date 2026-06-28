import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  options: SelectOption[];
  label?: string;
  placeholder?: string;
  error?: string;
  hint?: string;
  onChange?: (value: string) => void;
}

/**
 * Select — styled native select dropdown.
 *
 * Usage:
 * ```tsx
 * <Select
 *   label="Tipo de ativo"
 *   options={[
 *     { value: "acoes", label: "Ações" },
 *     { value: "fii",   label: "FIIs" },
 *   ]}
 *   value={type}
 *   onChange={setType}
 * />
 * ```
 */
export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ options, label, placeholder, error, hint, onChange, className, id, ...props }, ref) => {
    const selectId = id ?? React.useId();

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label htmlFor={selectId} className="text-[13px] font-medium text-foreground">
            {label}
          </label>
        )}

        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            onChange={(e) => onChange?.(e.target.value)}
            className={cn(
              "h-9 w-full appearance-none rounded-lg border border-border bg-background px-3 pr-8 py-2",
              "text-[13px] text-foreground",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              error && "border-destructive",
              className
            )}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : hint ? `${selectId}-hint` : undefined}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>

          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        </div>

        {error && (
          <p id={`${selectId}-error`} className="text-[12px] text-destructive">{error}</p>
        )}
        {hint && !error && (
          <p id={`${selectId}-hint`} className="text-[12px] text-muted-foreground">{hint}</p>
        )}
      </div>
    );
  }
);
Select.displayName = "Select";
