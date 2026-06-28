import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export type DangerButtonProps = Omit<ButtonProps, "variant">;

/**
 * DangerButton — destructive action button (red).
 * Shorthand for `<Button variant="destructive">`.
 */
export const DangerButton = React.forwardRef<HTMLButtonElement, DangerButtonProps>(
  (props, ref) => <Button ref={ref} variant="destructive" {...props} />
);
DangerButton.displayName = "DangerButton";
