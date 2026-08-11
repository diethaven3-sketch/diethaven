import { forwardRef, type SelectHTMLAttributes } from "react";
import clsx from "clsx";

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
}

export const SelectField = forwardRef<HTMLSelectElement, SelectFieldProps>(
  ({ label, error, id, className, children, ...props }, ref) => {
    const selectId = id ?? props.name;
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={selectId} className="text-sm font-medium text-heading">
          {label}
        </label>
        <select
          ref={ref}
          id={selectId}
          className={clsx(
            "rounded-lg border px-3 py-2.5 text-sm text-body bg-white",
            "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
            error ? "border-red-500" : "border-gray-300",
            className,
          )}
          aria-invalid={Boolean(error)}
          {...props}
        >
          {children}
        </select>
        {error ? <p className="text-sm text-red-600">{error}</p> : null}
      </div>
    );
  },
);
SelectField.displayName = "SelectField";
