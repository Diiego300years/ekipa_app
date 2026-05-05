"use client";

import type { ButtonHTMLAttributes, ReactNode } from "react";
import { useFormStatus } from "react-dom";

type SubmitButtonProps = Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "children" | "type"
> & {
  label: ReactNode;
  pendingLabel: ReactNode;
};

export function SubmitButton({
  label,
  pendingLabel,
  disabled,
  ...props
}: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <button disabled={disabled || pending} type="submit" {...props}>
      {pending ? pendingLabel : label}
    </button>
  );
}
