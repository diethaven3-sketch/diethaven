import type { ComponentType } from "react";
import { Pressable, Text, View } from "react-native";
import { ChevronRight } from "lucide-react-native";
import { colors } from "@repo/ui-tokens";

interface LinkRowProps {
  label: string;
  description?: string;
  /** Right-aligned secondary value, shown before the chevron (e.g. a phone number or status). */
  value?: string;
  icon?: ComponentType<{ size?: number; color?: string }>;
  onPress: () => void;
  last?: boolean;
  tone?: "default" | "danger";
  /** Hide the trailing chevron for rows that don't navigate anywhere (e.g. sign out). */
  chevron?: boolean;
}

export function LinkRow({
  label,
  description,
  value,
  icon: Icon,
  onPress,
  last = false,
  tone = "default",
  chevron = true,
}: LinkRowProps) {
  const labelColor = tone === "danger" ? "text-danger" : "text-heading";
  const iconColor = tone === "danger" ? colors.danger : colors.textMuted;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      className={`min-h-[52px] flex-row items-center gap-3 py-3 active:opacity-60 ${
        last ? "" : "border-b border-gray-100"
      }`}
    >
      {Icon ? <Icon size={18} color={iconColor} /> : null}
      <View className="flex-1">
        <Text className={`font-body-medium text-sm ${labelColor}`}>{label}</Text>
        {description ? <Text className="font-body text-sm text-body">{description}</Text> : null}
      </View>
      {value ? <Text className="font-body text-sm text-muted">{value}</Text> : null}
      {chevron ? <ChevronRight size={16} color={colors.textMuted} /> : null}
    </Pressable>
  );
}
