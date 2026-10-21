"use client";
import { useId, type ComponentProps, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
export function Field({
  label,
  optional,
  hint,
  wide,
  error,
  children,
  id: suppliedId,
  ...props
}: ComponentProps<typeof Input> & {
  label: string;
  optional?: boolean;
  hint?: string;
  wide?: boolean;
  error?: string;
  children?: ReactNode;
}) {
  const generatedId = useId();
  const id = suppliedId || generatedId;
  return (
    <div className={`field ${wide ? "wide" : ""}`}>
      <label htmlFor={id}>
        {label}
        {props.required && <span className="required">*</span>}
        {optional && <span className="optional">Opsional</span>}
      </label>
      {children || (
        <Input
          {...props}
          id={id}
          aria-invalid={!!error}
          aria-describedby={error || hint ? `${id}-hint` : undefined}
        />
      )}
      {(error || hint) && (
        <small
          id={`${id}-hint`}
          className={error ? "text-destructive" : ""}
          role={error ? "alert" : undefined}
        >
          {error || hint}
        </small>
      )}
    </div>
  );
}
