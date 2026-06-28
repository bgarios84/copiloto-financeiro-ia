import * as React from "react";
import { cn } from "@/lib/utils";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  leftIcon?: React.ElementType;
  rightIcon?: React.ElementType;
  onRightIconClick?: () => void;
}

/**
 * Input — styled text input with optional label, hint, error, and icon slots.
 *
 * Usage:
 * ```tsx
 * <Input
 *   label="E-mail"
 *   type="email"
 *   placeholder="voce@exemplo.com"
 *   leftIcon={Mail}
 *   error="E-mail inválido"
 * />
 * ```
 */
export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, hint, leftIcon: LeftIcon, rightIcon: RightIcon, onRightIconClick, className, id, ...props }, ref) => {
    const inputId = id ?? React.useId();

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="text-[13px] font-medium text-foreground"
          >
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {LeftIcon && (
            <div className="pointer-events-none absolute left-3 flex items-center text-muted-foreground">
              <LeftIcon className="h-4 w-4" />
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-9 w-full rounded-lg border border-border bg-background px-3 py-2",
              "text-[13px] text-foreground placeholder:text-muted-foreground/60",
              "transition-colors focus:outline-none focus:ring-2 focus:ring-ring/30 focus:border-ring",
              "disabled:cursor-not-allowed disabled:opacity-50",
              LeftIcon && "pl-9",
              RightIcon && "pr-9",
              error && "border-destructive focus:ring-destructive/30",
              className
            )}
            aria-describedby={
              error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined
            }
            aria-invalid={!!error}
            {...props}
          />

          {RightIcon && (
            <button
              type="button"
              onClick={onRightIconClick}
              className="absolute right-3 flex items-center text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={onRightIconClick ? 0 : -1}
            >
              <RightIcon className="h-4 w-4" />
            </button>
          )}
        </div>

        {error && (
          <p id={`${inputId}-error`} className="text-[12px] text-destructive">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-[12px] text-muted-foreground">
            {hint}
          </p>
        )}
      </div>
    );
  }
);
Input.displayName = "Input";
