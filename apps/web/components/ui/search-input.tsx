"use client";

import { forwardRef, type InputHTMLAttributes } from "react";
import { Search, X } from "lucide-react";
import clsx from "clsx";

export interface SearchInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
  placeholder?: string;
  className?: string;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onChange,
      onClear,
      placeholder = "Search...",
      className,
      disabled,
      ...props
    },
    ref,
  ) => {
    const handleClear = () => {
      onChange("");
      onClear?.();
    };

    return (
      <div className={clsx("relative flex items-center", className)}>
        <Search
          size={16}
          className="pointer-events-none absolute left-3 text-body/50 transition-colors"
          aria-hidden
        />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className={clsx(
            "w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-8 text-sm text-body shadow-2xs transition-all duration-200",
            "placeholder:text-body/45",
            "hover:border-gray-400",
            "focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden",
            disabled && "cursor-not-allowed bg-gray-100 opacity-60",
          )}
          {...props}
        />
        {value ? (
          <button
            type="button"
            onClick={handleClear}
            aria-label="Clear search"
            className="absolute right-2.5 rounded-full p-1 text-body/40 hover:bg-gray-100 hover:text-body focus:outline-hidden"
          >
            <X size={14} aria-hidden />
          </button>
        ) : null}
      </div>
    );
  },
);

SearchInput.displayName = "SearchInput";
