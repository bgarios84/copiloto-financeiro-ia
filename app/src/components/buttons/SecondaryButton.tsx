import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export type SecondaryButtonProps = Omit<ButtonProps, "variant">;

/**
 * SecondaryButton — muted, secondary action button.
 * Shorthand for `<Button variant="secondary">`.
 */
export const SecondaryButton = React.forwardRef<HTMLButtonElement, SecondaryButtonProps>(
  (props, ref) => <Button ref={ref} variant="secondary" {...props} />
);
SecondaryButton.displayName = "SecondaryButton";
