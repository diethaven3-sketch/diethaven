"use client";

import { forwardRef } from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, ChevronUp } from "lucide-react";
import clsx from "clsx";

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface CustomSelectProps {
  label?: string;
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  error?: string;
  id?: string;
  className?: string;
  triggerClassName?: string;
}

export const CustomSelect = forwardRef<HTMLButtonElement, CustomSelectProps>(
  (
    {
      label,
      value,
      defaultValue,
      onValueChange,
      options,
      placeholder = "Select an option...",
      disabled = false,
      error,
      id,
      className,
      triggerClassName,
    },
    ref,
  ) => {
    return (
      <div className={clsx("flex flex-col gap-1.5", className)}>
        {label && (
          <label
            htmlFor={id}
            className="text-sm font-medium text-heading select-none"
          >
            {label}
          </label>
        )}
        <SelectPrimitive.Root
          value={value}
          defaultValue={defaultValue}
          onValueChange={onValueChange}
          disabled={disabled}
        >
          <SelectPrimitive.Trigger
            ref={ref}
            id={id}
            aria-invalid={Boolean(error)}
            className={clsx(
              "inline-flex items-center justify-between gap-2 rounded-lg border bg-white px-3 py-2 text-sm text-body shadow-2xs transition-all duration-200",
              "hover:border-gray-400 focus:border-primary focus:ring-2 focus:ring-primary/20 focus:outline-hidden",
              "data-[placeholder]:text-body/50",
              error ? "border-red-500" : "border-gray-300",
              disabled && "cursor-not-allowed bg-gray-100 opacity-60",
              triggerClassName,
            )}
          >
            <SelectPrimitive.Value placeholder={placeholder} />
            <SelectPrimitive.Icon asChild>
              <ChevronDown size={16} className="text-body/50 shrink-0" aria-hidden />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              className="z-50 min-w-[8rem] overflow-hidden rounded-xl border border-gray-200 bg-white p-1 text-body shadow-lg animate-popover"
              position="popper"
              sideOffset={4}
            >
              <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1 text-body/60">
                <ChevronUp size={14} />
              </SelectPrimitive.ScrollUpButton>
              <SelectPrimitive.Viewport className="p-1">
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    disabled={option.disabled}
                    className={clsx(
                      "relative flex cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-hidden transition-colors duration-150",
                      "data-[highlighted]:bg-surface-alt data-[highlighted]:text-primary-dark font-medium",
                      "data-[disabled]:pointer-events-none data-[disabled]:opacity-40",
                    )}
                  >
                    <span className="absolute left-2.5 flex h-3.5 w-3.5 items-center justify-center">
                      <SelectPrimitive.ItemIndicator>
                        <Check size={14} className="text-primary font-bold" />
                      </SelectPrimitive.ItemIndicator>
                    </span>
                    <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
              <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1 text-body/60">
                <ChevronDown size={14} />
              </SelectPrimitive.ScrollDownButton>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    );
  },
);

CustomSelect.displayName = "CustomSelect";
