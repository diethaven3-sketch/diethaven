import { Pressable, Text, type PressableProps } from "react-native";

type Variant = "primary" | "secondary" | "outline" | "ghost";

const variantClasses: Record<Variant, string> = {
  primary: "bg-primary active:bg-primary-dark",
  secondary: "bg-secondary active:bg-secondary-dark",
  outline: "bg-surface-alt active:bg-surface",
  ghost: "bg-transparent active:bg-surface-alt",
};

const variantTextClasses: Record<Variant, string> = {
  primary: "text-white",
  secondary: "text-white",
  outline: "text-primary-dark",
  ghost: "text-primary",
};

interface ButtonProps extends Omit<PressableProps, "children"> {
  variant?: Variant;
  loading?: boolean;
  children: string;
}

export function Button({ variant = "primary", loading = false, disabled, children, className, ...props }: ButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled || loading}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
      className={`min-h-[52px] items-center justify-center rounded-[14px] px-4 py-3 ${variantClasses[variant]} ${
        disabled || loading ? "opacity-60" : ""
      } ${className ?? ""}`}
      {...props}
    >
      <Text className={`font-body-medium text-base ${variantTextClasses[variant]}`}>
        {loading ? "Please wait…" : children}
      </Text>
    </Pressable>
  );
}
