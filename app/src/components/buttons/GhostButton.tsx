import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export type GhostButtonProps = Omit<ButtonProps, "variant">;

/**
 * GhostButton — borderless, transparent hover button.
 * Shorthand for `<Button variant="ghost">`.
 */
export const GhostButton = React.forwardRef<HTMLButtonElement, GhostButtonProps>(
  (props, ref) => <Button ref={ref} variant="ghost" {...props} />
);
GhostButton.displayName = "GhostButton";
