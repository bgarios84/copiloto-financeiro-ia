import * as React from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

export type PrimaryButtonProps = Omit<ButtonProps, "variant">;

/**
 * PrimaryButton — primary action button (blue, filled).
 * Shorthand for `<Button variant="default">`.
 */
export const PrimaryButton = React.forwardRef<HTMLButtonElement, PrimaryButtonProps>(
  (props, ref) => <Button ref={ref} variant="default" {...props} />
);
PrimaryButton.displayName = "PrimaryButton";
