import type { ReactNode } from "react";
import { Text, View, type ViewProps } from "react-native";

type Tone = "info" | "warning" | "danger" | "success";

const toneClasses: Record<Tone, string> = {
  info: "bg-blue-50 border-blue-200",
  warning: "bg-orange-50 border-orange-200",
  danger: "bg-red-50 border-red-200",
  success: "bg-surface-alt border-primary/20",
};

const toneTextClasses: Record<Tone, string> = {
  info: "text-blue-800",
  warning: "text-secondary-dark",
  danger: "text-red-800",
  success: "text-primary-dark",
};

interface BannerProps extends ViewProps {
  tone?: Tone;
  children: ReactNode;
}

export function Banner({ tone = "info", children, className, ...props }: BannerProps) {
  return (
    <View className={`rounded-lg border px-4 py-3 ${toneClasses[tone]} ${className ?? ""}`} {...props}>
      <Text className={`font-body text-sm ${toneTextClasses[tone]}`}>{children}</Text>
    </View>
  );
}
