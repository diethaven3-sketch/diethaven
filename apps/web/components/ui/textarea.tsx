import { forwardRef, type TextareaHTMLAttributes } from "react";
import clsx from "clsx";

interface TextareaFieldProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  hint?: string;
  error?: string;
}

export const TextareaField = forwardRef<HTMLTextAreaElement, TextareaFieldProps>(
  ({ label, hint, error, id, className, rows = 3, ...props }, ref) => {
    const fieldId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-heading">
          {label}
        </label>
        {hint ? <p className="text-xs text-body">{hint}</p> : null}
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          className={clsx(
            "rounded-lg border px-3 py-2.5 text-sm text-body bg-white",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            error ? "border-red-500" : "border-gray-300",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  },
);
TextareaField.displayName = "TextareaField";
